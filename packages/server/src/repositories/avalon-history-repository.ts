/**
 * Avalon History Repository
 * 阿瓦隆历史记录存储层 - 抽象文件系统操作
 * 未来可轻松迁移到数据库
 */

import fs from 'fs/promises';
import path from 'path';
import {
  AvalonGameRecord,
  AvalonParticipantsRecord,
  AvalonHistoryEvent,
  AvalonUserStats,
  AvalonUserGamesIndex,
  AvalonUserGameEntry,
  AvalonParticipant
} from '@survival-game/shared';

const DATA_ROOT = path.join(process.cwd(), 'data', 'avalon');

export class AvalonHistoryRepository {
  /**
   * 确保目录存在
   */
  private async ensureDir(dirPath: string): Promise<void> {
    try {
      console.log(`[AvalonHistory] ========================================`);
      console.log(`[AvalonHistory] Creating directory: ${dirPath}`);
      console.log(`[AvalonHistory] process.cwd(): ${process.cwd()}`);
      console.log(`[AvalonHistory] DATA_ROOT: ${DATA_ROOT}`);
      console.log(`[AvalonHistory] ========================================`);
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`[AvalonHistory] ✓ Directory created successfully: ${dirPath}`);

      // 验证目录是否可写
      const testFile = `${dirPath}/.test`;
      await fs.writeFile(testFile, 'test', 'utf-8');
      try {
        await fs.unlink(testFile);
      } catch (unlinkError: any) {
        // 忽略文件不存在的错误（可能被并发调用删除了）
        if (unlinkError.code !== 'ENOENT') {
          throw unlinkError;
        }
      }
      console.log(`[AvalonHistory] ✓ Directory is writable: ${dirPath}`);
    } catch (error) {
      console.error('[AvalonHistory] ❌ ERROR creating/writing to directory:', dirPath);
      console.error('[AvalonHistory] Error details:', error);
      console.error('[AvalonHistory] Stack:', (error as Error).stack);
      throw error;
    }
  }

  /**
   * 写入对局主信息
   */
  async saveGameRecord(record: AvalonGameRecord): Promise<void> {
    console.log(`[AvalonHistory] Saving game record for: ${record.gameId}`);
    const gameDir = path.join(DATA_ROOT, 'games', record.gameId);
    await this.ensureDir(gameDir);

    const filePath = path.join(gameDir, 'game.json');
    console.log(`[AvalonHistory] Writing to file: ${filePath}`);
    await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');
    console.log(`[AvalonHistory] Successfully saved game record: ${record.gameId}`);
  }

  /**
   * 写入参与者信息
   */
  async saveParticipants(record: AvalonParticipantsRecord): Promise<void> {
    const gameDir = path.join(DATA_ROOT, 'games', record.gameId);
    await this.ensureDir(gameDir);

    const filePath = path.join(gameDir, 'participants.json');
    await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');
    console.log(`[AvalonHistory] Saved participants: ${record.gameId}`);
  }

  /**
   * 追加事件到 events.ndjson（NDJSON 格式：一行一个事件）
   */
  async appendEvent(event: AvalonHistoryEvent): Promise<void> {
    const gameDir = path.join(DATA_ROOT, 'games', event.gameId);
    await this.ensureDir(gameDir);

    const filePath = path.join(gameDir, 'events.ndjson');
    const eventLine = JSON.stringify(event) + '\n';

    await fs.appendFile(filePath, eventLine, 'utf-8');
    console.log(`[AvalonHistory] Appended event: ${event.type} for game ${event.gameId}`);
  }

  /**
   * 读取对局主信息
   */
  async getGameRecord(gameId: string): Promise<AvalonGameRecord | null> {
    try {
      const filePath = path.join(DATA_ROOT, 'games', gameId, 'game.json');
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`[AvalonHistory] Game record not found: ${gameId}`);
      return null;
    }
  }

  /**
   * 读取参与者信息
   */
  async getParticipants(gameId: string): Promise<AvalonParticipantsRecord | null> {
    try {
      const filePath = path.join(DATA_ROOT, 'games', gameId, 'participants.json');
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`[AvalonHistory] Participants not found: ${gameId}`);
      return null;
    }
  }

  /**
   * 读取所有事件
   */
  async getEvents(gameId: string): Promise<AvalonHistoryEvent[]> {
    try {
      const filePath = path.join(DATA_ROOT, 'games', gameId, 'events.ndjson');
      const content = await fs.readFile(filePath, 'utf-8');

      const lines = content.trim().split('\n').filter(line => line.length > 0);
      return lines.map(line => JSON.parse(line));
    } catch (error) {
      console.warn(`[AvalonHistory] Events not found: ${gameId}`);
      return [];
    }
  }

  /**
   * 读取用户统计
   */
  async getUserStats(userId: string): Promise<AvalonUserStats> {
    try {
      const filePath = path.join(DATA_ROOT, 'users', userId, 'stats.json');
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // 如果不存在，返回初始统计
      return {
        userId,
        totalGames: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        goodGames: 0,
        goodWins: 0,
        evilGames: 0,
        evilWins: 0,
        roleCounts: {},
        lastUpdated: Date.now()
      };
    }
  }

  /**
   * 保存用户统计
   */
  async saveUserStats(stats: AvalonUserStats): Promise<void> {
    const userDir = path.join(DATA_ROOT, 'users', stats.userId);
    await this.ensureDir(userDir);

    const filePath = path.join(userDir, 'stats.json');
    await fs.writeFile(filePath, JSON.stringify(stats, null, 2), 'utf-8');
    console.log(`[AvalonHistory] Saved user stats: ${stats.userId}`);
  }

  /**
   * 读取用户对局索引
   */
  async getUserGamesIndex(userId: string): Promise<AvalonUserGamesIndex> {
    try {
      const filePath = path.join(DATA_ROOT, 'users', userId, 'games.json');
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // 如果不存在，返回空索引
      return {
        userId,
        games: [],
        lastUpdated: Date.now()
      };
    }
  }

  /**
   * 保存用户对局索引
   */
  async saveUserGamesIndex(index: AvalonUserGamesIndex): Promise<void> {
    const userDir = path.join(DATA_ROOT, 'users', index.userId);
    await this.ensureDir(userDir);

    const filePath = path.join(userDir, 'games.json');
    await fs.writeFile(filePath, JSON.stringify(index, null, 2), 'utf-8');
    console.log(`[AvalonHistory] Saved user games index: ${index.userId}`);
  }

  /**
   * 为用户添加一条对局记录到索引
   */
  async addGameToUserIndex(userId: string, entry: AvalonUserGameEntry): Promise<void> {
    const index = await this.getUserGamesIndex(userId);

    // 添加到列表开头（最新的在前）
    index.games.unshift(entry);
    index.lastUpdated = Date.now();

    await this.saveUserGamesIndex(index);
  }

  /**
   * 更新用户统计（对局结束后调用）
   */
  async updateUserStats(
    userId: string,
    participant: AvalonParticipant
  ): Promise<void> {
    const stats = await this.getUserStats(userId);

    stats.totalGames++;
    if (participant.isWinner) {
      stats.wins++;
    } else {
      stats.losses++;
    }
    stats.winRate = stats.wins / stats.totalGames;

    if (participant.alignment === 'good') {
      stats.goodGames++;
      if (participant.isWinner) stats.goodWins++;
    } else {
      stats.evilGames++;
      if (participant.isWinner) stats.evilWins++;
    }

    // 更新角色计数
    stats.roleCounts[participant.role] = (stats.roleCounts[participant.role] || 0) + 1;

    stats.lastUpdated = Date.now();

    await this.saveUserStats(stats);
  }
}

// 单例导出
export const avalonHistoryRepository = new AvalonHistoryRepository();
