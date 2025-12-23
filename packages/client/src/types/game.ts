/**
 * Frontend-specific game types
 * These may differ slightly from backend types for UI purposes
 */

// ============================================================================
// Game State
// ============================================================================

export interface VisibleStats {
  health: number;        // 0-100
  stamina: number;       // 0-100
  sanity: number;        // 0-100 (shown as "精神")
  supplies: number;      // Resource count
}

export interface GameState {
  sessionId: string | null;
  phase: GamePhase;
  currentNarrative: Narrative | null;
  choices: Choice[];
  stats: VisibleStats;
  location: string;
  turnCount: number;
  eventLog: EventLogEntry[];
  inventory: InventoryItem[];
  anomalyHint?: string;  // Subtle hint about hidden stats
}

export enum GamePhase {
  TITLE = 'TITLE',
  PLAYING = 'PLAYING',
  CHOICE = 'CHOICE',
  OUTCOME = 'OUTCOME',
  DEATH = 'DEATH',
  EVACUATION = 'EVACUATION'
}

// ============================================================================
// Narrative & Events
// ============================================================================

export interface Narrative {
  id: string;
  speaker?: string;      // "记录", "电台", "陌生人", etc.
  text: string;
  location: string;
  backgroundImage?: string;
  timestamp: number;
}

export interface Choice {
  id: string;
  text: string;
  disabled?: boolean;
  warning?: string;      // Optional warning text
  hidden?: boolean;
}

export interface EventLogEntry {
  id: string;
  turn: number;
  location: string;
  summary: string;
  timestamp: number;
}

// ============================================================================
// Inventory & Items
// ============================================================================

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: 'NORMAL' | 'ANOMALOUS';
  icon?: string;
  isAnomalous: boolean;
  persistsAcrossDeaths: boolean;
}

// ============================================================================
// UI State
// ============================================================================

export interface UIState {
  isInventoryOpen: boolean;
  isLogOpen: boolean;
  isSettingsOpen: boolean;
  isLoading: boolean;
  error: string | null;
  typingSpeed: number;   // For typewriter effect
  enableTypewriter: boolean;
}

// ============================================================================
// Connection Status
// ============================================================================

export interface ConnectionStatus {
  server: 'connected' | 'disconnected' | 'connecting';
  llm: 'available' | 'unavailable' | 'unknown';
}
