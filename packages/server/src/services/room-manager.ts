/**
 * Room Manager
 * Platform-level room management for all games
 */

import path from 'path';
import { GameMatch, PluginGamePlayer, AvalonRoomConfig } from '@survival-game/shared';
import { JsonStore } from '../utils/JsonStore';

export interface Room {
  roomId: string;
  gameId: string;         // 'avalon', 'text-adventure', etc.
  hostUserId: string;
  name: string;
  maxPlayers: number;
  players: PluginGamePlayer[];
  match?: GameMatch;      // Active game match
  createdAt: number;
  status: 'lobby' | 'playing' | 'finished';

  // Track original players when game starts (for reconnection control)
  originalPlayers?: string[];  // userIds of players when game started
  gameStartedAt?: number;      // Timestamp when game started (for auto-cleanup)

  // Game-specific configuration (e.g., Avalon role config)
  avalonConfig?: AvalonRoomConfig;
}

interface RoomsData {
  rooms: Record<string, Room>;
}

const DATA_DIR = path.join(process.cwd(), 'data', 'rooms');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');

class RoomManager {
  private store: JsonStore<RoomsData>;
  private rooms: Map<string, Room> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly ROOM_MAX_AGE = 10 * 60 * 60 * 1000; // 10 hours in milliseconds
  private readonly GAME_MAX_DURATION = 5 * 60 * 60 * 1000; // 5 hours in milliseconds

  constructor() {
    this.store = new JsonStore<RoomsData>(ROOMS_FILE);
    this.loadRooms();
    this.startCleanupTimer();
  }

  private async loadRooms(): Promise<void> {
    const data = await this.store.load({ rooms: {} });
    Object.values(data.rooms).forEach(room => {
      // Only load active rooms
      if (room.status !== 'finished') {
        this.rooms.set(room.roomId, room);
      }
    });
  }

  /**
   * Create a new room
   */
  async createRoom(gameId: string, hostUserId: string, name: string, maxPlayers: number): Promise<Room> {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const room: Room = {
      roomId,
      gameId,
      hostUserId,
      name,
      maxPlayers,
      players: [],
      createdAt: Date.now(),
      status: 'lobby',
    };

    this.rooms.set(roomId, room);
    await this.persist();

    return room;
  }

  /**
   * Get room by ID
   */
  getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) || null;
  }

  /**
   * List all active rooms for a game
   * Returns rooms in 'lobby' or 'playing' status (not 'finished')
   */
  listRooms(gameId?: string): Room[] {
    const allRooms = Array.from(this.rooms.values());
    if (gameId) {
      return allRooms.filter(r => r.gameId === gameId && (r.status === 'lobby' || r.status === 'playing'));
    }
    return allRooms.filter(r => r.status === 'lobby' || r.status === 'playing');
  }

  /**
   * Get all rooms regardless of status
   */
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Join a room
   * - Lobby rooms: anyone can join
   * - Playing rooms: only original players can rejoin
   */
  async joinRoom(roomId: string, userId: string, username: string): Promise<Room> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Check if user is already in this room
    const existingPlayer = room.players.find(p => p.userId === userId);
    if (existingPlayer) {
      // User is already in this room, update connection status and return
      console.log(`[RoomManager] User ${userId} already in room ${roomId}, updating connection status`);
      existingPlayer.connected = true;
      await this.persist();
      return room;
    }

    // Handle joining based on room status
    if (room.status === 'lobby') {
      // Lobby: normal join logic
      if (room.players.length >= room.maxPlayers) {
        throw new Error('Room is full');
      }

      // Check if user is in a different room and remove them
      const existingRoom = this.findRoomByUserId(userId);
      if (existingRoom && existingRoom.roomId !== roomId) {
        console.log(`[RoomManager] User ${userId} is in room ${existingRoom.roomId}, leaving before joining ${roomId}`);
        await this.leaveRoom(existingRoom.roomId, userId);
      }

      const player: PluginGamePlayer = {
        userId,
        username,
        ready: false,
        connected: true,
      };

      room.players.push(player);
      await this.persist();

      return room;
    } else if (room.status === 'playing') {
      // Playing: only original players can rejoin
      if (!room.originalPlayers || !room.originalPlayers.includes(userId)) {
        throw new Error('Only original players can rejoin a game in progress');
      }

      // Re-add the player (they must have left during the game)
      const player: PluginGamePlayer = {
        userId,
        username,
        ready: true,  // Keep them ready since game is ongoing
        connected: true,
      };

      room.players.push(player);
      await this.persist();

      console.log(`[RoomManager] Original player ${userId} rejoined playing room ${roomId}`);
      return room;
    } else {
      throw new Error('Cannot join a finished game');
    }
  }

  /**
   * Leave a room
   */
  async leaveRoom(roomId: string, userId: string): Promise<Room> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    room.players = room.players.filter(p => p.userId !== userId);

    // If host left, assign new host or delete room
    if (room.hostUserId === userId) {
      if (room.players.length > 0) {
        room.hostUserId = room.players[0].userId;
      } else {
        // Room empty, delete it
        this.rooms.delete(roomId);
        await this.persist();
        return room;
      }
    }

    await this.persist();
    return room;
  }

  /**
   * Set player ready status
   */
  async setReady(roomId: string, userId: string, ready: boolean): Promise<Room> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const player = room.players.find(p => p.userId === userId);
    if (!player) {
      throw new Error('Player not in room');
    }

    player.ready = ready;
    await this.persist();

    return room;
  }

  /**
   * Start game
   * Records original players and start time for reconnection control and auto-cleanup
   */
  async startGame(roomId: string, match: GameMatch): Promise<Room> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    room.match = match;
    room.status = 'playing';

    // Record original players for reconnection control
    room.originalPlayers = room.players.map(p => p.userId);

    // Record game start time for auto-cleanup (5 hours)
    room.gameStartedAt = Date.now();

    console.log(`[RoomManager] Game started in room ${roomId} with ${room.originalPlayers.length} players`);

    await this.persist();

    return room;
  }

  /**
   * End game
   */
  async endGame(roomId: string): Promise<Room> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    room.status = 'finished';
    room.match = undefined;

    // Reset all players to not ready
    room.players.forEach(p => p.ready = false);

    await this.persist();
    return room;
  }

  /**
   * Reset room for "Play Again"
   * Changes status from 'playing' or 'finished' back to 'lobby'
   * Resets all players to not ready
   * Clears match data
   */
  async resetRoom(roomId: string): Promise<Room> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Reset room state
    room.status = 'lobby';
    room.match = undefined;
    room.originalPlayers = undefined;
    room.gameStartedAt = undefined;

    // Reset all players to not ready
    room.players.forEach(p => p.ready = false);

    await this.persist();
    return room;
  }

  /**
   * Delete room
   */
  async deleteRoom(roomId: string): Promise<void> {
    this.rooms.delete(roomId);
    await this.persist();
  }

  /**
   * Update Avalon room configuration (host only, lobby only)
   */
  async updateAvalonConfig(roomId: string, userId: string, config: AvalonRoomConfig): Promise<Room> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Only host can update config
    if (room.hostUserId !== userId) {
      throw new Error('Only host can update room configuration');
    }

    // Only allow updates in lobby
    if (room.status !== 'lobby') {
      throw new Error('Cannot update configuration after game has started');
    }

    // Only for Avalon games
    if (room.gameId !== 'avalon') {
      throw new Error('Configuration updates only available for Avalon games');
    }

    // Validate target player count against current players
    if (config.targetPlayerCount < room.players.length) {
      throw new Error(
        `Target player count (${config.targetPlayerCount}) cannot be less than current player count (${room.players.length})`
      );
    }

    // Update room's maxPlayers to match target
    room.maxPlayers = config.targetPlayerCount;
    room.avalonConfig = config;

    await this.persist();
    return room;
  }

  /**
   * Find room by userId
   */
  findRoomByUserId(userId: string): Room | null {
    for (const room of this.rooms.values()) {
      if (room.players.some(p => p.userId === userId)) {
        return room;
      }
    }
    return null;
  }

  /**
   * Remove player from any room they're in
   * Used when player disconnects
   */
  async removePlayerFromAllRooms(userId: string): Promise<void> {
    const room = this.findRoomByUserId(userId);
    if (room) {
      console.log(`[RoomManager] Removing disconnected player ${userId} from room ${room.roomId}`);
      await this.leaveRoom(room.roomId, userId);
    }
  }

  /**
   * Start cleanup timer to remove old rooms
   */
  private startCleanupTimer(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldRooms();
    }, 60 * 60 * 1000); // 1 hour

    // Also run on startup
    this.cleanupOldRooms();
  }

  /**
   * Clean up old rooms:
   * - Rooms older than 10 hours (based on creation time)
   * - Games running longer than 5 hours (based on game start time)
   */
  private async cleanupOldRooms(): Promise<void> {
    const now = Date.now();
    const roomsToDelete: string[] = [];

    for (const [roomId, room] of this.rooms.entries()) {
      let shouldDelete = false;
      let reason = '';

      // Check room age (10 hours since creation)
      const roomAge = now - room.createdAt;
      if (roomAge > this.ROOM_MAX_AGE) {
        shouldDelete = true;
        reason = `room age: ${Math.round(roomAge / 1000 / 60 / 60)}h`;
      }

      // Check game duration for playing rooms (5 hours since game start)
      if (room.status === 'playing' && room.gameStartedAt) {
        const gameDuration = now - room.gameStartedAt;
        if (gameDuration > this.GAME_MAX_DURATION) {
          shouldDelete = true;
          reason = `game running for ${Math.round(gameDuration / 1000 / 60 / 60)}h (max 5h)`;
        }
      }

      if (shouldDelete) {
        console.log(`[RoomManager] Cleaning up room ${roomId} (${reason})`);
        roomsToDelete.push(roomId);
      }
    }

    for (const roomId of roomsToDelete) {
      this.rooms.delete(roomId);
    }

    if (roomsToDelete.length > 0) {
      await this.persist();
      console.log(`[RoomManager] Cleaned up ${roomsToDelete.length} old rooms`);
    }
  }

  /**
   * Persist rooms to disk
   */
  private async persist(): Promise<void> {
    const roomsData: RoomsData = {
      rooms: Object.fromEntries(this.rooms.entries()),
    };
    await this.store.save(roomsData);
  }

  /**
   * Shutdown cleanup timer
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
let roomManagerInstance: RoomManager | null = null;

export function getRoomManager(): RoomManager {
  if (!roomManagerInstance) {
    roomManagerInstance = new RoomManager();
  }
  return roomManagerInstance;
}

export { RoomManager };
