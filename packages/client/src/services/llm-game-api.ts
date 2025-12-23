/**
 * LLM-Driven Game API Client
 * Communicates with /api/game/step endpoint for LLM-based narrative generation
 */

export interface GameStepRequest {
  sceneId: string;
  gameState: {
    player: {
      visible: {
        health: number;
        stamina: number;
        supplies: number;
      };
      inventory: Array<{ name: string }>;
      persistent: {
        anomalousArtifacts: Array<{ name: string }>;
        deathCount: number;
      };
    };
    turnCount: number;
  };
  history: Array<{
    step: number;
    eventId: string;
    choiceId: string;
    choiceText: string;
    outcome: {
      summary: string;
    };
  }>;
  runId: string;
}

export interface GameStepResponse {
  success: boolean;
  data?: {
    narrative: string;
    narrativeSource: string;
    choices: Array<{
      id: string;
      text: string;
      riskHint: string;
    }>;
    tags: string[];
    background: string;
    backgroundFallback: string;
    sceneInfo: {
      sceneId: string;
      name: string;
      dangerLevel: number;
    };
    meta: {
      usedFallback: boolean;
      llmError?: string;
    };
  };
  error?: string;
}

const API_BASE = '/api/game';

export class LLMGameAPI {
  /**
   * Request next game step from LLM
   */
  static async requestStep(request: GameStepRequest): Promise<GameStepResponse> {
    try {
      const response = await fetch(`${API_BASE}/step`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('LLM Game API error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  /**
   * Get server stats (for debugging)
   */
  static async getStats(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get stats:', error);
      return null;
    }
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch('/health');
      return response.ok;
    } catch {
      return false;
    }
  }
}
