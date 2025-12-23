"use strict";
/**
 * Avalon Game Logic
 * Server-authoritative game state management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvalonGame = void 0;
const avalon_1 = require("../../packages/shared/src/types/avalon");
const config_json_1 = __importDefault(require("./config.json"));
class AvalonGame {
    constructor(match) {
        this.events = [];
        this.match = match;
        const playerCount = match.players.length;
        const configKey = playerCount.toString();
        if (!config_json_1.default.playerConfigs[configKey]) {
            throw new Error(`Invalid player count: ${playerCount}`);
        }
        this.config = config_json_1.default.playerConfigs[configKey];
        this.state = this.initializeState();
    }
    // ============================================================================
    // Initialization
    // ============================================================================
    initializeState() {
        return {
            phase: avalon_1.AvalonPhase.LOBBY,
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
    // ============================================================================
    // Game Flow
    // ============================================================================
    startGame() {
        if (this.state.phase !== avalon_1.AvalonPhase.LOBBY) {
            throw new Error('Game already started');
        }
        // Assign roles
        this.assignRoles();
        // Move to role reveal phase
        this.state.phase = avalon_1.AvalonPhase.ROLE_REVEAL;
        const event = {
            eventId: `event_${Date.now()}`,
            matchId: this.match.matchId,
            gameId: 'avalon',
            timestamp: Date.now(),
            type: 'GAME_STARTED',
            payload: { phase: avalon_1.AvalonPhase.ROLE_REVEAL },
            visibleTo: 'all',
        };
        this.events.push(event);
        // Automatically move to nomination after players have seen their roles
        // Changed from 3 seconds to 8 seconds to allow for 5-second countdown + role reveal
        setTimeout(() => this.startNomination(), 8000);
        return [event];
    }
    assignRoles() {
        const players = [...this.match.players];
        const shuffled = this.shuffleArray(players);
        const goodRoles = this.config.roles.good;
        const evilRoles = this.config.roles.evil;
        const allRoles = [...goodRoles, ...evilRoles];
        shuffled.forEach((player, index) => {
            this.state.roleAssignments[player.userId] = allRoles[index];
        });
    }
    startNomination() {
        this.state.phase = avalon_1.AvalonPhase.NOMINATION;
        this.state.round++;
        this.state.nominatedTeam = [];
        const event = {
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
        return [event];
    }
    // ============================================================================
    // Actions
    // ============================================================================
    handleNominateTeam(userId, teamUserIds) {
        // Validate
        if (this.state.phase !== avalon_1.AvalonPhase.NOMINATION) {
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
        this.state.phase = avalon_1.AvalonPhase.TEAM_VOTE;
        this.state.teamVotes = {};
        const event = {
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
        return [event];
    }
    handleVoteTeam(userId, approve) {
        if (this.state.phase !== avalon_1.AvalonPhase.TEAM_VOTE) {
            throw new Error('Not in team vote phase');
        }
        if (this.state.teamVotes[userId] !== undefined) {
            throw new Error('Already voted');
        }
        this.state.teamVotes[userId] = approve;
        const events = [{
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
                this.state.phase = avalon_1.AvalonPhase.QUEST_VOTE;
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
            }
            else {
                // Team rejected, next leader
                this.advanceLeader();
                return events.concat(this.startNomination());
            }
        }
        this.events.push(...events);
        return events;
    }
    handleVoteQuest(userId, success) {
        if (this.state.phase !== avalon_1.AvalonPhase.QUEST_VOTE) {
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
        if (team === avalon_1.AvalonTeam.GOOD && !success) {
            throw new Error('Good players must vote success');
        }
        this.state.questVotes[userId] = success;
        const events = [{
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
            const result = {
                questNumber: this.state.round,
                team: this.state.nominatedTeam,
                successVotes,
                failVotes,
                success: questSuccess,
            };
            this.state.questResults.push(result);
            if (questSuccess) {
                this.state.goodWins++;
            }
            else {
                this.state.evilWins++;
            }
            this.state.phase = avalon_1.AvalonPhase.QUEST_RESULT;
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
                return events.concat(this.startAssassination());
            }
            else if (this.state.evilWins >= 3) {
                // Evil wins
                return events.concat(this.endGame(avalon_1.AvalonTeam.EVIL, 'Three quests failed'));
            }
            else {
                // Continue to next round
                this.advanceLeader();
                setTimeout(() => this.startNomination(), 2000);
            }
        }
        this.events.push(...events);
        return events;
    }
    handleAssassinate(userId, targetUserId) {
        if (this.state.phase !== avalon_1.AvalonPhase.ASSASSINATION) {
            throw new Error('Not in assassination phase');
        }
        const role = this.state.roleAssignments[userId];
        if (role !== avalon_1.AvalonRole.ASSASSIN) {
            throw new Error('Only assassin can assassinate');
        }
        const targetRole = this.state.roleAssignments[targetUserId];
        const hitMerlin = targetRole === avalon_1.AvalonRole.MERLIN;
        this.state.assassinTarget = targetUserId;
        const events = [{
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
            return events.concat(this.endGame(avalon_1.AvalonTeam.EVIL, 'Merlin assassinated'));
        }
        else {
            return events.concat(this.endGame(avalon_1.AvalonTeam.GOOD, 'Merlin survived'));
        }
    }
    startAssassination() {
        this.state.phase = avalon_1.AvalonPhase.ASSASSINATION;
        const event = {
            eventId: `event_${Date.now()}`,
            matchId: this.match.matchId,
            gameId: 'avalon',
            timestamp: Date.now(),
            type: 'ASSASSINATION_STARTED',
            payload: {},
            visibleTo: 'all',
        };
        this.events.push(event);
        return [event];
    }
    endGame(winner, reason) {
        this.state.phase = avalon_1.AvalonPhase.GAME_OVER;
        this.state.winner = winner;
        const event = {
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
        return [event];
    }
    // ============================================================================
    // State Views
    // ============================================================================
    getPublicState() {
        const questVoteCount = this.state.phase === avalon_1.AvalonPhase.QUEST_VOTE || this.state.phase === avalon_1.AvalonPhase.QUEST_RESULT
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
    getPrivateState(userId) {
        const role = this.state.roleAssignments[userId];
        const team = this.getRoleTeam(role);
        const privateState = {
            userId,
            role,
            team,
        };
        // Merlin sees all evil players
        if (role === avalon_1.AvalonRole.MERLIN) {
            privateState.evilPlayers = Object.entries(this.state.roleAssignments)
                .filter(([_, r]) => this.getRoleTeam(r) === avalon_1.AvalonTeam.EVIL)
                .map(([uid, _]) => uid);
        }
        // Percival sees Merlin and Morgana (cannot distinguish)
        if (role === avalon_1.AvalonRole.PERCIVAL) {
            privateState.merlinCandidates = Object.entries(this.state.roleAssignments)
                .filter(([_, r]) => r === avalon_1.AvalonRole.MERLIN || r === avalon_1.AvalonRole.MORGANA)
                .map(([uid, _]) => uid);
        }
        return privateState;
    }
    getEvents() {
        return this.events;
    }
    // ============================================================================
    // Helpers
    // ============================================================================
    getCurrentQuestConfig() {
        return this.config.quests[this.state.round - 1];
    }
    advanceLeader() {
        this.state.leaderIndex = (this.state.leaderIndex + 1) % this.match.players.length;
        this.state.leader = this.match.players[this.state.leaderIndex].userId;
    }
    getRoleTeam(role) {
        if (role === avalon_1.AvalonRole.ASSASSIN || role === avalon_1.AvalonRole.MORGANA || role === avalon_1.AvalonRole.MINION) {
            return avalon_1.AvalonTeam.EVIL;
        }
        return avalon_1.AvalonTeam.GOOD;
    }
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}
exports.AvalonGame = AvalonGame;
