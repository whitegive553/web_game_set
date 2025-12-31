"use strict";
/**
 * Game constants and default values
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLM_CONFIG = exports.DEFAULT_GAME_CONFIG = exports.EVENT_TYPE_WEIGHTS = exports.LOCATIONS = exports.CRITICAL_THRESHOLDS = exports.STAT_LIMITS = exports.DEFAULT_HIDDEN_STATS = exports.DEFAULT_VISIBLE_STATS = void 0;
// ============================================================================
// Default Starting Values
// ============================================================================
exports.DEFAULT_VISIBLE_STATS = {
    health: 100,
    stamina: 100,
    supplies: 50,
    currentLocation: 'ZONE_ENTRANCE'
};
exports.DEFAULT_HIDDEN_STATS = {
    sanity: 100,
    anomalyAffinity: 0,
    observationLevel: 0,
    realityStability: 100
};
// ============================================================================
// Game Balance Constants
// ============================================================================
exports.STAT_LIMITS = {
    MIN: 0,
    MAX: 100
};
exports.CRITICAL_THRESHOLDS = {
    HEALTH_CRITICAL: 20,
    SANITY_CRITICAL: 30,
    STAMINA_EXHAUSTED: 10,
    REALITY_UNSTABLE: 40
};
// ============================================================================
// Location IDs (Placeholder for future expansion)
// ============================================================================
exports.LOCATIONS = {
    ZONE_ENTRANCE: 'ZONE_ENTRANCE',
    ZONE_CORRIDOR: 'ZONE_CORRIDOR',
    ZONE_CHAMBER: 'ZONE_CHAMBER'
};
// ============================================================================
// Event Type Weights (for random selection)
// ============================================================================
exports.EVENT_TYPE_WEIGHTS = {
    EXPLORATION: 40,
    ENCOUNTER: 25,
    DISCOVERY: 20,
    ANOMALOUS: 10,
    ENVIRONMENTAL: 5
};
// ============================================================================
// Default Game Configuration
// ============================================================================
exports.DEFAULT_GAME_CONFIG = {
    startingLocation: exports.LOCATIONS.ZONE_ENTRANCE,
    startingStats: {
        visible: exports.DEFAULT_VISIBLE_STATS,
        hidden: exports.DEFAULT_HIDDEN_STATS
    },
    difficultyMultiplier: 1.0,
    enabledZones: [exports.LOCATIONS.ZONE_ENTRANCE]
};
// ============================================================================
// LLM Configuration
// ============================================================================
exports.LLM_CONFIG = {
    MAX_TOKENS: {
        EVENT_DESCRIPTION: 300,
        OUTCOME_NARRATIVE: 200,
        DEATH_REVIEW: 400,
        ANOMALY_MANIFESTATION: 250
    },
    TEMPERATURE: 0.7,
    TIMEOUT_MS: 10000
};
//# sourceMappingURL=constants.js.map