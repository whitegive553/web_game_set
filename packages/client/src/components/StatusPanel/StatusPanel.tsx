/**
 * StatusPanel Component
 * Displays visible player stats (health, stamina, sanity, supplies)
 */

import React from 'react';
import { VisibleStats } from '../../types/game';
import './StatusPanel.css';

interface StatusPanelProps {
  stats: VisibleStats;
}

interface StatBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  icon: React.ReactNode;
  warning?: boolean;
}

const StatBar: React.FC<StatBarProps> = ({ label, value, max, color, icon, warning }) => {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  const isCritical = percentage <= 25;

  return (
    <div className={`stat-bar ${warning || isCritical ? 'stat-bar--warning' : ''}`}>
      <div className="stat-bar__header">
        <div className="stat-bar__icon">{icon}</div>
        <div className="stat-bar__label">{label}</div>
        <div className="stat-bar__value">
          {value}
          <span className="stat-bar__max">/{max}</span>
        </div>
      </div>
      <div className="stat-bar__track">
        <div
          className="stat-bar__fill"
          style={{
            width: `${percentage}%`,
            background: color
          }}
        />
      </div>
    </div>
  );
};

export const StatusPanel: React.FC<StatusPanelProps> = ({ stats }) => {
  return (
    <div className="status-panel">
      <div className="status-panel__title">状态</div>

      <div className="status-panel__stats">
        <StatBar
          label="生命"
          value={stats.health}
          max={100}
          color="linear-gradient(90deg, #ff4444, #cc0000)"
          icon={
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          }
        />

        <StatBar
          label="体力"
          value={stats.stamina}
          max={100}
          color="linear-gradient(90deg, #44ff44, #00cc00)"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          }
        />

        <StatBar
          label="精神"
          value={stats.sanity}
          max={100}
          color="linear-gradient(90deg, #44aaff, #0066cc)"
          warning={stats.sanity < 50}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 2v20M17 7l-5 5 5 5M7 7l5 5-5 5"></path>
            </svg>
          }
        />

        <StatBar
          label="补给"
          value={stats.supplies}
          max={100}
          color="linear-gradient(90deg, #ffaa44, #cc6600)"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            </svg>
          }
        />
      </div>
    </div>
  );
};
