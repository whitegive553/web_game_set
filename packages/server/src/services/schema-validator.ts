/**
 * Schema Validator Service
 * Validates LLM input and output against JSON schemas
 */

import * as fs from 'fs';
import * as path from 'path';
import { LLMGenerationInput, LLMGenerationOutput } from '@survival-game/shared';

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class SchemaValidator {
  private inputSchema: any;
  private outputSchema: any;

  constructor(schemasPath?: string) {
    // Default to project root/prompts/schemas (go up two levels from packages/server)
    const basePath = schemasPath || path.join(process.cwd(), '..', '..', 'prompts', 'schemas');

    // Load schemas
    this.inputSchema = this.loadSchema(path.join(basePath, 'llm_input.schema.json'));
    this.outputSchema = this.loadSchema(path.join(basePath, 'llm_output.schema.json'));
  }

  /**
   * Load a JSON schema from file
   */
  private loadSchema(filePath: string): any {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (error) {
      console.error(`Failed to load schema: ${filePath}`, error);
      return null;
    }
  }

  /**
   * Validate LLM input against schema
   */
  validateInput(input: LLMGenerationInput): ValidationResult {
    return this.validate(input, this.inputSchema, 'input');
  }

  /**
   * Validate LLM output against schema
   */
  validateOutput(output: any): ValidationResult {
    return this.validate(output, this.outputSchema, 'output');
  }

  /**
   * Generic validation function
   */
  private validate(data: any, schema: any, type: string): ValidationResult {
    const errors: string[] = [];

    if (!schema) {
      errors.push(`${type} schema not loaded`);
      return { valid: false, errors };
    }

    // Basic validation (simplified - in production, use a library like Ajv)
    try {
      // Check required fields based on schema
      if (type === 'input') {
        this.validateLLMInput(data, errors);
      } else if (type === 'output') {
        this.validateLLMOutput(data, errors);
      }
    } catch (error: any) {
      errors.push(`Validation error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate LLM input structure
   */
  private validateLLMInput(input: any, errors: string[]): void {
    if (!input.promptType) {
      errors.push('Missing required field: promptType');
    }

    if (!input.context) {
      errors.push('Missing required field: context');
      return;
    }

    const { context } = input;

    // Validate scene
    if (!context.scene) {
      errors.push('Missing required field: context.scene');
    } else {
      if (!context.scene.sceneId) errors.push('Missing context.scene.sceneId');
      if (!context.scene.name) errors.push('Missing context.scene.name');
      if (!Array.isArray(context.scene.theme)) errors.push('context.scene.theme must be an array');
      if (typeof context.scene.dangerLevel !== 'number') {
        errors.push('context.scene.dangerLevel must be a number');
      }
    }

    // Validate player
    if (!context.player) {
      errors.push('Missing required field: context.player');
    } else {
      if (!context.player.visibleState) {
        errors.push('Missing context.player.visibleState');
      } else {
        const vs = context.player.visibleState;
        if (typeof vs.health !== 'number') errors.push('visibleState.health must be a number');
        if (typeof vs.stamina !== 'number') errors.push('visibleState.stamina must be a number');
        if (typeof vs.hunger !== 'number') errors.push('visibleState.hunger must be a number');
        if (typeof vs.water !== 'number') errors.push('visibleState.water must be a number');
      }
      if (!Array.isArray(context.player.inventorySummary)) {
        errors.push('context.player.inventorySummary must be an array');
      }
      if (!Array.isArray(context.player.vaultSummary)) {
        errors.push('context.player.vaultSummary must be an array');
      }
    }

    // Validate history
    if (!Array.isArray(context.history)) {
      errors.push('context.history must be an array');
    }

    // Validate meta
    if (!context.meta) {
      errors.push('Missing required field: context.meta');
    } else {
      if (typeof context.meta.step !== 'number') errors.push('context.meta.step must be a number');
      if (typeof context.meta.failureCount !== 'number') {
        errors.push('context.meta.failureCount must be a number');
      }
      if (!context.meta.runId) errors.push('Missing context.meta.runId');
    }

    // Validate constraints
    if (!input.constraints) {
      errors.push('Missing required field: constraints');
    } else {
      const c = input.constraints;
      if (typeof c.minChoices !== 'number') errors.push('constraints.minChoices must be a number');
      if (typeof c.maxChoices !== 'number') errors.push('constraints.maxChoices must be a number');
      if (!c.tone) errors.push('Missing constraints.tone');
      if (!c.language) errors.push('Missing constraints.language');
      if (typeof c.noDirectOutcome !== 'boolean') {
        errors.push('constraints.noDirectOutcome must be a boolean');
      }
    }
  }

  /**
   * Validate LLM output structure
   */
  private validateLLMOutput(output: any, errors: string[]): void {
    // Validate narrative
    if (!output.narrative) {
      errors.push('Missing required field: narrative');
    } else {
      if (!output.narrative.text || typeof output.narrative.text !== 'string') {
        errors.push('narrative.text must be a non-empty string');
      } else {
        if (output.narrative.text.length < 10) {
          errors.push('narrative.text must be at least 10 characters');
        }
        if (output.narrative.text.length > 1000) {
          errors.push('narrative.text must be at most 1000 characters');
        }
      }

      const validSources = ['environment', 'character', 'system'];
      if (!validSources.includes(output.narrative.source)) {
        errors.push(`narrative.source must be one of: ${validSources.join(', ')}`);
      }
    }

    // Validate choices
    if (!Array.isArray(output.choices)) {
      errors.push('choices must be an array');
    } else {
      if (output.choices.length < 2) {
        errors.push('choices must have at least 2 items');
      }
      if (output.choices.length > 4) {
        errors.push('choices must have at most 4 items');
      }

      const choiceIds = new Set<string>();
      output.choices.forEach((choice: any, index: number) => {
        if (!choice.id) {
          errors.push(`choices[${index}].id is required`);
        } else {
          if (!/^choice_[0-9]+$/.test(choice.id)) {
            errors.push(`choices[${index}].id must match pattern "choice_N"`);
          }
          if (choiceIds.has(choice.id)) {
            errors.push(`Duplicate choice ID: ${choice.id}`);
          }
          choiceIds.add(choice.id);
        }

        if (!choice.text || typeof choice.text !== 'string') {
          errors.push(`choices[${index}].text must be a non-empty string`);
        } else {
          if (choice.text.length < 5 || choice.text.length > 200) {
            errors.push(`choices[${index}].text must be between 5 and 200 characters`);
          }
        }

        if (!choice.riskHint || typeof choice.riskHint !== 'string') {
          errors.push(`choices[${index}].riskHint must be a non-empty string`);
        } else {
          if (choice.riskHint.length < 3 || choice.riskHint.length > 100) {
            errors.push(`choices[${index}].riskHint must be between 3 and 100 characters`);
          }
        }
      });
    }

    // Validate tags
    if (!Array.isArray(output.tags)) {
      errors.push('tags must be an array');
    } else {
      if (output.tags.length < 1 || output.tags.length > 3) {
        errors.push('tags must have between 1 and 3 items');
      }

      output.tags.forEach((tag: any, index: number) => {
        if (typeof tag !== 'string') {
          errors.push(`tags[${index}] must be a string`);
        } else {
          // Basic validation: tag should be reasonable length
          if (tag.length < 2 || tag.length > 50) {
            errors.push(`tags[${index}] must be between 2 and 50 characters`);
          }
          // Tag should be alphanumeric with underscores
          if (!/^[a-z0-9_]+$/.test(tag)) {
            errors.push(`tags[${index}] must contain only lowercase letters, numbers, and underscores`);
          }
        }
      });
    }
  }

  /**
   * Parse and validate LLM response (handles JSON parsing)
   */
  parseAndValidateOutput(rawResponse: string): {
    success: boolean;
    output?: LLMGenerationOutput;
    errors: string[];
    rawOutput?: string;
  } {
    const errors: string[] = [];

    // Try to parse JSON
    let parsed: any;
    try {
      // Remove markdown code fences if present
      let cleaned = rawResponse.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      parsed = JSON.parse(cleaned);
    } catch (error: any) {
      errors.push(`Failed to parse JSON: ${error.message}`);
      return {
        success: false,
        errors,
        rawOutput: rawResponse,
      };
    }

    // Validate structure
    const validation = this.validateOutput(parsed);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
        rawOutput: rawResponse,
      };
    }

    return {
      success: true,
      output: parsed as LLMGenerationOutput,
      errors: [],
    };
  }
}

// Singleton instance
let validatorInstance: SchemaValidator | null = null;

export function getSchemaValidator(): SchemaValidator {
  if (!validatorInstance) {
    validatorInstance = new SchemaValidator();
  }
  return validatorInstance;
}
