/**
 * API Client for communicating with the game server
 */

import { GameState, Choice } from '@survival-game/shared';

const API_BASE = '/api/game';

export interface GameResponse {
  success: boolean;
  data?: {
    sessionId?: string;
    gameState: GameState;
    availableChoices: Choice[];
  };
  error?: string;
}

export class GameAPI {
  /**
   * Creates a new game session
   */
  static async createNewGame(): Promise<GameResponse> {
    const response = await fetch(`${API_BASE}/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  }

  /**
   * Gets current game state
   */
  static async getGameState(sessionId: string): Promise<GameResponse> {
    const response = await fetch(`${API_BASE}/${sessionId}/state`);
    return response.json();
  }

  /**
   * Makes a choice
   */
  static async makeChoice(sessionId: string, choiceId: string): Promise<GameResponse> {
    const response = await fetch(`${API_BASE}/${sessionId}/choice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ choiceId })
    });
    return response.json();
  }

  /**
   * Respawns after death
   */
  static async respawn(sessionId: string): Promise<GameResponse> {
    const response = await fetch(`${API_BASE}/${sessionId}/respawn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  }

  /**
   * Deletes a session
   */
  static async deleteSession(sessionId: string): Promise<void> {
    await fetch(`${API_BASE}/${sessionId}`, {
      method: 'DELETE'
    });
  }
}
