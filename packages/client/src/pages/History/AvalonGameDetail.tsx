/**
 * Avalon Game Detail - View detailed game replay
 * 阿瓦隆对局详情
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AvalonGameRecord,
  AvalonParticipant,
  AvalonHistoryEvent,
  GameStartedEvent,
  RoundStartedEvent,
  TeamProposedEvent,
  TeamVotedEvent,
  QuestResolvedEvent,
  AssassinationEvent,
  GameEndedEvent,
} from '@survival-game/shared';
import './AvalonGameDetail.css';

interface GameDetailData {
  game: AvalonGameRecord;
  participants: AvalonParticipant[];
  events: AvalonHistoryEvent[];
}

export const AvalonGameDetail: React.FC = () => {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const [data, setData] = useState<GameDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGameDetail();
  }, [gameId]);

  const loadGameDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/avalon/history/${gameId}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load game detail');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      console.error('Error loading game detail:', err);
      setError('无法加载对局详情');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/history');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (startedAt: number, endedAt: number) => {
    const seconds = Math.floor((endedAt - startedAt) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes === 0) {
      return `${remainingSeconds}秒`;
    }
    return `${minutes}分${remainingSeconds}秒`;
  };

  const getRoleText = (role: string) => {
    const roleMap: Record<string, string> = {
      merlin: '梅林',
      percival: '派西维尔',
      loyal_servant: '忠臣',
      servant: '忠臣',
      assassin: '刺客',
      morgana: '莫甘娜',
      mordred: '莫德雷德',
      oberon: '奥伯伦',
      minion: '爪牙',
    };
    return roleMap[role] || role;
  };

  const getPlayerName = (seat: number) => {
    return data?.participants.find(p => p.seat === seat)?.username || `Player ${seat + 1}`;
  };

  const renderEvent = (event: AvalonHistoryEvent) => {
    switch (event.type) {
      case 'GAME_STARTED': {
        const e = event as GameStartedEvent;
        return (
          <div key={event.eventId} className="event-item event-game-start">
            <div className="event-icon">🎮</div>
            <div className="event-content">
              <div className="event-title">游戏开始</div>
              <div className="event-desc">{e.payload.playerCount}人局</div>
            </div>
          </div>
        );
      }

      case 'ROUND_STARTED': {
        const e = event as RoundStartedEvent;
        return (
          <div key={event.eventId} className="event-item event-round-start">
            <div className="event-icon">🔄</div>
            <div className="event-content">
              <div className="event-title">第 {e.payload.round} 轮开始</div>
              <div className="event-desc">
                队长: {getPlayerName(e.payload.leaderSeat)}
              </div>
            </div>
          </div>
        );
      }

      case 'TEAM_PROPOSED': {
        const e = event as TeamProposedEvent;
        return (
          <div key={event.eventId} className="event-item event-team-proposal">
            <div className="event-icon">👥</div>
            <div className="event-content">
              <div className="event-title">队伍提名</div>
              <div className="event-desc">
                队长 {getPlayerName(e.payload.leaderSeat)} 提名:
                {e.payload.teamSeats.map(seat => getPlayerName(seat)).join(', ')}
              </div>
            </div>
          </div>
        );
      }

      case 'TEAM_VOTED': {
        const e = event as TeamVotedEvent;
        return (
          <div key={event.eventId} className="event-item event-team-vote">
            <div className="event-icon">{e.payload.passed ? '✅' : '❌'}</div>
            <div className="event-content">
              <div className="event-title">
                组队投票 {e.payload.passed ? '通过' : '失败'}
              </div>
              <div className="event-desc">
                赞成: {e.payload.approveCount} | 反对: {e.payload.rejectCount}
              </div>
              <div className="vote-details">
                {e.payload.votes.map(v => (
                  <span
                    key={v.userId}
                    className={`vote-badge ${v.vote === 'approve' ? 'approve' : 'reject'}`}
                  >
                    {getPlayerName(v.seat)}: {v.vote === 'approve' ? '✓' : '✗'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 'QUEST_RESOLVED': {
        const e = event as QuestResolvedEvent;
        return (
          <div key={event.eventId} className="event-item event-quest">
            <div className="event-icon">{e.payload.questSuccess ? '🏆' : '💥'}</div>
            <div className="event-content">
              <div className="event-title">
                任务 {e.payload.questSuccess ? '成功' : '失败'}
              </div>
              <div className="event-desc">
                成功: {e.payload.successCount} | 失败: {e.payload.failCount}
              </div>
              <div className="event-info">
                执行队员: {e.payload.teamSeats.map(seat => getPlayerName(seat)).join(', ')}
              </div>
            </div>
          </div>
        );
      }

      case 'ASSASSINATION': {
        const e = event as AssassinationEvent;
        return (
          <div key={event.eventId} className="event-item event-assassination">
            <div className="event-icon">🗡️</div>
            <div className="event-content">
              <div className="event-title">
                刺杀 {e.payload.success ? '成功' : '失败'}
              </div>
              <div className="event-desc">
                {getPlayerName(e.payload.assassinSeat)} 刺杀了{' '}
                {getPlayerName(e.payload.targetSeat)}
              </div>
              <div className="event-info">
                目标角色: {getRoleText(e.payload.targetRole)}
              </div>
            </div>
          </div>
        );
      }

      case 'GAME_ENDED': {
        const e = event as GameEndedEvent;
        return (
          <div key={event.eventId} className="event-item event-game-end">
            <div className="event-icon">🏁</div>
            <div className="event-content">
              <div className="event-title">游戏结束</div>
              <div className="event-desc">
                {e.payload.winner === 'good' ? '好人阵营胜利' : '坏人阵营胜利'}
              </div>
              <div className="event-info">原因: {e.payload.reason}</div>
              <div className="event-info">
                比分: 好人 {e.payload.goodScore} - {e.payload.evilScore} 坏人
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="game-detail">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="game-detail">
        <div className="error-message">{error || '数据不存在'}</div>
        <button className="back-button" onClick={handleBack}>
          ← 返回历史记录
        </button>
      </div>
    );
  }

  return (
    <div className="game-detail">
      <div className="detail-container">
        <button className="back-button" onClick={handleBack}>
          ← 返回历史记录
        </button>

        <div className="game-summary">
          <h1>对局详情</h1>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-label">游戏时间</div>
              <div className="summary-value">{formatDate(data.game.startedAt)}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">游戏时长</div>
              <div className="summary-value">
                {formatDuration(data.game.startedAt, data.game.endedAt)}
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-label">玩家人数</div>
              <div className="summary-value">{data.game.playerCount}人</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">获胜方</div>
              <div className={`summary-value ${data.game.outcome.winner}`}>
                {data.game.outcome.winner === 'good' ? '好人阵营' : '坏人阵营'}
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-label">最终比分</div>
              <div className="summary-value">
                {data.game.outcome.goodScore} - {data.game.outcome.evilScore}
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-label">结束原因</div>
              <div className="summary-value">{data.game.outcome.reason}</div>
            </div>
          </div>
        </div>

        <div className="participants-section">
          <h2>玩家信息</h2>
          <div className="participants-grid">
            {data.participants
              .sort((a, b) => a.seat - b.seat)
              .map((p) => (
                <div
                  key={p.userId}
                  className={`participant-card ${p.alignment} ${p.isWinner ? 'winner' : 'loser'}`}
                >
                  <div className="participant-header">
                    <span className="participant-seat">#{p.seat + 1}</span>
                    <span className="participant-name">{p.username}</span>
                    {p.isWinner && <span className="winner-badge">🏆</span>}
                  </div>
                  <div className="participant-info">
                    <div className="role-badge">{getRoleText(p.role)}</div>
                    <div className={`alignment-badge ${p.alignment}`}>
                      {p.alignment === 'good' ? '好人' : '坏人'}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="events-section">
          <h2>对局事件</h2>
          <div className="events-timeline">
            {data.events.map((event) => renderEvent(event))}
          </div>
        </div>
      </div>
    </div>
  );
};
