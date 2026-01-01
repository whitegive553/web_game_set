/**
 * Avalon Achievement Definitions
 * 阿瓦隆成就定义
 *
 * 使用现有成就系统的 Achievement 接口
 * 存储在用户档案中的 achievements 数组
 */

import { Achievement } from '@survival-game/shared';

/**
 * 阿瓦隆成就常量
 * 包含三个等级：青铜、白银、黄金
 */
export const AVALON_ACHIEVEMENTS = {
  // 参与者成就 - 青铜级 (20场)
  PARTICIPANT_BRONZE: {
    id: 'avalon_participant_bronze',
    name: '阿瓦隆参与者 · 青铜',
    description: '完成 20 场阿瓦隆游戏',
    icon: '🥉',
    category: 'special',
    requirement: 20
  } as Omit<Achievement, 'unlockedAt'> & { requirement: number },

  // 参与者成就 - 白银级 (50场)
  PARTICIPANT_SILVER: {
    id: 'avalon_participant_silver',
    name: '阿瓦隆参与者 · 白银',
    description: '完成 50 场阿瓦隆游戏',
    icon: '🥈',
    category: 'special',
    requirement: 50
  } as Omit<Achievement, 'unlockedAt'> & { requirement: number },

  // 参与者成就 - 黄金级 (70场)
  PARTICIPANT_GOLD: {
    id: 'avalon_participant_gold',
    name: '阿瓦隆参与者 · 黄金',
    description: '完成 70 场阿瓦隆游戏',
    icon: '🥇',
    category: 'special',
    requirement: 70
  } as Omit<Achievement, 'unlockedAt'> & { requirement: number }
};

/**
 * 成就等级列表（按要求从低到高排序）
 * 用于遍历检查
 */
export const ACHIEVEMENT_TIERS = [
  AVALON_ACHIEVEMENTS.PARTICIPANT_BRONZE,
  AVALON_ACHIEVEMENTS.PARTICIPANT_SILVER,
  AVALON_ACHIEVEMENTS.PARTICIPANT_GOLD
];
