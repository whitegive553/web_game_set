/**
 * Avalon Game Types
 */
export declare enum AvalonTeam {
    GOOD = "good",
    EVIL = "evil"
}
export declare enum AvalonRole {
    MERLIN = "merlin",// Good: Knows all evil players except Mordred
    PERCIVAL = "percival",// Good: Sees Merlin/Morgana candidates
    LOYAL_SERVANT = "loyal_servant",// Good: No special ability
    ASSASSIN = "assassin",// Evil: Can assassinate Merlin
    MORGANA = "morgana",// Evil: Appears as Merlin to Percival
    MORDRED = "mordred",// Evil: Hidden from Merlin, visible to evil
    OBERON = "oberon",// Evil: Hidden from evil, doesn't see evil
    MINION = "minion"
}
export interface RoleInfo {
    role: AvalonRole;
    team: AvalonTeam;
    seesEvilPlayers?: boolean;
    seesMerlinCandidates?: boolean;
    canAssassinate?: boolean;
    appearsAsMerlin?: boolean;
    hiddenFromMerlin?: boolean;
    hiddenFromEvil?: boolean;
    cannotSeeEvil?: boolean;
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
export interface AvalonRoomConfig {
    targetPlayerCount: number;
    roleConfig: RoleConfiguration;
}
export interface RoleConfiguration {
    merlin: number;
    percival: number;
    loyalServant: number;
    assassin: number;
    morgana: number;
    mordred: number;
    oberon: number;
    minion: number;
}
export interface RoleConfigValidation {
    valid: boolean;
    errors: string[];
    totalRoles?: number;
    goodCount?: number;
    evilCount?: number;
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
    currentQuestTeamVotes: TeamVoteHistory[];
    assassinTarget?: string;
    winner?: AvalonTeam;
    roleAssignments: Record<string, AvalonRole>;
}
export interface TeamVoteHistory {
    nominatedTeam: string[];
    approvals: string[];
    rejections: string[];
    passed: boolean;
}
export interface QuestResult {
    questNumber: number;
    team: string[];
    successVotes: number;
    failVotes: number;
    success: boolean;
    teamVoteHistory: TeamVoteHistory[];
}
export interface AvalonAction {
    type: 'READY' | 'START' | 'NOMINATE_TEAM' | 'VOTE_TEAM' | 'VOTE_QUEST' | 'ASSASSINATE' | 'UPDATE_CONFIG';
    payload?: any;
}
export interface UpdateConfigPayload {
    targetPlayerCount?: number;
    roleConfig?: RoleConfiguration;
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
    knownEvil?: string[];
    hasVotedQuest?: boolean;
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