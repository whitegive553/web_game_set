/**
 * Game State Mapper
 *
 * Converts backend GameState (from game-engine) to client-safe format.
 *
 * Key responsibilities:
 * - Filter out hidden stats (except sanity for UI purposes)
 * - Convert GameEvent to Narrative format
 * - Simplify Choice objects for frontend
 * - Map inventory items to client format
 *
 * Design note: Sanity is technically a "hidden stat" but is shown in the UI
 * as a gameplay concession. Other hidden stats (anomalyAffinity, observationLevel,
 * realityStability) remain hidden and are only revealed through narrative.
 */

import { GameState as EngineGameState, Choice as EngineChoice, GamePhase } from '@survival-game/shared';

// Client-compatible types (subset)
export interface ClientGameStateResponse {
  gameState: {
    phase: string;
    stats: {
      health: number;
      stamina: number;
      sanity: number;
      supplies: number;
    };
    location: string;
    turnCount: number;
  };
  currentNarrative: {
    id: string;
    speaker?: string;
    text: string;
    location: string;
    timestamp: number;
  } | null;
  choices: Array<{
    id: string;
    text: string;
    hidden?: boolean;
    warning?: string;
  }>;
  inventory: Array<{
    id: string;
    name: string;
    description: string;
    type: string;
    isAnomalous: boolean;
  }>;
}

/**
 * Maps backend GameState to client-safe response
 */
export function mapGameStateToClient(
  engineState: EngineGameState,
  availableChoices: EngineChoice[]
): ClientGameStateResponse {
  const { phase, player, currentEvent, turnCount } = engineState;

  // Extract visible stats + sanity (UI requirement)
  const stats = {
    health: player.visible.health,
    stamina: player.visible.stamina,
    sanity: player.hidden.sanity, // Shown in UI (design concession)
    supplies: player.visible.supplies
  };

  // Convert current event to narrative
  let narrative: ClientGameStateResponse['currentNarrative'] = null;
  if (currentEvent) {
    narrative = {
      id: currentEvent.id,
      speaker: '记录', // Default speaker
      text: currentEvent.descriptionTemplate,
      location: currentEvent.location,
      timestamp: Date.now()
    };
  }

  // Map choices to client format
  const choices = availableChoices.map(choice => ({
    id: choice.id,
    text: choice.text,
    hidden: choice.hidden,
    warning: choice.requirements.length > 0 ? undefined : undefined // TODO: Add warning logic
  }));

  // Map inventory items to client format
  const inventory = player.inventory.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
    type: item.type,
    isAnomalous: item.isAnomalous
  }));

  // Map game phase to client phase
  const clientPhase = mapPhaseToClient(phase);

  return {
    gameState: {
      phase: clientPhase,
      stats,
      location: player.visible.currentLocation,
      turnCount
    },
    currentNarrative: narrative,
    choices,
    inventory
  };
}

/**
 * Maps backend GamePhase to client-compatible phase
 */
function mapPhaseToClient(phase: GamePhase): string {
  switch (phase) {
    case GamePhase.INITIALIZATION:
      return 'TITLE';
    case GamePhase.EXPLORATION:
    case GamePhase.EVENT:
    case GamePhase.CHOICE:
      return 'PLAYING';
    case GamePhase.OUTCOME:
      return 'OUTCOME';
    case GamePhase.DEATH:
      return 'DEATH';
    case GamePhase.EVACUATION:
      return 'EVACUATION';
    case GamePhase.ENDED:
      return 'TITLE';
    default:
      return 'PLAYING';
  }
}

/**
 * Generates subtle hints about hidden stats (for future use)
 * This can be used to give players narrative feedback about hidden states
 * without revealing exact numbers
 */
export function generateAnomalyHint(engineState: EngineGameState): string | undefined {
  const { anomalyAffinity, observationLevel, realityStability } = engineState.player.hidden;

  // High anomaly affinity
  if (anomalyAffinity > 70) {
    return '你感觉与这个地方的联系越来越深...';
  }

  // High observation level
  if (observationLevel > 70) {
    return '你有种被注视的感觉...';
  }

  // Low reality stability
  if (realityStability < 30) {
    return '周围的事物似乎不太稳定...';
  }

  return undefined;
}
