/**
 * FooterActions Component
 * Bottom action buttons for inventory, log, and evacuation
 */

import React from 'react';
import { useGame } from '../../store/GameContext';
import './FooterActions.css';

export const FooterActions: React.FC = () => {
  const { openInventory, openLog, endSession, gameState } = useGame();

  return (
    <div className="footer-actions">
      <button
        className="footer-actions__button"
        onClick={openLog}
        disabled={gameState.eventLog.length === 0}
      >
        <svg className="footer-actions__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <span>探索记录</span>
        {gameState.eventLog.length > 0 && (
          <span className="footer-actions__badge">{gameState.eventLog.length}</span>
        )}
      </button>

      <button
        className="footer-actions__button"
        onClick={openInventory}
        disabled={gameState.inventory.length === 0}
      >
        <svg className="footer-actions__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="3" x2="9" y2="21"></line>
        </svg>
        <span>背包</span>
        {gameState.inventory.some(item => item.isAnomalous) && (
          <span className="footer-actions__badge footer-actions__badge--anomalous">!</span>
        )}
      </button>

      <button
        className="footer-actions__button footer-actions__button--danger"
        onClick={() => {
          if (confirm('确定要撤离吗？这将结束当前探索。')) {
            endSession();
          }
        }}
      >
        <svg className="footer-actions__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        <span>撤离</span>
      </button>
    </div>
  );
};
