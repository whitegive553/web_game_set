/**
 * Save and Vault types for persistent player data
 */
export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon?: string;
    unlockedAt: number;
    category: 'exploration' | 'survival' | 'discovery' | 'story' | 'special';
}
export interface GameHistoryEntry {
    runId: string;
    sceneId: string;
    sceneName: string;
    startedAt: number;
    endedAt: number;
    outcome: 'death' | 'evacuation' | 'abandoned';
    finalStats: {
        turnCount: number;
        health: number;
        stamina: number;
    };
    summary: string;
    achievementsUnlocked: string[];
}
export interface VaultItem {
    itemId: string;
    name: string;
    type: 'PERMISSION' | 'INFO' | 'WORLD_REACTIVE' | 'UNKNOWN';
    description: string;
    meta?: Record<string, any>;
    acquiredAt: number;
}
export interface CurrentRun {
    runId: string;
    startedAt: number;
    state: {
        location: string;
        turnCount: number;
        visibleStats: {
            health: number;
            stamina: number;
            sanity: number;
            supplies: number;
        };
        hiddenStats: {
            sanity: number;
            anomalyAffinity: number;
            observationLevel: number;
            realityStability: number;
        };
        inventory: string[];
        flags: Record<string, any>;
        eventHistory: string[];
    };
    log: Array<{
        turn: number;
        location: string;
        summary: string;
        timestamp: number;
    }>;
}
export interface SaveSlot {
    slotId: string;
    updatedAt: number;
    currentRun: CurrentRun | null;
    unlocked: {
        locations: string[];
        anomalies: string[];
    };
    runHistorySummary: {
        totalRuns: number;
        totalDeaths: number;
        successfulEvacuations: number;
        totalTurns: number;
    };
}
export interface UserProfile {
    userId: string;
    activeSaveSlotId: string;
    vault: VaultItem[];
    saves: Record<string, SaveSlot>;
    achievements: Achievement[];
    history: GameHistoryEntry[];
    createdAt: number;
    updatedAt: number;
}
export interface GetSaveResponse {
    profile: UserProfile;
}
export interface UpdateSaveRequest {
    slotId: string;
    currentRun?: CurrentRun | null;
    unlocked?: SaveSlot['unlocked'];
    runHistorySummary?: SaveSlot['runHistorySummary'];
}
export interface UpdateSaveResponse {
    success: boolean;
    profile: UserProfile;
}
export interface AddVaultItemRequest {
    item: VaultItem;
}
export interface AddVaultItemResponse {
    success: boolean;
    vault: VaultItem[];
}
export interface UnlockAchievementRequest {
    achievementId: string;
    achievement: Achievement;
}
export interface UnlockAchievementResponse {
    success: boolean;
    achievements: Achievement[];
}
export interface AddGameHistoryRequest {
    entry: GameHistoryEntry;
}
export interface AddGameHistoryResponse {
    success: boolean;
    history: GameHistoryEntry[];
}
export interface GetHistoryResponse {
    history: GameHistoryEntry[];
}
export interface GetAchievementsResponse {
    achievements: Achievement[];
    unlockedCount: number;
    totalCount: number;
}
//# sourceMappingURL=save.d.ts.map