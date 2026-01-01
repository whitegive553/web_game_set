/**
 * Avalon Achievement Service
 * 阿瓦隆成就服务
 *
 * 负责在游戏结束后检查玩家成就并解锁
 * 集成到现有的成就系统中
 */

import { saveStore } from './save-store';
import { AVALON_ACHIEVEMENTS, ACHIEVEMENT_TIERS } from '../config/avalon-achievements';
import { avalonHistoryRepository } from '../repositories/avalon-history-repository';

export class AvalonAchievementService {
  /**
   * 游戏结束后检查所有参与者的成就
   * 在 avalon-history-service 的 onGameEnd() 中调用
   *
   * @param participants 参与者列表
   */
  async checkAchievementsOnGameEnd(participants: Array<{
    userId: string;
    username: string;
  }>): Promise<void> {
    console.log(`[AvalonAchievement] Checking achievements for ${participants.length} players`);

    // 并行检查所有玩家的成就
    await Promise.all(
      participants.map(p => this.checkPlayerAchievements(p.userId))
    );
  }

  /**
   * 检查单个玩家的成就
   * 根据玩家的总游戏场数解锁相应等级的成就
   *
   * @param userId 用户ID
   */
  private async checkPlayerAchievements(userId: string): Promise<void> {
    try {
      // 1. 从 avalon 历史统计中获取玩家总游戏场数
      const stats = await avalonHistoryRepository.getUserStats(userId);
      const totalGames = stats?.totalGames || 0;

      console.log(`[AvalonAchievement] User ${userId} has completed ${totalGames} games`);

      // 2. 检查每个等级是否达到要求
      for (const tier of ACHIEVEMENT_TIERS) {
        if (totalGames >= tier.requirement) {
          // 3. 调用现有成就系统解锁成就
          // unlockAchievement 内部会检查是否已解锁（通过 achievement.id）
          await saveStore.unlockAchievement(userId, {
            ...tier,
            unlockedAt: Date.now()
          });

          console.log(`[AvalonAchievement] Unlocked ${tier.name} for user ${userId} (${totalGames}/${tier.requirement} games)`);
        }
      }
    } catch (error) {
      console.error(`[AvalonAchievement] Error checking achievements for ${userId}:`, error);
      // 不抛出错误，避免影响游戏核心流程
    }
  }
}

// 单例导出
export const avalonAchievementService = new AvalonAchievementService();
