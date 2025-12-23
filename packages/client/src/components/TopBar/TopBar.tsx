/**
 * TopBar Component
 * Displays game title, user info, settings, and connection status
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../store/GameContext';
import { useAuth } from '../../store/AuthContext';
import './TopBar.css';

export const TopBar: React.FC = () => {
  const { connectionStatus, openSettings } = useGame();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="top-bar">
      <div className="top-bar__left">
        <h1 className="top-bar__title">禁区记录</h1>
        <div className="top-bar__subtitle">EXCLUSION ZONE</div>
      </div>

      <div className="top-bar__right">
        {/* User Info */}
        {user && (
          <div className="top-bar__user">
            <svg
              className="top-bar__user-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span className="top-bar__username">{user.username}</span>
          </div>
        )}

        {/* Connection Status Indicator */}
        <div className="top-bar__status">
          <div
            className={`status-indicator status-indicator--${connectionStatus.server}`}
            title={`服务器: ${connectionStatus.server}`}
          >
            <span className="status-indicator__dot"></span>
            <span className="status-indicator__label">
              {connectionStatus.server === 'connected' ? '在线' : '离线'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <button
          className="top-bar__button"
          onClick={openSettings}
          title="设置"
        >
          <svg
            className="top-bar__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"></path>
          </svg>
        </button>

        <button
          className="top-bar__button"
          title="帮助"
        >
          <svg
            className="top-bar__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </button>

        {/* Logout Button */}
        {user && (
          <button
            className="top-bar__button top-bar__button--logout"
            onClick={handleLogout}
            title="登出"
          >
            <svg
              className="top-bar__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
