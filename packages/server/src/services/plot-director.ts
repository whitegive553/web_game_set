/**
 * Plot Director Service
 * Controls narrative pacing and progression
 * Determines act/beat/goal/pacing for each step
 */

import {
  PlotBlueprint,
  PlotState,
  PlotAct,
  PlotBeat,
  PacingConstraints,
  AntiStallState,
  LLMContextPlot,
  LLMContextPacing,
  LLMContextAntiStall,
} from '@survival-game/shared';

export class PlotDirector {
  private plotBlueprint: PlotBlueprint;
  private plotState: PlotState;
  private antiStallState: AntiStallState;

  private readonly RECENT_INTENT_WINDOW = 8;
  private readonly MAX_SAME_INTENT_REPEATS = 2;

  constructor(blueprint: PlotBlueprint, initialState?: PlotState) {
    this.plotBlueprint = blueprint;
    this.plotState = initialState || this.initializePlotState();
    this.antiStallState = {
      recentIntents: [],
      repeatCounts: {},
      forbiddenIntentsThisTurn: [],
      consecutiveSameIntent: 0,
    };
  }

  /**
   * Initialize plot state
   */
  private initializePlotState(): PlotState {
    const firstAct = this.plotBlueprint.acts[0];
    const firstBeat = firstAct?.beats[0];

    return {
      currentAct: firstAct?.actId || 'act_1',
      currentBeat: firstBeat?.beatId || 'beat_1',
      revealedFacts: [],
      progressFlags: {},
      stepInAct: 0,
      stepTotal: 0,
    };
  }

  /**
   * Determine plot context for current step
   */
  determinePlotContext(step: number): LLMContextPlot {
    this.plotState.stepTotal = step;

    const currentAct = this.getCurrentAct();
    const currentBeat = this.getCurrentBeat();

    // Check if need to advance beat/act
    this.checkAndAdvanceProgression(step);

    return {
      act: this.plotState.currentAct,
      beatId: this.plotState.currentBeat,
      goal: currentBeat?.description || 'Continue exploration',
      mustReveal: currentBeat?.mustReveal || [],
      revealedFacts: this.plotState.revealedFacts,
      progressFlags: this.plotState.progressFlags,
    };
  }

  /**
   * Determine pacing constraints for current step
   */
  determinePacingConstraints(step: number): LLMContextPacing {
    const currentAct = this.getCurrentAct();
    const maxStepsForAct = this.plotBlueprint.progressBudget.maxStepsPerAct;

    return {
      requireOneOf: ['new_info', 'new_location', 'new_cost'],
      maxSameTopicRepeats: this.MAX_SAME_INTENT_REPEATS,
      stepBudget: {
        current: this.plotState.stepInAct,
        max: maxStepsForAct,
        mustAdvanceBy: maxStepsForAct - 2,
      },
    };
  }

  /**
   * Update anti-stall state based on player choice
   */
  updateAntiStall(choiceIntent: string): void {
    // Add to recent intents
    this.antiStallState.recentIntents.push(choiceIntent);
    if (this.antiStallState.recentIntents.length > this.RECENT_INTENT_WINDOW) {
      this.antiStallState.recentIntents.shift();
    }

    // Update repeat counts
    this.antiStallState.repeatCounts[choiceIntent] =
      (this.antiStallState.repeatCounts[choiceIntent] || 0) + 1;

    // Check for consecutive same intent
    const lastTwoIntents = this.antiStallState.recentIntents.slice(-2);
    if (lastTwoIntents.length === 2 && lastTwoIntents[0] === lastTwoIntents[1]) {
      this.antiStallState.consecutiveSameIntent++;
    } else {
      this.antiStallState.consecutiveSameIntent = 0;
    }
  }

  /**
   * Get anti-stall context for next step
   */
  getAntiStallContext(): LLMContextAntiStall {
    // Determine forbidden intents
    const forbiddenIntents: string[] = [];

    // Count recent intent occurrences
    const intentCounts: Record<string, number> = {};
    for (const intent of this.antiStallState.recentIntents) {
      intentCounts[intent] = (intentCounts[intent] || 0) + 1;
    }

    // Forbid intents that appear too frequently in recent history
    for (const [intent, count] of Object.entries(intentCounts)) {
      if (count >= this.MAX_SAME_INTENT_REPEATS) {
        forbiddenIntents.push(intent);
      }
    }

    // Check consecutive same intent
    if (this.antiStallState.consecutiveSameIntent >= 2) {
      const lastIntent = this.antiStallState.recentIntents[
        this.antiStallState.recentIntents.length - 1
      ];
      if (lastIntent && !forbiddenIntents.includes(lastIntent)) {
        forbiddenIntents.push(lastIntent);
      }
    }

    return {
      recentIntents: [...this.antiStallState.recentIntents],
      repeatCounts: { ...this.antiStallState.repeatCounts },
      forbiddenIntentsThisTurn: forbiddenIntents,
    };
  }

  /**
   * Mark fact as revealed
   */
  revealFact(fact: string): void {
    if (!this.plotState.revealedFacts.includes(fact)) {
      this.plotState.revealedFacts.push(fact);
    }
  }

  /**
   * Set progress flag
   */
  setProgressFlag(flag: string, value: boolean = true): void {
    this.plotState.progressFlags[flag] = value;
  }

  /**
   * Get current act
   */
  private getCurrentAct(): PlotAct | undefined {
    return this.plotBlueprint.acts.find(
      (act) => act.actId === this.plotState.currentAct
    );
  }

  /**
   * Get current beat
   */
  private getCurrentBeat(): PlotBeat | undefined {
    const act = this.getCurrentAct();
    return act?.beats.find((beat) => beat.beatId === this.plotState.currentBeat);
  }

  /**
   * Check and advance progression
   */
  private checkAndAdvanceProgression(step: number): void {
    const currentBeat = this.getCurrentBeat();

    // Check if should advance beat
    if (currentBeat?.maxStep && step >= currentBeat.maxStep) {
      this.advanceBeat();
    }

    // Check if should advance act
    const actMaxSteps = this.plotBlueprint.progressBudget.maxStepsPerAct;
    if (this.plotState.stepInAct >= actMaxSteps) {
      this.advanceAct();
    }
  }

  /**
   * Advance to next beat
   */
  private advanceBeat(): void {
    const currentAct = this.getCurrentAct();
    if (!currentAct) return;

    const currentBeatIndex = currentAct.beats.findIndex(
      (beat) => beat.beatId === this.plotState.currentBeat
    );

    if (currentBeatIndex >= 0 && currentBeatIndex < currentAct.beats.length - 1) {
      const nextBeat = currentAct.beats[currentBeatIndex + 1];
      this.plotState.currentBeat = nextBeat.beatId;
      console.log(`[PlotDirector] Advanced to beat: ${nextBeat.beatId}`);
    }
  }

  /**
   * Advance to next act
   */
  private advanceAct(): void {
    const currentActIndex = this.plotBlueprint.acts.findIndex(
      (act) => act.actId === this.plotState.currentAct
    );

    if (currentActIndex >= 0 && currentActIndex < this.plotBlueprint.acts.length - 1) {
      const nextAct = this.plotBlueprint.acts[currentActIndex + 1];
      this.plotState.currentAct = nextAct.actId;
      this.plotState.currentBeat = nextAct.beats[0]?.beatId || 'beat_1';
      this.plotState.stepInAct = 0;
      console.log(`[PlotDirector] Advanced to act: ${nextAct.actId}`);
    }
  }

  /**
   * Get current plot state (for persistence)
   */
  getPlotState(): PlotState {
    return { ...this.plotState };
  }

  /**
   * Get plot blueprint
   */
  getBlueprint(): PlotBlueprint {
    return this.plotBlueprint;
  }
}

/**
 * Load plot blueprint for scene
 */
export function loadPlotBlueprint(sceneId: string): PlotBlueprint | null {
  // This will be implemented by scene-loader or similar service
  // For now, return null and let game-step-controller handle it
  return null;
}
