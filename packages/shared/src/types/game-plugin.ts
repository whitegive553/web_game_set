/**
 * Game Plugin System
 * Unified interface for all games (text-adventure, avalon, etc.)
 */

// ============================================================================
// Base Game Plugin Interface
// ============================================================================

export interface GamePlugin {
  gameId: string;
  displayName: string;
  minPlayers: number;
  maxPlayers: number;

  // Lifecycle
  createMatch(roomId: string, options: any): GameMatch;
  validateAction(match: GameMatch, userId: string, action: PluginGameAction): ValidationResult;
}

// ============================================================================
// Game Match (Single instance of a game)
// ============================================================================

export interface GameMatch {
  matchId: string;
  roomId: string;
  gameId: string;
  state: PluginGameState;
  players: PluginGamePlayer[];
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
}

export interface PluginGamePlayer {
  userId: string;
  username: string;
  ready: boolean;
  connected: boolean;
}

export interface PluginGameState {
  phase: string;
  [key: string]: any;
}

// ============================================================================
// Actions and Events
// ============================================================================

export interface PluginGameAction {
  type: string;
  payload?: any;
}

export interface PluginGameEvent {
  eventId: string;
  matchId: string;
  gameId: string;
  timestamp: number;
  type: string;
  userId?: string;
  payload: any;
  visibleTo?: 'all' | 'player' | string[]; // Who can see this event
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// State Views (Information Visibility)
// ============================================================================

export interface PublicStateView {
  matchId: string;
  gameId: string;
  phase: string;
  players: Array<{
    userId: string;
    username: string;
    ready: boolean;
    connected: boolean;
  }>;
  [key: string]: any;
}

export interface PrivateStateView {
  userId: string;
  [key: string]: any;
}

// ============================================================================
// Game History
// ============================================================================

export interface GameHistoryRecord {
  gameId: string;
  matchId: string;
  roomId: string;
  players: Array<{
    userId: string;
    username: string;
  }>;
  startedAt: number;
  endedAt: number;
  winner?: string; // Team or player ID
  events: PluginGameEvent[];
}
