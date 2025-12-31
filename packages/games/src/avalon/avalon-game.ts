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
  AvalonRoomConfig,
  roleConfigToPlayerCountConfig,
  getPlayerCountConfig
} from '@survival-game/shared';
import gameConfig from './config.json';

// Type for history service to avoid circular dependency
export interface IAvalonHistoryService {
  onGameStart(matchId: string, gameData: any): Promise<void>;
  onRoundStart(gameId: string, roundData: any): Promise<void>;
  onTeamProposal(gameId: string, proposalData: any): Promise<void>;
  onTeamVote(gameId: string, voteData: any): Promise<void>;
  onQuestResolved(gameId: string, questData: any): Promise<void>;
  onAssassination(gameId: string, assassinationData: any): Promise<void>;
  onGameEnd(gameData: any): Promise<void>;
}

export class AvalonGame {
  private match: GameMatch;
  private state: AvalonGameState;
  private config: PlayerCountConfig;
  private events: PluginGameEvent[] = [];
  private roomId: string;
  private gameStartedAt?: number;
  private historyService?: IAvalonHistoryService;

  /**
   * @param match - The game match
   * @param customConfig - Optional custom role configuration (overrides default config.json)
   * @param historyService - Optional history service for recording game events
   */
  constructor(match: GameMatch, customConfig?: AvalonRoomConfig, historyService?: IAvalonHistoryService) {
    console.log('[AvalonGame] >>>>>> CONSTRUCTOR CALLED WITH VERSION 2024-12-31 <<<<<<');
    console.log('[AvalonGame] >>>>>> historyService parameter:', historyService ? 'PROVIDED' : 'UNDEFINED');
    this.historyService = historyService;
    console.log('[AvalonGame] >>>>>> this.historyService set to:', this.historyService ? 'OK' : 'UNDEFINED');
    this.match = match;
    this.roomId = match.roomId;
    const playerCount = match.players.length;

    // Use custom config if provided, otherwise fall back to config.json
    if (customConfig) {
      console.log(`[AvalonGame] Using custom configuration for ${playerCount} players:`, customConfig);
      const playerConfig = roleConfigToPlayerCountConfig(
        customConfig.targetPlayerCount,
        customConfig.roleConfig
      );

      if (!playerConfig) {
        throw new Error('Invalid custom configuration');
      }

      this.config = playerConfig;
    } else {
      // Fall back to config.json (backward compatibility)
      const configKey = playerCount.toString() as keyof typeof gameConfig.playerConfigs;
      if (!gameConfig.playerConfigs[configKey]) {
        throw new Error(`Invalid player count: ${playerCount}`);
      }

      this.config = gameConfig.playerConfigs[configKey] as PlayerCountConfig;
    }

    // Try to restore state from match if it exists
    if (match.state && (match.state as any).roleAssignments) {
      console.log('[AvalonGame] Restoring game state from match');
      this.state = match.state as any as AvalonGameState;

      // Ensure compatibility with old saved states
      if (!this.state.currentQuestTeamVotes) {
        console.log('[AvalonGame] Adding missing currentQuestTeamVotes to restored state');
        this.state.currentQuestTeamVotes = [];
      }

      // Fix old quest results that don't have teamVoteHistory
      if (this.state.questResults) {
        this.state.questResults.forEach((result, index) => {
          if (!result.teamVoteHistory) {
            console.log(`[AvalonGame] Adding missing teamVoteHistory to quest ${index + 1}`);
            result.teamVoteHistory = [];
          }
        });
      }
    } else {
      console.log('[AvalonGame] Initializing new game state');
      this.state = this.initializeState();
    }
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private initializeState(): AvalonGameState {
    // Randomize first leader instead of always using first player
    const randomLeaderIndex = Math.floor(Math.random() * this.match.players.length);

    console.log(`[AvalonGame] Initializing new game - Random first leader index: ${randomLeaderIndex} (player: ${this.match.players[randomLeaderIndex].username})`);

    return {
      phase: AvalonPhase.LOBBY,
      round: 0,
      leader: this.match.players[randomLeaderIndex].userId,
      leaderIndex: randomLeaderIndex,
      questResults: [],
      goodWins: 0,
      evilWins: 0,
      nominatedTeam: [],
      teamVotes: {},
      questVotes: {},
      currentQuestTeamVotes: [],
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

    // Re-initialize state to ensure clean start with random leader
    // This fixes issues with restored game state from persistence
    console.log('[AvalonGame] Starting new game - resetting state');
    this.state = this.initializeState();

    // Assign roles
    this.assignRoles();

    // Move to role reveal phase
    this.state.phase = AvalonPhase.ROLE_REVEAL;
    this.gameStartedAt = Date.now();

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

    // Record game start in history
    console.log('[AvalonGame] >>>>>> historyService exists?', !!this.historyService);
    console.log('[AvalonGame] >>>>>> Calling historyService.onGameStart');
    this.historyService?.onGameStart(this.match.matchId, {
      gameId: this.match.matchId,
      roomId: this.roomId,
      createdAt: this.match.createdAt,
      startedAt: this.gameStartedAt,
      players: this.match.players.map(p => ({ userId: p.userId, username: p.username })),
      roleAssignments: this.state.roleAssignments,
      config: this.config
    }).catch(err => console.error('[AvalonHistory] Failed to record game start:', err));

    // Automatically move to nomination after players have seen their roles
    // Changed from 3 seconds to 8 seconds to allow for 5-second countdown + role reveal
    setTimeout(() => this.startNomination(true), 8000); // Start first quest (round 1)

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

  /**
   * Start nomination phase
   * @param incrementRound - Whether to increment the round (new quest) or stay on same quest (team vote failed)
   */
  private startNomination(incrementRound: boolean = true): PluginGameEvent[] {
    this.state.phase = AvalonPhase.NOMINATION;

    // Only increment round when starting a new quest, not when team vote fails
    if (incrementRound) {
      this.state.round++;
    }

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

    // Record round start in history (only when starting a new quest)
    if (incrementRound) {
      this.historyService?.onRoundStart(this.match.matchId, {
        round: this.state.round,
        leaderUserId: this.state.leader,
        leaderIndex: this.state.leaderIndex
      }).catch(err => console.error('[AvalonHistory] Failed to record round start:', err));
    }

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

    // Record team proposal in history
    this.historyService?.onTeamProposal(this.match.matchId, {
      round: this.state.round,
      proposalIndex: this.state.currentQuestTeamVotes.length,
      leaderSeat: this.state.leaderIndex,
      teamUserIds,
      players: this.match.players
    }).catch(err => console.error('[AvalonHistory] Failed to record team proposal:', err));

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

      // Record team vote history
      const approvals: string[] = [];
      const rejections: string[] = [];
      for (const [userId, vote] of Object.entries(this.state.teamVotes)) {
        if (vote) {
          approvals.push(userId);
        } else {
          rejections.push(userId);
        }
      }

      this.state.currentQuestTeamVotes.push({
        nominatedTeam: [...this.state.nominatedTeam],
        approvals,
        rejections,
        passed: majority,
      });

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

      // Record team vote in history
      this.historyService?.onTeamVote(this.match.matchId, {
        round: this.state.round,
        proposalIndex: this.state.currentQuestTeamVotes.length - 1, // We just pushed to the array
        teamVotes: this.state.teamVotes,
        players: this.match.players,
        passed: majority
      }).catch(err => console.error('[AvalonHistory] Failed to record team vote:', err));

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
        // Team rejected, next leader (stay on same quest round)
        this.advanceLeader();
        this.syncStateToMatch();
        return events.concat(this.startNomination(false)); // Don't increment round
      }
    }

    this.events.push(...events);
    this.syncStateToMatch();
    return events;
  }

  public async handleVoteQuest(userId: string, success: boolean): Promise<PluginGameEvent[]> {
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
        teamVoteHistory: [...this.state.currentQuestTeamVotes],
      };

      this.state.questResults.push(result);

      // Clear team vote history for next quest
      this.state.currentQuestTeamVotes = [];

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

      // Record quest resolution in history
      this.historyService?.onQuestResolved(this.match.matchId, {
        round: this.state.round,
        teamUserIds: this.state.nominatedTeam,
        players: this.match.players,
        successVotes,
        failVotes,
        questSuccess
      }).catch(err => console.error('[AvalonHistory] Failed to record quest resolution:', err));

      // Check win conditions
      if (this.state.goodWins >= 3) {
        // Good needs to survive assassination
        this.syncStateToMatch();
        return events.concat(this.startAssassination());
      } else if (this.state.evilWins >= 3) {
        // Evil wins
        this.syncStateToMatch();
        return events.concat(await this.endGame(AvalonTeam.EVIL, 'Three quests failed'));
      } else {
        // Continue to next quest
        this.advanceLeader();
        this.syncStateToMatch();
        setTimeout(() => this.startNomination(true), 2000); // Start next quest
      }
    }

    this.events.push(...events);
    this.syncStateToMatch();
    return events;
  }

  public async handleAssassinate(userId: string, targetUserId: string): Promise<PluginGameEvent[]> {
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

    // Record assassination in history
    this.historyService?.onAssassination(this.match.matchId, {
      assassinUserId: userId,
      targetUserId,
      targetRole,
      success: hitMerlin,
      players: this.match.players
    }).catch(err => console.error('[AvalonHistory] Failed to record assassination:', err));

    if (hitMerlin) {
      return events.concat(await this.endGame(AvalonTeam.EVIL, 'Merlin assassinated'));
    } else {
      return events.concat(await this.endGame(AvalonTeam.GOOD, 'Merlin survived'));
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

  private async endGame(winner: AvalonTeam, reason: string): Promise<PluginGameEvent[]> {
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

    // Record game end in history - WAIT for it to complete
    try {
      await this.historyService?.onGameEnd({
        gameId: this.match.matchId,
        matchId: this.match.matchId,
        roomId: this.roomId,
        createdAt: this.match.createdAt,
        startedAt: this.gameStartedAt || this.match.createdAt,
        endedAt: this.match.endedAt,
        players: this.match.players.map(p => ({ userId: p.userId, username: p.username })),
        roleAssignments: this.state.roleAssignments,
        winner,
        reason,
        goodScore: this.state.goodWins,
        evilScore: this.state.evilWins,
        config: this.config
      });
      console.log('[AvalonHistory] Game end recorded successfully');
    } catch (err) {
      console.error('[AvalonHistory] Failed to record game end:', err);
    }

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

    // ========================================================================
    // Vision Rules Implementation (按图示标准)
    // ========================================================================

    // Merlin: Sees all evil players EXCEPT Mordred
    if (role === AvalonRole.MERLIN) {
      privateState.evilPlayers = Object.entries(this.state.roleAssignments)
        .filter(([_, r]) => {
          // See all evil except Mordred
          return this.getRoleTeam(r) === AvalonTeam.EVIL && r !== AvalonRole.MORDRED;
        })
        .map(([uid, _]) => uid);
    }

    // Percival: Sees Merlin and Morgana (cannot distinguish)
    if (role === AvalonRole.PERCIVAL) {
      privateState.merlinCandidates = Object.entries(this.state.roleAssignments)
        .filter(([_, r]) => r === AvalonRole.MERLIN || r === AvalonRole.MORGANA)
        .map(([uid, _]) => uid);
    }

    // Evil team (except Oberon): Can see each other, but NOT Oberon
    // Includes: Assassin, Morgana, Mordred, Minion (但看不到Oberon)
    if (team === AvalonTeam.EVIL && role !== AvalonRole.OBERON) {
      privateState.knownEvil = Object.entries(this.state.roleAssignments)
        .filter(([uid, r]) => {
          // Don't include self
          if (uid === userId) return false;
          // See all evil teammates except Oberon
          return this.getRoleTeam(r) === AvalonTeam.EVIL && r !== AvalonRole.OBERON;
        })
        .map(([uid, _]) => uid);
    }

    // Oberon: Sees no one (knows team but not teammates)
    // Oberon gets no special vision - knownEvil remains undefined

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
    if (
      role === AvalonRole.ASSASSIN ||
      role === AvalonRole.MORGANA ||
      role === AvalonRole.MORDRED ||
      role === AvalonRole.OBERON ||
      role === AvalonRole.MINION
    ) {
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
