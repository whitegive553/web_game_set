/**
 * Avalon Game Logic
 * Server-authoritative game state management
 */

import {
  AvalonPhase,
  AvalonRole,
  AvalonTeam,
  AvalonGameState,
  AvalonPublicState,
  AvalonPrivateState,
  QuestResult,
  PlayerCountConfig,
  QuestConfig,
  GameMatch,
  PluginGamePlayer,
  PluginGameEvent,
  PublicStateView,
  PrivateStateView,
  ValidationResult,
} from '@survival-game/shared';
import gameConfig from './config.json';

export class AvalonGame {
  private match: GameMatch;
  private state: AvalonGameState;
  private config: PlayerCountConfig;
  private events: PluginGameEvent[] = [];

  constructor(match: GameMatch) {
    this.match = match;
    const playerCount = match.players.length;

    const configKey = playerCount.toString() as keyof typeof gameConfig.playerConfigs;
    if (!gameConfig.playerConfigs[configKey]) {
      throw new Error(`Invalid player count: ${playerCount}`);
    }

    this.config = gameConfig.playerConfigs[configKey] as PlayerCountConfig;

    // Try to restore state from match if it exists
    if (match.state && (match.state as any).roleAssignments) {
      console.log('[AvalonGame] Restoring game state from match');
      this.state = match.state as any as AvalonGameState;
    } else {
      console.log('[AvalonGame] Initializing new game state');
      this.state = this.initializeState();
    }
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private initializeState(): AvalonGameState {
    return {
      phase: AvalonPhase.LOBBY,
      round: 0,
      leader: this.match.players[0].userId,
      leaderIndex: 0,
      questResults: [],
      goodWins: 0,
      evilWins: 0,
      nominatedTeam: [],
      teamVotes: {},
      questVotes: {},
      roleAssignments: {},
    };
  }

  /**
   * Sync current game state to match object for persistence
   */
  private syncStateToMatch(): void {
    this.match.state = this.state as any;
  }

  // ============================================================================
  // Game Flow
  // ============================================================================

  public startGame(): PluginGameEvent[] {
    if (this.state.phase !== AvalonPhase.LOBBY) {
      throw new Error('Game already started');
    }

    // Assign roles
    this.assignRoles();

    // Move to role reveal phase
    this.state.phase = AvalonPhase.ROLE_REVEAL;

    const event: PluginGameEvent = {
      eventId: `event_${Date.now()}`,
      matchId: this.match.matchId,
      gameId: 'avalon',
      timestamp: Date.now(),
      type: 'GAME_STARTED',
      payload: { phase: AvalonPhase.ROLE_REVEAL },
      visibleTo: 'all',
    };

    this.events.push(event);

    // Sync state to match for persistence
    this.syncStateToMatch();

    // Automatically move to nomination after players have seen their roles
    // Changed from 3 seconds to 8 seconds to allow for 5-second countdown + role reveal
    setTimeout(() => this.startNomination(), 8000);

    return [event];
  }

  private assignRoles(): void {
    const players = [...this.match.players];
    const shuffled = this.shuffleArray(players);

    const goodRoles = this.config.roles.good;
    const evilRoles = this.config.roles.evil;

    const allRoles = [...goodRoles, ...evilRoles];

    shuffled.forEach((player, index) => {
      this.state.roleAssignments[player.userId] = allRoles[index] as AvalonRole;
    });
  }

  private startNomination(): PluginGameEvent[] {
    this.state.phase = AvalonPhase.NOMINATION;
    this.state.round++;
    this.state.nominatedTeam = [];

    const event: PluginGameEvent = {
      eventId: `event_${Date.now()}`,
      matchId: this.match.matchId,
      gameId: 'avalon',
      timestamp: Date.now(),
      type: 'NOMINATION_STARTED',
      payload: {
        round: this.state.round,
        leader: this.state.leader,
        teamSize: this.getCurrentQuestConfig().teamSize,
      },
      visibleTo: 'all',
    };

    this.events.push(event);
    this.syncStateToMatch();
    return [event];
  }

  // ============================================================================
  // Actions
  // ============================================================================

  public handleNominateTeam(userId: string, teamUserIds: string[]): PluginGameEvent[] {
    // Validate
    if (this.state.phase !== AvalonPhase.NOMINATION) {
      throw new Error('Not in nomination phase');
    }

    if (userId !== this.state.leader) {
      throw new Error('Only leader can nominate');
    }

    const questConfig = this.getCurrentQuestConfig();
    if (teamUserIds.length !== questConfig.teamSize) {
      throw new Error(`Team must have ${questConfig.teamSize} members`);
    }

    // Check all nominated players exist
    const playerIds = this.match.players.map(p => p.userId);
    if (!teamUserIds.every(id => playerIds.includes(id))) {
      throw new Error('Invalid player in team');
    }

    // Update state
    this.state.nominatedTeam = teamUserIds;
    this.state.phase = AvalonPhase.TEAM_VOTE;
    this.state.teamVotes = {};

    const event: PluginGameEvent = {
      eventId: `event_${Date.now()}`,
      matchId: this.match.matchId,
      gameId: 'avalon',
      timestamp: Date.now(),
      type: 'TEAM_NOMINATED',
      payload: {
        leader: userId,
        team: teamUserIds,
      },
      visibleTo: 'all',
    };

    this.events.push(event);
    this.syncStateToMatch();
    return [event];
  }

  public handleVoteTeam(userId: string, approve: boolean): PluginGameEvent[] {
    if (this.state.phase !== AvalonPhase.TEAM_VOTE) {
      throw new Error('Not in team vote phase');
    }

    if (this.state.teamVotes[userId] !== undefined) {
      throw new Error('Already voted');
    }

    this.state.teamVotes[userId] = approve;

    const events: PluginGameEvent[] = [{
      eventId: `event_${Date.now()}`,
      matchId: this.match.matchId,
      gameId: 'avalon',
      timestamp: Date.now(),
      type: 'TEAM_VOTE_CAST',
      payload: { userId },
      visibleTo: 'all',
    }];

    // Check if all voted
    if (Object.keys(this.state.teamVotes).length === this.match.players.length) {
      const approveCount = Object.values(this.state.teamVotes).filter(v => v).length;
      const majority = approveCount > this.match.players.length / 2;

      events.push({
        eventId: `event_${Date.now() + 1}`,
        matchId: this.match.matchId,
        gameId: 'avalon',
        timestamp: Date.now(),
        type: 'TEAM_VOTE_RESULT',
        payload: {
          votes: this.state.teamVotes,
          approved: majority,
        },
        visibleTo: 'all',
      });

      if (majority) {
        // Team approved, move to quest
        this.state.phase = AvalonPhase.QUEST_VOTE;
        this.state.questVotes = {};

        events.push({
          eventId: `event_${Date.now() + 2}`,
          matchId: this.match.matchId,
          gameId: 'avalon',
          timestamp: Date.now(),
          type: 'QUEST_STARTED',
          payload: { team: this.state.nominatedTeam },
          visibleTo: 'all',
        });
      } else {
        // Team rejected, next leader
        this.advanceLeader();
        this.syncStateToMatch();
        return events.concat(this.startNomination());
      }
    }

    this.events.push(...events);
    this.syncStateToMatch();
    return events;
  }

  public handleVoteQuest(userId: string, success: boolean): PluginGameEvent[] {
    if (this.state.phase !== AvalonPhase.QUEST_VOTE) {
      throw new Error('Not in quest vote phase');
    }

    if (!this.state.nominatedTeam.includes(userId)) {
      throw new Error('Not on the quest team');
    }

    if (this.state.questVotes[userId] !== undefined) {
      throw new Error('Already voted');
    }

    // Good players can only vote success
    const role = this.state.roleAssignments[userId];
    const team = this.getRoleTeam(role);
    if (team === AvalonTeam.GOOD && !success) {
      throw new Error('Good players must vote success');
    }

    this.state.questVotes[userId] = success;

    const events: PluginGameEvent[] = [{
      eventId: `event_${Date.now()}`,
      matchId: this.match.matchId,
      gameId: 'avalon',
      timestamp: Date.now(),
      type: 'QUEST_VOTE_CAST',
      payload: { userId },
      visibleTo: 'all',
    }];

    // Check if all team members voted
    if (Object.keys(this.state.questVotes).length === this.state.nominatedTeam.length) {
      const successVotes = Object.values(this.state.questVotes).filter(v => v).length;
      const failVotes = Object.values(this.state.questVotes).filter(v => !v).length;

      const questConfig = this.getCurrentQuestConfig();
      const questSuccess = failVotes < questConfig.failsRequired;

      const result: QuestResult = {
        questNumber: this.state.round,
        team: this.state.nominatedTeam,
        successVotes,
        failVotes,
        success: questSuccess,
      };

      this.state.questResults.push(result);

      if (questSuccess) {
        this.state.goodWins++;
      } else {
        this.state.evilWins++;
      }

      this.state.phase = AvalonPhase.QUEST_RESULT;

      events.push({
        eventId: `event_${Date.now() + 1}`,
        matchId: this.match.matchId,
        gameId: 'avalon',
        timestamp: Date.now(),
        type: 'QUEST_RESULT',
        payload: result,
        visibleTo: 'all',
      });

      // Check win conditions
      if (this.state.goodWins >= 3) {
        // Good needs to survive assassination
        this.syncStateToMatch();
        return events.concat(this.startAssassination());
      } else if (this.state.evilWins >= 3) {
        // Evil wins
        this.syncStateToMatch();
        return events.concat(this.endGame(AvalonTeam.EVIL, 'Three quests failed'));
      } else {
        // Continue to next round
        this.advanceLeader();
        this.syncStateToMatch();
        setTimeout(() => this.startNomination(), 2000);
      }
    }

    this.events.push(...events);
    this.syncStateToMatch();
    return events;
  }

  public handleAssassinate(userId: string, targetUserId: string): PluginGameEvent[] {
    if (this.state.phase !== AvalonPhase.ASSASSINATION) {
      throw new Error('Not in assassination phase');
    }

    const role = this.state.roleAssignments[userId];
    if (role !== AvalonRole.ASSASSIN) {
      throw new Error('Only assassin can assassinate');
    }

    const targetRole = this.state.roleAssignments[targetUserId];
    const hitMerlin = targetRole === AvalonRole.MERLIN;

    this.state.assassinTarget = targetUserId;

    const events: PluginGameEvent[] = [{
      eventId: `event_${Date.now()}`,
      matchId: this.match.matchId,
      gameId: 'avalon',
      timestamp: Date.now(),
      type: 'ASSASSINATION',
      payload: {
        assassin: userId,
        target: targetUserId,
        hitMerlin,
      },
      visibleTo: 'all',
    }];

    if (hitMerlin) {
      return events.concat(this.endGame(AvalonTeam.EVIL, 'Merlin assassinated'));
    } else {
      return events.concat(this.endGame(AvalonTeam.GOOD, 'Merlin survived'));
    }
  }

  private startAssassination(): PluginGameEvent[] {
    this.state.phase = AvalonPhase.ASSASSINATION;

    const event: PluginGameEvent = {
      eventId: `event_${Date.now()}`,
      matchId: this.match.matchId,
      gameId: 'avalon',
      timestamp: Date.now(),
      type: 'ASSASSINATION_STARTED',
      payload: {},
      visibleTo: 'all',
    };

    this.events.push(event);
    this.syncStateToMatch();
    return [event];
  }

  private endGame(winner: AvalonTeam, reason: string): PluginGameEvent[] {
    this.state.phase = AvalonPhase.GAME_OVER;
    this.state.winner = winner;

    const event: PluginGameEvent = {
      eventId: `event_${Date.now()}`,
      matchId: this.match.matchId,
      gameId: 'avalon',
      timestamp: Date.now(),
      type: 'GAME_OVER',
      payload: {
        winner,
        reason,
        roleAssignments: this.state.roleAssignments,
      },
      visibleTo: 'all',
    };

    this.events.push(event);
    this.match.endedAt = Date.now();

    // Sync final state to match
    this.syncStateToMatch();

    return [event];
  }

  // ============================================================================
  // State Views
  // ============================================================================

  public getPublicState(): AvalonPublicState {
    const questVoteCount = this.state.phase === AvalonPhase.QUEST_VOTE || this.state.phase === AvalonPhase.QUEST_RESULT
      ? {
          success: Object.values(this.state.questVotes).filter(v => v).length,
          fail: Object.values(this.state.questVotes).filter(v => !v).length,
        }
      : undefined;

    return {
      phase: this.state.phase,
      round: this.state.round,
      leader: this.state.leader,
      questResults: this.state.questResults,
      goodWins: this.state.goodWins,
      evilWins: this.state.evilWins,
      nominatedTeam: this.state.nominatedTeam.length > 0 ? this.state.nominatedTeam : undefined,
      teamVotes: Object.keys(this.state.teamVotes).length > 0 ? this.state.teamVotes : undefined,
      questVoteCount,
      winner: this.state.winner,
    };
  }

  public getPrivateState(userId: string): AvalonPrivateState {
    const role = this.state.roleAssignments[userId];
    const team = this.getRoleTeam(role);

    const privateState: AvalonPrivateState = {
      userId,
      role,
      team,
    };

    // Merlin sees all evil players
    if (role === AvalonRole.MERLIN) {
      privateState.evilPlayers = Object.entries(this.state.roleAssignments)
        .filter(([_, r]) => this.getRoleTeam(r) === AvalonTeam.EVIL)
        .map(([uid, _]) => uid);
    }

    // Percival sees Merlin and Morgana (cannot distinguish)
    if (role === AvalonRole.PERCIVAL) {
      privateState.merlinCandidates = Object.entries(this.state.roleAssignments)
        .filter(([_, r]) => r === AvalonRole.MERLIN || r === AvalonRole.MORGANA)
        .map(([uid, _]) => uid);
    }

    // Check if player has voted in current quest
    if (this.state.phase === AvalonPhase.QUEST_VOTE) {
      privateState.hasVotedQuest = this.state.questVotes[userId] !== undefined;
    }

    return privateState;
  }

  public getEvents(): PluginGameEvent[] {
    return this.events;
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private getCurrentQuestConfig(): QuestConfig {
    return this.config.quests[this.state.round - 1];
  }

  private advanceLeader(): void {
    this.state.leaderIndex = (this.state.leaderIndex + 1) % this.match.players.length;
    this.state.leader = this.match.players[this.state.leaderIndex].userId;
  }

  private getRoleTeam(role: AvalonRole): AvalonTeam {
    if (role === AvalonRole.ASSASSIN || role === AvalonRole.MORGANA || role === AvalonRole.MINION) {
      return AvalonTeam.EVIL;
    }
    return AvalonTeam.GOOD;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
