/**
 * Auth Service - Handles user authentication
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { User, UserInternal, JWTPayload } from '@survival-game/shared';
import { userStore } from './user-store';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const JWT_EXPIRES_IN = '7d'; // 7 days
const BCRYPT_ROUNDS = 10;

export class AuthService {
  /**
   * Register new user
   */
  async register(username: string, password: string): Promise<{ user: User; token: string }> {
    console.log('[AuthService] Starting registration for username:', username);

    // Validate username
    if (!username || username.length < 3 || username.length > 20) {
      throw new Error('Username must be 3-20 characters');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }

    // Validate password
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Check if username already exists
    console.log('[AuthService] Checking if username exists...');
    const existing = await userStore.findByUsername(username);
    if (existing) {
      throw new Error('Username already exists');
    }

    // Hash password
    console.log('[AuthService] Hashing password...');
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user
    console.log('[AuthService] Creating user...');
    const userId = randomBytes(16).toString('hex');
    const userInternal: UserInternal = {
      id: userId,
      username,
      passwordHash,
      createdAt: Date.now()
    };

    await userStore.create(userInternal);
    console.log('[AuthService] User created successfully');

    // Generate token
    const token = this.generateToken(userId, username);

    // Return public user data
    const user: User = {
      id: userId,
      username,
      createdAt: userInternal.createdAt
    };

    console.log('[AuthService] Registration complete');
    return { user, token };
  }

  /**
   * Login user
   */
  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    // Find user
    const userInternal = await userStore.findByUsername(username);
    if (!userInternal) {
      // Use generic error to avoid leaking user existence
      throw new Error('Invalid username or password');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, userInternal.passwordHash);
    if (!isValid) {
      throw new Error('Invalid username or password');
    }

    // Generate token
    const token = this.generateToken(userInternal.id, userInternal.username);

    // Return public user data
    const user: User = {
      id: userInternal.id,
      username: userInternal.username,
      createdAt: userInternal.createdAt
    };

    return { user, token };
  }

  /**
   * Verify JWT token and return user
   */
  async verifyToken(token: string): Promise<User> {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;

      // Get user from database
      const userInternal = await userStore.findById(payload.userId);
      if (!userInternal) {
        throw new Error('User not found');
      }

      return {
        id: userInternal.id,
        username: userInternal.username,
        createdAt: userInternal.createdAt
      };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generate JWT token
   */
  private generateToken(userId: string, username: string): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId,
      username
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });
  }
}

// Singleton instance
export const authService = new AuthService();
