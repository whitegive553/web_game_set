/**
 * WebSocket Service
 * Real-time communication for multiplayer games
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';
import jwt from 'jsonwebtoken';
import { PluginGameEvent } from '@survival-game/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  username?: string;
  roomId?: string;
}

interface WebSocketMessage {
  type: string;
  payload?: any;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, AuthenticatedWebSocket> = new Map(); // userId -> WebSocket
  private roomClients: Map<string, Set<string>> = new Map(); // roomId -> Set<userId>

  constructor(server: Server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws'
    });

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: AuthenticatedWebSocket, request: IncomingMessage): void {
    console.log('[WS] New connection attempt');

    // Extract token from query string
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      console.log('[WS] No token provided, closing connection');
      ws.close(1008, 'Authentication required');
      return;
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
      ws.userId = decoded.userId;
      ws.username = decoded.username;

      // Store client
      this.clients.set(decoded.userId, ws);

      console.log(`[WS] Client authenticated: ${decoded.username} (${decoded.userId})`);

      // Check if user is in a game and mark as reconnected
      (async () => {
        try {
          const { getRoomManager } = await import('./room-manager');
          const roomManager = getRoomManager();
          const room = roomManager.findRoomByUserId(decoded.userId);

          if (room && room.status === 'playing') {
            const player = room.players.find(p => p.userId === decoded.userId);
            if (player) {
              player.connected = true;
              console.log(`[WS] User ${decoded.userId} reconnected to game in room ${room.roomId}`);

              // Notify other players
              this.broadcastToRoom(room.roomId, {
                type: 'PLAYER_RECONNECTED',
                payload: { userId: decoded.userId, username: decoded.username }
              });
            }
          }
        } catch (error) {
          console.error('[WS] Error handling reconnection:', error);
        }
      })();

      // Send connection success
      this.sendToClient(decoded.userId, {
        type: 'CONNECTED',
        payload: { userId: decoded.userId, username: decoded.username }
      });

      // Handle messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as WebSocketMessage;
          this.handleMessage(decoded.userId, message);
        } catch (error) {
          console.error('[WS] Invalid message format:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        console.log(`[WS] Client disconnected: ${decoded.username} (${decoded.userId})`);
        this.handleDisconnect(decoded.userId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`[WS] Error for ${decoded.username}:`, error);
      });

    } catch (error) {
      console.log('[WS] Invalid token, closing connection');
      ws.close(1008, 'Invalid token');
    }
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(userId: string, message: WebSocketMessage): void {
    console.log(`[WS] Message from ${userId}:`, message.type);

    switch (message.type) {
      case 'JOIN_ROOM':
        this.handleJoinRoom(userId, message.payload?.roomId);
        break;
      case 'LEAVE_ROOM':
        this.handleLeaveRoom(userId);
        break;
      case 'PING':
        this.sendToClient(userId, { type: 'PONG' });
        break;
      default:
        console.log(`[WS] Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle client joining a room
   */
  private handleJoinRoom(userId: string, roomId: string): void {
    if (!roomId) {
      console.error('[WS] JOIN_ROOM missing roomId');
      return;
    }

    const ws = this.clients.get(userId);
    if (!ws) {
      console.error(`[WS] Client not found: ${userId}`);
      return;
    }

    // Leave previous room if any
    if (ws.roomId) {
      this.handleLeaveRoom(userId);
    }

    // Join new room
    ws.roomId = roomId;
    if (!this.roomClients.has(roomId)) {
      this.roomClients.set(roomId, new Set());
    }
    this.roomClients.get(roomId)!.add(userId);

    console.log(`[WS] ${userId} joined room ${roomId}`);
  }

  /**
   * Handle client leaving room
   */
  private handleLeaveRoom(userId: string): void {
    const ws = this.clients.get(userId);
    if (!ws || !ws.roomId) {
      return;
    }

    const roomId = ws.roomId;
    const roomClients = this.roomClients.get(roomId);
    if (roomClients) {
      roomClients.delete(userId);
      if (roomClients.size === 0) {
        this.roomClients.delete(roomId);
      }
    }

    console.log(`[WS] ${userId} left room ${roomId}`);
    ws.roomId = undefined;
  }

  /**
   * Handle client disconnect
   */
  private async handleDisconnect(userId: string): Promise<void> {
    console.log(`[WS] Handling disconnect for user ${userId}`);

    // Remove from WebSocket room tracking
    this.handleLeaveRoom(userId);

    // Handle game room disconnection
    try {
      const { getRoomManager } = await import('./room-manager');
      const roomManager = getRoomManager();
      const room = roomManager.findRoomByUserId(userId);

      if (room) {
        // If game is in progress, just mark as disconnected (don't remove)
        if (room.status === 'playing') {
          console.log(`[WS] User ${userId} disconnected from active game in room ${room.roomId}, keeping in room`);

          // Mark player as disconnected
          const player = room.players.find(p => p.userId === userId);
          if (player) {
            player.connected = false;
          }

          // Notify other players
          this.broadcastToRoom(room.roomId, {
            type: 'PLAYER_DISCONNECTED',
            payload: { userId, username: player?.username }
          });
        } else {
          // If in lobby, remove player
          await roomManager.removePlayerFromAllRooms(userId);

          // Notify other players in the room
          this.broadcastToRoom(room.roomId, {
            type: 'PLAYER_LEFT',
            payload: { userId, reason: 'disconnected' }
          });

          console.log(`[WS] User ${userId} removed from lobby room ${room.roomId} due to disconnect`);
        }
      }
    } catch (error) {
      console.error(`[WS] Error handling disconnect:`, error);
    }

    // Remove from clients map
    this.clients.delete(userId);
  }

  /**
   * Send message to a specific client
   */
  public sendToClient(userId: string, message: WebSocketMessage): void {
    const ws = this.clients.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send game event to a specific player
   */
  public sendEventToPlayer(userId: string, event: PluginGameEvent): void {
    this.sendToClient(userId, {
      type: 'GAME_EVENT',
      payload: event
    });
  }

  /**
   * Broadcast message to all clients in a room
   */
  public broadcastToRoom(roomId: string, message: WebSocketMessage, excludeUserId?: string): void {
    const roomClients = this.roomClients.get(roomId);
    if (!roomClients) {
      return;
    }

    roomClients.forEach(userId => {
      if (userId !== excludeUserId) {
        this.sendToClient(userId, message);
      }
    });
  }

  /**
   * Broadcast game event to all players in a room
   */
  public broadcastEventToRoom(roomId: string, event: PluginGameEvent, excludeUserId?: string): void {
    this.broadcastToRoom(roomId, {
      type: 'GAME_EVENT',
      payload: event
    }, excludeUserId);
  }

  /**
   * Send events based on visibility rules
   */
  public sendGameEvents(roomId: string, events: PluginGameEvent[]): void {
    const roomClients = this.roomClients.get(roomId);
    console.log(`[WS] sendGameEvents to room ${roomId}, clients:`, roomClients ? Array.from(roomClients) : 'NO CLIENTS');
    if (!roomClients) {
      console.warn(`[WS] No clients found for room ${roomId}`);
      return;
    }

    events.forEach(event => {
      console.log(`[WS] Processing event type: ${event.type}, visibleTo: ${event.visibleTo}`);
      if (event.visibleTo === 'all') {
        // Broadcast to all players in room
        console.log(`[WS] Broadcasting ${event.type} to all players in room ${roomId}`);
        this.broadcastEventToRoom(roomId, event);
      } else if (event.visibleTo === 'player' && event.userId) {
        // Send to specific player only
        console.log(`[WS] Sending ${event.type} to player ${event.userId}`);
        this.sendEventToPlayer(event.userId, event);
      } else if (Array.isArray(event.visibleTo)) {
        // Send to specific list of players
        console.log(`[WS] Sending ${event.type} to ${event.visibleTo.length} specific players`);
        event.visibleTo.forEach(userId => {
          this.sendEventToPlayer(userId, event);
        });
      }
    });
  }

  /**
   * Get connected clients in a room
   */
  public getRoomClients(roomId: string): string[] {
    const roomClients = this.roomClients.get(roomId);
    return roomClients ? Array.from(roomClients) : [];
  }

  /**
   * Check if user is connected
   */
  public isUserConnected(userId: string): boolean {
    const ws = this.clients.get(userId);
    return ws !== undefined && ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let wsServiceInstance: WebSocketService | null = null;

export function initWebSocketService(server: Server): WebSocketService {
  if (!wsServiceInstance) {
    wsServiceInstance = new WebSocketService(server);
    console.log('[WS] WebSocket service initialized');
  }
  return wsServiceInstance;
}

export function getWebSocketService(): WebSocketService {
  if (!wsServiceInstance) {
    throw new Error('WebSocket service not initialized');
  }
  return wsServiceInstance;
}
