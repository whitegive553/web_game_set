/**
 * EventLogDrawer Component
 * Displays exploration history
 */

import React from 'react';
import { useGame } from '../../store/GameContext';
import { Drawer } from '../Drawer/Drawer';
import './EventLogDrawer.css';

export const EventLogDrawer: React.FC = () => {
  const { uiState, closeLog, gameState } = useGame();

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Drawer isOpen={uiState.isLogOpen} onClose={closeLog} title="探索记录">
      {gameState.eventLog.length === 0 ? (
        <div className="event-log__empty">
          <svg className="event-log__empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <p>尚无探索记录</p>
        </div>
      ) : (
        <div className="event-log">
          {gameState.eventLog.map((entry) => (
            <div key={entry.id} className="event-log__entry">
              <div className="event-log__header">
                <span className="event-log__turn">回合 {entry.turn}</span>
                <span className="event-log__time">{formatTimestamp(entry.timestamp)}</span>
              </div>

              <div className="event-log__location">
                <svg className="event-log__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                {entry.location}
              </div>

              <div className="event-log__summary">{entry.summary}</div>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
};
