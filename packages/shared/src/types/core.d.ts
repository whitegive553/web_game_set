/**
 * Core type definitions for the survival narrative game
 * These types define the fundamental abstractions of the game system
 */
export declare enum GamePhase {
    INITIALIZATION = "INITIALIZATION",
    EXPLORATION = "EXPLORATION",// Player is navigating
    EVENT = "EVENT",// An event is being presented
    CHOICE = "CHOICE",// Player is making a choice
    OUTCOME = "OUTCOME",// Showing the result of a choice
    DEATH = "DEATH",// Player has died
    EVACUATION = "EVACUATION",// Player evacuated successfully
    ENDED = "ENDED"
}
/**
 * Visible stats that player can see and monitor
 */
export interface VisibleStats {
    health: number;
    stamina: number;
    supplies: number;
    currentLocation: string;
}
/**
 * Hidden stats that influence game but are not directly shown
 * Player can only infer these through narrative cues
 */
export interface HiddenStats {
    sanity: number;
    anomalyAffinity: number;
    observationLevel: number;
    realityStability: number;
}
/**
 * Inventory item
 */
export interface Item {
    id: string;
    name: string;
    description: string;
    type: 'TOOL' | 'CONSUMABLE' | 'DOCUMENT' | 'ANOMALOUS';
    isAnomalous: boolean;
    effects?: Record<string, number>;
}
/**
 * Cross-life persistent data
 * These survive death and provide long-term progression
 */
export interface PersistentData {
    exploredLocations: Set<string>;
    knownAnomalies: Set<string>;
    anomalousArtifacts: Item[];
    deathCount: number;
    successfulEvacuations: number;
    totalPlaytime: number;
}
/**
 * Complete player state
 */
export interface PlayerState {
    visible: VisibleStats;
    hidden: HiddenStats;
    inventory: Item[];
    persistent: PersistentData;
    flags: Record<string, any>;
}
/**
 * Condition that must be met for something to trigger
 */
export interface Condition {
    type: 'STAT' | 'ITEM' | 'FLAG' | 'LOCATION' | 'RANDOM';
    key: string;
    operator: 'GT' | 'LT' | 'EQ' | 'HAS' | 'NOT_HAS';
    value: number | string | boolean;
}
/**
 * State modification to apply
 */
export interface StateChange {
    target: 'visible' | 'hidden' | 'inventory' | 'flags';
    key: string;
    operation: 'SET' | 'ADD' | 'SUBTRACT' | 'TOGGLE';
    value: number | string | boolean | Item;
}
/**
 * Weighted outcome possibility
 */
export interface OutcomeProbability {
    weight: number;
    outcome: Outcome;
}
/**
 * Result of a choice
 */
export interface Outcome {
    id: string;
    stateChanges: StateChange[];
    nextEventId?: string;
    narrativeTemplate: string;
    requiresLLM: boolean;
    endsGame?: boolean;
    deathType?: 'INSTANT' | 'GRADUAL' | 'ANOMALOUS';
}
/**
 * A choice the player can make
 */
export interface Choice {
    id: string;
    text: string;
    requirements: Condition[];
    outcomes: OutcomeProbability[];
    isTextInput?: boolean;
    hidden?: boolean;
}
/**
 * A game event
 */
export interface GameEvent {
    id: string;
    type: 'EXPLORATION' | 'ENCOUNTER' | 'DISCOVERY' | 'ANOMALOUS' | 'ENVIRONMENTAL';
    location: string;
    triggerConditions: Condition[];
    descriptionTemplate: string;
    requiresLLM: boolean;
    choices: Choice[];
    priority: number;
    oneTime: boolean;
}
export interface GameState {
    phase: GamePhase;
    player: PlayerState;
    currentEvent: GameEvent | null;
    selectedChoice: Choice | null;
    eventHistory: string[];
    turnCount: number;
    gameStartTime: number;
    triggeredEventIds: Set<string>;
}
/**
 * Context provided to LLM for generation
 */
export interface LLMContext {
    playerState: PlayerState;
    currentLocation: string;
    recentEvents: string[];
    template: string;
    additionalContext?: Record<string, any>;
}
/**
 * LLM generation request
 */
export interface LLMRequest {
    type: 'EVENT_DESCRIPTION' | 'OUTCOME_NARRATIVE' | 'DEATH_REVIEW' | 'ANOMALY_MANIFESTATION';
    context: LLMContext;
    maxTokens?: number;
}
/**
 * LLM generation response
 */
export interface LLMResponse {
    text: string;
    error?: string;
}
/**
 * Abstract interface for LLM service
 * Implementations can use different providers (OpenAI, Anthropic, local models)
 */
export interface ILLMService {
    generateText(request: LLMRequest): Promise<LLMResponse>;
    isAvailable(): boolean;
}
export interface GameConfig {
    startingLocation: string;
    startingStats: {
        visible: VisibleStats;
        hidden: HiddenStats;
    };
    difficultyMultiplier: number;
    enabledZones: string[];
}
//# sourceMappingURL=core.d.ts.map