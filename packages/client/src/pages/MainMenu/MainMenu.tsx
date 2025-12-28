/**
 * Main Menu - Entry point after login
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import './MainMenu.css';

export const MainMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleStartGame = () => {
    navigate('/game/scene-select');
  };

  const handleMultiplayer = () => {
    navigate('/lobby');
  };

  const handleViewHistory = () => {
    navigate('/game/history');
  };

  const handleViewAchievements = () => {
    navigate('/game/achievements');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="main-menu">
      <div className="main-menu-container">
        <div className="main-menu-header">
          <h1>WG553 Game Hub</h1>
          <p className="subtitle">Multiple Games Platform</p>
        </div>

        <div className="welcome-section">
          <p className="welcome-text">欢迎回来，{user?.username}</p>
        </div>

        <div className="menu-buttons">
          <button
            className="menu-button primary disabled"
            onClick={handleStartGame}
            disabled
          >
            <span className="button-icon">🔧</span>
            单人游戏 (维护中)
          </button>

          <button
            className="menu-button primary"
            onClick={handleMultiplayer}
          >
            <span className="button-icon">👥</span>
            多人游戏大厅
          </button>

          <button
            className="menu-button"
            onClick={handleViewHistory}
          >
            <span className="button-icon">📜</span>
            历史记录
          </button>

          <button
            className="menu-button"
            onClick={handleViewAchievements}
          >
            <span className="button-icon">🏆</span>
            成就系统
          </button>

          <button
            className="menu-button secondary"
            onClick={handleLogout}
          >
            <span className="button-icon">🚪</span>
            登出
          </button>
        </div>

        <div className="footer-info">
          <p>
            Built by whitegive553 · {' '}
            <a href="https://whitegive553.github.io/" target="_blank" rel="noopener noreferrer">
              About / Home
            </a>
            {' '} · {' '}
            <a href="mailto:pengze.ai@mail.utoronto.ca">
              Feedback
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
