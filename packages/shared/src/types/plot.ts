/**
 * Plot Blueprint Types
 * Defines narrative structure and progression for scenes
 */

export interface PlotBeat {
  beatId: string;
  description: string;
  triggerCondition?: string;
  mustReveal: string[];           // Must reveal these facts/info types
  requiredIntent?: string;         // Required player intent to advance
  minStep?: number;                // Minimum step number for this beat
  maxStep?: number;                // Maximum step number (force advance)
}

export interface PlotAct {
  actId: string;
  name: string;
  description: string;
  beats: PlotBeat[];
  entryCondition?: string;
  exitCondition?: string;
}

export interface PlotBlueprint {
  sceneId: string;
  acts: PlotAct[];
  canonFacts: string[];            // Established facts that LLM cannot contradict
  forbiddenClaims: string[];       // Things LLM must not claim
  progressBudget: {
    maxStepsPerAct: number;
    totalMaxSteps: number;
  };
}

export interface PlotState {
  currentAct: string;
  currentBeat: string;
  revealedFacts: string[];
  progressFlags: Record<string, boolean>;
  stepInAct: number;
  stepTotal: number;
}

export interface PacingConstraints {
  requireOneOf: ('new_info' | 'new_location' | 'new_cost')[];
  maxSameTopicRepeats: number;
  stepBudget: {
    current: number;
    max: number;
    mustAdvanceBy: number;
  };
}

export interface AntiStallState {
  recentIntents: string[];          // Last N intents
  repeatCounts: Record<string, number>;
  forbiddenIntentsThisTurn: string[];
  consecutiveSameIntent: number;
}
