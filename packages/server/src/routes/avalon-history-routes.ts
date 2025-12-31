/**
 * Avalon History API Routes
 * 阿瓦隆历史记录 API 路由
 */

import { Router, Request, Response } from 'express';
import { avalonHistoryRepository } from '../repositories/avalon-history-repository';
import { requireAuth } from '../middleware/auth';
import { AvalonParticipant } from '@survival-game/shared';

const router = Router();

/**
 * GET /api/avalon/history
 * 获取当前用户的历史对局列表和统计
 */
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // 获取用户对局索引
    const gamesIndex = await avalonHistoryRepository.getUserGamesIndex(userId);

    // 获取用户统计
    const stats = await avalonHistoryRepository.getUserStats(userId);

    res.json({
      success: true,
      data: {
        games: gamesIndex.games,
        stats
      }
    });
  } catch (error) {
    console.error('[AvalonHistory] Error fetching history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

/**
 * GET /api/avalon/history/:gameId
 * 获取指定对局的详细信息（战报）
 */
router.get('/history/:gameId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // 获取对局主信息
    const game = await avalonHistoryRepository.getGameRecord(gameId);
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    // 获取参与者信息
    const participantsRecord = await avalonHistoryRepository.getParticipants(gameId);
    if (!participantsRecord) {
      return res.status(404).json({ success: false, error: 'Participants not found' });
    }

    // 验证当前用户是否参与了这局游戏
    const isParticipant = participantsRecord.participants.some((p: AvalonParticipant) => p.userId === userId);
    if (!isParticipant) {
      return res.status(403).json({ success: false, error: 'You did not participate in this game' });
    }

    // 获取事件列表
    const events = await avalonHistoryRepository.getEvents(gameId);

    res.json({
      success: true,
      data: {
        game,
        participants: participantsRecord.participants,
        events
      }
    });
  } catch (error) {
    console.error('[AvalonHistory] Error fetching game detail:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch game detail' });
  }
});

export default router;
