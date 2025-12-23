/**
 * Game Engine Package - Core game logic and rules
 */

// Main engine
export { GameEngine } from './game-engine';

// Core systems
export { evaluateCondition, evaluateConditions } from './core/condition-evaluator';
export { applyStateChange, applyStateChanges, isPlayerDead, getCriticalStatus } from './core/state-modifier';
export { selectNextEvent, getAvailableChoices, selectOutcome } from './core/event-selector';

// Placeholder data for testing
export { PLACEHOLDER_EVENTS } from './data/placeholder-events';
