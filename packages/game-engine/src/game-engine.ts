/**
 * Game Engine - Main orchestrator of game logic
 * This class manages the game loop and coordinates all systems
 */

import {
  GameState,
  GamePhase,
  PlayerState,
  GameEvent,
  Choice,
  Outcome,
  GameConfig,
  DEFAULT_GAME_CONFIG,
  DEFAULT_VISIBLE_STATS,
  DEFAULT_HIDDEN_STATS
} from '@survival-game/shared';

import { evaluateConditions } from './core/condition-evaluator';
import { applyStateChanges, isPlayerDead, getCriticalStatus } from './core/state-modifier';
import { selectNextEvent, getAvailableChoices, selectOutcome } from './core/event-selector';

/**
 * Main game engine class
 */
export class GameEngine {
  private gameState: GameState;
  private availableEvents: GameEvent[];
  private config: GameConfig;

  constructor(config: GameConfig = DEFAULT_GAME_CONFIG) {
    this.config = config;
    this.availableEvents = [];
    this.gameState = this.createInitialState();
  }

  /**
   * Creates a fresh game state
   */
  private createInitialState(): GameState {
    const playerState: PlayerState = {
      visible: { ...this.config.startingStats.visible },
      hidden: { ...this.config.startingStats.hidden },
      inventory: [],
      persistent: {
        exploredLocations: new Set([this.config.startingLocation]),
        knownAnomalies: new Set(),
        anomalousArtifacts: [],
        deathCount: 0,
        successfulEvacuations: 0,
        totalPlaytime: 0
      },
      flags: {}
    };

    return {
      phase: GamePhase.INITIALIZATION,
      player: playerState,
      currentEvent: null,
      selectedChoice: null,
      eventHistory: [],
      turnCount: 0,
      gameStartTime: Date.now(),
      triggeredEventIds: new Set()
    };
  }

  /**
   * Registers events that can occur in the game
   */
  public registerEvents(events: GameEvent[]): void {
    this.availableEvents.push(...events);
  }

  /**
   * Starts a new game
   */
  public startGame(): GameState {
    this.gameState.phase = GamePhase.EXPLORATION;
    this.advanceToNextEvent();
    return this.getState();
  }

  /**
   * Advances to the next event
   */
  private advanceToNextEvent(): void {
    const nextEvent = selectNextEvent(this.availableEvents, this.gameState);

    if (!nextEvent) {
      // No available events - game ends (for now)
      this.gameState.phase = GamePhase.ENDED;
      return;
    }

    this.gameState.currentEvent = nextEvent;
    this.gameState.phase = GamePhase.EVENT;

    // Mark one-time events as triggered
    if (nextEvent.oneTime) {
      this.gameState.triggeredEventIds.add(nextEvent.id);
    }

    this.gameState.eventHistory.push(nextEvent.id);
  }

  /**
   * Player makes a choice
   */
  public makeChoice(choiceId: string): GameState {
    if (!this.gameState.currentEvent) {
      throw new Error('No active event');
    }

    const choice = this.gameState.currentEvent.choices.find(c => c.id === choiceId);
    if (!choice) {
      throw new Error(`Invalid choice: ${choiceId}`);
    }

    // Verify choice requirements
    if (!evaluateConditions(choice.requirements, this.gameState.player)) {
      throw new Error('Choice requirements not met');
    }

    this.gameState.selectedChoice = choice;
    this.gameState.phase = GamePhase.CHOICE;

    // Process the outcome
    this.processOutcome(choice);

    return this.getState();
  }

  /**
   * Processes the outcome of a choice
   */
  private processOutcome(choice: Choice): void {
    // Select an outcome based on probabilities
    const outcome = selectOutcome(choice, this.gameState);

    // Apply state changes
    this.gameState.player = applyStateChanges(
      this.gameState.player,
      outcome.stateChanges
    );

    this.gameState.phase = GamePhase.OUTCOME;
    this.gameState.turnCount++;

    // Check for death
    if (isPlayerDead(this.gameState.player) || outcome.endsGame) {
      this.handleDeath(outcome.deathType);
      return;
    }

    // Check for critical warnings
    const warnings = getCriticalStatus(this.gameState.player);
    if (warnings.length > 0) {
      // Store warnings for UI display
      this.gameState.player.flags['_criticalWarnings'] = warnings.join(',');
    }

    // Advance to next event or end
    if (outcome.nextEventId) {
      const nextEvent = this.availableEvents.find(e => e.id === outcome.nextEventId);
      if (nextEvent) {
        this.gameState.currentEvent = nextEvent;
        this.gameState.phase = GamePhase.EVENT;
        this.gameState.eventHistory.push(nextEvent.id);
        return;
      }
    }

    // Otherwise, select next event normally
    this.advanceToNextEvent();
  }

  /**
   * Handles player death
   */
  private handleDeath(deathType?: Outcome['deathType']): void {
    this.gameState.phase = GamePhase.DEATH;
    this.gameState.player.persistent.deathCount++;

    // Preserve anomalous artifacts
    const anomalousItems = this.gameState.player.inventory.filter(
      item => item.isAnomalous
    );
    this.gameState.player.persistent.anomalousArtifacts.push(...anomalousItems);

    // Store death type for narrative
    this.gameState.player.flags['_lastDeathType'] = deathType || 'INSTANT';
  }

  /**
   * Starts a new life (after death)
   */
  public respawn(): GameState {
    const persistent = this.gameState.player.persistent;

    // Create new player state but preserve persistent data
    this.gameState.player = {
      visible: { ...DEFAULT_VISIBLE_STATS, currentLocation: this.config.startingLocation },
      hidden: { ...DEFAULT_HIDDEN_STATS },
      inventory: [...persistent.anomalousArtifacts], // Carry over anomalous items
      persistent,
      flags: {}
    };

    this.gameState.phase = GamePhase.EXPLORATION;
    this.gameState.eventHistory = [];
    this.gameState.turnCount = 0;
    this.gameState.gameStartTime = Date.now();
    this.gameState.triggeredEventIds = new Set();

    this.advanceToNextEvent();
    return this.getState();
  }

  /**
   * Gets current game state (immutable copy)
   */
  public getState(): Readonly<GameState> {
    return JSON.parse(JSON.stringify(this.gameState));
  }

  /**
   * Gets available choices for current event
   */
  public getAvailableChoices(): Choice[] {
    if (!this.gameState.currentEvent) {
      return [];
    }
    return getAvailableChoices(this.gameState.currentEvent, this.gameState.player);
  }

  /**
   * Gets current event
   */
  public getCurrentEvent(): GameEvent | null {
    return this.gameState.currentEvent;
  }
}
