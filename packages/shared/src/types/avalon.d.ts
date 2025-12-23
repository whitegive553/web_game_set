/**
 * Avalon Game Types
 */
export declare enum AvalonTeam {
    GOOD = "good",
    EVIL = "evil"
}
export declare enum AvalonRole {
    MERLIN = "merlin",// Good: Knows all evil players
    PERCIVAL = "percival",// Good: Sees Merlin/Morgana candidates
    LOYAL_SERVANT = "loyal_servant",// Good: No special ability
    ASSASSIN = "assassin",// Evil: Can assassinate Merlin
    MORGANA = "morgana"
}
export interface RoleInfo {
    role: AvalonRole;
    team: AvalonTeam;
    seesEvilPlayers?: boolean;
    seesMerlinCandidates?: boolean;
    canAssassinate?: boolean;
    appearsAsMerlin?: boolean;
}
export declare enum AvalonPhase {
    LOBBY = "LOBBY",
    ROLE_REVEAL = "ROLE_REVEAL",
    NOMINATION = "NOMINATION",
    TEAM_VOTE = "TEAM_VOTE",
    QUEST_VOTE = "QUEST_VOTE",
    QUEST_RESULT = "QUEST_RESULT",
    ASSASSINATION = "ASSASSINATION",
    GAME_OVER = "GAME_OVER"
}
export interface QuestConfig {
    questNumber: number;
    teamSize: number;
    failsRequired: number;
}
export interface PlayerCountConfig {
    totalPlayers: number;
    goodCount: number;
    evilCount: number;
    roles: {
        good: string[];
        evil: string[];
    };
    quests: QuestConfig[];
}
export interface AvalonGameState {
    phase: AvalonPhase;
    round: number;
    leader: string;
    leaderIndex: number;
    questResults: QuestResult[];
    goodWins: number;
    evilWins: number;
    nominatedTeam: string[];
    teamVotes: Record<string, boolean>;
    questVotes: Record<string, boolean>;
    assassinTarget?: string;
    winner?: AvalonTeam;
    roleAssignments: Record<string, AvalonRole>;
}
export interface QuestResult {
    questNumber: number;
    team: string[];
    successVotes: number;
    failVotes: number;
    success: boolean;
}
export interface AvalonAction {
    type: 'READY' | 'START' | 'NOMINATE_TEAM' | 'VOTE_TEAM' | 'VOTE_QUEST' | 'ASSASSINATE';
    payload?: any;
}
export interface NominateTeamPayload {
    teamUserIds: string[];
}
export interface VoteTeamPayload {
    approve: boolean;
}
export interface VoteQuestPayload {
    success: boolean;
}
export interface AssassinatePayload {
    targetUserId: string;
}
export interface AvalonPrivateState {
    userId: string;
    role: AvalonRole;
    team: AvalonTeam;
    evilPlayers?: string[];
    merlinCandidates?: string[];
}
export interface AvalonPublicState {
    phase: AvalonPhase;
    round: number;
    leader: string;
    questResults: QuestResult[];
    goodWins: number;
    evilWins: number;
    nominatedTeam?: string[];
    teamVotes?: Record<string, boolean>;
    questVoteCount?: {
        success: number;
        fail: number;
    };
    winner?: AvalonTeam;
    winReason?: string;
}
//# sourceMappingURL=avalon.d.ts.map