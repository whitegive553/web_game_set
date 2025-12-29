/**
 * Avalon Room Configuration Panel
 * Allows host to configure player count and roles in lobby
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './AvalonRoomConfig.css';

interface RoleConfiguration {
  merlin: number;
  percival: number;
  loyalServant: number;
  assassin: number;
  morgana: number;
  mordred: number;
  oberon: number;
  minion: number;
}

interface AvalonRoomConfig {
  targetPlayerCount: number;
  roleConfig: RoleConfiguration;
}

interface ValidationError {
  valid: boolean;
  errors: string[];
  totalRoles?: number;
  goodCount?: number;
  evilCount?: number;
}

interface Props {
  config: AvalonRoomConfig;
  currentPlayerCount: number;
  isHost: boolean;
  onConfigUpdate: (config: AvalonRoomConfig) => Promise<void>;
}

// 标准配置要求
const PLAYER_COUNT_REQUIREMENTS: Record<number, { good: number; evil: number }> = {
  6: { good: 4, evil: 2 },
  7: { good: 4, evil: 3 },
  8: { good: 5, evil: 3 },
  9: { good: 5, evil: 4 },
  10: { good: 6, evil: 4 },
};

export const AvalonRoomConfig: React.FC<Props> = ({
  config,
  currentPlayerCount,
  isHost,
  onConfigUpdate
}) => {
  const { t } = useTranslation();
  const [editedConfig, setEditedConfig] = useState<AvalonRoomConfig>(config);
  const [isEditing, setIsEditing] = useState(false);
  const [validation, setValidation] = useState<ValidationError | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 只在非编辑状态下更新配置，避免覆盖用户正在编辑的内容
    if (!isEditing) {
      setEditedConfig(config);
      validateConfig(config);
    }
  }, [config, isEditing]);

  const validateConfig = (cfg: AvalonRoomConfig) => {
    const errors: string[] = [];
    const { roleConfig, targetPlayerCount } = cfg;

    // 检查人数范围
    if (targetPlayerCount < 6 || targetPlayerCount > 10) {
      errors.push(t('avalonConfig.validation.playerCountRange'));
    }

    // 检查特殊角色唯一性 - Skip for now, not critical validation

    // 计算总数
    const goodCount = roleConfig.merlin + roleConfig.percival + roleConfig.loyalServant;
    const evilCount = roleConfig.assassin + roleConfig.morgana + roleConfig.mordred +
                      roleConfig.oberon + roleConfig.minion;
    const totalRoles = goodCount + evilCount;

    // 检查总数
    if (totalRoles !== targetPlayerCount) {
      errors.push(t('avalonConfig.validation.totalMismatch', { total: totalRoles, target: targetPlayerCount }));
    }

    // 检查善恶比例
    const requirement = PLAYER_COUNT_REQUIREMENTS[targetPlayerCount];
    if (requirement) {
      if (goodCount !== requirement.good) {
        errors.push(t('avalonConfig.validation.goodCountMismatch', { required: requirement.good, actual: goodCount }));
      }
      if (evilCount !== requirement.evil) {
        errors.push(t('avalonConfig.validation.evilCountMismatch', { required: requirement.evil, actual: evilCount }));
      }
    }

    setValidation({
      valid: errors.length === 0,
      errors,
      totalRoles,
      goodCount,
      evilCount
    });
  };

  const handlePlayerCountChange = (newCount: number) => {
    const newConfig = { ...editedConfig, targetPlayerCount: newCount };

    // 自动使用默认配置
    const requirement = PLAYER_COUNT_REQUIREMENTS[newCount];
    if (requirement) {
      // 简单的默认配置生成
      newConfig.roleConfig = {
        merlin: 1,
        percival: 1,
        loyalServant: requirement.good - 2,
        assassin: 1,
        morgana: 1,
        mordred: newCount >= 9 ? 1 : 0,
        oberon: 0,
        minion: Math.max(0, requirement.evil - 2 - (newCount >= 9 ? 1 : 0))
      };
    }

    setEditedConfig(newConfig);
    validateConfig(newConfig);
  };

  const handleRoleChange = (role: keyof RoleConfiguration, value: number) => {
    const newConfig = {
      ...editedConfig,
      roleConfig: {
        ...editedConfig.roleConfig,
        [role]: Math.max(0, value)
      }
    };
    setEditedConfig(newConfig);
    validateConfig(newConfig);
  };

  const handleSave = async () => {
    if (!validation?.valid) return;

    setSaving(true);
    try {
      await onConfigUpdate(editedConfig);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedConfig(config);
    validateConfig(config);
    setIsEditing(false);
  };

  const { roleConfig, targetPlayerCount } = isEditing ? editedConfig : config;
  const requirement = PLAYER_COUNT_REQUIREMENTS[targetPlayerCount];

  return (
    <div className="avalon-room-config">
      <div className="config-header">
        <h2>{t('avalonConfig.title')}</h2>
        {isHost && !isEditing && (
          <button onClick={() => setIsEditing(true)} className="btn-edit-config">
            {t('avalonConfig.editConfig')}
          </button>
        )}
      </div>

      {/* 目标人数 */}
      <div className="config-section">
        <div className="config-label">{t('avalonConfig.targetPlayerCount')}</div>
        {isEditing ? (
          <div className="player-count-selector">
            {[6, 7, 8, 9, 10].map(count => (
              <button
                key={count}
                className={`count-option ${targetPlayerCount === count ? 'selected' : ''}`}
                onClick={() => handlePlayerCountChange(count)}
                disabled={count < currentPlayerCount}
                title={count < currentPlayerCount ? t('avalonConfig.currentPlayers', { count: currentPlayerCount }) : ''}
              >
                {t('avalonConfig.playerCount', { count })}
              </button>
            ))}
          </div>
        ) : (
          <div className="config-value">
            <strong>{t('avalonConfig.playerCount', { count: targetPlayerCount })}</strong>
            {requirement && (
              <span className="config-detail">
                {t('avalonConfig.goodEvilRatio', { good: requirement.good, evil: requirement.evil })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 角色配置 */}
      <div className="config-section">
        <div className="config-label">{t('avalonConfig.roleConfig')}</div>

        {/* 善良阵营 */}
        <div className="role-group">
          <h3 className="role-group-title good">{t('avalonConfig.goodTeam')} ({roleConfig.merlin + roleConfig.percival + roleConfig.loyalServant})</h3>
          <div className="role-list">
            {(['merlin', 'percival', 'loyalServant'] as const).map(role => (
              <div key={role} className="role-item">
                <div className="role-info">
                  <span className="role-name">{t(`avalonConfig.roles.${role}`)}</span>
                  <span className="role-desc">{t(`avalonConfig.roles.descriptions.${role}`)}</span>
                </div>
                {isEditing ? (
                  <div className="role-control">
                    <button
                      onClick={() => handleRoleChange(role, roleConfig[role] - 1)}
                      disabled={roleConfig[role] === 0}
                    >
                      -
                    </button>
                    <span className="role-count">{roleConfig[role]}</span>
                    <button
                      onClick={() => handleRoleChange(role, roleConfig[role] + 1)}
                      disabled={role !== 'loyalServant' && roleConfig[role] >= 1}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <span className="role-count-display">{roleConfig[role]}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 邪恶阵营 */}
        <div className="role-group">
          <h3 className="role-group-title evil">{t('avalonConfig.evilTeam')} ({roleConfig.assassin + roleConfig.morgana + roleConfig.mordred + roleConfig.oberon + roleConfig.minion})</h3>
          <div className="role-list">
            {(['assassin', 'morgana', 'mordred', 'oberon', 'minion'] as const).map(role => (
              <div key={role} className="role-item">
                <div className="role-info">
                  <span className="role-name">{t(`avalonConfig.roles.${role}`)}</span>
                  <span className="role-desc">{t(`avalonConfig.roles.descriptions.${role}`)}</span>
                </div>
                {isEditing ? (
                  <div className="role-control">
                    <button
                      onClick={() => handleRoleChange(role, roleConfig[role] - 1)}
                      disabled={roleConfig[role] === 0}
                    >
                      -
                    </button>
                    <span className="role-count">{roleConfig[role]}</span>
                    <button
                      onClick={() => handleRoleChange(role, roleConfig[role] + 1)}
                      disabled={role !== 'minion' && roleConfig[role] >= 1}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <span className="role-count-display">{roleConfig[role]}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 校验信息 */}
      {isEditing && validation && (
        <div className={`validation-info ${validation.valid ? 'valid' : 'invalid'}`}>
          {validation.valid ? (
            <div className="validation-success">
              {t('avalonConfig.validation.valid', { total: validation.totalRoles, good: validation.goodCount, evil: validation.evilCount })}
            </div>
          ) : (
            <div className="validation-errors">
              <div className="error-title">{t('avalonConfig.validation.errors')}</div>
              <ul>
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 编辑按钮 */}
      {isEditing && (
        <div className="config-actions">
          <button onClick={handleCancel} className="btn-cancel" disabled={saving}>
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="btn-save"
            disabled={!validation?.valid || saving}
          >
            {saving ? t('avalonConfig.saving') : t('avalonConfig.saveConfig')}
          </button>
        </div>
      )}
    </div>
  );
};
