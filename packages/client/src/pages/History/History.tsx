/**
 * History - View game history and past runs
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameHistoryEntry } from '@survival-game/shared';
import './History.css';

export const History: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/save/history', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load history');
      }

      const data = await response.json();
      setHistory(data.data.history || []);
    } catch (err) {
      console.error('Error loading history:', err);
      setError('无法加载历史记录');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/game');
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

  const formatDuration = (startedAt: number, endedAt: number) => {
    const minutes = Math.floor((endedAt - startedAt) / 60000);
    if (minutes < 60) {
      return `${minutes} 分钟`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} 小时 ${remainingMinutes} 分钟`;
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'death':
        return '💀';
      case 'evacuation':
        return '✅';
      case 'abandoned':
        return '🚪';
      default:
        return '❓';
    }
  };

  const getOutcomeText = (outcome: string) => {
    switch (outcome) {
      case 'death':
        return '死亡';
      case 'evacuation':
        return '成功撤离';
      case 'abandoned':
        return '放弃';
      default:
        return '未知';
    }
  };

  const getOutcomeClass = (outcome: string) => {
    switch (outcome) {
      case 'death':
        return 'outcome-death';
      case 'evacuation':
        return 'outcome-success';
      case 'abandoned':
        return 'outcome-abandoned';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="history">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="history">
      <div className="history-container">
        <div className="history-header">
          <button className="back-button" onClick={handleBack}>
            ← 返回主菜单
          </button>
          <h1>历史记录</h1>
          <p className="header-subtitle">Game History</p>
        </div>

        {error && (
          <div className="error-message">{error}</div>
        )}

        {history.length === 0 && !error && (
          <div className="empty-state">
            <p className="empty-icon">📝</p>
            <p>还没有游戏记录</p>
            <p className="empty-hint">开始你的第一次探索吧！</p>
          </div>
        )}

        {history.length > 0 && (
          <div className="history-list">
            {history.slice().reverse().map((entry, index) => (
              <div key={entry.runId} className="history-entry">
                <div className="entry-header">
                  <div className="entry-title">
                    <span className="entry-number">#{history.length - index}</span>
                    <h3>{entry.sceneName}</h3>
                    <span className={`outcome-badge ${getOutcomeClass(entry.outcome)}`}>
                      {getOutcomeIcon(entry.outcome)} {getOutcomeText(entry.outcome)}
                    </span>
                  </div>
                  <div className="entry-date">
                    {formatDate(entry.startedAt)}
                  </div>
                </div>

                <div className="entry-stats">
                  <div className="stat">
                    <span className="stat-label">步数:</span>
                    <span className="stat-value">{entry.finalStats.turnCount}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">最终生命:</span>
                    <span className="stat-value health">{entry.finalStats.health}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">最终体力:</span>
                    <span className="stat-value stamina">{entry.finalStats.stamina}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">游戏时长:</span>
                    <span className="stat-value">{formatDuration(entry.startedAt, entry.endedAt)}</span>
                  </div>
                </div>

                {entry.summary && (
                  <div className="entry-summary">
                    <p>{entry.summary}</p>
                  </div>
                )}

                {entry.achievementsUnlocked && entry.achievementsUnlocked.length > 0 && (
                  <div className="entry-achievements">
                    <span className="achievements-label">解锁成就:</span>
                    {entry.achievementsUnlocked.map((achId) => (
                      <span key={achId} className="achievement-badge">
                        🏆 {achId}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
