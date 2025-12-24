/**
 * Achievements - View unlocked achievements
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Achievement } from '@survival-game/shared';
import './Achievements.css';

export const Achievements: React.FC = () => {
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/save/achievements', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load achievements');
      }

      const data = await response.json();
      setAchievements(data.data.achievements || []);
      setUnlockedCount(data.data.unlockedCount || 0);
      setTotalCount(data.data.totalCount || 0);
    } catch (err) {
      console.error('Error loading achievements:', err);
      setError('无法加载成就数据');
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
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'exploration':
        return '🗺️';
      case 'survival':
        return '❤️';
      case 'discovery':
        return '🔍';
      case 'story':
        return '📖';
      case 'special':
        return '⭐';
      default:
        return '🏆';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'exploration':
        return '探索';
      case 'survival':
        return '生存';
      case 'discovery':
        return '发现';
      case 'story':
        return '剧情';
      case 'special':
        return '特殊';
      default:
        return '其他';
    }
  };

  const groupByCategory = (achievements: Achievement[]) => {
    const grouped: Record<string, Achievement[]> = {};
    achievements.forEach((ach) => {
      if (!grouped[ach.category]) {
        grouped[ach.category] = [];
      }
      grouped[ach.category].push(ach);
    });
    return grouped;
  };

  const progressPercentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <div className="achievements">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  const groupedAchievements = groupByCategory(achievements);
  const categories = ['exploration', 'survival', 'discovery', 'story', 'special'];

  return (
    <div className="achievements">
      <div className="achievements-container">
        <div className="achievements-header">
          <button className="back-button" onClick={handleBack}>
            ← 返回主菜单
          </button>
          <h1>成就系统</h1>
          <p className="header-subtitle">Achievements</p>
        </div>

        {error && (
          <div className="error-message">{error}</div>
        )}

        <div className="progress-section">
          <div className="progress-info">
            <span className="progress-text">总进度</span>
            <span className="progress-count">
              {unlockedCount} / {totalCount}
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="progress-percentage">
            {progressPercentage.toFixed(1)}%
          </div>
        </div>

        {achievements.length === 0 && !error && (
          <div className="empty-state">
            <p className="empty-icon">🏆</p>
            <p>还没有解锁任何成就</p>
            <p className="empty-hint">探索禁区，解锁你的第一个成就！</p>
          </div>
        )}

        {achievements.length > 0 && (
          <div className="achievements-list">
            {categories.map((category) => {
              const categoryAchievements = groupedAchievements[category];
              if (!categoryAchievements || categoryAchievements.length === 0) {
                return null;
              }

              return (
                <div key={category} className="category-section">
                  <div className="category-header">
                    <span className="category-icon">{getCategoryIcon(category)}</span>
                    <h2>{getCategoryName(category)}</h2>
                    <span className="category-count">
                      {categoryAchievements.length}
                    </span>
                  </div>

                  <div className="category-achievements">
                    {categoryAchievements.map((achievement) => (
                      <div key={achievement.id} className="achievement-card">
                        <div className="achievement-icon">
                          {achievement.icon || '🏆'}
                        </div>
                        <div className="achievement-content">
                          <h3>{achievement.name}</h3>
                          <p className="achievement-description">
                            {achievement.description}
                          </p>
                          <p className="achievement-date">
                            解锁于 {formatDate(achievement.unlockedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
