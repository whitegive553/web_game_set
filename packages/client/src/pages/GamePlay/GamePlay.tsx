/**
 * Game Play - Main game interface with enhanced features
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GameHistoryEntry } from '@survival-game/shared';
import './GamePlay.css';

interface StoryEntry {
  step: number;
  narrative: string;
  choices: Array<{ id: string; text: string; riskHint: string; intent?: string }>;
  selectedChoiceId?: string;
  selectedChoiceText?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  description?: string;
}

export const GamePlay: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sceneId = searchParams.get('scene') || 'zone_01';

  const [storyEntries, setStoryEntries] = useState<StoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [gameState, setGameState] = useState({
    health: 100,
    stamina: 100,
    turnCount: 0,
  });
  const [inventory] = useState<InventoryItem[]>([
    { id: 'compass', name: '指南针', description: '一个不太可靠的指南针' }
  ]);
  const [runId] = useState(`run_${Date.now()}`);
  const [gameStartTime] = useState(Date.now());
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showInventory, setShowInventory] = useState(false);

  const storyContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startNewGame();
  }, [sceneId]);

  useEffect(() => {
    if (storyContainerRef.current) {
      storyContainerRef.current.scrollTop = storyContainerRef.current.scrollHeight;
    }
  }, [storyEntries]);

  const startNewGame = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/game/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sceneId,
          gameState: {
            player: {
              visible: { health: 100, stamina: 100 },
              inventory: [],
              persistent: { anomalousArtifacts: [], deathCount: 0 }
            },
            turnCount: 0
          },
          history: [],
          runId
        })
      });

      const data = await response.json();
      if (data.success && data.data) {
        setStoryEntries([{
          step: 0,
          narrative: data.data.narrative,
          choices: data.data.choices
        }]);
      }
    } catch (error) {
      console.error('Failed to start game:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChoice = async (choiceId: string, choiceText: string, _intent?: string) => {
    // Mark choice as selected
    setStoryEntries(prev => {
      const updated = [...prev];
      const lastEntry = updated[updated.length - 1];
      if (lastEntry) {
        lastEntry.selectedChoiceId = choiceId;
        lastEntry.selectedChoiceText = choiceText;
      }
      return updated;
    });

    // Update game state
    const newTurnCount = gameState.turnCount + 1;
    setGameState(prev => ({ ...prev, turnCount: newTurnCount }));

    setIsLoading(true);
    try {
      // Build history from story entries
      const history = storyEntries.map((entry, index) => ({
        step: index,
        eventId: `event_${index}`,
        choiceId: entry.selectedChoiceId || 'choice_1',
        choiceText: entry.selectedChoiceText || '',
        outcome: { summary: `Selected: ${entry.selectedChoiceText}` }
      }));

      const response = await fetch('http://localhost:3001/api/game/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sceneId,
          gameState: {
            player: {
              visible: gameState,
              inventory: inventory.map(i => ({ name: i.name })),
              persistent: { anomalousArtifacts: [], deathCount: 0 }
            },
            turnCount: newTurnCount
          },
          history,
          runId
        })
      });

      const data = await response.json();
      if (data.success && data.data) {
        setStoryEntries(prev => [...prev, {
          step: newTurnCount,
          narrative: data.data.narrative,
          choices: data.data.choices
        }]);

        // Simulate stat changes
        setGameState(prev => ({
          ...prev,
          health: Math.max(0, prev.health - Math.floor(Math.random() * 5)),
          stamina: Math.max(0, prev.stamina - Math.floor(Math.random() * 10))
        }));
      }
    } catch (error) {
      console.error('Failed to get next step:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseItem = (item: InventoryItem) => {
    console.log('Using item:', item);
    // TODO: Implement item usage logic
    setShowInventory(false);
  };

  const handleEndGame = async (outcome: 'death' | 'evacuation' | 'abandoned') => {
    const endTime = Date.now();
    const historyEntry: GameHistoryEntry = {
      runId,
      sceneId,
      sceneName: '禁区边缘', // TODO: Get from scene data
      startedAt: gameStartTime,
      endedAt: endTime,
      outcome,
      finalStats: {
        turnCount: gameState.turnCount,
        health: gameState.health,
        stamina: gameState.stamina
      },
      summary: `探索了 ${gameState.turnCount} 步，${outcome === 'death' ? '最终死亡' : outcome === 'evacuation' ? '成功撤离' : '放弃游戏'}。`,
      achievementsUnlocked: []
    };

    try {
      await fetch('http://localhost:3001/api/save/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ entry: historyEntry })
      });
    } catch (error) {
      console.error('Failed to save history:', error);
    }

    navigate('/game');
  };

  const handleExitGame = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    handleEndGame('abandoned');
  };

  return (
    <div className="game-play">
      {/* Top Bar */}
      <div className="game-top-bar">
        <div className="game-stats">
          <div className="stat health">
            <span className="stat-label">生命:</span>
            <span className="stat-value">{gameState.health}</span>
          </div>
          <div className="stat stamina">
            <span className="stat-label">体力:</span>
            <span className="stat-value">{gameState.stamina}</span>
          </div>
          <div className="stat turn">
            <span className="stat-label">步数:</span>
            <span className="stat-value">{gameState.turnCount}</span>
          </div>
        </div>

        <div className="game-controls">
          <button
            className="control-button inventory-button"
            onClick={() => setShowInventory(!showInventory)}
          >
            🎒 道具 ({inventory.length})
          </button>
          <button
            className="control-button exit-button"
            onClick={handleExitGame}
          >
            🚪 退出
          </button>
        </div>
      </div>

      {/* Story Container */}
      <div className="story-container" ref={storyContainerRef}>
        {storyEntries.map((entry, index) => (
          <div key={index} className="story-entry">
            <div className="narrative">
              <div className="narrative-header">
                <span className="step-number">步骤 {entry.step}</span>
              </div>
              <p>{entry.narrative}</p>
            </div>

            <div className="choices">
              {entry.choices.map((choice) => {
                const isSelected = entry.selectedChoiceId === choice.id;
                const isLastEntry = index === storyEntries.length - 1;
                const canSelect = isLastEntry && !entry.selectedChoiceId && !isLoading;

                return (
                  <button
                    key={choice.id}
                    className={`choice ${isSelected ? 'selected' : ''}`}
                    onClick={() => canSelect && handleChoice(choice.id, choice.text, choice.intent)}
                    disabled={!canSelect}
                  >
                    {isSelected && <span className="selected-icon">✓</span>}
                    <div className="choice-content">
                      <div className="choice-text">{choice.text}</div>
                      <div className="choice-risk">{choice.riskHint}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>生成中...</p>
          </div>
        )}
      </div>

      {/* Inventory Modal */}
      {showInventory && (
        <div className="modal-overlay" onClick={() => setShowInventory(false)}>
          <div className="modal-content inventory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>道具栏</h2>
              <button className="close-button" onClick={() => setShowInventory(false)}>✕</button>
            </div>
            <div className="inventory-grid">
              {inventory.length === 0 ? (
                <p className="empty-inventory">没有道具</p>
              ) : (
                inventory.map((item) => (
                  <div key={item.id} className="inventory-item">
                    <h3>{item.name}</h3>
                    {item.description && <p>{item.description}</p>}
                    <button
                      className="use-item-button"
                      onClick={() => handleUseItem(item)}
                    >
                      使用
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation */}
      {showExitConfirm && (
        <div className="modal-overlay" onClick={() => setShowExitConfirm(false)}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h2>确认退出？</h2>
            <p>游戏进度将被保存到历史记录</p>
            <div className="modal-buttons">
              <button className="confirm-button" onClick={confirmExit}>
                确认退出
              </button>
              <button className="cancel-button" onClick={() => setShowExitConfirm(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
