/**
 * Game constants and default values
 */
import { GameConfig, VisibleStats, HiddenStats } from './types/core';
export declare const DEFAULT_VISIBLE_STATS: VisibleStats;
export declare const DEFAULT_HIDDEN_STATS: HiddenStats;
export declare const STAT_LIMITS: {
    readonly MIN: 0;
    readonly MAX: 100;
};
export declare const CRITICAL_THRESHOLDS: {
    readonly HEALTH_CRITICAL: 20;
    readonly SANITY_CRITICAL: 30;
    readonly STAMINA_EXHAUSTED: 10;
    readonly REALITY_UNSTABLE: 40;
};
export declare const LOCATIONS: {
    readonly ZONE_ENTRANCE: "ZONE_ENTRANCE";
    readonly ZONE_CORRIDOR: "ZONE_CORRIDOR";
    readonly ZONE_CHAMBER: "ZONE_CHAMBER";
};
export declare const EVENT_TYPE_WEIGHTS: {
    readonly EXPLORATION: 40;
    readonly ENCOUNTER: 25;
    readonly DISCOVERY: 20;
    readonly ANOMALOUS: 10;
    readonly ENVIRONMENTAL: 5;
};
export declare const DEFAULT_GAME_CONFIG: GameConfig;
export declare const LLM_CONFIG: {
    readonly MAX_TOKENS: {
        readonly EVENT_DESCRIPTION: 300;
        readonly OUTCOME_NARRATIVE: 200;
        readonly DEATH_REVIEW: 400;
        readonly ANOMALY_MANIFESTATION: 250;
    };
    readonly TEMPERATURE: 0.7;
    readonly TIMEOUT_MS: 10000;
};
//# sourceMappingURL=constants.d.ts.map