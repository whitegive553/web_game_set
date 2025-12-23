/**
 * Save/Vault Routes
 */

import { Router, Request, Response } from 'express';
import {
  UpdateSaveRequest,
  AddVaultItemRequest,
  GetSaveResponse,
  UpdateSaveResponse,
  AddVaultItemResponse,
  UnlockAchievementRequest,
  UnlockAchievementResponse,
  AddGameHistoryRequest,
  AddGameHistoryResponse,
  GetHistoryResponse,
  GetAchievementsResponse
} from '@survival-game/shared';
import { requireAuth } from '../middleware/auth';
import { saveStore } from '../services/save-store';

const router = Router();

// All save routes require authentication
router.use(requireAuth);

/**
 * GET /api/save
 * Get user's save data (profile, vault, active slot)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const profile = await saveStore.getProfile(userId);

    const response: GetSaveResponse = {
      profile
    };

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('[Save] Get save error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to load save data'
    });
  }
});

/**
 * PUT /api/save
 * Update user's save slot
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { slotId, currentRun, unlocked, runHistorySummary } = req.body as UpdateSaveRequest;

    if (!slotId) {
      res.status(400).json({
        success: false,
        error: 'Slot ID is required'
      });
      return;
    }

    // Build updates object
    const updates: any = {};
    if (currentRun !== undefined) updates.currentRun = currentRun;
    if (unlocked !== undefined) updates.unlocked = unlocked;
    if (runHistorySummary !== undefined) updates.runHistorySummary = runHistorySummary;

    const profile = await saveStore.updateSlot(userId, slotId, updates);

    const response: UpdateSaveResponse = {
      success: true,
      profile
    };

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('[Save] Update save error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to update save data'
    });
  }
});

/**
 * POST /api/vault/add
 * Add an anomalous item to the vault
 */
router.post('/vault/add', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { item } = req.body as AddVaultItemRequest;

    if (!item || !item.itemId) {
      res.status(400).json({
        success: false,
        error: 'Item data is required'
      });
      return;
    }

    const profile = await saveStore.addVaultItem(userId, item);

    const response: AddVaultItemResponse = {
      success: true,
      vault: profile.vault
    };

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('[Vault] Add item error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to add item to vault'
    });
  }
});

/**
 * DELETE /api/vault/:itemId
 * Remove an item from the vault
 */
router.delete('/vault/:itemId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { itemId } = req.params;

    if (!itemId) {
      res.status(400).json({
        success: false,
        error: 'Item ID is required'
      });
      return;
    }

    const profile = await saveStore.removeVaultItem(userId, itemId);

    res.json({
      success: true,
      data: {
        vault: profile.vault
      }
    });
  } catch (error) {
    console.error('[Vault] Remove item error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to remove item from vault'
    });
  }
});

/**
 * PUT /api/save/active-slot
 * Set the active save slot
 */
router.put('/active-slot', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { slotId } = req.body;

    if (!slotId) {
      res.status(400).json({
        success: false,
        error: 'Slot ID is required'
      });
      return;
    }

    const profile = await saveStore.setActiveSlot(userId, slotId);

    res.json({
      success: true,
      data: {
        profile
      }
    });
  } catch (error) {
    console.error('[Save] Set active slot error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to set active slot'
    });
  }
});

/**
 * POST /api/save/achievement
 * Unlock an achievement
 */
router.post('/achievement', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { achievement } = req.body as UnlockAchievementRequest;

    if (!achievement || !achievement.id) {
      res.status(400).json({
        success: false,
        error: 'Achievement data is required'
      });
      return;
    }

    const profile = await saveStore.unlockAchievement(userId, achievement);

    const response: UnlockAchievementResponse = {
      success: true,
      achievements: profile.achievements
    };

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('[Achievement] Unlock error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to unlock achievement'
    });
  }
});

/**
 * GET /api/save/achievements
 * Get all unlocked achievements
 */
router.get('/achievements', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const achievements = await saveStore.getAchievements(userId);

    // TODO: Load total available achievements from config
    const totalCount = 50; // Placeholder

    const response: GetAchievementsResponse = {
      achievements,
      unlockedCount: achievements.length,
      totalCount
    };

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('[Achievement] Get error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get achievements'
    });
  }
});

/**
 * POST /api/save/history
 * Add a game history entry
 */
router.post('/history', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { entry } = req.body as AddGameHistoryRequest;

    if (!entry || !entry.runId) {
      res.status(400).json({
        success: false,
        error: 'History entry data is required'
      });
      return;
    }

    const profile = await saveStore.addHistoryEntry(userId, entry);

    const response: AddGameHistoryResponse = {
      success: true,
      history: profile.history
    };

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('[History] Add entry error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to add history entry'
    });
  }
});

/**
 * GET /api/save/history
 * Get all game history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const history = await saveStore.getHistory(userId);

    const response: GetHistoryResponse = {
      history
    };

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('[History] Get error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get history'
    });
  }
});

export default router;
