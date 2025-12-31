/**
 * Avalon Game Routes
 * Game-specific endpoints for Avalon gameplay
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getRoomManager } from '../services/room-manager';
import { getWebSocketService } from '../services/websocket-service';
import {
  GameMatch,
  PluginGamePlayer,
  validateRoleConfiguration,
  getDefaultRoomConfig,
  roleConfigToPlayerCountConfig
} from '@survival-game/shared';
import { AvalonGame } from '../../../../games/avalon/avalon-game';
import { avalonHistoryService } from '../services/avalon-history-service';

console.log('[AvalonRoutes] Module loaded, AvalonGame:', AvalonGame ? 'OK' : 'FAILED');
console.log('[AvalonRoutes] avalonHistoryService loaded:', avalonHistoryService ? 'OK' : 'FAILED');

const router = Router();

// In-memory game instances (in production, use Redis or similar)
const activeGames = new Map<string, any>();

/**
 * POST /api/avalon/:roomId/config
 * Update room configuration (host only, lobby only)
 */
router.post('/:roomId/config', requireAuth, async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.id;
    const { targetPlayerCount, roleConfig } = req.body;

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
        error: 'Only the host can update configuration'
      });
      return;
    }

    if (room.status !== 'lobby') {
      res.status(400).json({
        success: false,
        error: 'Cannot update configuration after game has started'
      });
      return;
    }

    // Get current config or default
    let currentConfig = room.avalonConfig;
    if (!currentConfig) {
      const defaultConfig = getDefaultRoomConfig(room.maxPlayers);
      if (!defaultConfig) {
        res.status(400).json({
          success: false,
          error: `Invalid player count: ${room.maxPlayers}. Must be 6-10.`
        });
        return;
      }
      currentConfig = defaultConfig;
    }

    // Update target player count if provided
    if (targetPlayerCount !== undefined) {
      if (targetPlayerCount < 6 || targetPlayerCount > 10) {
        res.status(400).json({
          success: false,
          error: 'Player count must be between 6 and 10'
        });
        return;
      }

      if (targetPlayerCount < room.players.length) {
        res.status(400).json({
          success: false,
          error: `Target player count (${targetPlayerCount}) cannot be less than current player count (${room.players.length})`
        });
        return;
      }

      currentConfig.targetPlayerCount = targetPlayerCount;

      // If only changing player count, use default role config for new count
      if (!roleConfig) {
        const newDefaultConfig = getDefaultRoomConfig(targetPlayerCount);
        if (newDefaultConfig) {
          currentConfig.roleConfig = newDefaultConfig.roleConfig;
        }
      }
    }

    // Update role config if provided
    if (roleConfig) {
      const playerCount = currentConfig.targetPlayerCount;

      // Validate the role configuration
      const validation = validateRoleConfiguration(playerCount, roleConfig);

      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: 'Invalid role configuration',
          details: validation.errors
        });
        return;
      }

      currentConfig.roleConfig = roleConfig;
    }

    // Update the room
    await roomManager.updateAvalonConfig(roomId, userId, currentConfig);

    // Broadcast config update to all players in room
    const wsService = getWebSocketService();
    wsService.broadcastToRoom(roomId, {
      type: 'ROOM_CONFIG_UPDATED',
      payload: {
        avalonConfig: currentConfig,
        maxPlayers: currentConfig.targetPlayerCount
      }
    });

    console.log(`[Avalon] Room ${roomId} config updated by ${userId}:`, currentConfig);

    res.json({
      success: true,
      data: {
        avalonConfig: currentConfig
      }
    });
  } catch (error) {
    console.error('[Avalon] Update config error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update configuration'
    });
  }
});

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

    // Get or create default Avalon config
    let avalonConfig = room.avalonConfig;
    if (!avalonConfig) {
      const defaultConfig = getDefaultRoomConfig(room.players.length);
      if (!defaultConfig) {
        res.status(400).json({
          success: false,
          error: `Cannot create default configuration for ${room.players.length} players`
        });
        return;
      }
      avalonConfig = defaultConfig;
    }

    // Validate configuration matches actual player count
    if (avalonConfig.targetPlayerCount !== room.players.length) {
      res.status(400).json({
        success: false,
        error: `Configuration mismatch: expected ${avalonConfig.targetPlayerCount} players, got ${room.players.length}`
      });
      return;
    }

    // Validate role configuration
    const validation = validateRoleConfiguration(
      room.players.length,
      avalonConfig.roleConfig
    );
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: 'Invalid role configuration',
        details: validation.errors
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

    // Initialize game instance with custom config and history service
    const avalonGame = new AvalonGame(match, avalonConfig, avalonHistoryService);
    activeGames.set(matchId, avalonGame);

    console.log(`[Avalon] Starting game with config:`, avalonConfig);

    // Update room status
    await roomManager.startGame(roomId, match);

    // Start the game
    console.log('[Avalon] ===== CALLING avalonGame.startGame() =====');
    const events = avalonGame.startGame();
    console.log('[Avalon] ===== startGame() returned, events count:', events.length);

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
        events = await avalonGame.handleVoteQuest(userId, payload.success);
        break;

      case 'ASSASSINATE':
        events = await avalonGame.handleAssassinate(userId, payload.targetUserId);
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
          avalonGame = new AvalonGame(room.match, undefined, avalonHistoryService);
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
        players: room?.players || [],
        roomId: room?.roomId
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
