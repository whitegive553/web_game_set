/**
 * Event Selector - Chooses appropriate events based on game state
 * This is where the "game feel" is tuned
 */

import { GameEvent, PlayerState, GameState, Choice, Outcome } from '@survival-game/shared';
import { evaluateConditions } from './condition-evaluator';

/**
 * Selects the next event from available events
 * Returns null if no valid events are available
 */
export function selectNextEvent(
  availableEvents: GameEvent[],
  gameState: GameState
): GameEvent | null {
  // Filter events that can trigger
  const validEvents = availableEvents.filter(event =>
    canEventTrigger(event, gameState)
  );

  if (validEvents.length === 0) {
    return null;
  }

  // Sort by priority (higher first)
  validEvents.sort((a, b) => b.priority - a.priority);

  // For now, take the highest priority event
  // In the future, could use weighted random selection
  return validEvents[0];
}

/**
 * Checks if an event can trigger given current game state
 */
function canEventTrigger(event: GameEvent, gameState: GameState): boolean {
  // Check if event is for current location
  if (event.location !== gameState.player.visible.currentLocation) {
    return false;
  }

  // Check if one-time event has already triggered
  if (event.oneTime && gameState.triggeredEventIds.has(event.id)) {
    return false;
  }

  // Check trigger conditions
  return evaluateConditions(event.triggerConditions, gameState.player);
}

/**
 * Filters choices to show only those available to player
 */
export function getAvailableChoices(
  event: GameEvent,
  playerState: PlayerState
): Choice[] {
  return event.choices.filter(choice => {
    // Hidden choices that don't meet requirements are excluded
    if (choice.hidden && !evaluateConditions(choice.requirements, playerState)) {
      return false;
    }
    return true;
  });
}

/**
 * Selects an outcome from weighted possibilities
 * Uses a deterministic random based on game state for reproducibility
 */
export function selectOutcome(
  choice: Choice,
  _gameState: GameState // For future seeded random
): Outcome {
  const totalWeight = choice.outcomes.reduce((sum: number, o) => sum + o.weight, 0);
  const random = Math.random() * totalWeight; // TODO: Use seeded random

  let cumulative = 0;
  for (const outcomeProb of choice.outcomes) {
    cumulative += outcomeProb.weight;
    if (random <= cumulative) {
      return outcomeProb.outcome;
    }
  }

  // Fallback to last outcome
  return choice.outcomes[choice.outcomes.length - 1].outcome;
}
