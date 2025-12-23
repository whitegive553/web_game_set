/**
 * Scene Selection - Choose which scene to play
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SceneSelect.css';

interface Scene {
  id: string;
  name: string;
  description: string;
  dangerLevel: number;
  theme: string[];
  unlocked: boolean;
}

export const SceneSelect: React.FC = () => {
  const navigate = useNavigate();
  const [scenes] = useState<Scene[]>([
    {
      id: 'zone_01',
      name: '禁区边缘',
      description: '一片笼罩在迷雾中的山坡，空气中弥漫着说不清的异样感。你的指南针开始颤动，温度似乎比周围低了几度...',
      dangerLevel: 3,
      theme: ['迷雾', '山地', '未知结构'],
      unlocked: true
    },
    {
      id: 'zone_02',
      name: '废弃设施',
      description: '一座锈迹斑斑的工业建筑，内部传来不明的金属摩擦声。墙上的文字似乎在扭曲变化...',
      dangerLevel: 5,
      theme: ['工业废墟', '异常空间', '未知实体'],
      unlocked: false // 需要完成 zone_01 解锁
    },
    {
      id: 'zone_03',
      name: '深层异常',
      description: '现实的边界在这里变得模糊，时间和空间的规律不再适用。只有最有经验的探索者才能进入...',
      dangerLevel: 8,
      theme: ['现实扭曲', '高危', '极端异常'],
      unlocked: false
    }
  ]);

  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);

  const handleSelectScene = (scene: Scene) => {
    if (scene.unlocked) {
      setSelectedScene(scene);
    }
  };

  const handleStartGame = () => {
    if (selectedScene) {
      // Navigate to game with selected scene
      navigate(`/game/play?scene=${selectedScene.id}`);
    }
  };

  const handleBack = () => {
    navigate('/game');
  };

  return (
    <div className="scene-select">
      <div className="scene-select-container">
        <div className="scene-select-header">
          <button className="back-button" onClick={handleBack}>
            ← 返回主菜单
          </button>
          <h1>选择场景</h1>
          <p className="header-subtitle">Choose Your Destination</p>
        </div>

        <div className="scenes-grid">
          {scenes.map((scene) => (
            <div
              key={scene.id}
              className={`scene-card ${selectedScene?.id === scene.id ? 'selected' : ''} ${!scene.unlocked ? 'locked' : ''}`}
              onClick={() => handleSelectScene(scene)}
            >
              {!scene.unlocked && (
                <div className="lock-overlay">
                  <span className="lock-icon">🔒</span>
                  <p>未解锁</p>
                </div>
              )}

              <div className="scene-header">
                <h2>{scene.name}</h2>
                <div className="danger-level">
                  <span className="danger-label">危险等级:</span>
                  <div className="danger-bars">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className={`danger-bar ${i < scene.dangerLevel ? 'active' : ''}`}
                      />
                    ))}
                  </div>
                  <span className="danger-value">{scene.dangerLevel}/10</span>
                </div>
              </div>

              <p className="scene-description">{scene.description}</p>

              <div className="scene-themes">
                {scene.theme.map((theme, index) => (
                  <span key={index} className="theme-tag">
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="action-buttons">
          <button
            className="start-button"
            onClick={handleStartGame}
            disabled={!selectedScene}
          >
            {selectedScene ? `进入 ${selectedScene.name}` : '请选择场景'}
          </button>
        </div>
      </div>
    </div>
  );
};
