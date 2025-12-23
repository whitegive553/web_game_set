/**
 * Game State Management using React Context
 * Provides centralized state and actions for the entire game
 * Integrated with save/load system
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { GameState, GamePhase, UIState, ConnectionStatus } from '../types/game';
import * as gameApi from '../services/gameApi';
import * as saveApi from '../services/saveApi';
import { useAuth } from './AuthContext';

// ============================================================================
// Context Types
// ============================================================================

interface GameContextValue {
  // State
  gameState: GameState;
  uiState: UIState;
  connectionStatus: ConnectionStatus;

  // Actions
  startNewGame: () => Promise<void>;
  makeChoice: (choiceId: string) => Promise<void>;
  respawn: () => Promise<void>;
  endSession: () => Promise<void>;
  loadSaveFromServer: () => Promise<void>;

  // UI Actions
  openInventory: () => void;
  closeInventory: () => void;
  openLog: () => void;
  closeLog: () => void;
  openSettings: () => void;
  closeSettings: () => void;
}

// ============================================================================
// Context Creation
// ============================================================================

const GameContext = createContext<GameContextValue | undefined>(undefined);

// ============================================================================
// Initial States
// ============================================================================

const initialGameState: GameState = {
  sessionId: null,
  phase: GamePhase.TITLE,
  currentNarrative: null,
  choices: [],
  stats: {
    health: 100,
    stamina: 100,
    sanity: 100,
    supplies: 50
  },
  location: '未知',
  turnCount: 0,
  eventLog: [],
  inventory: []
};

const initialUIState: UIState = {
  isInventoryOpen: false,
  isLogOpen: false,
  isSettingsOpen: false,
  isLoading: false,
  error: null,
  typingSpeed: 50,
  enableTypewriter: false
};

const initialConnectionStatus: ConnectionStatus = {
  server: 'connected',
  llm: 'available'
};

// ============================================================================
// Provider Component
// ============================================================================

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [uiState, setUIState] = useState<UIState>(initialUIState);
  const [connectionStatus] = useState<ConnectionStatus>(initialConnectionStatus);
  const { user } = useAuth();

  // ------------------------------------------------------------------------
  // Auto-load save on user login
  // ------------------------------------------------------------------------

  useEffect(() => {
    if (user) {
      loadSaveFromServer();
    } else {
      // Reset game state on logout
      setGameState(initialGameState);
    }
  }, [user]);

  // ------------------------------------------------------------------------
  // Save/Load Functions
  // ------------------------------------------------------------------------

  /**
   * Load save data from server
   */
  const loadSaveFromServer = useCallback(async () => {
    if (!user) return;

    try {
      console.log('[GameContext] Loading save from server...');
      const saveData = await saveApi.getSave();

      // TODO: If there's an active save, restore game state
      // For now, we just load the vault items into inventory
      if (saveData.data && saveData.data.profile && saveData.data.profile.vault && saveData.data.profile.vault.length > 0) {
        setGameState(prev => ({
          ...prev,
          inventory: [
            ...prev.inventory,
            ...saveData.data!.profile.vault.map((item: any) => ({
              id: item.itemId,
              name: item.name,
              description: item.description,
              type: 'ANOMALOUS' as const,
              isAnomalous: true,
              persistsAcrossDeaths: true
            }))
          ]
        }));
      }

      console.log('[GameContext] Save loaded successfully');
    } catch (error) {
      console.error('[GameContext] Failed to load save:', error);
      // Don't show error to user - save loading is optional
    }
  }, [user]);

  /**
   * Auto-save current game state to server
   */
  const autoSaveToServer = useCallback(async () => {
    if (!user || !gameState.sessionId) return;

    try {
      console.log('[GameContext] Auto-saving game state...');

      // Prepare save data
      const saveData = {
        slotId: 'slot-1', // TODO: Support multiple save slots
        currentRun: {
          runId: gameState.sessionId,
          startedAt: Date.now(),
          state: {
            location: gameState.location,
            turnCount: gameState.turnCount,
            visibleStats: gameState.stats,
            hiddenStats: {
              // These are not available on client, send placeholders
              sanity: gameState.stats.sanity,
              anomalyAffinity: 0,
              observationLevel: 0,
              realityStability: 100
            },
            inventory: gameState.inventory.map(i => i.id),
            flags: {},
            eventHistory: gameState.eventLog.map(e => e.id)
          },
          log: gameState.eventLog.map(e => ({
            turn: e.turn,
            location: e.location,
            summary: e.summary,
            timestamp: e.timestamp
          }))
        },
        unlocked: {
          locations: [],
          anomalies: [],
          items: []
        }
      };

      await saveApi.updateSave(saveData);
      console.log('[GameContext] Auto-save completed');
    } catch (error) {
      console.error('[GameContext] Auto-save failed:', error);
      // Don't throw - auto-save failure shouldn't break the game
    }
  }, [user, gameState]);

  // ------------------------------------------------------------------------
  // Game Actions
  // ------------------------------------------------------------------------

  const startNewGame = useCallback(async () => {
    setUIState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await gameApi.startGame();

      setGameState({
        sessionId: response.sessionId,
        phase: GamePhase.PLAYING,
        currentNarrative: response.narrative,
        choices: response.choices,
        stats: response.stats,
        location: response.location,
        turnCount: 1,
        eventLog: [],
        inventory: gameState.inventory.filter(item => item.persistsAcrossDeaths) // Keep vault items
      });

      setUIState(prev => ({ ...prev, isLoading: false }));

      // Auto-save after starting new game
      await autoSaveToServer();
    } catch (error) {
      console.error('Failed to start game:', error);
      setUIState(prev => ({
        ...prev,
        isLoading: false,
        error: '无法启动游戏会话'
      }));
    }
  }, [autoSaveToServer, gameState.inventory]);

  const makeChoice = useCallback(async (choiceId: string) => {
    if (!gameState.sessionId) {
      console.error('No active session');
      return;
    }

    setUIState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await gameApi.makeChoice(gameState.sessionId, choiceId);

      // Update event log
      const newLogEntry = {
        id: `log_${Date.now()}`,
        turn: gameState.turnCount + 1,
        location: response.location,
        summary: response.narrative.text.substring(0, 50) + '...',
        timestamp: Date.now()
      };

      setGameState(prev => ({
        ...prev,
        phase: response.phase,
        currentNarrative: response.narrative,
        choices: response.choices,
        stats: response.stats,
        location: response.location,
        turnCount: prev.turnCount + 1,
        eventLog: [...prev.eventLog, newLogEntry]
      }));

      setUIState(prev => ({ ...prev, isLoading: false }));

      // Auto-save after making choice
      await autoSaveToServer();
    } catch (error) {
      console.error('Failed to make choice:', error);
      setUIState(prev => ({
        ...prev,
        isLoading: false,
        error: '选择处理失败'
      }));
    }
  }, [gameState.sessionId, gameState.turnCount, autoSaveToServer]);

  const respawn = useCallback(async () => {
    if (!gameState.sessionId) {
      console.error('No active session');
      return;
    }

    setUIState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // TODO: Update death count in save
      // TODO: Save any anomalous items found this run to vault

      const response = await gameApi.respawnGame(gameState.sessionId);

      setGameState(prev => ({
        ...prev,
        phase: GamePhase.PLAYING,
        currentNarrative: response.narrative,
        choices: response.choices,
        stats: response.stats,
        location: response.location,
        turnCount: 1,
        eventLog: [],
        // Keep vault items (persistsAcrossDeaths)
        inventory: prev.inventory.filter(item => item.persistsAcrossDeaths)
      }));

      setUIState(prev => ({ ...prev, isLoading: false }));

      // Auto-save after respawn
      await autoSaveToServer();
    } catch (error) {
      console.error('Failed to respawn:', error);
      setUIState(prev => ({
        ...prev,
        isLoading: false,
        error: '重生失败'
      }));
    }
  }, [gameState.sessionId, autoSaveToServer]);

  const endSession = useCallback(async () => {
    if (!gameState.sessionId) return;

    try {
      // Save before ending
      await autoSaveToServer();
      await gameApi.endGame(gameState.sessionId);
      setGameState(initialGameState);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }, [gameState.sessionId, autoSaveToServer]);

  // ------------------------------------------------------------------------
  // UI Actions
  // ------------------------------------------------------------------------

  const openInventory = useCallback(() => {
    setUIState(prev => ({ ...prev, isInventoryOpen: true }));
  }, []);

  const closeInventory = useCallback(() => {
    setUIState(prev => ({ ...prev, isInventoryOpen: false }));
  }, []);

  const openLog = useCallback(() => {
    setUIState(prev => ({ ...prev, isLogOpen: true }));
  }, []);

  const closeLog = useCallback(() => {
    setUIState(prev => ({ ...prev, isLogOpen: false }));
  }, []);

  const openSettings = useCallback(() => {
    setUIState(prev => ({ ...prev, isSettingsOpen: true }));
  }, []);

  const closeSettings = useCallback(() => {
    setUIState(prev => ({ ...prev, isSettingsOpen: false }));
  }, []);

  // ------------------------------------------------------------------------
  // Context Value
  // ------------------------------------------------------------------------

  const value: GameContextValue = {
    gameState,
    uiState,
    connectionStatus,
    startNewGame,
    makeChoice,
    respawn,
    endSession,
    loadSaveFromServer,
    openInventory,
    closeInventory,
    openLog,
    closeLog,
    openSettings,
    closeSettings
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

// ============================================================================
// Custom Hook
// ============================================================================

export const useGame = (): GameContextValue => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};
