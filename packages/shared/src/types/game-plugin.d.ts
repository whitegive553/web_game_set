/**
 * Game Plugin System
 * Unified interface for all games (text-adventure, avalon, etc.)
 */
export interface GamePlugin {
    gameId: string;
    displayName: string;
    minPlayers: number;
    maxPlayers: number;
    createMatch(roomId: string, options: any): GameMatch;
    validateAction(match: GameMatch, userId: string, action: PluginGameAction): ValidationResult;
}
export interface GameMatch {
    matchId: string;
    roomId: string;
    gameId: string;
    state: PluginGameState;
    players: PluginGamePlayer[];
    createdAt: number;
    startedAt?: number;
    endedAt?: number;
}
export interface PluginGamePlayer {
    userId: string;
    username: string;
    ready: boolean;
    connected: boolean;
}
export interface PluginGameState {
    phase: string;
    [key: string]: any;
}
export interface PluginGameAction {
    type: string;
    payload?: any;
}
export interface PluginGameEvent {
    eventId: string;
    matchId: string;
    gameId: string;
    timestamp: number;
    type: string;
    userId?: string;
    payload: any;
    visibleTo?: 'all' | 'player' | string[];
}
export interface ValidationResult {
    valid: boolean;
    error?: string;
}
export interface PublicStateView {
    matchId: string;
    gameId: string;
    phase: string;
    players: Array<{
        userId: string;
        username: string;
        ready: boolean;
        connected: boolean;
    }>;
    [key: string]: any;
}
export interface PrivateStateView {
    userId: string;
    [key: string]: any;
}
export interface GameHistoryRecord {
    gameId: string;
    matchId: string;
    roomId: string;
    players: Array<{
        userId: string;
        username: string;
    }>;
    startedAt: number;
    endedAt: number;
    winner?: string;
    events: PluginGameEvent[];
}
//# sourceMappingURL=game-plugin.d.ts.map