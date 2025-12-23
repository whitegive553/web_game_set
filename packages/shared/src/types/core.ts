/**
 * Core type definitions for the survival narrative game
 * These types define the fundamental abstractions of the game system
 */

// ============================================================================
// Game Phase - Represents the current stage of the game loop
// ============================================================================

export enum GamePhase {
  INITIALIZATION = 'INITIALIZATION',
  EXPLORATION = 'EXPLORATION',      // Player is navigating
  EVENT = 'EVENT',                   // An event is being presented
  CHOICE = 'CHOICE',                 // Player is making a choice
  OUTCOME = 'OUTCOME',               // Showing the result of a choice
  DEATH = 'DEATH',                   // Player has died
  EVACUATION = 'EVACUATION',         // Player evacuated successfully
  ENDED = 'ENDED'                    // Game session ended
}

// ============================================================================
// Player State - All player-related data
// ============================================================================

/**
 * Visible stats that player can see and monitor
 */
export interface VisibleStats {
  health: number;           // 0-100
  stamina: number;          // 0-100
  supplies: number;         // Consumable resources
  currentLocation: string;  // Current zone ID
}

/**
 * Hidden stats that influence game but are not directly shown
 * Player can only infer these through narrative cues
 */
export interface HiddenStats {
  sanity: number;                    // 0-100, affects perception reliability
  anomalyAffinity: number;           // 0-100, how "connected" to anomalies
  observationLevel: number;          // 0-100, how much "attention" from entities
  realityStability: number;          // 0-100, local reality coherence
}

/**
 * Inventory item
 */
export interface Item {
  id: string;
  name: string;
  description: string;
  type: 'TOOL' | 'CONSUMABLE' | 'DOCUMENT' | 'ANOMALOUS';
  isAnomalous: boolean;              // Anomalous items may persist across deaths
  effects?: Record<string, number>;  // Stat modifications
}

/**
 * Cross-life persistent data
 * These survive death and provide long-term progression
 */
export interface PersistentData {
  exploredLocations: Set<string>;     // Locations discovered
  knownAnomalies: Set<string>;        // Anomalies encountered
  anomalousArtifacts: Item[];         // Rare items that persist
  deathCount: number;
  successfulEvacuations: number;
  totalPlaytime: number;              // in seconds
}

/**
 * Complete player state
 */
export interface PlayerState {
  visible: VisibleStats;
  hidden: HiddenStats;
  inventory: Item[];
  persistent: PersistentData;
  flags: Record<string, any>;         // Quest/event flags and metadata
}

// ============================================================================
// Event System - Core gameplay building blocks
// ============================================================================

/**
 * Condition that must be met for something to trigger
 */
export interface Condition {
  type: 'STAT' | 'ITEM' | 'FLAG' | 'LOCATION' | 'RANDOM';
  key: string;
  operator: 'GT' | 'LT' | 'EQ' | 'HAS' | 'NOT_HAS';
  value: number | string | boolean;
}

/**
 * State modification to apply
 */
export interface StateChange {
  target: 'visible' | 'hidden' | 'inventory' | 'flags';
  key: string;
  operation: 'SET' | 'ADD' | 'SUBTRACT' | 'TOGGLE';
  value: number | string | boolean | Item;
}

/**
 * Weighted outcome possibility
 */
export interface OutcomeProbability {
  weight: number;           // Relative probability
  outcome: Outcome;
}

/**
 * Result of a choice
 */
export interface Outcome {
  id: string;
  stateChanges: StateChange[];
  nextEventId?: string;              // Next event to trigger (if any)
  narrativeTemplate: string;         // Template for LLM or direct text
  requiresLLM: boolean;              // Whether this needs LLM generation
  endsGame?: boolean;                // Does this end the current life?
  deathType?: 'INSTANT' | 'GRADUAL' | 'ANOMALOUS';
}

/**
 * A choice the player can make
 */
export interface Choice {
  id: string;
  text: string;                      // Display text for the choice
  requirements: Condition[];         // What's needed to show this choice
  outcomes: OutcomeProbability[];    // Possible results (weighted)
  isTextInput?: boolean;             // Rare: allows natural language input
  hidden?: boolean;                  // Hidden until requirements met
}

/**
 * A game event
 */
export interface GameEvent {
  id: string;
  type: 'EXPLORATION' | 'ENCOUNTER' | 'DISCOVERY' | 'ANOMALOUS' | 'ENVIRONMENTAL';
  location: string;
  triggerConditions: Condition[];
  descriptionTemplate: string;       // Template for event description
  requiresLLM: boolean;              // Whether description needs LLM
  choices: Choice[];
  priority: number;                  // For event selection (higher = more important)
  oneTime: boolean;                  // Can only happen once per game
}

// ============================================================================
// Game State - Complete game session state
// ============================================================================

export interface GameState {
  phase: GamePhase;
  player: PlayerState;
  currentEvent: GameEvent | null;
  selectedChoice: Choice | null;
  eventHistory: string[];            // IDs of past events
  turnCount: number;
  gameStartTime: number;             // Timestamp
  triggeredEventIds: Set<string>;    // One-time events that have occurred
}

// ============================================================================
// LLM Service Interface - Abstraction for AI text generation
// ============================================================================

/**
 * Context provided to LLM for generation
 */
export interface LLMContext {
  playerState: PlayerState;
  currentLocation: string;
  recentEvents: string[];
  template: string;
  additionalContext?: Record<string, any>;
}

/**
 * LLM generation request
 */
export interface LLMRequest {
  type: 'EVENT_DESCRIPTION' | 'OUTCOME_NARRATIVE' | 'DEATH_REVIEW' | 'ANOMALY_MANIFESTATION';
  context: LLMContext;
  maxTokens?: number;
}

/**
 * LLM generation response
 */
export interface LLMResponse {
  text: string;
  error?: string;
}

/**
 * Abstract interface for LLM service
 * Implementations can use different providers (OpenAI, Anthropic, local models)
 */
export interface ILLMService {
  generateText(request: LLMRequest): Promise<LLMResponse>;
  isAvailable(): boolean;
}

// ============================================================================
// Game Configuration - For different zones and game modes
// ============================================================================

export interface GameConfig {
  startingLocation: string;
  startingStats: {
    visible: VisibleStats;
    hidden: HiddenStats;
  };
  difficultyMultiplier: number;
  enabledZones: string[];
}
