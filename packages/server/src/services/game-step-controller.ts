/**
 * Game Step Controller
 * Orchestrates LLM-based narrative generation for game steps
 */

import { getSceneLoader } from './scene-loader';
import { getContextBuilder } from './context-builder';
import { getPromptRenderer } from './prompt-renderer';
import { getLLMClient } from './llm-client';
import { getSchemaValidator } from './schema-validator';
import { PlotDirector } from './plot-director';
import { LLMGenerationOutput, LLMGeneratedChoice, SceneData, PlotBlueprint } from '@survival-game/shared';

export interface GameStepInput {
  sceneId: string;
  gameState: {
    player: {
      visible: {
        health: number;
        stamina: number;
        supplies?: number;
      };
      inventory: Array<{ name: string }>;
      persistent: {
        anomalousArtifacts: Array<{ name: string }>;
        deathCount: number;
      };
    };
    turnCount: number;
  };
  history: Array<{
    step: number;
    eventId: string;
    choiceId: string;
    choiceText: string;
    outcome: {
      summary: string;
    };
  }>;
  runId: string;
}

export interface GameStepOutput {
  narrative: string;
  narrativeSource: string;
  choices: LLMGeneratedChoice[];
  tags: string[];
  background: string;
  backgroundFallback: string;
  sceneInfo: {
    sceneId: string;
    name: string;
    dangerLevel: number;
  };
  meta: {
    usedFallback: boolean;
    llmError?: string;
  };
}

export class GameStepController {
  private sceneLoader = getSceneLoader();
  private contextBuilder = getContextBuilder();
  private promptRenderer = getPromptRenderer();
  private llmClient: ReturnType<typeof getLLMClient>;
  private schemaValidator = getSchemaValidator();
  private plotDirector: PlotDirector | null = null;
  private currentSceneId: string | null = null;

  constructor() {
    // Initialize LLM client in constructor to ensure env vars are loaded
    this.llmClient = getLLMClient();
  }

  /**
   * Generate next game step with narrative and choices
   */
  async generateStep(input: GameStepInput): Promise<GameStepOutput> {
    try {
      // 1. Load scene data
      const loadedScene = await this.sceneLoader.loadScene(input.sceneId);
      const scene = loadedScene.scene;

      // 1.5. Initialize PlotDirector if needed
      if (!this.plotDirector || this.currentSceneId !== input.sceneId) {
        const plotBlueprint = this.sceneLoader.loadPlotBlueprint(input.sceneId);
        if (plotBlueprint) {
          this.plotDirector = new PlotDirector(plotBlueprint);
          this.currentSceneId = input.sceneId;
          console.log(`[Controller] Initialized PlotDirector for scene: ${input.sceneId}`);
        } else {
          console.log(`[Controller] No plot blueprint for scene: ${input.sceneId}, running without plot control`);
        }
      }

      // 2. Get plot context (if PlotDirector exists)
      let plotContext, antiStallContext, pacingContext;
      if (this.plotDirector) {
        plotContext = this.plotDirector.determinePlotContext(input.gameState.turnCount);
        antiStallContext = this.plotDirector.getAntiStallContext();
        pacingContext = this.plotDirector.determinePacingConstraints(input.gameState.turnCount);

        console.log(`[Controller] Plot context: act=${plotContext.act}, beat=${plotContext.beatId}`);
        console.log(`[Controller] Must reveal: ${plotContext.mustReveal.join(', ')}`);
        console.log(`[Controller] Forbidden intents: ${antiStallContext.forbiddenIntentsThisTurn.join(', ')}`);
      }

      // 3. Build LLM context
      const llmInput = this.contextBuilder.buildLLMInput(
        input.gameState,
        scene,
        input.history,
        input.runId,
        undefined, // overrideConstraints
        plotContext,
        antiStallContext,
        pacingContext
      );

      // 3. Validate input
      const inputValidation = this.schemaValidator.validateInput(llmInput);
      if (!inputValidation.valid) {
        console.error('LLM input validation failed:', inputValidation.errors);
        return this.generateFallback(scene, loadedScene.backgroundUrl, 'Input validation failed');
      }

      // 4. Generate last choice summary (if history exists)
      let lastChoiceSummary = '';
      if (input.history.length > 0) {
        const lastChoice = input.history[input.history.length - 1];
        lastChoiceSummary = `
---
**ATTENTION: LAST PLAYER ACTION**

The player just completed step ${lastChoice.step}.

**What the player chose**: "${lastChoice.choiceText}"

Your narrative MUST start by describing what happens as a DIRECT RESULT of this action.

- If player chose "进入裂口", your narrative should begin INSIDE the crack/crevice
- If player chose "向山上攀登", your narrative should describe the climbing process or arrival
- If player chose "停下休息", your narrative should describe the rest period or what player notices during rest

DO NOT ignore this action. DO NOT jump to a different location. Continue the story from this exact point.
---
`;
      } else {
        lastChoiceSummary = `
---
**ATTENTION: FIRST STEP**

This is the opening scene (step 0). Generate an atmospheric introduction to the scene based on the scene context above.
---
`;
      }

      // 5. Render prompt
      const prompt = this.promptRenderer.render('scene_and_choices', {
        CONTEXT_JSON: JSON.stringify(llmInput.context, null, 2),
        CONSTRAINTS_JSON: JSON.stringify(llmInput.constraints, null, 2),
        LAST_CHOICE_SUMMARY: lastChoiceSummary,
        // Plot progression placeholders
        ACT_ID: plotContext?.act || 'N/A',
        BEAT_ID: plotContext?.beatId || 'N/A',
        GOAL_DESCRIPTION: plotContext?.goal || 'Continue exploration',
        MUST_REVEAL_LIST: plotContext?.mustReveal.join(', ') || 'None',
        // Anti-stall placeholders
        RECENT_INTENTS: antiStallContext?.recentIntents.join(' → ') || 'None',
        FORBIDDEN_INTENTS: antiStallContext?.forbiddenIntentsThisTurn.join(', ') || 'None',
      });

      // Log prompt for debugging (can be removed in production)
      console.log('Generated prompt (first 200 chars):', prompt.substring(0, 200) + '...');

      // Log last choice summary to verify it's being sent
      if (input.history.length > 0) {
        const lastChoice = input.history[input.history.length - 1];
        console.log(`[Controller] Last player action: "${lastChoice.choiceText}"`);
        console.log(`[Controller] LLM should generate narrative INSIDE/AFTER this action`);
      } else {
        console.log('[Controller] First step - generating opening scene');
      }

      // 5. Call LLM
      const llmResponse = await this.llmClient.generate(prompt);

      if (!llmResponse.success) {
        console.error('[Controller] LLM generation failed:', llmResponse.error);
        return this.generateFallback(
          scene,
          loadedScene.backgroundUrl,
          llmResponse.error || 'LLM generation failed'
        );
      }

      // 6. Parse and validate output
      let validatedOutput: LLMGenerationOutput;

      if (llmResponse.rawOutput && typeof llmResponse.rawOutput === 'string') {
        console.log('[Controller] Parsing rawOutput from LLM...');
        const parseResult = this.schemaValidator.parseAndValidateOutput(llmResponse.rawOutput);

        if (!parseResult.success || !parseResult.output) {
          console.error('[Controller] LLM output validation failed:', parseResult.errors);
          console.error('[Controller] Raw output:', llmResponse.rawOutput);
          return this.generateFallback(
            scene,
            loadedScene.backgroundUrl,
            `Output validation failed: ${parseResult.errors.join(', ')}`
          );
        }

        validatedOutput = parseResult.output;
        console.log('[Controller] LLM output validated successfully');
        console.log(`[Controller] Generated narrative: "${validatedOutput.narrative.text.substring(0, 100)}..."`);

        // Verify continuity
        if (input.history.length > 0) {
          const lastChoice = input.history[input.history.length - 1];
          console.log(`[Controller] Continuity check:`);
          console.log(`  Player chose: "${lastChoice.choiceText}"`);
          console.log(`  LLM generated: "${validatedOutput.narrative.text.substring(0, 80)}..."`);
        }
      } else if (llmResponse.output) {
        console.log('[Controller] Using pre-parsed output from LLM');
        // Output already parsed (mock provider)
        validatedOutput = llmResponse.output;
      } else {
        console.error('[Controller] No output or rawOutput from LLM');
        return this.generateFallback(
          scene,
          loadedScene.backgroundUrl,
          'No output from LLM'
        );
      }

      // 7. Build response
      return {
        narrative: validatedOutput.narrative.text,
        narrativeSource: validatedOutput.narrative.source,
        choices: validatedOutput.choices,
        tags: validatedOutput.tags,
        background: loadedScene.backgroundUrl,
        backgroundFallback: scene.background.fallbackColor,
        sceneInfo: {
          sceneId: scene.sceneId,
          name: scene.name,
          dangerLevel: scene.dangerLevel,
        },
        meta: {
          usedFallback: false,
        },
      };
    } catch (error: any) {
      console.error('Error in generateStep:', error);

      // Try to load scene for fallback
      try {
        const loadedScene = await this.sceneLoader.loadScene(input.sceneId);
        return this.generateFallback(
          loadedScene.scene,
          loadedScene.backgroundUrl,
          error.message
        );
      } catch (sceneError) {
        // Even scene loading failed, use absolute fallback
        return this.generateAbsoluteFallback(input.sceneId, error.message);
      }
    }
  }

  /**
   * Generate fallback narrative when LLM fails
   */
  private generateFallback(
    scene: SceneData,
    backgroundUrl: string,
    errorMessage: string
  ): GameStepOutput {
    // Generate generic narrative based on scene theme
    const themes = scene.theme.join('、');
    const narrative = `你继续在${scene.name}中前进。这里是一片${themes}区域，空气中弥漫着不确定的气息。你需要做出选择。`;

    // Generate generic choices
    const choices: LLMGeneratedChoice[] = [
      {
        id: 'choice_1',
        text: '继续向前探索',
        riskHint: '未知风险',
        intent: 'move_forward',
      },
      {
        id: 'choice_2',
        text: '仔细观察周围',
        riskHint: '消耗时间',
        intent: 'investigate',
      },
      {
        id: 'choice_3',
        text: '检查装备和补给',
        riskHint: '信息有限',
        intent: 'investigate',
      },
    ];

    return {
      narrative,
      narrativeSource: 'system',
      choices,
      tags: ['exploration'],
      background: backgroundUrl,
      backgroundFallback: scene.background.fallbackColor,
      sceneInfo: {
        sceneId: scene.sceneId,
        name: scene.name,
        dangerLevel: scene.dangerLevel,
      },
      meta: {
        usedFallback: true,
        llmError: errorMessage,
      },
    };
  }

  /**
   * Absolute fallback when even scene loading fails
   */
  private generateAbsoluteFallback(sceneId: string, errorMessage: string): GameStepOutput {
    return {
      narrative: '你发现自己身处一个陌生的环境。一切都显得模糊不清。你需要谨慎前行。',
      narrativeSource: 'system',
      choices: [
        {
          id: 'choice_1',
          text: '向前移动',
          riskHint: '未知',
          intent: 'move_forward',
        },
        {
          id: 'choice_2',
          text: '停下观察',
          riskHint: '未知',
          intent: 'wait',
        },
      ],
      tags: ['exploration'],
      background: '',
      backgroundFallback: '#0b0f14',
      sceneInfo: {
        sceneId,
        name: '未知区域',
        dangerLevel: 0,
      },
      meta: {
        usedFallback: true,
        llmError: errorMessage,
      },
    };
  }
}

// Singleton instance
let controllerInstance: GameStepController | null = null;

export function getGameStepController(): GameStepController {
  if (!controllerInstance) {
    controllerInstance = new GameStepController();
  }
  return controllerInstance;
}
