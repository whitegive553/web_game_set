/**
 * Game API Routes
 */

import { Router, Request, Response } from 'express';
import { GameSessionManager } from '../services/game-session-manager';
import { MockLLMService } from '../services/llm-service-mock';
import { mapGameStateToClient } from '../utils/game-state-mapper';
import { getGameStepController, GameStepInput } from '../services/game-step-controller';

const router = Router();
const sessionManager = new GameSessionManager();
const llmService = new MockLLMService();

// Lazy initialization - get controller when needed, not at module load time
let stepController: ReturnType<typeof getGameStepController> | null = null;
function getStepController() {
  if (!stepController) {
    stepController = getGameStepController();
  }
  return stepController;
}

/**
 * POST /api/game/new
 * Creates a new game session
 */
router.post('/new', (req: Request, res: Response) => {
  try {
    const { sessionId, gameState, availableChoices } = sessionManager.createSession();

    // Map to client-safe format
    const clientResponse = mapGameStateToClient(gameState, availableChoices);

    res.json({
      success: true,
      data: {
        sessionId,
        ...clientResponse
      }
    });
  } catch (error) {
    console.error('Error creating game session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create game session'
    });
  }
});

/**
 * GET /api/game/:sessionId/state
 * Gets current game state
 */
router.get('/:sessionId/state', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const engine = sessionManager.getSession(sessionId);

  if (!engine) {
    res.status(404).json({
      success: false,
      error: 'Session not found'
    });
    return;
  }

  const gameState = engine.getState();
  const availableChoices = engine.getAvailableChoices();

  // Map to client-safe format
  const clientResponse = mapGameStateToClient(gameState, availableChoices);

  res.json({
    success: true,
    data: clientResponse
  });
});

/**
 * POST /api/game/:sessionId/choice
 * Makes a choice in the game
 */
router.post('/:sessionId/choice', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { choiceId } = req.body;

  const engine = sessionManager.getSession(sessionId);

  if (!engine) {
    res.status(404).json({
      success: false,
      error: 'Session not found'
    });
    return;
  }

  if (!choiceId) {
    res.status(400).json({
      success: false,
      error: 'Choice ID is required'
    });
    return;
  }

  try {
    const gameState = engine.makeChoice(choiceId);
    const availableChoices = engine.getAvailableChoices();

    // Map to client-safe format
    const clientResponse = mapGameStateToClient(gameState, availableChoices);

    res.json({
      success: true,
      data: clientResponse
    });
  } catch (error) {
    console.error('Error making choice:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Invalid choice'
    });
  }
});

/**
 * POST /api/game/:sessionId/respawn
 * Respawns after death
 */
router.post('/:sessionId/respawn', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const engine = sessionManager.getSession(sessionId);

  if (!engine) {
    res.status(404).json({
      success: false,
      error: 'Session not found'
    });
    return;
  }

  try {
    const gameState = engine.respawn();
    const availableChoices = engine.getAvailableChoices();

    // Map to client-safe format
    const clientResponse = mapGameStateToClient(gameState, availableChoices);

    res.json({
      success: true,
      data: clientResponse
    });
  } catch (error) {
    console.error('Error respawning:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to respawn'
    });
  }
});

/**
 * DELETE /api/game/:sessionId
 * Deletes a game session
 */
router.delete('/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const deleted = sessionManager.deleteSession(sessionId);

  res.json({
    success: deleted,
    message: deleted ? 'Session deleted' : 'Session not found'
  });
});

/**
 * POST /api/game/step
 * Generate next game step with LLM-based narrative
 */
router.post('/step', async (req: Request, res: Response) => {
  try {
    const input: GameStepInput = req.body;

    // Validate input
    if (!input.sceneId || !input.gameState || !input.runId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: sceneId, gameState, runId'
      });
      return;
    }

    // Generate step (lazy init ensures env vars are loaded)
    const output = await getStepController().generateStep(input);

    res.json({
      success: true,
      data: output
    });
  } catch (error: any) {
    console.error('Error in /step endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate game step'
    });
  }
});

/**
 * POST /api/game/step/stream
 * Generate next game step with LLM-based narrative (streaming)
 */
router.post('/step/stream', async (req: Request, res: Response) => {
  try {
    const input: GameStepInput = req.body;

    // Validate input
    if (!input.sceneId || !input.gameState || !input.runId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: sceneId, gameState, runId'
      });
      return;
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Generate step with streaming
    const controller = getStepController();

    try {
      // For now, use non-streaming but send chunks of the response
      const output = await controller.generateStep(input);

      // Send the complete response as SSE
      res.write(`data: ${JSON.stringify({ type: 'complete', data: output })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error('[Stream] Error in /step/stream endpoint:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    console.error('[Stream] Error setting up stream:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to start stream'
      });
    }
  }
});

/**
 * GET /api/game/stats
 * Gets server stats (for monitoring)
 */
router.get('/stats', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      activeSessions: sessionManager.getSessionCount(),
      llmAvailable: llmService.isAvailable()
    }
  });
});

export default router;
