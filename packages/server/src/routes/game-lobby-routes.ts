/**
 * Game Lobby Routes
 * Platform-level room management for all games
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getRoomManager } from '../services/room-manager';
import { getWebSocketService } from '../services/websocket-service';

const router = Router();

/**
 * POST /api/lobby/rooms
 * Create a new room
 */
router.post('/rooms', requireAuth, async (req: Request, res: Response) => {
  try {
    const { gameId, name, maxPlayers } = req.body;
    const userId = req.user!.id;
    const username = req.user!.username;

    if (!gameId || !name || !maxPlayers) {
      res.status(400).json({
        success: false,
        error: 'gameId, name, and maxPlayers are required'
      });
      return;
    }

    const roomManager = getRoomManager();
    const room = await roomManager.createRoom(gameId, userId, name, maxPlayers);

    // Auto-join creator as first player
    await roomManager.joinRoom(room.roomId, userId, username);

    console.log(`[Lobby] Room created: ${room.roomId} by ${username}`);

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('[Lobby] Create room error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create room'
    });
  }
});

/**
 * GET /api/lobby/rooms
 * List all active rooms (optionally filter by gameId)
 */
router.get('/rooms', requireAuth, async (req: Request, res: Response) => {
  try {
    const { gameId } = req.query;
    const roomManager = getRoomManager();
    const rooms = roomManager.listRooms(gameId as string | undefined);

    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    console.error('[Lobby] List rooms error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list rooms'
    });
  }
});

/**
 * GET /api/lobby/my-room
 * Get the room the current user is in (if any)
 */
router.get('/my-room', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const roomManager = getRoomManager();
    const room = roomManager.findRoomByUserId(userId);

    if (!room) {
      res.json({
        success: true,
        data: null
      });
      return;
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('[Lobby] Get my room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get room'
    });
  }
});

/**
 * GET /api/lobby/rooms/:roomId
 * Get room details
 */
router.get('/rooms/:roomId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const roomManager = getRoomManager();
    const room = roomManager.getRoom(roomId);

    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found'
      });
      return;
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('[Lobby] Get room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get room'
    });
  }
});

/**
 * POST /api/lobby/rooms/:roomId/join
 * Join a room
 */
router.post('/rooms/:roomId/join', requireAuth, async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.id;
    const username = req.user!.username;

    const roomManager = getRoomManager();
    const room = await roomManager.joinRoom(roomId, userId, username);

    console.log(`[Lobby] ${username} joined room ${roomId}`);

    // Notify other players via WebSocket
    try {
      const wsService = getWebSocketService();
      wsService.broadcastToRoom(roomId, {
        type: 'PLAYER_JOINED',
        payload: { userId, username }
      }, userId);
    } catch (error) {
      console.warn('[Lobby] WebSocket notification failed:', error);
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('[Lobby] Join room error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to join room'
    });
  }
});

/**
 * POST /api/lobby/rooms/:roomId/leave
 * Leave a room
 */
router.post('/rooms/:roomId/leave', requireAuth, async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.id;
    const username = req.user!.username;

    const roomManager = getRoomManager();
    const room = await roomManager.leaveRoom(roomId, userId);

    console.log(`[Lobby] ${username} left room ${roomId}`);

    // Notify other players via WebSocket
    try {
      const wsService = getWebSocketService();
      wsService.broadcastToRoom(roomId, {
        type: 'PLAYER_LEFT',
        payload: { userId, username }
      });
    } catch (error) {
      console.warn('[Lobby] WebSocket notification failed:', error);
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('[Lobby] Leave room error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to leave room'
    });
  }
});

/**
 * POST /api/lobby/rooms/:roomId/ready
 * Set ready status
 */
router.post('/rooms/:roomId/ready', requireAuth, async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { ready } = req.body;
    const userId = req.user!.id;
    const username = req.user!.username;

    if (typeof ready !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'ready must be a boolean'
      });
      return;
    }

    const roomManager = getRoomManager();
    const room = await roomManager.setReady(roomId, userId, ready);

    console.log(`[Lobby] ${username} set ready=${ready} in room ${roomId}`);

    // Notify other players via WebSocket
    try {
      const wsService = getWebSocketService();
      wsService.broadcastToRoom(roomId, {
        type: 'PLAYER_READY',
        payload: { userId, username, ready }
      });
    } catch (error) {
      console.warn('[Lobby] WebSocket notification failed:', error);
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('[Lobby] Set ready error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set ready status'
    });
  }
});

/**
 * POST /api/lobby/rooms/:roomId/start
 * Start the game (handled by game-specific routes)
 * This endpoint is a placeholder - actual game start is handled by game plugins
 */
router.post('/rooms/:roomId/start', requireAuth, async (req: Request, res: Response) => {
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

    // Check all players are ready
    const allReady = room.players.every(p => p.ready);
    if (!allReady) {
      res.status(400).json({
        success: false,
        error: 'Not all players are ready'
      });
      return;
    }

    // Redirect to game-specific start endpoint
    res.json({
      success: true,
      message: `Use /api/${room.gameId}/${roomId}/start to start this game`,
      data: { gameId: room.gameId, roomId }
    });
  } catch (error) {
    console.error('[Lobby] Start game error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start game'
    });
  }
});

/**
 * DELETE /api/lobby/rooms/:roomId
 * Delete a room (host only)
 */
router.delete('/rooms/:roomId', requireAuth, async (req: Request, res: Response) => {
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

    if (room.hostUserId !== userId) {
      res.status(403).json({
        success: false,
        error: 'Only the host can delete the room'
      });
      return;
    }

    await roomManager.deleteRoom(roomId);

    console.log(`[Lobby] Room ${roomId} deleted by host`);

    // Notify all players via WebSocket
    try {
      const wsService = getWebSocketService();
      wsService.broadcastToRoom(roomId, {
        type: 'ROOM_DELETED',
        payload: { roomId }
      });
    } catch (error) {
      console.warn('[Lobby] WebSocket notification failed:', error);
    }

    res.json({
      success: true,
      message: 'Room deleted'
    });
  } catch (error) {
    console.error('[Lobby] Delete room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete room'
    });
  }
});

export default router;
