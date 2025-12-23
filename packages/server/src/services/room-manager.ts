/**
 * Room Manager
 * Platform-level room management for all games
 */

import path from 'path';
import { GameMatch, PluginGamePlayer } from '@survival-game/shared';
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
   */
  listRooms(gameId?: string): Room[] {
    const allRooms = Array.from(this.rooms.values());
    if (gameId) {
      return allRooms.filter(r => r.gameId === gameId && r.status === 'lobby');
    }
    return allRooms.filter(r => r.status === 'lobby');
  }

  /**
   * Get all rooms regardless of status
   */
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Join a room
   */
  async joinRoom(roomId: string, userId: string, username: string): Promise<Room> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status !== 'lobby') {
      throw new Error('Room is not in lobby');
    }

    if (room.players.length >= room.maxPlayers) {
      throw new Error('Room is full');
    }

    // Check if user is already in this room
    if (room.players.some(p => p.userId === userId)) {
      // User is already in this room, just return it
      console.log(`[RoomManager] User ${userId} already in room ${roomId}, returning existing room`);
      return room;
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
   */
  async startGame(roomId: string, match: GameMatch): Promise<Room> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    room.match = match;
    room.status = 'playing';
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
   * Delete room
   */
  async deleteRoom(roomId: string): Promise<void> {
    this.rooms.delete(roomId);
    await this.persist();
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
   * Clean up rooms older than 10 hours
   */
  private async cleanupOldRooms(): Promise<void> {
    const now = Date.now();
    const roomsToDelete: string[] = [];

    for (const [roomId, room] of this.rooms.entries()) {
      const age = now - room.createdAt;
      if (age > this.ROOM_MAX_AGE) {
        console.log(`[RoomManager] Cleaning up old room ${roomId} (age: ${Math.round(age / 1000 / 60 / 60)}h)`);
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
