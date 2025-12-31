/**
 * Avalon History Service
 * 阿瓦隆历史记录服务 - 处理游戏事件到历史记录的转换
 */

import { avalonHistoryRepository } from '../repositories/avalon-history-repository';
import {
  AvalonGameRecord,
  AvalonParticipantsRecord,
  AvalonParticipant,
  AvalonHistoryEvent,
  GameStartedEvent,
  RoundStartedEvent,
  TeamProposedEvent,
  TeamVotedEvent,
  QuestResolvedEvent,
  AssassinationEvent,
  GameEndedEvent,
  AvalonUserGameEntry
} from '@survival-game/shared';

export class AvalonHistoryService {
  /**
   * 游戏开始时初始化历史记录
   */
  async onGameStart(matchId: string, gameData: {
    gameId: string;
    roomId: string;
    createdAt: number;
    startedAt: number;
    players: Array<{ userId: string; username: string }>;
    roleAssignments: Record<string, string>;
    config: any;
  }): Promise<void> {
    console.log(`[AvalonHistory] ========== Recording game start: ${gameData.gameId} ==========`);

    // 创建参与者信息
    const participants: AvalonParticipant[] = gameData.players.map((player, index) => {
      const role = gameData.roleAssignments[player.userId];
      const alignment = this.getRoleAlignment(role);

      return {
        userId: player.userId,
        username: player.username,
        seat: index,
        role,
        alignment,
        isWinner: false // 游戏结束时更新
      };
    });

    // 保存参与者信息
    await avalonHistoryRepository.saveParticipants({
      gameId: gameData.gameId,
      participants
    });

    // 追加 GAME_STARTED 事件
    const event: GameStartedEvent = {
      eventId: `${gameData.gameId}_START_${Date.now()}`,
      gameId: gameData.gameId,
      timestamp: gameData.startedAt,
      type: 'GAME_STARTED',
      payload: {
        playerCount: gameData.players.length,
        configSnapshot: gameData.config
      }
    };

    await avalonHistoryRepository.appendEvent(event);
  }

  /**
   * 新一轮开始
   */
  async onRoundStart(gameId: string, roundData: {
    round: number;
    leaderUserId: string;
    leaderIndex: number;
  }): Promise<void> {
    const event: RoundStartedEvent = {
      eventId: `${gameId}_ROUND_${roundData.round}_${Date.now()}`,
      gameId,
      timestamp: Date.now(),
      type: 'ROUND_STARTED',
      payload: {
        round: roundData.round,
        leaderSeat: roundData.leaderIndex,
        leaderUserId: roundData.leaderUserId
      }
    };

    await avalonHistoryRepository.appendEvent(event);
  }

  /**
   * 队伍提名
   */
  async onTeamProposal(gameId: string, proposalData: {
    round: number;
    proposalIndex: number;
    leaderSeat: number;
    teamUserIds: string[];
    players: Array<{ userId: string }>;
  }): Promise<void> {
    // 将 userId 转换为 seat
    const teamSeats = proposalData.teamUserIds.map(userId => {
      const index = proposalData.players.findIndex(p => p.userId === userId);
      return index;
    });

    const event: TeamProposedEvent = {
      eventId: `${gameId}_PROPOSE_${proposalData.round}_${proposalData.proposalIndex}_${Date.now()}`,
      gameId,
      timestamp: Date.now(),
      type: 'TEAM_PROPOSED',
      payload: {
        round: proposalData.round,
        proposalIndex: proposalData.proposalIndex,
        leaderSeat: proposalData.leaderSeat,
        teamSeats
      }
    };

    await avalonHistoryRepository.appendEvent(event);
  }

  /**
   * 组队投票结果
   */
  async onTeamVote(gameId: string, voteData: {
    round: number;
    proposalIndex: number;
    teamVotes: Record<string, boolean>;
    players: Array<{ userId: string }>;
    passed: boolean;
  }): Promise<void> {
    const votes = Object.entries(voteData.teamVotes).map(([userId, approve]) => {
      const seat = voteData.players.findIndex(p => p.userId === userId);
      return {
        seat,
        userId,
        vote: approve ? 'approve' as const : 'reject' as const
      };
    });

    const approveCount = votes.filter(v => v.vote === 'approve').length;
    const rejectCount = votes.filter(v => v.vote === 'reject').length;

    const event: TeamVotedEvent = {
      eventId: `${gameId}_VOTE_${voteData.round}_${voteData.proposalIndex}_${Date.now()}`,
      gameId,
      timestamp: Date.now(),
      type: 'TEAM_VOTED',
      payload: {
        round: voteData.round,
        proposalIndex: voteData.proposalIndex,
        votes,
        approveCount,
        rejectCount,
        passed: voteData.passed
      }
    };

    await avalonHistoryRepository.appendEvent(event);
  }

  /**
   * 任务执行结果
   */
  async onQuestResolved(gameId: string, questData: {
    round: number;
    teamUserIds: string[];
    players: Array<{ userId: string }>;
    successVotes: number;
    failVotes: number;
    questSuccess: boolean;
  }): Promise<void> {
    const teamSeats = questData.teamUserIds.map(userId => {
      return questData.players.findIndex(p => p.userId === userId);
    });

    const event: QuestResolvedEvent = {
      eventId: `${gameId}_QUEST_${questData.round}_${Date.now()}`,
      gameId,
      timestamp: Date.now(),
      type: 'QUEST_RESOLVED',
      payload: {
        round: questData.round,
        teamSeats,
        successCount: questData.successVotes,
        failCount: questData.failVotes,
        questSuccess: questData.questSuccess
      }
    };

    await avalonHistoryRepository.appendEvent(event);
  }

  /**
   * 刺杀事件
   */
  async onAssassination(gameId: string, assassinationData: {
    assassinUserId: string;
    targetUserId: string;
    targetRole: string;
    success: boolean;
    players: Array<{ userId: string }>;
  }): Promise<void> {
    const assassinSeat = assassinationData.players.findIndex(p => p.userId === assassinationData.assassinUserId);
    const targetSeat = assassinationData.players.findIndex(p => p.userId === assassinationData.targetUserId);

    const event: AssassinationEvent = {
      eventId: `${gameId}_ASSASSINATE_${Date.now()}`,
      gameId,
      timestamp: Date.now(),
      type: 'ASSASSINATION',
      payload: {
        assassinSeat,
        targetSeat,
        targetRole: assassinationData.targetRole,
        success: assassinationData.success
      }
    };

    await avalonHistoryRepository.appendEvent(event);
  }

  /**
   * 游戏结束 - 保存完整记录和更新统计
   */
  async onGameEnd(gameData: {
    gameId: string;
    matchId: string;
    roomId: string;
    createdAt: number;
    startedAt: number;
    endedAt: number;
    players: Array<{ userId: string; username: string }>;
    roleAssignments: Record<string, string>;
    winner: 'good' | 'evil';
    reason: string;
    goodScore: number;
    evilScore: number;
    config: any;
  }): Promise<void> {
    console.log(`[AvalonHistory] Recording game end: ${gameData.gameId}, winner: ${gameData.winner}`);

    // 追加 GAME_ENDED 事件
    const endEvent: GameEndedEvent = {
      eventId: `${gameData.gameId}_END_${Date.now()}`,
      gameId: gameData.gameId,
      timestamp: gameData.endedAt,
      type: 'GAME_ENDED',
      payload: {
        winner: gameData.winner,
        reason: gameData.reason,
        goodScore: gameData.goodScore,
        evilScore: gameData.evilScore
      }
    };

    await avalonHistoryRepository.appendEvent(endEvent);

    // 创建参与者信息并标记胜者
    const participants: AvalonParticipant[] = gameData.players.map((player, index) => {
      const role = gameData.roleAssignments[player.userId];
      const alignment = this.getRoleAlignment(role);
      const isWinner = alignment === gameData.winner;

      return {
        userId: player.userId,
        username: player.username,
        seat: index,
        role,
        alignment,
        isWinner
      };
    });

    // 保存对局主信息
    const gameRecord: AvalonGameRecord = {
      gameId: gameData.gameId,
      matchId: gameData.matchId,
      roomId: gameData.roomId,
      createdAt: gameData.createdAt,
      startedAt: gameData.startedAt,
      endedAt: gameData.endedAt,
      playerCount: gameData.players.length,
      configSnapshot: {
        roleConfig: gameData.config.roles,
        questConfig: gameData.config.quests
      },
      outcome: {
        winner: gameData.winner,
        reason: gameData.reason,
        goodScore: gameData.goodScore,
        evilScore: gameData.evilScore
      }
    };

    await avalonHistoryRepository.saveGameRecord(gameRecord);

    // 更新参与者信息（带胜负）
    await avalonHistoryRepository.saveParticipants({
      gameId: gameData.gameId,
      participants
    });

    // 为每个玩家更新统计和索引
    for (const participant of participants) {
      // 更新统计
      await avalonHistoryRepository.updateUserStats(participant.userId, participant);

      // 添加到用户对局索引
      const userGameEntry: AvalonUserGameEntry = {
        gameId: gameData.gameId,
        matchId: gameData.matchId,
        endedAt: gameData.endedAt,
        playerCount: gameData.players.length,
        winner: gameData.winner,
        isWinner: participant.isWinner,
        role: participant.role,
        alignment: participant.alignment
      };

      await avalonHistoryRepository.addGameToUserIndex(participant.userId, userGameEntry);
    }

    console.log(`[AvalonHistory] Game ${gameData.gameId} fully recorded`);
  }

  /**
   * 根据角色获取阵营
   */
  private getRoleAlignment(role: string): 'good' | 'evil' {
    const evilRoles = ['assassin', 'morgana', 'mordred', 'oberon', 'minion'];
    return evilRoles.includes(role) ? 'evil' : 'good';
  }
}

// 单例导出
export const avalonHistoryService = new AvalonHistoryService();
