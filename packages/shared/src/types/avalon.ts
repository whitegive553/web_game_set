/**
 * Avalon Game Types
 */

// ============================================================================
// Roles and Teams
// ============================================================================

export enum AvalonTeam {
  GOOD = 'good',
  EVIL = 'evil',
}

export enum AvalonRole {
  MERLIN = 'merlin',       // Good: Knows all evil players except Mordred
  PERCIVAL = 'percival',   // Good: Sees Merlin/Morgana candidates
  LOYAL_SERVANT = 'loyal_servant', // Good: No special ability
  ASSASSIN = 'assassin',   // Evil: Can assassinate Merlin
  MORGANA = 'morgana',     // Evil: Appears as Merlin to Percival
  MORDRED = 'mordred',     // Evil: Hidden from Merlin, visible to evil
  OBERON = 'oberon',       // Evil: Hidden from evil, doesn't see evil
  MINION = 'minion',       // Evil: No special ability
}

export interface RoleInfo {
  role: AvalonRole;
  team: AvalonTeam;
  seesEvilPlayers?: boolean;    // Merlin (except Mordred)
  seesMerlinCandidates?: boolean; // Percival
  canAssassinate?: boolean;     // Assassin
  appearsAsMerlin?: boolean;    // Morgana
  hiddenFromMerlin?: boolean;   // Mordred
  hiddenFromEvil?: boolean;     // Oberon
  cannotSeeEvil?: boolean;      // Oberon
}

// ============================================================================
// Game Phases
// ============================================================================

export enum AvalonPhase {
  LOBBY = 'LOBBY',
  ROLE_REVEAL = 'ROLE_REVEAL',
  NOMINATION = 'NOMINATION',
  TEAM_VOTE = 'TEAM_VOTE',
  QUEST_VOTE = 'QUEST_VOTE',
  QUEST_RESULT = 'QUEST_RESULT',
  ASSASSINATION = 'ASSASSINATION',
  GAME_OVER = 'GAME_OVER',
}

// ============================================================================
// Quest Configuration
// ============================================================================

export interface QuestConfig {
  questNumber: number;        // 1-5
  teamSize: number;           // How many players on the quest
  failsRequired: number;      // How many fails to fail the quest (usually 1, except quest 4 with 7+ players)
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

// Room configuration for Avalon games (customizable by host in lobby)
export interface AvalonRoomConfig {
  targetPlayerCount: number;    // Target number of players (6-10)
  roleConfig: RoleConfiguration; // Which roles are enabled
}

// Role configuration defining which roles and how many
export interface RoleConfiguration {
  // Good roles
  merlin: number;           // 0 or 1
  percival: number;         // 0 or 1
  loyalServant: number;     // Variable to fill good side

  // Evil roles
  assassin: number;         // 0 or 1
  morgana: number;          // 0 or 1
  mordred: number;          // 0 or 1
  oberon: number;           // 0 or 1
  minion: number;           // Variable to fill evil side
}

// Validation result for role configurations
export interface RoleConfigValidation {
  valid: boolean;
  errors: string[];
  totalRoles?: number;
  goodCount?: number;
  evilCount?: number;
}

// ============================================================================
// Game State
// ============================================================================

export interface AvalonGameState {
  phase: AvalonPhase;
  round: number;              // Current quest round (1-5)
  leader: string;             // Current leader userId
  leaderIndex: number;        // Index in players array

  // Quest results
  questResults: QuestResult[];
  goodWins: number;
  evilWins: number;

  // Current nomination/vote
  nominatedTeam: string[];    // userIds
  teamVotes: Record<string, boolean>; // userId -> approve/reject
  questVotes: Record<string, boolean>; // userId -> success/fail (only team members)

  // Team vote history for current quest (accumulated until quest completes)
  currentQuestTeamVotes: TeamVoteHistory[];

  // Assassination
  assassinTarget?: string;    // userId

  // Winner
  winner?: AvalonTeam;

  // Role assignments (private, not in public state)
  roleAssignments: Record<string, AvalonRole>;
}

export interface TeamVoteHistory {
  nominatedTeam: string[];    // userIds who were nominated
  approvals: string[];        // userIds who approved
  rejections: string[];       // userIds who rejected
  passed: boolean;            // Whether team was approved
}

export interface QuestResult {
  questNumber: number;
  team: string[];             // userIds who went on quest
  successVotes: number;
  failVotes: number;
  success: boolean;

  // Vote history for this quest (may have multiple team votes before approval)
  teamVoteHistory: TeamVoteHistory[];
}

// ============================================================================
// Actions
// ============================================================================

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

// ============================================================================
// Private State Views
// ============================================================================

export interface AvalonPrivateState {
  userId: string;
  role: AvalonRole;
  team: AvalonTeam;

  // Role-specific vision information
  evilPlayers?: string[];     // For Merlin (all evil except Mordred)
  merlinCandidates?: string[]; // For Percival (Merlin + Morgana)
  knownEvil?: string[];       // For evil players (all evil except Oberon)

  // Voting status
  hasVotedQuest?: boolean;    // Whether player has voted in current quest
}

// ============================================================================
// Public State View
// ============================================================================

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
