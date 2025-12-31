/**
 * Avalon History System Types
 * 阿瓦隆历史记录系统类型定义
 */

// ============================================================================
// Game Record - 对局主信息
// ============================================================================

export interface AvalonGameRecord {
  gameId: string;
  matchId: string;
  roomId: string;
  createdAt: number;
  startedAt: number;
  endedAt: number;
  playerCount: number;
  configSnapshot: {
    roleConfig: any; // 角色配置快照
    questConfig: any; // 任务配置快照
  };
  outcome: {
    winner: 'good' | 'evil';
    reason: string; // "3 quests succeeded", "Merlin assassinated", etc.
    goodScore: number;
    evilScore: number;
  };
}

// ============================================================================
// Participants - 参与者信息
// ============================================================================

export interface AvalonParticipant {
  userId: string;
  username: string; // 快照：对局时的显示名
  seat: number; // 座位号 0-based
  role: string; // 角色
  alignment: 'good' | 'evil'; // 阵营
  isWinner: boolean; // 是否胜利
}

export interface AvalonParticipantsRecord {
  gameId: string;
  participants: AvalonParticipant[];
}

// ============================================================================
// Events - 事件日志 (NDJSON 格式)
// ============================================================================

export type AvalonHistoryEventType =
  | 'GAME_STARTED'
  | 'ROUND_STARTED'
  | 'TEAM_PROPOSED'
  | 'TEAM_VOTED'
  | 'QUEST_RESOLVED'
  | 'ASSASSINATION'
  | 'GAME_ENDED';

export interface BaseHistoryEvent {
  eventId: string;
  gameId: string;
  timestamp: number;
  type: AvalonHistoryEventType;
}

export interface GameStartedEvent extends BaseHistoryEvent {
  type: 'GAME_STARTED';
  payload: {
    playerCount: number;
    configSnapshot: any;
  };
}

export interface RoundStartedEvent extends BaseHistoryEvent {
  type: 'ROUND_STARTED';
  payload: {
    round: number;
    leaderSeat: number;
    leaderUserId: string;
  };
}

export interface TeamProposedEvent extends BaseHistoryEvent {
  type: 'TEAM_PROPOSED';
  payload: {
    round: number;
    proposalIndex: number; // 第几次提名（同一轮可能多次）
    leaderSeat: number;
    teamSeats: number[]; // 队员座位号
  };
}

export interface TeamVotedEvent extends BaseHistoryEvent {
  type: 'TEAM_VOTED';
  payload: {
    round: number;
    proposalIndex: number;
    votes: Array<{
      seat: number;
      userId: string;
      vote: 'approve' | 'reject';
    }>;
    approveCount: number;
    rejectCount: number;
    passed: boolean;
  };
}

export interface QuestResolvedEvent extends BaseHistoryEvent {
  type: 'QUEST_RESOLVED';
  payload: {
    round: number;
    teamSeats: number[];
    successCount: number;
    failCount: number;
    questSuccess: boolean;
  };
}

export interface AssassinationEvent extends BaseHistoryEvent {
  type: 'ASSASSINATION';
  payload: {
    assassinSeat: number;
    targetSeat: number;
    targetRole: string;
    success: boolean; // 是否刺中梅林
  };
}

export interface GameEndedEvent extends BaseHistoryEvent {
  type: 'GAME_ENDED';
  payload: {
    winner: 'good' | 'evil';
    reason: string;
    goodScore: number;
    evilScore: number;
  };
}

export type AvalonHistoryEvent =
  | GameStartedEvent
  | RoundStartedEvent
  | TeamProposedEvent
  | TeamVotedEvent
  | QuestResolvedEvent
  | AssassinationEvent
  | GameEndedEvent;

// ============================================================================
// User Stats - 用户统计
// ============================================================================

export interface AvalonUserStats {
  userId: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  goodGames: number;
  goodWins: number;
  evilGames: number;
  evilWins: number;
  roleCounts: Record<string, number>; // 各角色出场次数
  lastUpdated: number;
}

// ============================================================================
// User Game Index - 用户对局索引
// ============================================================================

export interface AvalonUserGameEntry {
  gameId: string;
  matchId: string;
  endedAt: number;
  playerCount: number;
  winner: 'good' | 'evil';
  isWinner: boolean;
  role: string;
  alignment: 'good' | 'evil';
}

export interface AvalonUserGamesIndex {
  userId: string;
  games: AvalonUserGameEntry[];
  lastUpdated: number;
}

// ============================================================================
// API Response Types - API 响应类型
// ============================================================================

export interface AvalonHistoryListResponse {
  success: boolean;
  data?: {
    games: AvalonUserGameEntry[];
    stats: AvalonUserStats;
  };
  error?: string;
}

export interface AvalonGameDetailResponse {
  success: boolean;
  data?: {
    game: AvalonGameRecord;
    participants: AvalonParticipant[];
    events: AvalonHistoryEvent[];
  };
  error?: string;
}
