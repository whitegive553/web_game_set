/**
 * LLM-Driven Game Interface
 * Fully powered by LLM narrative generation system
 */

import React, { useState } from 'react';
import { LLMGameAPI, GameStepRequest, GameStepResponse } from '../services/llm-game-api';
import './LLMGameUI.css';

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

interface StepData {
  narrative: string;
  narrativeSource: string;
  choices: Array<{ id: string; text: string; riskHint: string }>;
  background: string;
  backgroundFallback: string;
  sceneInfo: {
    sceneId: string;
    name: string;
    dangerLevel: number;
  };
  usedFallback: boolean;
}

export const LLMGameUI: React.FC = () => {
  const [session, setSession] = useState<GameSession | null>(null);
  const [currentStep, setCurrentStep] = useState<StepData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Generate unique run ID
  const generateRunId = () => `run_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Initialize new game session
  const startNewGame = async () => {
    setLoading(true);
    setError(null);

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

      const response: GameStepResponse = await LLMGameAPI.requestStep(request);

      if (!response.success || !response.data) {
        setError(response.error || 'Failed to generate narrative');
        setLoading(false);
        return;
      }

      setCurrentStep({
        narrative: response.data.narrative,
        narrativeSource: response.data.narrativeSource,
        choices: response.data.choices,
        background: response.data.background,
        backgroundFallback: response.data.backgroundFallback,
        sceneInfo: response.data.sceneInfo,
        usedFallback: response.data.meta.usedFallback,
      });
    } catch (err: any) {
      setError(err.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle player choice
  const makeChoice = async (choiceId: string, choiceText: string) => {
    if (!session || !currentStep) return;

    setLoading(true);

    // Simulate consequence (in real game, this would be determined by rule engine)
    const consequence = generateConsequence(choiceId);

    // Update session
    const updatedSession: GameSession = {
      ...session,
      step: session.step + 1,
      playerState: {
        ...session.playerState,
        health: Math.max(0, session.playerState.health + consequence.healthDelta),
        stamina: Math.max(0, session.playerState.stamina + consequence.staminaDelta),
        supplies: Math.max(0, session.playerState.supplies + consequence.suppliesDelta),
      },
      history: [
        ...session.history,
        {
          step: session.step,
          eventId: `event_${session.step}`,
          choiceId,
          choiceText,
          outcome: {
            summary: consequence.summary,
          },
        },
      ],
    };

    setSession(updatedSession);
    await loadStep(updatedSession);
  };

  // Generate consequence (placeholder - should be from rule engine)
  const generateConsequence = (_choiceId: string) => {
    const randomFactor = Math.random();
    return {
      healthDelta: Math.floor((randomFactor - 0.5) * 20),
      staminaDelta: Math.floor((randomFactor - 0.6) * 15),
      suppliesDelta: Math.floor((randomFactor - 0.7) * 10),
      summary: '行动产生了一些影响',
    };
  };

  // Handle death
  const handleRespawn = async () => {
    if (!session) return;

    const respawnSession: GameSession = {
      ...session,
      step: 0,
      playerState: {
        health: 80,
        stamina: 80,
        supplies: 60,
        deathCount: session.playerState.deathCount + 1,
      },
      history: [],
    };

    setSession(respawnSession);
    await loadStep(respawnSession);
  };

  // Check if player is dead
  const isDead = session && session.playerState.health <= 0;

  // Background style
  const backgroundStyle = currentStep
    ? currentStep.background
      ? { backgroundImage: `url(${currentStep.background})` }
      : { backgroundColor: currentStep.backgroundFallback }
    : { backgroundColor: '#0b0f14' };

  if (!isInitialized) {
    return (
      <div className="llm-game-container" style={{ backgroundColor: '#0b0f14' }}>
        <div className="title-screen">
          <h1 className="game-title">EXCLUSION ZONE</h1>
          <p className="game-subtitle">LLM 叙事生成系统 - 技术演示</p>
          <div className="title-info">
            <p>• 完全由 LLM 驱动的叙事生成</p>
            <p>• 场景系统 + 上下文构造</p>
            <p>• 结构化输入输出校验</p>
          </div>
          <button onClick={startNewGame} disabled={loading} className="start-button">
            {loading ? '初始化中...' : '进入禁区'}
          </button>
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    );
  }

  if (isDead) {
    return (
      <div className="llm-game-container" style={backgroundStyle}>
        <div className="death-screen">
          <h2 className="death-title">生命终结</h2>
          <p className="death-count">死亡次数: {session?.playerState.deathCount}</p>
          <p className="death-message">禁区吞噬了又一个生命。但记忆会留存。</p>
          <button onClick={handleRespawn} className="respawn-button">
            重生
          </button>
          <button
            onClick={() => {
              setIsInitialized(false);
              setSession(null);
              setCurrentStep(null);
            }}
            className="menu-button"
          >
            返回主菜单
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="llm-game-container" style={backgroundStyle}>
      {/* Status HUD */}
      <div className="game-hud">
        <div className="hud-stats">
          <div className="stat-item">
            <span className="stat-label">生命</span>
            <span className="stat-value">{session?.playerState.health}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">体力</span>
            <span className="stat-value">{session?.playerState.stamina}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">补给</span>
            <span className="stat-value">{session?.playerState.supplies}</span>
          </div>
        </div>
        <div className="hud-info">
          <span className="scene-name">{currentStep?.sceneInfo.name}</span>
          <span className="step-count">步骤 {session?.step}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="game-content">
        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>LLM 生成中...</p>
          </div>
        )}

        {currentStep && !loading && (
          <>
            {/* Narrative Text */}
            <div className="narrative-panel">
              <div className="narrative-text">{currentStep.narrative}</div>
              {currentStep.usedFallback && (
                <div className="fallback-warning">
                  ⚠ LLM 生成失败，使用降级文本
                </div>
              )}
            </div>

            {/* Choices */}
            <div className="choices-panel">
              <h3 className="choices-title">你的选择</h3>
              <div className="choices-grid">
                {currentStep.choices.map((choice) => (
                  <button
                    key={choice.id}
                    className="choice-card"
                    onClick={() => makeChoice(choice.id, choice.text)}
                    disabled={loading}
                  >
                    <div className="choice-text">{choice.text}</div>
                    <div className="choice-risk">{choice.riskHint}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {error && !loading && (
          <div className="error-panel">
            <h3>发生错误</h3>
            <p>{error}</p>
            <button onClick={() => session && loadStep(session)} className="retry-button">
              重试
            </button>
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="debug-panel">
        <small>
          Run: {session?.runId.substring(0, 12)}... | Step: {session?.step} | Deaths:{' '}
          {session?.playerState.deathCount}
          {currentStep?.usedFallback && ' | [FALLBACK]'}
        </small>
      </div>
    </div>
  );
};
