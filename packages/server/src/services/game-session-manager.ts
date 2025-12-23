/**
 * Game Session Manager - Manages multiple game instances
 * In production, would use Redis or similar for distributed sessions
 */

import { GameEngine, PLACEHOLDER_EVENTS } from '@survival-game/game-engine';
import { GameState, DEFAULT_GAME_CONFIG } from '@survival-game/shared';
import { randomBytes } from 'crypto';

interface GameSession {
  id: string;
  engine: GameEngine;
  createdAt: number;
  lastActivity: number;
}

export class GameSessionManager {
  private sessions: Map<string, GameSession>;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.sessions = new Map();
    this.startCleanupTimer();
  }

  /**
   * Creates a new game session
   */
  createSession(): { sessionId: string; gameState: GameState; availableChoices: any[] } {
    const sessionId = randomBytes(16).toString('hex');
    const engine = new GameEngine(DEFAULT_GAME_CONFIG);

    // Register placeholder events
    engine.registerEvents(PLACEHOLDER_EVENTS);

    const session: GameSession = {
      id: sessionId,
      engine,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    this.sessions.set(sessionId, session);

    // Start the game
    const gameState = engine.startGame();
    const availableChoices = engine.getAvailableChoices();

    return { sessionId, gameState, availableChoices };
  }

  /**
   * Gets a game session
   */
  getSession(sessionId: string): GameEngine | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Update last activity
    session.lastActivity = Date.now();
    return session.engine;
  }

  /**
   * Deletes a session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Cleans up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
        console.log(`Cleaned up expired session: ${sessionId}`);
      }
    }
  }

  /**
   * Starts periodic cleanup timer
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  /**
   * Gets session count (for monitoring)
   */
  getSessionCount(): number {
    return this.sessions.size;
  }
}
