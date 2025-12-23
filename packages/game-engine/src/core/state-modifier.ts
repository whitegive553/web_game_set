/**
 * State Modifier - Deterministic state manipulation system
 * All game state changes flow through here
 */

import { StateChange, PlayerState, Item, STAT_LIMITS } from '@survival-game/shared';

/**
 * Applies a single state change to player state
 * Returns a NEW state object (immutable pattern)
 */
export function applyStateChange(
  playerState: PlayerState,
  change: StateChange
): PlayerState {
  const newState = JSON.parse(JSON.stringify(playerState)) as PlayerState;

  switch (change.target) {
    case 'visible': {
      const key = change.key;
      if (key === 'currentLocation') {
        newState.visible.currentLocation = change.value as string;
      } else if (key === 'health' || key === 'stamina' || key === 'supplies') {
        const currentValue = newState.visible[key];
        newState.visible[key] = clampStat(
          performOperation(
            currentValue,
            change.operation,
            change.value as number
          )
        );
      }
      break;
    }

    case 'hidden': {
      const key = change.key as keyof PlayerState['hidden'];
      newState.hidden[key] = clampStat(
        performOperation(
          newState.hidden[key],
          change.operation,
          change.value as number
        )
      );
      break;
    }

    case 'inventory': {
      if (change.operation === 'ADD') {
        newState.inventory.push(change.value as Item);
      } else if (change.operation === 'SUBTRACT') {
        const itemId = change.value as string;
        newState.inventory = newState.inventory.filter(item => item.id !== itemId);
      }
      break;
    }

    case 'flags': {
      if (change.operation === 'SET') {
        newState.flags[change.key] = change.value as boolean;
      } else if (change.operation === 'TOGGLE') {
        newState.flags[change.key] = !newState.flags[change.key];
      }
      break;
    }
  }

  return newState;
}

/**
 * Applies multiple state changes in sequence
 */
export function applyStateChanges(
  playerState: PlayerState,
  changes: StateChange[]
): PlayerState {
  return changes.reduce(
    (state, change) => applyStateChange(state, change),
    playerState
  );
}

/**
 * Performs arithmetic operation based on type
 */
function performOperation(
  current: number,
  operation: StateChange['operation'],
  value: number
): number {
  switch (operation) {
    case 'SET': return value;
    case 'ADD': return current + value;
    case 'SUBTRACT': return current - value;
    default: return current;
  }
}

/**
 * Clamps a stat value to valid range
 */
function clampStat(value: number): number {
  return Math.max(STAT_LIMITS.MIN, Math.min(STAT_LIMITS.MAX, value));
}

/**
 * Checks if player is dead based on visible stats
 */
export function isPlayerDead(playerState: PlayerState): boolean {
  return playerState.visible.health <= 0;
}

/**
 * Checks for critical status warnings
 */
export function getCriticalStatus(playerState: PlayerState): string[] {
  const warnings: string[] = [];

  if (playerState.visible.health <= 20) {
    warnings.push('HEALTH_CRITICAL');
  }

  if (playerState.visible.stamina <= 10) {
    warnings.push('STAMINA_EXHAUSTED');
  }

  if (playerState.hidden.sanity <= 30) {
    warnings.push('SANITY_DETERIORATING');
  }

  if (playerState.hidden.realityStability <= 40) {
    warnings.push('REALITY_UNSTABLE');
  }

  return warnings;
}
