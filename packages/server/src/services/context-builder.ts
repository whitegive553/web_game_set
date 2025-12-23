/**
 * Context Builder Service
 * Constructs LLM context from game state and scene data
 */

import {
  LLMGenerationInput,
  LLMGenerationContext,
  LLMContextScene,
  LLMContextPlayer,
  LLMContextMeta,
  LLMConstraints,
  LLMHistoryEntry,
  SceneData,
} from '@survival-game/shared';

/**
 * Game state interface (minimal required fields)
 */
interface GameStateInput {
  player: {
    visible: {
      health: number;
      stamina: number;
      supplies?: number;
    };
    inventory: Array<{ name: string }>;
    persistent: {
      anomalousArtifacts: Array<{ name: string }>;
      deathCount: number;
    };
  };
  turnCount: number;
}

/**
 * History entry from game session
 */
interface GameHistoryEntry {
  step: number;
  eventId: string;
  choiceId: string;
  choiceText: string;
  outcome: {
    summary: string;
  };
}

export class ContextBuilder {
  private readonly MAX_HISTORY_ENTRIES = 8;
  private readonly DEFAULT_CONSTRAINTS: LLMConstraints = {
    minChoices: 2,
    maxChoices: 4,
    tone: 'cold_and_uncertain',
    language: 'zh-CN',
    noDirectOutcome: true,
  };

  /**
   * Build complete LLM input from game state and scene
   */
  buildLLMInput(
    gameState: GameStateInput,
    scene: SceneData,
    history: GameHistoryEntry[],
    runId: string,
    overrideConstraints?: Partial<LLMConstraints>,
    plotContext?: any,
    antiStallContext?: any,
    pacingContext?: any
  ): LLMGenerationInput {
    const context = this.buildContext(gameState, scene, history, runId);

    // Add plot/pacing/antiStall context if provided
    if (plotContext) {
      (context as any).plot = plotContext;
    }
    if (antiStallContext) {
      (context as any).antiStall = antiStallContext;
    }
    if (pacingContext) {
      (context as any).pacing = pacingContext;
    }

    const constraints = { ...this.DEFAULT_CONSTRAINTS, ...overrideConstraints };

    return {
      promptType: 'scene_and_choice_generation',
      context,
      constraints,
    };
  }

  /**
   * Build LLM context
   */
  private buildContext(
    gameState: GameStateInput,
    scene: SceneData,
    history: GameHistoryEntry[],
    runId: string
  ): LLMGenerationContext {
    return {
      scene: this.buildSceneContext(scene),
      player: this.buildPlayerContext(gameState),
      history: this.buildHistoryContext(history),
      meta: this.buildMetaContext(gameState, runId),
    };
  }

  /**
   * Build scene portion of context
   */
  private buildSceneContext(scene: SceneData): LLMContextScene {
    return {
      sceneId: scene.sceneId,
      name: scene.name,
      theme: scene.theme,
      dangerLevel: scene.dangerLevel,
    };
  }

  /**
   * Build player portion of context
   */
  private buildPlayerContext(gameState: GameStateInput): LLMContextPlayer {
    // Map game stats to LLM context format
    // Note: Original game uses health/stamina/supplies, but LLM context expects health/stamina/hunger/water
    // We'll map supplies to both hunger and water for now
    const supplies = gameState.player.visible.supplies ?? 50;

    return {
      visibleState: {
        health: gameState.player.visible.health,
        stamina: gameState.player.visible.stamina,
        hunger: supplies, // Using supplies as hunger proxy
        water: supplies,  // Using supplies as water proxy
      },
      inventorySummary: gameState.player.inventory.map(item => item.name),
      vaultSummary: gameState.player.persistent.anomalousArtifacts.map(item => item.name),
    };
  }

  /**
   * Build history portion of context (max N recent entries)
   */
  private buildHistoryContext(history: GameHistoryEntry[]): LLMHistoryEntry[] {
    // Take only the most recent entries
    const recentHistory = history.slice(-this.MAX_HISTORY_ENTRIES);

    return recentHistory.map(entry => ({
      step: entry.step,
      eventId: entry.eventId,
      choiceId: entry.choiceId,
      choiceText: entry.choiceText,
      consequenceSummary: entry.outcome.summary,
    }));
  }

  /**
   * Build meta portion of context
   */
  private buildMetaContext(gameState: GameStateInput, runId: string): LLMContextMeta {
    return {
      step: gameState.turnCount,
      failureCount: gameState.player.persistent.deathCount,
      runId,
      timezone: 'local', // Can be made configurable if needed
    };
  }

  /**
   * Get default constraints (for reference or override)
   */
  getDefaultConstraints(): LLMConstraints {
    return { ...this.DEFAULT_CONSTRAINTS };
  }

  /**
   * Update max history entries (for testing/tuning)
   */
  setMaxHistoryEntries(max: number): void {
    if (max < 1 || max > 20) {
      throw new Error('Max history entries must be between 1 and 20');
    }
    (this as any).MAX_HISTORY_ENTRIES = max;
  }
}

// Singleton instance
let contextBuilderInstance: ContextBuilder | null = null;

export function getContextBuilder(): ContextBuilder {
  if (!contextBuilderInstance) {
    contextBuilderInstance = new ContextBuilder();
  }
  return contextBuilderInstance;
}
