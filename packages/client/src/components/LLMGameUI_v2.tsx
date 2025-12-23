/**
 * LLM-Driven Game Interface V2
 * Scrollable conversation-style UI
 */

import React, { useState, useEffect, useRef } from 'react';
import { LLMGameAPI, GameStepRequest } from '../services/llm-game-api';
import './LLMGameUI_v2.css';

interface GameSession {
  runId: string;
  sceneId: string;
  step: number;
  playerState: {
    health: number;
    stamina: number;
    supplies: number;
    deathCount: number;
  };
  inventory: Array<{ name: string }>;
  vault: Array<{ name: string }>;
  history: Array<{
    step: number;
    eventId: string;
    choiceId: string;
    choiceText: string;
    outcome: { summary: string };
  }>;
}

interface StoryEntry {
  step: number;
  narrative: string;
  narrativeSource: string;
  choices: Array<{ id: string; text: string; riskHint: string }>;
  selectedChoiceId?: string; // Which choice was selected (if any)
  usedFallback: boolean;
}

export const LLMGameUI_v2: React.FC = () => {
  const [session, setSession] = useState<GameSession | null>(null);
  const [storyEntries, setStoryEntries] = useState<StoryEntry[]>([]);
  const [sceneInfo, setSceneInfo] = useState<{
    sceneId: string;
    name: string;
    dangerLevel: number;
  } | null>(null);
  const [background, setBackground] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const storyContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entry is added
  useEffect(() => {
    if (storyContainerRef.current) {
      storyContainerRef.current.scrollTop = storyContainerRef.current.scrollHeight;
    }
  }, [storyEntries]);

  // Generate unique run ID
  const generateRunId = () => `run_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Initialize new game session
  const startNewGame = async () => {
    setLoading(true);
    setError(null);
    setStoryEntries([]);

    const newSession: GameSession = {
      runId: generateRunId(),
      sceneId: 'zone_01',
      step: 0,
      playerState: {
        health: 100,
        stamina: 100,
        supplies: 80,
        deathCount: 0,
      },
      inventory: [],
      vault: [],
      history: [],
    };

    setSession(newSession);
    await loadStep(newSession);
    setIsInitialized(true);
  };

  // Load game step from LLM
  const loadStep = async (sessionData: GameSession) => {
    setLoading(true);
    setError(null);

    try {
      const request: GameStepRequest = {
        sceneId: sessionData.sceneId,
        gameState: {
          player: {
            visible: {
              health: sessionData.playerState.health,
              stamina: sessionData.playerState.stamina,
              supplies: sessionData.playerState.supplies,
            },
            inventory: sessionData.inventory,
            persistent: {
              anomalousArtifacts: sessionData.vault,
              deathCount: sessionData.playerState.deathCount,
            },
          },
          turnCount: sessionData.step,
        },
        history: sessionData.history,
        runId: sessionData.runId,
      };

      console.log('Requesting step:', request);

      const response = await LLMGameAPI.requestStep(request);

      if (response.success && response.data) {
        const newEntry: StoryEntry = {
          step: sessionData.step,
          narrative: response.data.narrative,
          narrativeSource: response.data.narrativeSource,
          choices: response.data.choices,
          usedFallback: response.data.meta?.usedFallback || false,
        };

        setStoryEntries(prev => [...prev, newEntry]);
        setSceneInfo(response.data.sceneInfo);
        setBackground(response.data.background || '');
        setLoading(false);
      } else {
        throw new Error(response.error || 'Failed to load step');
      }
    } catch (err: any) {
      console.error('Failed to load step:', err);
      setError(err.message || 'Failed to load game step');
      setLoading(false);
    }
  };

  // Handle player choice
  const handleChoice = async (choiceId: string, choiceText: string) => {
    if (!session) return;

    // Mark the choice as selected in the current entry
    setStoryEntries(prev => {
      const updated = [...prev];
      const lastEntry = updated[updated.length - 1];
      if (lastEntry) {
        lastEntry.selectedChoiceId = choiceId;
      }
      return updated;
    });

    // Update session history
    const newHistoryEntry = {
      step: session.step,
      eventId: `step_${session.step}`,
      choiceId,
      choiceText,
      outcome: {
        summary: `你选择了${choiceText}`,
      },
    };

    const updatedSession: GameSession = {
      ...session,
      step: session.step + 1,
      history: [...session.history, newHistoryEntry],
    };

    setSession(updatedSession);

    // Load next step
    await loadStep(updatedSession);
  };

  // Restart game
  const restartGame = () => {
    setSession(null);
    setStoryEntries([]);
    setSceneInfo(null);
    setIsInitialized(false);
    setError(null);
  };

  // Render story entry
  const renderStoryEntry = (entry: StoryEntry, index: number) => {
    const isLatest = index === storyEntries.length - 1;
    const hasSelectedChoice = entry.selectedChoiceId !== undefined;

    return (
      <div key={entry.step} className="story-entry">
        {/* Narrative */}
        <div className="narrative-block">
          <div className="narrative-header">
            <span className="step-indicator">步骤 {entry.step + 1}</span>
            {entry.usedFallback && (
              <span className="fallback-indicator">⚠ 降级文本</span>
            )}
          </div>
          <div className="narrative-text">{entry.narrative}</div>
        </div>

        {/* Choices */}
        <div className="choices-block">
          {entry.choices.map((choice) => {
            const isSelected = choice.id === entry.selectedChoiceId;
            const isClickable = isLatest && !hasSelectedChoice && !loading;

            return (
              <div
                key={choice.id}
                className={`choice-card ${isSelected ? 'selected' : ''} ${
                  isClickable ? 'clickable' : 'disabled'
                }`}
                onClick={() => {
                  if (isClickable) {
                    handleChoice(choice.id, choice.text);
                  }
                }}
              >
                <div className="choice-text">
                  {isSelected && <span className="selected-marker">✓ </span>}
                  {choice.text}
                </div>
                <div className="choice-risk-hint">{choice.riskHint}</div>
              </div>
            );
          })}
        </div>

        {/* Loading indicator for current step */}
        {isLatest && loading && (
          <div className="loading-next">
            <div className="spinner"></div>
            <span>LLM 正在生成下一步...</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="llm-game-ui-v2"
      style={{
        backgroundImage: background ? `url(${background})` : 'none',
        backgroundColor: background ? 'transparent' : '#0b0f14',
      }}
    >
      {/* Header HUD */}
      <div className="game-hud">
        <div className="hud-left">
          {sceneInfo && (
            <>
              <span className="scene-name">{sceneInfo.name}</span>
              <span className="danger-level">
                危险等级: {'⚠'.repeat(sceneInfo.dangerLevel)}
              </span>
            </>
          )}
        </div>
        <div className="hud-right">
          {session && (
            <>
              <span className="stat">生命: {session.playerState.health}</span>
              <span className="stat">体力: {session.playerState.stamina}</span>
              <span className="stat">补给: {session.playerState.supplies}</span>
            </>
          )}
        </div>
      </div>

      {/* Story Container (Scrollable) */}
      <div className="story-container" ref={storyContainerRef}>
        {!isInitialized ? (
          <div className="start-screen">
            <h1>LLM 驱动的生存叙事游戏</h1>
            <p>所有叙事和选项由 LLM 实时生成</p>
            <button className="start-button" onClick={startNewGame}>
              开始探索
            </button>
          </div>
        ) : (
          <>
            {storyEntries.map((entry, index) => renderStoryEntry(entry, index))}
            {error && (
              <div className="error-message">
                <strong>错误:</strong> {error}
                <button onClick={restartGame}>重新开始</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Controls */}
      {isInitialized && (
        <div className="game-controls">
          <button className="control-button" onClick={restartGame}>
            重新开始
          </button>
          <div className="step-counter">
            步骤: {session?.step || 0}
          </div>
        </div>
      )}
    </div>
  );
};
