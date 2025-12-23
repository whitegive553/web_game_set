/**
 * Game API Service
 * Handles all game-related API calls to the backend
 */

import { GameState, Narrative, Choice } from '../types/game';

// Use relative URL to leverage Vite proxy in development
const API_BASE = import.meta.env.VITE_API_BASE || '/api/game';

export interface StartGameResponse {
  sessionId: string;
  narrative: Narrative;
  choices: Choice[];
  stats: GameState['stats'];
  location: string;
}

export interface MakeChoiceResponse {
  narrative: Narrative;
  choices: Choice[];
  stats: GameState['stats'];
  location: string;
  phase: GameState['phase'];
}

/**
 * Start a new game session
 */
export async function startGame(): Promise<StartGameResponse> {
  try {
    const response = await fetch(`${API_BASE}/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to start game');
    }

    const { sessionId, gameState, currentNarrative, choices } = result.data;

    return {
      sessionId,
      narrative: currentNarrative || createDefaultNarrative(gameState.location),
      choices: choices.map(mapChoice),
      stats: gameState.stats,
      location: gameState.location
    };
  } catch (error) {
    console.error('[gameApi] startGame error:', error);
    throw error;
  }
}

/**
 * Make a choice and get next game state
 */
export async function makeChoice(
  sessionId: string,
  choiceId: string
): Promise<MakeChoiceResponse> {
  try {
    const response = await fetch(`${API_BASE}/${sessionId}/choice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ choiceId })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to make choice');
    }

    const { gameState, currentNarrative, choices } = result.data;

    return {
      narrative: currentNarrative || createDefaultNarrative(gameState.location),
      choices: choices.map(mapChoice),
      stats: gameState.stats,
      location: gameState.location,
      phase: gameState.phase as any
    };
  } catch (error) {
    console.error('[gameApi] makeChoice error:', error);
    throw error;
  }
}

/**
 * Respawn after death
 */
export async function respawnGame(sessionId: string): Promise<StartGameResponse> {
  try {
    const response = await fetch(`${API_BASE}/${sessionId}/respawn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to respawn');
    }

    const { gameState, currentNarrative, choices } = result.data;

    return {
      sessionId,
      narrative: currentNarrative || createRespawnNarrative(gameState.location),
      choices: choices.map(mapChoice),
      stats: gameState.stats,
      location: gameState.location
    };
  } catch (error) {
    console.error('[gameApi] respawnGame error:', error);
    throw error;
  }
}

/**
 * End current session
 */
export async function endGame(sessionId: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/${sessionId}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('[gameApi] endGame error:', error);
    // Don't throw - ending session is not critical
  }
}

/**
 * Get server connection status
 */
export async function getServerStatus(): Promise<{ connected: boolean; llmAvailable: boolean }> {
  try {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) {
      return { connected: false, llmAvailable: false };
    }

    const result = await response.json();
    return {
      connected: true,
      llmAvailable: result.data?.llmAvailable || false
    };
  } catch (error) {
    return { connected: false, llmAvailable: false };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Maps backend choice to frontend choice format
 */
function mapChoice(choice: any): Choice {
  return {
    id: choice.id,
    text: choice.text,
    disabled: false,
    warning: choice.warning,
    hidden: choice.hidden
  };
}

/**
 * Creates a default narrative when none is provided
 */
function createDefaultNarrative(location: string): Narrative {
  return {
    id: `narrative_${Date.now()}`,
    speaker: '记录',
    text: '你站在这里,思考着下一步该做什么...',
    location,
    timestamp: Date.now()
  };
}

/**
 * Creates a respawn narrative
 */
function createRespawnNarrative(location: string): Narrative {
  return {
    id: `respawn_${Date.now()}`,
    speaker: '记录',
    text: '你又一次站在禁区入口。记忆中的恐惧依然清晰,但你知道得更多了。',
    location,
    timestamp: Date.now()
  };
}
