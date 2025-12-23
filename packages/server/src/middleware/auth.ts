/**
 * Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { User } from '@survival-game/shared';
import { authService } from '../services/auth-service';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Middleware to require authentication
 * Extracts JWT from Authorization header and verifies it
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No authentication token provided'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token and get user
    const user = await authService.verifyToken(token);

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token'
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if not
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await authService.verifyToken(token);
      req.user = user;
    }
  } catch (error) {
    // Silently ignore invalid tokens
  }

  next();
}
