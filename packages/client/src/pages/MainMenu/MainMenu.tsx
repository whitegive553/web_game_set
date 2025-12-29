/**
 * Main Menu - Entry point after login
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import './MainMenu.css';

export const MainMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    setShowLanguageMenu(false);
  };

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
          <p className="subtitle">{t('mainMenu.subtitle')}</p>
        </div>

        <div className="welcome-section">
          <p className="welcome-text">{t('mainMenu.welcomeBack', { username: user?.username })}</p>
        </div>

        <div className="menu-buttons">
          <button
            className="menu-button primary disabled"
            onClick={handleStartGame}
            disabled
          >
            <span className="button-icon">🔧</span>
            {t('mainMenu.singlePlayerMaintenance')}
          </button>

          <button
            className="menu-button primary"
            onClick={handleMultiplayer}
          >
            <span className="button-icon">👥</span>
            {t('mainMenu.multiplayer')}
          </button>

          <button
            className="menu-button"
            onClick={handleViewHistory}
          >
            <span className="button-icon">📜</span>
            {t('mainMenu.history')}
          </button>

          <button
            className="menu-button"
            onClick={handleViewAchievements}
          >
            <span className="button-icon">🏆</span>
            {t('mainMenu.achievements')}
          </button>

          <button
            className="menu-button"
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
          >
            <span className="button-icon">🌐</span>
            {t('mainMenu.language')}
          </button>

          <button
            className="menu-button secondary"
            onClick={handleLogout}
          >
            <span className="button-icon">🚪</span>
            {t('mainMenu.logout')}
          </button>
        </div>

        {/* Language Menu */}
        {showLanguageMenu && (
          <div className="language-menu">
            <button
              className={`language-option ${i18n.language === 'zh' ? 'active' : ''}`}
              onClick={() => changeLanguage('zh')}
            >
              {t('language.chinese')}
            </button>
            <button
              className={`language-option ${i18n.language === 'en' ? 'active' : ''}`}
              onClick={() => changeLanguage('en')}
            >
              {t('language.english')}
            </button>
          </div>
        )}

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
