/**
 * Game constants and default values
 */

import { GameConfig, VisibleStats, HiddenStats } from './types/core';

// ============================================================================
// Default Starting Values
// ============================================================================

export const DEFAULT_VISIBLE_STATS: VisibleStats = {
  health: 100,
  stamina: 100,
  supplies: 50,
  currentLocation: 'ZONE_ENTRANCE'
};

export const DEFAULT_HIDDEN_STATS: HiddenStats = {
  sanity: 100,
  anomalyAffinity: 0,
  observationLevel: 0,
  realityStability: 100
};

// ============================================================================
// Game Balance Constants
// ============================================================================

export const STAT_LIMITS = {
  MIN: 0,
  MAX: 100
} as const;

export const CRITICAL_THRESHOLDS = {
  HEALTH_CRITICAL: 20,
  SANITY_CRITICAL: 30,
  STAMINA_EXHAUSTED: 10,
  REALITY_UNSTABLE: 40
} as const;

// ============================================================================
// Location IDs (Placeholder for future expansion)
// ============================================================================

export const LOCATIONS = {
  ZONE_ENTRANCE: 'ZONE_ENTRANCE',
  ZONE_CORRIDOR: 'ZONE_CORRIDOR',
  ZONE_CHAMBER: 'ZONE_CHAMBER'
} as const;

// ============================================================================
// Event Type Weights (for random selection)
// ============================================================================

export const EVENT_TYPE_WEIGHTS = {
  EXPLORATION: 40,
  ENCOUNTER: 25,
  DISCOVERY: 20,
  ANOMALOUS: 10,
  ENVIRONMENTAL: 5
} as const;

// ============================================================================
// Default Game Configuration
// ============================================================================

export const DEFAULT_GAME_CONFIG: GameConfig = {
  startingLocation: LOCATIONS.ZONE_ENTRANCE,
  startingStats: {
    visible: DEFAULT_VISIBLE_STATS,
    hidden: DEFAULT_HIDDEN_STATS
  },
  difficultyMultiplier: 1.0,
  enabledZones: [LOCATIONS.ZONE_ENTRANCE]
};

// ============================================================================
// LLM Configuration
// ============================================================================

export const LLM_CONFIG = {
  MAX_TOKENS: {
    EVENT_DESCRIPTION: 300,
    OUTCOME_NARRATIVE: 200,
    DEATH_REVIEW: 400,
    ANOMALY_MANIFESTATION: 250
  },
  TEMPERATURE: 0.7,
  TIMEOUT_MS: 10000
} as const;
