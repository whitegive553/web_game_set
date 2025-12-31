/**
 * LLM Input/Output type definitions (Phase 4)
 * These types are for the new LLM-driven narrative generation system
 */
/**
 * Player visible state for context
 */
export interface LLMPlayerVisibleState {
    health: number;
    stamina: number;
    hunger: number;
    water: number;
}
/**
 * History entry for context
 */
export interface LLMHistoryEntry {
    step: number;
    eventId: string;
    choiceId: string;
    choiceText: string;
    consequenceSummary: string;
}
/**
 * LLM Context - Scene portion
 */
export interface LLMContextScene {
    sceneId: string;
    name: string;
    theme: string[];
    dangerLevel: number;
}
/**
 * LLM Context - Player portion
 */
export interface LLMContextPlayer {
    visibleState: LLMPlayerVisibleState;
    inventorySummary: string[];
    vaultSummary: string[];
}
/**
 * LLM Context - Meta information
 */
export interface LLMContextMeta {
    step: number;
    failureCount: number;
    runId: string;
    timezone?: string;
}
/**
 * LLM Context - Plot progression
 */
export interface LLMContextPlot {
    act: string;
    beatId: string;
    goal: string;
    mustReveal: string[];
    revealedFacts: string[];
    progressFlags: Record<string, boolean>;
}
/**
 * LLM Context - Anti-stall information
 */
export interface LLMContextAntiStall {
    recentIntents: string[];
    repeatCounts: Record<string, number>;
    forbiddenIntentsThisTurn: string[];
}
/**
 * LLM Context - Pacing requirements
 */
export interface LLMContextPacing {
    requireOneOf: ('new_info' | 'new_location' | 'new_cost')[];
    maxSameTopicRepeats: number;
    stepBudget: {
        current: number;
        max: number;
        mustAdvanceBy: number;
    };
}
/**
 * Complete LLM Generation Context (Phase 4)
 */
export interface LLMGenerationContext {
    scene: LLMContextScene;
    player: LLMContextPlayer;
    history: LLMHistoryEntry[];
    meta: LLMContextMeta;
    plot?: LLMContextPlot;
    antiStall?: LLMContextAntiStall;
    pacing?: LLMContextPacing;
}
/**
 * LLM Constraints
 */
export interface LLMConstraints {
    minChoices: number;
    maxChoices: number;
    tone: 'cold_and_uncertain' | 'tense' | 'calm' | 'ominous';
    language: string;
    noDirectOutcome: boolean;
}
/**
 * Complete LLM Input (Phase 4)
 */
export interface LLMGenerationInput {
    promptType: 'scene_and_choice_generation';
    context: LLMGenerationContext;
    constraints: LLMConstraints;
}
/**
 * Narrative portion of LLM output
 */
export interface LLMNarrative {
    text: string;
    source: 'environment' | 'character' | 'system';
}
/**
 * Single choice from LLM
 */
export interface LLMGeneratedChoice {
    id: string;
    text: string;
    riskHint: string;
    intent: string;
}
/**
 * Complete LLM Output (Phase 4)
 */
export interface LLMGenerationOutput {
    narrative: LLMNarrative;
    choices: LLMGeneratedChoice[];
    tags: string[];
}
/**
 * LLM Response with metadata (Phase 4)
 */
export interface LLMGenerationResponse {
    success: boolean;
    output?: LLMGenerationOutput;
    rawOutput?: string;
    error?: string;
    usedFallback?: boolean;
}
//# sourceMappingURL=llm.d.ts.map