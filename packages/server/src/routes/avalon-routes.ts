/**
 * Avalon Game Routes
 * Game-specific endpoints for Avalon gameplay
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getRoomManager } from '../services/room-manager';
import { getWebSocketService } from '../services/websocket-service';
import { GameMatch, PluginGamePlayer } from '@survival-game/shared';
import { AvalonGame } from '../../../../games/avalon/avalon-game';

const router = Router();

// In-memory game instances (in production, use Redis or similar)
const activeGames = new Map<string, any>();

/**
 * POST /api/avalon/:roomId/start
 * Start an Avalon game
 */
router.post('/:roomId/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.id;

    const roomManager = getRoomManager();
    const room = roomManager.getRoom(roomId);

    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found'
      });
      return;
    }

    if (room.gameId !== 'avalon') {
      res.status(400).json({
        success: false,
        error: 'This room is not for Avalon game'
      });
      return;
    }

    if (room.hostUserId !== userId) {
      res.status(403).json({
        success: false,
        error: 'Only the host can start the game'
      });
      return;
    }

    if (room.status !== 'lobby') {
      res.status(400).json({
        success: false,
        error: 'Game already started or finished'
      });
      return;
    }

    // Check player count (6-10 for Avalon)
    if (room.players.length < 6 || room.players.length > 10) {
      res.status(400).json({
        success: false,
        error: 'Avalon requires 6-10 players'
      });
      return;
    }

    // Check all players are ready (host is always considered ready)
    const allReady = room.players.every(p => p.userId === room.hostUserId || p.ready);
    if (!allReady) {
      res.status(400).json({
        success: false,
        error: 'Not all players are ready'
      });
      return;
    }

    // Create game match
    const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const match: GameMatch = {
      matchId,
      roomId,
      gameId: 'avalon',
      state: { phase: 'LOBBY' },
      players: room.players.map(p => ({
        userId: p.userId,
        username: p.username,
        ready: p.ready,
        connected: p.connected
      })) as PluginGamePlayer[],
      createdAt: Date.now()
    };

    // Initialize game instance
    const avalonGame = new AvalonGame(match);
    activeGames.set(matchId, avalonGame);

    // Update room status
    await roomManager.startGame(roomId, match);

    // Start the game
    const events = avalonGame.startGame();

    // Send events via WebSocket
    const wsService = getWebSocketService();
    wsService.sendGameEvents(roomId, events);

    // Send explicit GAME_STARTED event to trigger navigation
    wsService.broadcastToRoom(roomId, {
      type: 'GAME_STARTED',
      payload: { matchId, gameId: 'avalon' }
    });

    // Send private states to each player
    room.players.forEach(player => {
      const privateState = avalonGame.getPrivateState(player.userId);
      wsService.sendEventToPlayer(player.userId, {
        eventId: `private_${Date.now()}`,
        matchId,
        gameId: 'avalon',
        timestamp: Date.now(),
        type: 'PRIVATE_STATE',
        payload: privateState,
        visibleTo: 'player',
        userId: player.userId
      });
    });

    console.log(`[Avalon] Game started in room ${roomId}, match ${matchId}`);

    res.json({
      success: true,
      data: {
        matchId,
        publicState: avalonGame.getPublicState()
      }
    });
  } catch (error) {
    console.error('[Avalon] Start game error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start game'
    });
  }
});

/**
 * POST /api/avalon/:matchId/action
 * Perform a game action
 */
router.post('/:matchId/action', requireAuth, async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;
    const { type, payload } = req.body;
    const userId = req.user!.id;

    if (!type) {
      res.status(400).json({
        success: false,
        error: 'Action type is required'
      });
      return;
    }

    const avalonGame = activeGames.get(matchId);
    if (!avalonGame) {
      res.status(404).json({
        success: false,
        error: 'Game not found'
      });
      return;
    }

    let events;

    // Handle different action types
    switch (type) {
      case 'NOMINATE_TEAM':
        events = avalonGame.handleNominateTeam(userId, payload.teamUserIds);
        break;

      case 'VOTE_TEAM':
        events = avalonGame.handleVoteTeam(userId, payload.approve);
        break;

      case 'VOTE_QUEST':
        events = avalonGame.handleVoteQuest(userId, payload.success);
        break;

      case 'ASSASSINATE':
        events = avalonGame.handleAssassinate(userId, payload.targetUserId);
        break;

      default:
        res.status(400).json({
          success: false,
          error: `Unknown action type: ${type}`
        });
        return;
    }

    // Get room ID from match
    const roomManager = getRoomManager();
    const allRooms = roomManager.getAllRooms();
    const room = allRooms.find(r => r.match?.matchId === matchId);

    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found for this match'
      });
      return;
    }

    // Send events via WebSocket
    const wsService = getWebSocketService();
    wsService.sendGameEvents(room.roomId, events);

    console.log(`[Avalon] Action ${type} by ${userId} in match ${matchId}`);

    res.json({
      success: true,
      data: {
        events,
        publicState: avalonGame.getPublicState()
      }
    });
  } catch (error) {
    console.error('[Avalon] Action error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Action failed'
    });
  }
});

/**
 * GET /api/avalon/:matchId/state
 * Get current game state
 */
router.get('/:matchId/state', requireAuth, async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;
    const userId = req.user!.id;

    // Get room to check if match exists
    const roomManager = getRoomManager();
    const allRooms = roomManager.getAllRooms();
    const room = allRooms.find(r => r.match?.matchId === matchId);

    let avalonGame = activeGames.get(matchId);

    // If game instance doesn't exist but room has this match, recreate it
    if (!avalonGame && room && room.match) {
      console.log(`[Avalon] Game instance not found for match ${matchId}, attempting to recreate from room data`);

      // Check if this is still an active game
      if (room.status === 'playing') {
        try {
          avalonGame = new AvalonGame(room.match);
          activeGames.set(matchId, avalonGame);
          console.log(`[Avalon] Successfully recreated game instance for match ${matchId}`);
        } catch (error) {
          console.error(`[Avalon] Failed to recreate game instance:`, error);
        }
      }
    }

    if (!avalonGame) {
      res.status(404).json({
        success: false,
        error: 'Game not found or has ended',
        gameEnded: true
      });
      return;
    }

    const publicState = avalonGame.getPublicState();
    const privateState = avalonGame.getPrivateState(userId);

    res.json({
      success: true,
      data: {
        publicState,
        privateState,
        players: room?.players || []
      }
    });
  } catch (error) {
    console.error('[Avalon] Get state error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game state'
    });
  }
});

/**
 * GET /api/avalon/:matchId/events
 * Get game event history
 */
router.get('/:matchId/events', requireAuth, async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;

    const avalonGame = activeGames.get(matchId);
    if (!avalonGame) {
      res.status(404).json({
        success: false,
        error: 'Game not found'
      });
      return;
    }

    const events = avalonGame.getEvents();

    res.json({
      success: true,
      data: { events }
    });
  } catch (error) {
    console.error('[Avalon] Get events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get events'
    });
  }
});

export default router;
