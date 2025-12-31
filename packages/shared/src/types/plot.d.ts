/**
 * Plot Blueprint Types
 * Defines narrative structure and progression for scenes
 */
export interface PlotBeat {
    beatId: string;
    description: string;
    triggerCondition?: string;
    mustReveal: string[];
    requiredIntent?: string;
    minStep?: number;
    maxStep?: number;
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
    canonFacts: string[];
    forbiddenClaims: string[];
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
    recentIntents: string[];
    repeatCounts: Record<string, number>;
    forbiddenIntentsThisTurn: string[];
    consecutiveSameIntent: number;
}
//# sourceMappingURL=plot.d.ts.map