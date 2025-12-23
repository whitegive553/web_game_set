/**
 * Prompt Renderer Service
 * Loads prompt templates and renders them with context
 */

import * as fs from 'fs';
import * as path from 'path';

export type PromptType = 'scene_and_choices';

export interface PromptPlaceholders {
  [key: string]: string;
}

export class PromptRenderer {
  private templatesPath: string;
  private templateCache: Map<PromptType, string> = new Map();

  constructor(templatesPath?: string) {
    // Default to project root/prompts/templates (go up two levels from packages/server)
    this.templatesPath = templatesPath || path.join(process.cwd(), '..', '..', 'prompts', 'templates');
  }

  /**
   * Render a prompt template with placeholders
   */
  render(promptType: PromptType, placeholders: PromptPlaceholders): string {
    const template = this.loadTemplate(promptType);
    return this.replacePlaceholders(template, placeholders);
  }

  /**
   * Load a template from file (with caching)
   */
  private loadTemplate(promptType: PromptType): string {
    // Check cache first
    if (this.templateCache.has(promptType)) {
      return this.templateCache.get(promptType)!;
    }

    // Determine filename
    const filename = this.getTemplateFilename(promptType);
    const filePath = path.join(this.templatesPath, filename);

    // Load template
    try {
      const template = fs.readFileSync(filePath, 'utf-8');
      this.templateCache.set(promptType, template);
      return template;
    } catch (error) {
      console.error(`Failed to load template: ${filePath}`, error);
      throw new Error(`Prompt template not found: ${promptType}`);
    }
  }

  /**
   * Get template filename for a prompt type
   */
  private getTemplateFilename(promptType: PromptType): string {
    switch (promptType) {
      case 'scene_and_choices':
        return 'scene_and_choices.prompt.md';
      default:
        throw new Error(`Unknown prompt type: ${promptType}`);
    }
  }

  /**
   * Replace placeholders in template
   * Placeholders are in format {{PLACEHOLDER_NAME}}
   */
  private replacePlaceholders(template: string, placeholders: PromptPlaceholders): string {
    let result = template;

    for (const [key, value] of Object.entries(placeholders)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }

    // Check for unreplaced placeholders (for debugging)
    const unreplaced = result.match(/\{\{([A-Z_]+)\}\}/g);
    if (unreplaced) {
      console.warn('Unreplaced placeholders found:', unreplaced);
    }

    return result;
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
  }

  /**
   * Preload all templates (useful for warming up)
   */
  preloadTemplates(): void {
    const types: PromptType[] = ['scene_and_choices'];
    types.forEach(type => {
      try {
        this.loadTemplate(type);
      } catch (error) {
        console.warn(`Failed to preload template: ${type}`, error);
      }
    });
  }

  /**
   * Check if template exists
   */
  templateExists(promptType: PromptType): boolean {
    try {
      const filename = this.getTemplateFilename(promptType);
      const filePath = path.join(this.templatesPath, filename);
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }
}

// Singleton instance
let rendererInstance: PromptRenderer | null = null;

export function getPromptRenderer(): PromptRenderer {
  if (!rendererInstance) {
    rendererInstance = new PromptRenderer();
  }
  return rendererInstance;
}
