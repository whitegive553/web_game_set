/**
 * GamePage Component
 * Main game interface that combines all UI components
 */

import React, { useEffect } from 'react';
import { useGame } from '../../store/GameContext';
import { TopBar } from '../../components/TopBar/TopBar';
import { Scene } from '../../components/Scene/Scene';
import { StatusPanel } from '../../components/StatusPanel/StatusPanel';
import { NarrativeBox } from '../../components/NarrativeBox/NarrativeBox';
import { ChoiceList } from '../../components/ChoiceList/ChoiceList';
import { FooterActions } from '../../components/FooterActions/FooterActions';
import { EventLogDrawer } from '../../components/EventLog/EventLogDrawer';
import { InventoryDrawer } from '../../components/Inventory/InventoryDrawer';
import { GamePhase } from '../../types/game';
import './GamePage.css';

export const GamePage: React.FC = () => {
  const { gameState, uiState, startNewGame, makeChoice, respawn } = useGame();

  // Keyboard shortcuts for choices
  useEffect(() => {
    if (gameState.phase !== GamePhase.PLAYING || gameState.choices.length === 0) {
      return;
    }

    const handleKeyPress = (e: KeyboardEvent) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= gameState.choices.length) {
        const choice = gameState.choices[num - 1];
        if (!choice.disabled) {
          makeChoice(choice.id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [gameState.phase, gameState.choices, makeChoice]);

  // Title Screen
  if (gameState.phase === GamePhase.TITLE) {
    return (
      <div className="game-page">
        <div className="title-screen">
          <div className="title-screen__content">
            <h1 className="title-screen__title">禁区记录</h1>
            <div className="title-screen__subtitle">EXCLUSION ZONE</div>
            <p className="title-screen__tagline">
              在规则失效的地方，只有记忆能够留存
            </p>

            <button
              className="title-screen__button"
              onClick={startNewGame}
              disabled={uiState.isLoading}
            >
              {uiState.isLoading ? '连接中...' : '进入禁区'}
            </button>

            {uiState.error && (
              <div className="title-screen__error">{uiState.error}</div>
            )}
          </div>

          <div className="title-screen__overlay" />
        </div>
      </div>
    );
  }

  // Death Screen
  if (gameState.phase === GamePhase.DEATH) {
    return (
      <div className="game-page">
        <TopBar />

        <div className="death-screen">
          <div className="death-screen__content">
            <h2 className="death-screen__title">你死了</h2>

            <div className="death-screen__stats">
              <div className="death-screen__stat">
                <span className="death-screen__stat-label">探索回合</span>
                <span className="death-screen__stat-value">{gameState.turnCount}</span>
              </div>
              <div className="death-screen__stat">
                <span className="death-screen__stat-label">发现地点</span>
                <span className="death-screen__stat-value">
                  {gameState.eventLog.length}
                </span>
              </div>
            </div>

            <div className="death-screen__message">
              黑暗吞噬了你。但知识会留存。<br />
              那些你见过的异常，都将成为下一次的指引。
            </div>

            <div className="death-screen__actions">
              <button className="death-screen__button" onClick={respawn}>
                再次尝试
              </button>
              <button
                className="death-screen__button death-screen__button--secondary"
                onClick={startNewGame}
              >
                开始新游戏
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Game Interface
  return (
    <div className="game-page">
      <TopBar />

      <div className="game-page__main">
        {/* Left Sidebar: Status */}
        <aside className="game-page__sidebar game-page__sidebar--left">
          <StatusPanel stats={gameState.stats} />
        </aside>

        {/* Main Content Area */}
        <main className="game-page__content">
          {/* Background Scene */}
          <div className="game-page__scene">
            <Scene />
          </div>

          {/* Foreground UI */}
          <div className="game-page__ui">
            {/* Narrative Box */}
            <div className="game-page__narrative">
              <NarrativeBox
                narrative={gameState.currentNarrative}
                enableTypewriter={uiState.enableTypewriter}
                typingSpeed={uiState.typingSpeed}
              />
            </div>

            {/* Choice List */}
            {gameState.choices.length > 0 && (
              <div className="game-page__choices">
                <ChoiceList
                  choices={gameState.choices}
                  onChoiceSelect={makeChoice}
                  disabled={uiState.isLoading}
                />
              </div>
            )}

            {/* Loading Overlay */}
            {uiState.isLoading && (
              <div className="game-page__loading">
                <div className="loading-spinner"></div>
                <div className="loading-text">处理中...</div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <FooterActions />

      {/* Drawers */}
      <EventLogDrawer />
      <InventoryDrawer />
    </div>
  );
};
