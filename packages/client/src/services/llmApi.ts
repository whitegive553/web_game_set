/**
 * LLM API Service (Stub)
 * TODO: Implement real LLM rendering calls
 */

export interface LLMRenderRequest {
  type: 'EVENT' | 'OUTCOME' | 'DEATH_REVIEW' | 'ANOMALY';
  context: {
    location: string;
    stats: any;
    recentEvents: string[];
    template?: string;
  };
}

export interface LLMRenderResponse {
  text: string;
  generatedAt: number;
}

/**
 * Mock delay to simulate LLM processing
 */
const mockDelay = (ms: number = 1200) =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Request LLM to render narrative text
 * TODO: POST /api/llm/render
 */
export async function renderNarrative(
  request: LLMRenderRequest
): Promise<LLMRenderResponse> {
  await mockDelay();

  console.log('[Mock LLM] renderNarrative:', request);

  // Mock response based on type
  const mockTexts = {
    EVENT: '深入禁区的每一步，都在远离人类的常识。空气中似乎有什么东西在流动，但你看不见它。',
    OUTCOME: '你的选择产生了后果。现实微妙地扭曲了，但你无法确定是什么改变了。',
    DEATH_REVIEW: '死亡不是终点。那些异常的记忆会烙印在更深的地方。你会记得，即使你不应该记得。',
    ANOMALY: '某种不应该存在的东西，存在了。它注意到了你。'
  };

  return {
    text: mockTexts[request.type] || '未知的叙事文本',
    generatedAt: Date.now()
  };
}

/**
 * Check if LLM service is available
 * TODO: GET /api/llm/status
 */
export async function checkLLMStatus(): Promise<{
  available: boolean;
  provider: string;
}> {
  await mockDelay(200);

  return {
    available: true,
    provider: 'mock'
  };
}
