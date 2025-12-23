/**
 * Main Game UI Component
 */

import React, { useState } from 'react';
import { GameState, Choice, GamePhase } from '@survival-game/shared';
import { GameAPI } from '../services/api';
import './GameUI.css';

export const GameUI: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [availableChoices, setAvailableChoices] = useState<Choice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startNewGame = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await GameAPI.createNewGame();
      if (response.success && response.data) {
        setSessionId(response.data.sessionId!);
        setGameState(response.data.gameState);
        setAvailableChoices(response.data.availableChoices);
      } else {
        setError(response.error || 'Failed to start game');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const makeChoice = async (choiceId: string) => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await GameAPI.makeChoice(sessionId, choiceId);
      if (response.success && response.data) {
        setGameState(response.data.gameState);
        setAvailableChoices(response.data.availableChoices);
      } else {
        setError(response.error || 'Failed to make choice');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleRespawn = async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await GameAPI.respawn(sessionId);
      if (response.success && response.data) {
        setGameState(response.data.gameState);
        setAvailableChoices(response.data.availableChoices);
      } else {
        setError(response.error || 'Failed to respawn');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (!gameState) {
    return (
      <div className="game-container">
        <div className="title-screen">
          <h1>EXCLUSION ZONE</h1>
          <p className="subtitle">A Survival Narrative Experience</p>
          <button onClick={startNewGame} disabled={loading} className="btn-primary">
            {loading ? 'Initializing...' : 'Enter the Zone'}
          </button>
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <div className="game-interface">
        {/* Status Bar */}
        <div className="status-bar">
          <div className="stat">
            <span className="stat-label">Health</span>
            <span className="stat-value">{gameState.player.visible.health}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Stamina</span>
            <span className="stat-value">{gameState.player.visible.stamina}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Supplies</span>
            <span className="stat-value">{gameState.player.visible.supplies}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Location</span>
            <span className="stat-value">{gameState.player.visible.currentLocation}</span>
          </div>
        </div>

        {/* Event Description */}
        {gameState.currentEvent && (
          <div className="event-panel">
            <div className="event-description">
              {gameState.currentEvent.descriptionTemplate}
            </div>
          </div>
        )}

        {/* Choices */}
        {gameState.phase === GamePhase.EVENT && availableChoices.length > 0 && (
          <div className="choices-panel">
            <h3>What do you do?</h3>
            <div className="choices">
              {availableChoices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => makeChoice(choice.id)}
                  disabled={loading}
                  className="choice-button"
                >
                  {choice.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Death Screen */}
        {gameState.phase === GamePhase.DEATH && (
          <div className="death-panel">
            <h2>YOU DIED</h2>
            <p>Death #{gameState.player.persistent.deathCount}</p>
            <p className="death-message">
              The zone claims another victim. But knowledge persists.
            </p>
            <button onClick={handleRespawn} className="btn-primary">
              Try Again
            </button>
          </div>
        )}

        {/* Game Ended */}
        {gameState.phase === GamePhase.ENDED && (
          <div className="end-panel">
            <h2>EVACUATED</h2>
            <p>You made it out alive. This time.</p>
            <button onClick={startNewGame} className="btn-primary">
              New Game
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && <div className="error-banner">{error}</div>}

        {/* Debug Info (can be removed in production) */}
        <div className="debug-info">
          <small>
            Phase: {gameState.phase} | Turn: {gameState.turnCount} | Deaths:{' '}
            {gameState.player.persistent.deathCount}
          </small>
        </div>
      </div>
    </div>
  );
};
