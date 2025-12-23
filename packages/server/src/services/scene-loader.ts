/**
 * Scene Loader Service
 * Loads scene data, items, and background information from file system
 */

import * as fs from 'fs';
import * as path from 'path';
import { SceneData, ItemsData, LoadedScene, PlotBlueprint } from '@survival-game/shared';

export class SceneLoader {
  private scenesBasePath: string;
  private sceneCache: Map<string, LoadedScene> = new Map();

  constructor(scenesBasePath?: string) {
    // Default to project root/scenes directory (go up two levels from packages/server)
    this.scenesBasePath = scenesBasePath || path.join(process.cwd(), '..', '..', 'scenes');
  }

  /**
   * Load a scene by ID with all its data
   */
  async loadScene(sceneId: string): Promise<LoadedScene> {
    // Check cache first
    if (this.sceneCache.has(sceneId)) {
      return this.sceneCache.get(sceneId)!;
    }

    const scenePath = path.join(this.scenesBasePath, sceneId);

    // Check if scene directory exists
    if (!fs.existsSync(scenePath)) {
      throw new Error(`Scene directory not found: ${sceneId}`);
    }

    // Load scene.json (required)
    const sceneJsonPath = path.join(scenePath, 'scene.json');
    if (!fs.existsSync(sceneJsonPath)) {
      throw new Error(`scene.json not found for scene: ${sceneId}`);
    }

    const sceneData: SceneData = JSON.parse(
      fs.readFileSync(sceneJsonPath, 'utf-8')
    );

    // Load items.json (optional)
    let itemsData: ItemsData = { items: [] };
    const itemsJsonPath = path.join(scenePath, 'items.json');
    if (fs.existsSync(itemsJsonPath)) {
      itemsData = JSON.parse(fs.readFileSync(itemsJsonPath, 'utf-8'));
    }

    // Determine background URL
    const backgroundUrl = this.resolveBackgroundUrl(scenePath, sceneData.background.preferred);

    const loadedScene: LoadedScene = {
      scene: sceneData,
      items: itemsData,
      backgroundUrl,
    };

    // Cache the loaded scene
    this.sceneCache.set(sceneId, loadedScene);

    return loadedScene;
  }

  /**
   * Resolve background image URL
   * Returns URL to background image or fallback color
   */
  private resolveBackgroundUrl(scenePath: string, preferredFilename: string): string {
    const backgroundPath = path.join(scenePath, preferredFilename);

    if (fs.existsSync(backgroundPath)) {
      // Return relative URL path from public/static serving
      // In production, this would be served via Express static middleware
      return `/scenes/${path.basename(scenePath)}/${preferredFilename}`;
    }

    // If no background file exists, return empty string
    // Frontend will use fallbackColor from scene data
    return '';
  }

  /**
   * Get scene metadata without loading full scene
   */
  async getSceneMetadata(sceneId: string): Promise<Pick<SceneData, 'sceneId' | 'name' | 'theme' | 'dangerLevel'>> {
    const loadedScene = await this.loadScene(sceneId);
    return {
      sceneId: loadedScene.scene.sceneId,
      name: loadedScene.scene.name,
      theme: loadedScene.scene.theme,
      dangerLevel: loadedScene.scene.dangerLevel,
    };
  }

  /**
   * Check if a scene exists
   */
  sceneExists(sceneId: string): boolean {
    const scenePath = path.join(this.scenesBasePath, sceneId);
    return fs.existsSync(scenePath) && fs.existsSync(path.join(scenePath, 'scene.json'));
  }

  /**
   * List all available scene IDs
   */
  listScenes(): string[] {
    if (!fs.existsSync(this.scenesBasePath)) {
      return [];
    }

    return fs.readdirSync(this.scenesBasePath).filter(dir => {
      const scenePath = path.join(this.scenesBasePath, dir);
      return fs.statSync(scenePath).isDirectory() &&
             fs.existsSync(path.join(scenePath, 'scene.json'));
    });
  }

  /**
   * Clear the scene cache
   */
  clearCache(): void {
    this.sceneCache.clear();
  }

  /**
   * Clear specific scene from cache
   */
  clearSceneCache(sceneId: string): void {
    this.sceneCache.delete(sceneId);
  }

  /**
   * Load plot blueprint for scene (optional)
   */
  loadPlotBlueprint(sceneId: string): PlotBlueprint | null {
    const scenePath = path.join(this.scenesBasePath, sceneId);
    const plotJsonPath = path.join(scenePath, 'plot.json');

    if (!fs.existsSync(plotJsonPath)) {
      console.log(`[SceneLoader] No plot.json found for scene: ${sceneId}`);
      return null;
    }

    try {
      const plotData: PlotBlueprint = JSON.parse(
        fs.readFileSync(plotJsonPath, 'utf-8')
      );
      console.log(`[SceneLoader] Loaded plot blueprint for scene: ${sceneId}`);
      return plotData;
    } catch (error) {
      console.error(`[SceneLoader] Failed to load plot.json for scene: ${sceneId}`, error);
      return null;
    }
  }
}

// Singleton instance
let sceneLoaderInstance: SceneLoader | null = null;

export function getSceneLoader(): SceneLoader {
  if (!sceneLoaderInstance) {
    sceneLoaderInstance = new SceneLoader();
  }
  return sceneLoaderInstance;
}
