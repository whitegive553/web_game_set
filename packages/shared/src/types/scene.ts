/**
 * Scene system type definitions
 */

/**
 * Scene metadata and configuration
 */
export interface SceneData {
  sceneId: string;
  name: string;
  theme: string[];
  description: string;
  allowedEvents: string[];
  possibleItems: string[];
  dangerLevel: number;
  background: {
    preferred: string;
    fallbackColor: string;
  };
  rules?: {
    maxSteps?: number;
    evacuationAvailable?: boolean;
    deathIsPermament?: boolean;
  };
}

/**
 * Item definition
 */
export interface ItemData {
  itemId: string;
  name: string;
  type: string;
  rarity?: string;
  desc: string;
  meta: Record<string, any>;
  effects: Record<string, number>;
}

/**
 * Items collection
 */
export interface ItemsData {
  items: ItemData[];
}

/**
 * Loaded scene with all related data
 */
export interface LoadedScene {
  scene: SceneData;
  items: ItemsData;
  backgroundUrl: string;
}
