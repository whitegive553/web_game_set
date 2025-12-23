/**
 * Scene Component
 * Displays the main background and location information
 */

import React from 'react';
import { useGame } from '../../store/GameContext';
import './Scene.css';

export const Scene: React.FC = () => {
  const { gameState } = useGame();

  // TODO: Dynamic background based on location
  const getBackgroundImage = (_location: string): string => {
    // Placeholder: return different backgrounds for different locations
    // For now, use a gradient
    return '';
  };

  const backgroundImage = getBackgroundImage(gameState.location);

  return (
    <div className="scene">
      {/* Background Layer */}
      <div
        className="scene__background"
        style={{
          backgroundImage: backgroundImage || 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%)'
        }}
      />

      {/* Overlay for text readability */}
      <div className="scene__overlay" />

      {/* Location Badge */}
      {gameState.location && gameState.location !== '未知' && (
        <div className="scene__location-badge">
          <div className="scene__location-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <div className="scene__location-text">
            <div className="scene__location-label">当前位置</div>
            <div className="scene__location-name">{gameState.location}</div>
          </div>
        </div>
      )}

      {/* Anomaly Hint (subtle) */}
      {gameState.anomalyHint && (
        <div className="scene__anomaly-hint">
          <div className="scene__anomaly-icon">?</div>
          <div className="scene__anomaly-text">{gameState.anomalyHint}</div>
        </div>
      )}

      {/* Turn Counter */}
      {gameState.turnCount > 0 && (
        <div className="scene__turn-counter">
          <span className="scene__turn-label">回合</span>
          <span className="scene__turn-number">{gameState.turnCount}</span>
        </div>
      )}
    </div>
  );
};
