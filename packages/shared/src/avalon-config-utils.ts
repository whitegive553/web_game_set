/**
 * Avalon Configuration Utilities
 *
 * Provides default configurations, validation, and helper functions
 * for managing Avalon game room configurations.
 */

import {
  AvalonRole,
  AvalonTeam,
  RoleConfiguration,
  RoleConfigValidation,
  AvalonRoomConfig,
  PlayerCountConfig,
  QuestConfig
} from './types/avalon';

// ============================================================================
// Standard Player Count Requirements (6-10 players only)
// ============================================================================

interface PlayerCountRequirements {
  total: number;
  good: number;
  evil: number;
}

export const PLAYER_COUNT_REQUIREMENTS: Record<number, PlayerCountRequirements> = {
  5: { total: 5, good: 3, evil: 2 },
  6: { total: 6, good: 4, evil: 2 },
  7: { total: 7, good: 4, evil: 3 },
  8: { total: 8, good: 5, evil: 3 },
  9: { total: 9, good: 5, evil: 4 },  // Fixed: 梅林+派西维尔+忠臣×3=5, 莫甘娜+刺客+莫德雷德+爪牙=4
  10: { total: 10, good: 6, evil: 4 },
};

// ============================================================================
// Quest Configurations (team sizes and fail requirements)
// ============================================================================

export const QUEST_CONFIGURATIONS: Record<number, QuestConfig[]> = {
  5: [
    { questNumber: 1, teamSize: 2, failsRequired: 1 },
    { questNumber: 2, teamSize: 3, failsRequired: 1 },
    { questNumber: 3, teamSize: 2, failsRequired: 1 },
    { questNumber: 4, teamSize: 3, failsRequired: 1 },
    { questNumber: 5, teamSize: 3, failsRequired: 1 },
  ],
  6: [
    { questNumber: 1, teamSize: 2, failsRequired: 1 },
    { questNumber: 2, teamSize: 3, failsRequired: 1 },
    { questNumber: 3, teamSize: 4, failsRequired: 1 },
    { questNumber: 4, teamSize: 3, failsRequired: 1 },
    { questNumber: 5, teamSize: 4, failsRequired: 1 },
  ],
  7: [
    { questNumber: 1, teamSize: 2, failsRequired: 1 },
    { questNumber: 2, teamSize: 3, failsRequired: 1 },
    { questNumber: 3, teamSize: 3, failsRequired: 1 },
    { questNumber: 4, teamSize: 4, failsRequired: 2 }, // 7+ players: Quest 4 requires 2 fails
    { questNumber: 5, teamSize: 4, failsRequired: 1 },
  ],
  8: [
    { questNumber: 1, teamSize: 3, failsRequired: 1 },
    { questNumber: 2, teamSize: 4, failsRequired: 1 },
    { questNumber: 3, teamSize: 4, failsRequired: 1 },
    { questNumber: 4, teamSize: 5, failsRequired: 2 },
    { questNumber: 5, teamSize: 5, failsRequired: 1 },
  ],
  9: [
    { questNumber: 1, teamSize: 3, failsRequired: 1 },
    { questNumber: 2, teamSize: 4, failsRequired: 1 },
    { questNumber: 3, teamSize: 4, failsRequired: 1 },
    { questNumber: 4, teamSize: 5, failsRequired: 2 },
    { questNumber: 5, teamSize: 5, failsRequired: 1 },
  ],
  10: [
    { questNumber: 1, teamSize: 3, failsRequired: 1 },
    { questNumber: 2, teamSize: 4, failsRequired: 1 },
    { questNumber: 3, teamSize: 4, failsRequired: 1 },
    { questNumber: 4, teamSize: 5, failsRequired: 2 },
    { questNumber: 5, teamSize: 5, failsRequired: 1 },
  ],
};

// ============================================================================
// Default Role Configurations (按图示标准)
// ============================================================================

export const DEFAULT_ROLE_CONFIGURATIONS: Record<number, RoleConfiguration> = {
  5: {
    merlin: 1,
    percival: 1,
    loyalServant: 1,
    assassin: 1,
    morgana: 1,
    mordred: 0,
    oberon: 0,
    minion: 0,
  },
  6: {
    merlin: 1,
    percival: 1,
    loyalServant: 2,
    assassin: 1,
    morgana: 1,
    mordred: 0,
    oberon: 0,
    minion: 0,
  },
  7: {
    merlin: 1,
    percival: 1,
    loyalServant: 2,
    assassin: 1,
    morgana: 1,
    mordred: 0,
    oberon: 0,
    minion: 1,
  },
  8: {
    merlin: 1,
    percival: 1,
    loyalServant: 3,
    assassin: 1,
    morgana: 1,
    mordred: 0,
    oberon: 0,
    minion: 1,
  },
  9: {
    merlin: 1,
    percival: 1,
    loyalServant: 3,      // Good: 1+1+3 = 5
    assassin: 1,
    morgana: 1,
    mordred: 1,
    oberon: 0,
    minion: 1,            // Evil: 1+1+1+1 = 4
  },
  10: {
    merlin: 1,
    percival: 1,
    loyalServant: 4,
    assassin: 1,
    morgana: 1,
    mordred: 1,
    oberon: 0,
    minion: 1,
  },
};

// ============================================================================
// Role Configuration Validation
// ============================================================================

/**
 * Validates a role configuration against player count requirements
 */
export function validateRoleConfiguration(
  playerCount: number,
  roleConfig: RoleConfiguration
): RoleConfigValidation {
  const errors: string[] = [];

  // Check player count is supported (5-10 only)
  if (playerCount < 5 || playerCount > 10) {
    errors.push(`Player count must be between 5 and 10 (got ${playerCount})`);
    return { valid: false, errors };
  }

  const requirements = PLAYER_COUNT_REQUIREMENTS[playerCount];
  if (!requirements) {
    errors.push(`No configuration found for ${playerCount} players`);
    return { valid: false, errors };
  }

  // Validate uniqueness constraints (special roles max 1 each)
  if (roleConfig.merlin > 1) errors.push('Merlin: maximum 1 allowed');
  if (roleConfig.percival > 1) errors.push('Percival: maximum 1 allowed');
  if (roleConfig.assassin > 1) errors.push('Assassin: maximum 1 allowed');
  if (roleConfig.morgana > 1) errors.push('Morgana: maximum 1 allowed');
  if (roleConfig.mordred > 1) errors.push('Mordred: maximum 1 allowed');
  if (roleConfig.oberon > 1) errors.push('Oberon: maximum 1 allowed');

  // Validate non-negative counts
  const allCounts = Object.values(roleConfig);
  if (allCounts.some(count => count < 0)) {
    errors.push('All role counts must be non-negative');
  }

  // Calculate totals
  const goodCount = roleConfig.merlin + roleConfig.percival + roleConfig.loyalServant;
  const evilCount = roleConfig.assassin + roleConfig.morgana + roleConfig.mordred +
                    roleConfig.oberon + roleConfig.minion;
  const totalRoles = goodCount + evilCount;

  // Validate total equals player count
  if (totalRoles !== requirements.total) {
    errors.push(
      `Total roles (${totalRoles}) must equal player count (${requirements.total})`
    );
  }

  // Validate good/evil ratio
  if (goodCount !== requirements.good) {
    errors.push(
      `Good roles (${goodCount}) must equal ${requirements.good} for ${playerCount} players`
    );
  }
  if (evilCount !== requirements.evil) {
    errors.push(
      `Evil roles (${evilCount}) must equal ${requirements.evil} for ${playerCount} players`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    totalRoles,
    goodCount,
    evilCount,
  };
}

// ============================================================================
// Default Configuration Generation
// ============================================================================

/**
 * Gets the default room configuration for a given player count
 */
export function getDefaultRoomConfig(playerCount: number): AvalonRoomConfig | null {
  if (playerCount < 5 || playerCount > 10) {
    return null;
  }

  return {
    targetPlayerCount: playerCount,
    roleConfig: DEFAULT_ROLE_CONFIGURATIONS[playerCount],
  };
}

/**
 * Gets the full player count configuration (roles + quests)
 */
export function getPlayerCountConfig(playerCount: number): PlayerCountConfig | null {
  if (playerCount < 5 || playerCount > 10) {
    return null;
  }

  const requirements = PLAYER_COUNT_REQUIREMENTS[playerCount];
  const roleConfig = DEFAULT_ROLE_CONFIGURATIONS[playerCount];
  const quests = QUEST_CONFIGURATIONS[playerCount];

  // Build role arrays from configuration
  const goodRoles: string[] = [];
  const evilRoles: string[] = [];

  // Add good roles
  for (let i = 0; i < roleConfig.merlin; i++) goodRoles.push(AvalonRole.MERLIN);
  for (let i = 0; i < roleConfig.percival; i++) goodRoles.push(AvalonRole.PERCIVAL);
  for (let i = 0; i < roleConfig.loyalServant; i++) goodRoles.push(AvalonRole.LOYAL_SERVANT);

  // Add evil roles
  for (let i = 0; i < roleConfig.assassin; i++) evilRoles.push(AvalonRole.ASSASSIN);
  for (let i = 0; i < roleConfig.morgana; i++) evilRoles.push(AvalonRole.MORGANA);
  for (let i = 0; i < roleConfig.mordred; i++) evilRoles.push(AvalonRole.MORDRED);
  for (let i = 0; i < roleConfig.oberon; i++) evilRoles.push(AvalonRole.OBERON);
  for (let i = 0; i < roleConfig.minion; i++) evilRoles.push(AvalonRole.MINION);

  return {
    totalPlayers: requirements.total,
    goodCount: requirements.good,
    evilCount: requirements.evil,
    roles: {
      good: goodRoles,
      evil: evilRoles,
    },
    quests,
  };
}

/**
 * Converts a RoleConfiguration to a PlayerCountConfig
 */
export function roleConfigToPlayerCountConfig(
  playerCount: number,
  roleConfig: RoleConfiguration
): PlayerCountConfig | null {
  // Validate first
  const validation = validateRoleConfiguration(playerCount, roleConfig);
  if (!validation.valid) {
    return null;
  }

  const requirements = PLAYER_COUNT_REQUIREMENTS[playerCount];
  const quests = QUEST_CONFIGURATIONS[playerCount];

  // Build role arrays from configuration
  const goodRoles: string[] = [];
  const evilRoles: string[] = [];

  // Add good roles
  for (let i = 0; i < roleConfig.merlin; i++) goodRoles.push(AvalonRole.MERLIN);
  for (let i = 0; i < roleConfig.percival; i++) goodRoles.push(AvalonRole.PERCIVAL);
  for (let i = 0; i < roleConfig.loyalServant; i++) goodRoles.push(AvalonRole.LOYAL_SERVANT);

  // Add evil roles
  for (let i = 0; i < roleConfig.assassin; i++) evilRoles.push(AvalonRole.ASSASSIN);
  for (let i = 0; i < roleConfig.morgana; i++) evilRoles.push(AvalonRole.MORGANA);
  for (let i = 0; i < roleConfig.mordred; i++) evilRoles.push(AvalonRole.MORDRED);
  for (let i = 0; i < roleConfig.oberon; i++) evilRoles.push(AvalonRole.OBERON);
  for (let i = 0; i < roleConfig.minion; i++) evilRoles.push(AvalonRole.MINION);

  return {
    totalPlayers: requirements.total,
    goodCount: requirements.good,
    evilCount: requirements.evil,
    roles: {
      good: goodRoles,
      evil: evilRoles,
    },
    quests,
  };
}

// ============================================================================
// Role Team Mapping
// ============================================================================

/**
 * Gets the team (GOOD/EVIL) for a given role
 */
export function getRoleTeam(role: AvalonRole): AvalonTeam {
  switch (role) {
    case AvalonRole.MERLIN:
    case AvalonRole.PERCIVAL:
    case AvalonRole.LOYAL_SERVANT:
      return AvalonTeam.GOOD;

    case AvalonRole.ASSASSIN:
    case AvalonRole.MORGANA:
    case AvalonRole.MORDRED:
    case AvalonRole.OBERON:
    case AvalonRole.MINION:
      return AvalonTeam.EVIL;

    default:
      throw new Error(`Unknown role: ${role}`);
  }
}
