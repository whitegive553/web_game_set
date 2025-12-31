/**
 * Avalon History - View Avalon game history
 * 阿瓦隆历史记录
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AvalonUserGameEntry, AvalonUserStats } from '@survival-game/shared';
import './AvalonHistory.css';

export const AvalonHistory: React.FC = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<AvalonUserGameEntry[]>([]);
  const [stats, setStats] = useState<AvalonUserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/avalon/history', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load Avalon history');
      }

      const data = await response.json();
      setGames(data.data.games || []);
      setStats(data.data.stats || null);
    } catch (err) {
      console.error('Error loading Avalon history:', err);
      setError('无法加载阿瓦隆历史记录');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const getAlignmentBadge = (alignment: 'good' | 'evil', isWinner: boolean) => {
    const alignmentText = alignment === 'good' ? '好人' : '坏人';
    const winnerClass = isWinner ? 'winner' : 'loser';
    const alignmentClass = alignment === 'good' ? 'good' : 'evil';
    return (
      <span className={`alignment-badge ${alignmentClass} ${winnerClass}`}>
        {isWinner ? '✓ ' : '✗ '}
        {alignmentText}
      </span>
    );
  };

  const handleGameClick = (gameId: string) => {
    navigate(`/avalon/history/${gameId}`);
  };

  if (loading) {
    return (
      <div className="avalon-history">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="avalon-history">
      {error && (
        <div className="error-message">{error}</div>
      )}

      {stats && (
        <div className="stats-panel">
          <h2>个人统计</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">总对局</div>
              <div className="stat-value">{stats.totalGames}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">胜率</div>
              <div className="stat-value">{(stats.winRate * 100).toFixed(1)}%</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">胜/负</div>
              <div className="stat-value">
                <span className="win-count">{stats.wins}</span> /
                <span className="loss-count">{stats.losses}</span>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">好人胜率</div>
              <div className="stat-value">
                {stats.goodGames > 0
                  ? `${((stats.goodWins / stats.goodGames) * 100).toFixed(1)}%`
                  : 'N/A'}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">坏人胜率</div>
              <div className="stat-value">
                {stats.evilGames > 0
                  ? `${((stats.evilWins / stats.evilGames) * 100).toFixed(1)}%`
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      {games.length === 0 && !error && (
        <div className="empty-state">
          <p className="empty-icon">🎲</p>
          <p>还没有阿瓦隆游戏记录</p>
          <p className="empty-hint">开始你的第一次对局吧！</p>
        </div>
      )}

      {games.length > 0 && (
        <div className="games-list">
          <h2>对局历史</h2>
          {games.map((game, index) => (
            <div
              key={game.gameId}
              className="game-entry"
              onClick={() => handleGameClick(game.gameId)}
            >
              <div className="game-header">
                <div className="game-title">
                  <span className="game-number">#{index + 1}</span>
                  <span className="player-count">{game.playerCount}人局</span>
                  {getAlignmentBadge(game.alignment, game.isWinner)}
                </div>
                <div className="game-date">
                  {formatDate(game.endedAt)}
                </div>
              </div>

              <div className="game-info">
                <div className="info-item">
                  <span className="info-label">角色:</span>
                  <span className="info-value role">{getRoleText(game.role)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">获胜方:</span>
                  <span className={`info-value ${game.winner}`}>
                    {game.winner === 'good' ? '好人阵营' : '坏人阵营'}
                  </span>
                </div>
              </div>

              <div className="game-click-hint">
                点击查看详情 →
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
