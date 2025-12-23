/**
 * InventoryDrawer Component
 * Displays player inventory and anomalous items
 */

import React from 'react';
import { useGame } from '../../store/GameContext';
import { Drawer } from '../Drawer/Drawer';
import './InventoryDrawer.css';

export const InventoryDrawer: React.FC = () => {
  const { uiState, closeInventory, gameState } = useGame();

  const normalItems = gameState.inventory.filter(item => !item.isAnomalous);
  const anomalousItems = gameState.inventory.filter(item => item.isAnomalous);

  return (
    <Drawer isOpen={uiState.isInventoryOpen} onClose={closeInventory} title="背包">
      {gameState.inventory.length === 0 ? (
        <div className="inventory__empty">
          <svg className="inventory__empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
          </svg>
          <p>背包为空</p>
        </div>
      ) : (
        <div className="inventory">
          {/* Normal Items */}
          {normalItems.length > 0 && (
            <div className="inventory__section">
              <h3 className="inventory__section-title">普通物品</h3>
              <div className="inventory__grid">
                {normalItems.map((item) => (
                  <div key={item.id} className="inventory__item">
                    <div className="inventory__item-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </div>
                    <div className="inventory__item-info">
                      <div className="inventory__item-name">{item.name}</div>
                      <div className="inventory__item-desc">{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Anomalous Items */}
          {anomalousItems.length > 0 && (
            <div className="inventory__section">
              <h3 className="inventory__section-title inventory__section-title--anomalous">
                异常物品
                <span className="inventory__anomaly-badge">跨生命保留</span>
              </h3>
              <div className="inventory__grid">
                {anomalousItems.map((item) => (
                  <div
                    key={item.id}
                    className="inventory__item inventory__item--anomalous"
                  >
                    <div className="inventory__item-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="M2 17l10 5 10-5"></path>
                        <path d="M2 12l10 5 10-5"></path>
                      </svg>
                    </div>
                    <div className="inventory__item-info">
                      <div className="inventory__item-name">{item.name}</div>
                      <div className="inventory__item-desc">{item.description}</div>
                      <div className="inventory__item-warning">
                        此物品将在死亡后保留
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
};
