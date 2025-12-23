/**
 * Mock LLM Service - For testing without real LLM API
 * Replace with actual implementation when ready
 */

import { ILLMService, LLMRequest, LLMResponse } from '@survival-game/shared';

export class MockLLMService implements ILLMService {
  isAvailable(): boolean {
    return true;
  }

  async generateText(request: LLMRequest): Promise<LLMResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Return template-based response (no actual LLM call)
    return {
      text: this.generateMockResponse(request)
    };
  }

  private generateMockResponse(request: LLMRequest): string {
    const { type, context } = request;

    switch (type) {
      case 'EVENT_DESCRIPTION':
        return this.enhanceTemplate(context.template, context);

      case 'OUTCOME_NARRATIVE':
        return this.enhanceTemplate(context.template, context);

      case 'DEATH_REVIEW':
        return this.generateDeathReview(context);

      case 'ANOMALY_MANIFESTATION':
        return 'Something impossible occurs. Reality bends. You cannot trust your senses.';

      default:
        return context.template;
    }
  }

  private enhanceTemplate(template: string, context: any): string {
    // For now, just return template
    // In real implementation, would pass to LLM with context
    return template;
  }

  private generateDeathReview(context: any): string {
    const deathCount = context.playerState.persistent.deathCount;
    const locations = Array.from(context.playerState.persistent.exploredLocations);

    return (
      `Death #${deathCount}\n\n` +
      `You explored ${locations.length} location(s): ${locations.join(', ')}.\n` +
      `The zone claimed another victim. But knowledge persists.\n\n` +
      `What will you do differently next time?`
    );
  }
}
