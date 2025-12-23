/**
 * Save Store - Manages user save data and vaults
 */

import path from 'path';
import { UserProfile, SaveSlot, VaultItem, CurrentRun, Achievement, GameHistoryEntry } from '@survival-game/shared';
import { JsonStore } from '../utils/JsonStore';

const DATA_DIR = path.join(process.cwd(), 'data', 'saves');

class SaveStore {
  private getStore(userId: string): JsonStore<UserProfile> {
    const filePath = path.join(DATA_DIR, `${userId}.json`);
    return new JsonStore<UserProfile>(filePath);
  }

  /**
   * Get user profile (creates default if doesn't exist)
   */
  async getProfile(userId: string): Promise<UserProfile> {
    const store = this.getStore(userId);
    const defaultProfile = this.createDefaultProfile(userId);
    return await store.load(defaultProfile);
  }

  /**
   * Create default profile for new user
   */
  private createDefaultProfile(userId: string): UserProfile {
    const now = Date.now();
    const defaultSlot: SaveSlot = {
      slotId: 'slot-1',
      updatedAt: now,
      currentRun: null,
      unlocked: {
        locations: [],
        anomalies: []
      },
      runHistorySummary: {
        totalRuns: 0,
        totalDeaths: 0,
        successfulEvacuations: 0,
        totalTurns: 0
      }
    };

    return {
      userId,
      activeSaveSlotId: 'slot-1',
      vault: [],
      saves: {
        'slot-1': defaultSlot
      },
      achievements: [],
      history: [],
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Update save slot
   */
  async updateSlot(
    userId: string,
    slotId: string,
    updates: Partial<SaveSlot>
  ): Promise<UserProfile> {
    const store = this.getStore(userId);
    const defaultProfile = this.createDefaultProfile(userId);

    return await store.update(defaultProfile, profile => {
      if (!profile.saves[slotId]) {
        // Create slot if doesn't exist
        profile.saves[slotId] = {
          slotId,
          updatedAt: Date.now(),
          currentRun: null,
          unlocked: {
            locations: [],
            anomalies: []
          },
          runHistorySummary: {
            totalRuns: 0,
            totalDeaths: 0,
            successfulEvacuations: 0,
            totalTurns: 0
          }
        };
      }

      profile.saves[slotId] = {
        ...profile.saves[slotId],
        ...updates,
        updatedAt: Date.now()
      };

      profile.updatedAt = Date.now();
      return profile;
    });
  }

  /**
   * Update current run
   */
  async updateCurrentRun(
    userId: string,
    slotId: string,
    currentRun: CurrentRun | null
  ): Promise<UserProfile> {
    return await this.updateSlot(userId, slotId, { currentRun });
  }

  /**
   * Add item to vault (deduplicates by itemId)
   */
  async addVaultItem(userId: string, item: VaultItem): Promise<UserProfile> {
    const store = this.getStore(userId);
    const defaultProfile = this.createDefaultProfile(userId);

    return await store.update(defaultProfile, profile => {
      // Check if item already exists
      const exists = profile.vault.some(v => v.itemId === item.itemId);

      if (!exists) {
        profile.vault.push(item);
      }

      profile.updatedAt = Date.now();
      return profile;
    });
  }

  /**
   * Remove item from vault
   */
  async removeVaultItem(userId: string, itemId: string): Promise<UserProfile> {
    const store = this.getStore(userId);
    const defaultProfile = this.createDefaultProfile(userId);

    return await store.update(defaultProfile, profile => {
      profile.vault = profile.vault.filter(v => v.itemId !== itemId);
      profile.updatedAt = Date.now();
      return profile;
    });
  }

  /**
   * Set active save slot
   */
  async setActiveSlot(userId: string, slotId: string): Promise<UserProfile> {
    const store = this.getStore(userId);
    const defaultProfile = this.createDefaultProfile(userId);

    return await store.update(defaultProfile, profile => {
      profile.activeSaveSlotId = slotId;
      profile.updatedAt = Date.now();
      return profile;
    });
  }

  /**
   * Delete user's save data
   */
  async delete(userId: string): Promise<void> {
    const store = this.getStore(userId);
    await store.delete();
  }

  /**
   * Unlock achievement (deduplicates by id)
   */
  async unlockAchievement(userId: string, achievement: Achievement): Promise<UserProfile> {
    const store = this.getStore(userId);
    const defaultProfile = this.createDefaultProfile(userId);

    return await store.update(defaultProfile, profile => {
      // Check if achievement already unlocked
      const exists = profile.achievements.some(a => a.id === achievement.id);

      if (!exists) {
        profile.achievements.push(achievement);
      }

      profile.updatedAt = Date.now();
      return profile;
    });
  }

  /**
   * Add game history entry
   */
  async addHistoryEntry(userId: string, entry: GameHistoryEntry): Promise<UserProfile> {
    const store = this.getStore(userId);
    const defaultProfile = this.createDefaultProfile(userId);

    return await store.update(defaultProfile, profile => {
      profile.history.push(entry);
      profile.updatedAt = Date.now();
      return profile;
    });
  }

  /**
   * Get game history
   */
  async getHistory(userId: string): Promise<GameHistoryEntry[]> {
    const profile = await this.getProfile(userId);
    return profile.history;
  }

  /**
   * Get achievements
   */
  async getAchievements(userId: string): Promise<Achievement[]> {
    const profile = await this.getProfile(userId);
    return profile.achievements;
  }
}

// Singleton instance
export const saveStore = new SaveStore();
