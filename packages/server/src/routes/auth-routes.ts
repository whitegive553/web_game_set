/**
 * Authentication Routes
 */

import { Router, Request, Response } from 'express';
import { RegisterRequest, LoginRequest } from '@survival-game/shared';
import { authService } from '../services/auth-service';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    console.log('[Auth] Registration request received');
    const { username, password } = req.body as RegisterRequest;

    if (!username || !password) {
      console.log('[Auth] Registration failed - missing credentials');
      res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
      return;
    }

    console.log('[Auth] Registering user:', username);
    const result = await authService.register(username, password);
    console.log('[Auth] Registration successful for:', username);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Auth] Registration error:', error);

    const message = error instanceof Error ? error.message : 'Registration failed';

    res.status(400).json({
      success: false,
      error: message
    });
  }
});

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as LoginRequest;

    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
      return;
    }

    const result = await authService.login(username, password);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);

    res.status(401).json({
      success: false,
      error: 'Invalid username or password'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side token removal, this is just for consistency)
 */
router.post('/logout', (req: Request, res: Response) => {
  // With JWT, logout is handled client-side by removing the token
  // This endpoint exists for API consistency and future session-based auth
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
});

export default router;
