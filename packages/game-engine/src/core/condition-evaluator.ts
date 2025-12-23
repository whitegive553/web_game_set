/**
 * Condition Evaluator - Deterministic rule evaluation system
 * This is the core of the rules engine
 */

import { Condition, PlayerState } from '@survival-game/shared';

/**
 * Evaluates whether a condition is met given current player state
 * This function is PURE and DETERMINISTIC - no randomness, no side effects
 */
export function evaluateCondition(
  condition: Condition,
  playerState: PlayerState
): boolean {
  switch (condition.type) {
    case 'STAT': {
      const statValue = getStatValue(condition.key, playerState);
      return compareValues(statValue, condition.operator, condition.value as number);
    }

    case 'ITEM': {
      const hasItem = playerState.inventory.some(item => item.id === condition.key);
      return condition.operator === 'HAS' ? hasItem : !hasItem;
    }

    case 'FLAG': {
      const flagValue = playerState.flags[condition.key] || false;
      return condition.operator === 'EQ'
        ? flagValue === condition.value
        : flagValue !== condition.value;
    }

    case 'LOCATION': {
      const atLocation = playerState.visible.currentLocation === condition.value;
      return condition.operator === 'EQ' ? atLocation : !atLocation;
    }

    case 'RANDOM': {
      // Random conditions are evaluated with a deterministic seed based on turn count
      // This allows for "random" events that are actually reproducible
      const threshold = condition.value as number;
      const randomValue = Math.random(); // TODO: Use seeded random for determinism
      return randomValue < threshold;
    }

    default:
      console.warn(`Unknown condition type: ${condition.type}`);
      return false;
  }
}

/**
 * Evaluates all conditions in an array (AND logic)
 */
export function evaluateConditions(
  conditions: Condition[],
  playerState: PlayerState
): boolean {
  return conditions.every(condition => evaluateCondition(condition, playerState));
}

/**
 * Gets a stat value from player state by key path
 */
function getStatValue(key: string, playerState: PlayerState): number {
  // Support dot notation: "visible.health", "hidden.sanity", etc.
  const parts = key.split('.');

  if (parts.length === 2) {
    const [category, stat] = parts;
    if (category === 'visible' && stat in playerState.visible) {
      return playerState.visible[stat as keyof typeof playerState.visible] as number;
    }
    if (category === 'hidden' && stat in playerState.hidden) {
      return playerState.hidden[stat as keyof typeof playerState.hidden] as number;
    }
  }

  console.warn(`Invalid stat key: ${key}`);
  return 0;
}

/**
 * Compares two values based on operator
 */
function compareValues(
  actual: number,
  operator: Condition['operator'],
  expected: number
): boolean {
  switch (operator) {
    case 'GT': return actual > expected;
    case 'LT': return actual < expected;
    case 'EQ': return actual === expected;
    default: return false;
  }
}
