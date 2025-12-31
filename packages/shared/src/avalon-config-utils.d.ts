/**
 * Avalon Configuration Utilities
 *
 * Provides default configurations, validation, and helper functions
 * for managing Avalon game room configurations.
 */
import { AvalonRole, AvalonTeam, RoleConfiguration, RoleConfigValidation, AvalonRoomConfig, PlayerCountConfig, QuestConfig } from './types/avalon';
interface PlayerCountRequirements {
    total: number;
    good: number;
    evil: number;
}
export declare const PLAYER_COUNT_REQUIREMENTS: Record<number, PlayerCountRequirements>;
export declare const QUEST_CONFIGURATIONS: Record<number, QuestConfig[]>;
export declare const DEFAULT_ROLE_CONFIGURATIONS: Record<number, RoleConfiguration>;
/**
 * Validates a role configuration against player count requirements
 */
export declare function validateRoleConfiguration(playerCount: number, roleConfig: RoleConfiguration): RoleConfigValidation;
/**
 * Gets the default room configuration for a given player count
 */
export declare function getDefaultRoomConfig(playerCount: number): AvalonRoomConfig | null;
/**
 * Gets the full player count configuration (roles + quests)
 */
export declare function getPlayerCountConfig(playerCount: number): PlayerCountConfig | null;
/**
 * Converts a RoleConfiguration to a PlayerCountConfig
 */
export declare function roleConfigToPlayerCountConfig(playerCount: number, roleConfig: RoleConfiguration): PlayerCountConfig | null;
/**
 * Gets the team (GOOD/EVIL) for a given role
 */
export declare function getRoleTeam(role: AvalonRole): AvalonTeam;
export {};
//# sourceMappingURL=avalon-config-utils.d.ts.map