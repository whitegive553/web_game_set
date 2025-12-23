/**
 * LLM Client Service
 * Unified interface for calling LLM providers
 * Currently uses mock implementation, but ready for real API integration
 */

import { LLMGenerationResponse, LLMGenerationOutput } from '@survival-game/shared';

export interface LLMClientConfig {
  provider: 'mock' | 'openai' | 'anthropic';
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class LLMClient {
  private config: LLMClientConfig;

  constructor(config: LLMClientConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 1000,
      ...config,
    };
  }

  /**
   * Generate text from LLM
   */
  async generate(prompt: string): Promise<LLMGenerationResponse> {
    console.log(`[LLM] Generating with provider: ${this.config.provider}`);
    console.log(`[LLM] Prompt length: ${prompt.length} characters`);

    try {
      switch (this.config.provider) {
        case 'mock':
          console.log('[LLM] Using MOCK provider');
          return await this.generateMock(prompt);
        case 'openai':
          console.log('[LLM] Using OPENAI provider');
          return await this.generateOpenAI(prompt);
        case 'anthropic':
          console.log('[LLM] Using ANTHROPIC provider');
          return await this.generateAnthropic(prompt);
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error: any) {
      console.error('[LLM] Generation error:', error);
      return {
        success: false,
        error: error.message,
        usedFallback: false,
      };
    }
  }

  /**
   * Mock LLM generation (for testing)
   */
  private async generateMock(prompt: string): Promise<LLMGenerationResponse> {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 500));

    // Parse prompt to extract context (basic extraction)
    const isFirstStep = prompt.includes('"step":0') || prompt.includes('"step": 0');

    // Generate contextually appropriate mock response
    const output: LLMGenerationOutput = {
      narrative: {
        text: isFirstStep
          ? "你站在禁区边缘，远处的山坡笼罩在薄雾中。空气中有种说不清的异样感，仿佛温度比周围低了几度。你的指南针指针在轻微颤动。"
          : "风向变了。之前平静的空气现在带着某种金属气味。你注意到地面上的影子似乎比刚才长了一些，但太阳的位置并没有明显变化。",
        source: "environment"
      },
      choices: [
        {
          id: "choice_1",
          text: "继续向前，沿着山坡边缘前进",
          riskHint: "体力可能下降",
          intent: "move_forward"
        },
        {
          id: "choice_2",
          text: "停下来仔细观察周围环境",
          riskHint: "消耗时间",
          intent: "investigate"
        },
        {
          id: "choice_3",
          text: "检查背包中的物资",
          riskHint: "信息有限",
          intent: "investigate"
        }
      ],
      tags: ["exploration", "anomaly_hint"]
    };

    return {
      success: true,
      output,
      rawOutput: JSON.stringify(output),
      usedFallback: false,
    };
  }

  /**
   * OpenAI API integration (non-streaming)
   */
  private async generateOpenAI(prompt: string): Promise<LLMGenerationResponse> {
    console.log('[LLM] Calling OpenAI API (non-streaming)...');
    console.log(`[LLM] Model: ${this.config.model || 'gpt-4'}`);
    console.log(`[LLM] Temperature: ${this.config.temperature}`);
    console.log(`[LLM] Max Tokens: ${this.config.maxTokens}`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LLM] OpenAI API error: ${response.status} ${response.statusText}`);
      console.error(`[LLM] Error details: ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      choices: Array<{
        message: {
          content: string;
        };
      }>;
    };
    const outputText = data.choices[0].message.content;

    console.log('[LLM] OpenAI response received successfully');
    console.log(`[LLM] Response length: ${outputText.length} characters`);

    // Parse and return
    return {
      success: true,
      rawOutput: outputText,
      usedFallback: false,
    };
  }

  /**
   * OpenAI API integration (streaming)
   * Returns an async generator that yields chunks as they arrive
   */
  async *generateOpenAIStream(prompt: string): AsyncGenerator<string, void, unknown> {
    console.log('[LLM] Calling OpenAI API (streaming)...');
    console.log(`[LLM] Model: ${this.config.model || 'gpt-4'}`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true, // Enable streaming
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LLM] OpenAI API error: ${response.status} ${response.statusText}`);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.trim() === 'data: [DONE]') continue;
          if (!line.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(line.slice(6));
            const content = json.choices[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch (e) {
            console.error('[LLM] Failed to parse SSE line:', line);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Anthropic Claude API integration
   */
  private async generateAnthropic(prompt: string): Promise<LLMGenerationResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey!,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: prompt }],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      })
    });

    const data = await response.json() as {
      content: Array<{
        type: string;
        text: string;
      }>;
    };
    const outputText = data.content[0].text;

    return {
      success: true,
      rawOutput: outputText,
      usedFallback: false,
    };
  }

  /**
   * Check if LLM service is available
   */
  async isAvailable(): Promise<boolean> {
    if (this.config.provider === 'mock') {
      return true;
    }

    // For real providers, could do a health check
    return false;
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<LLMClientConfig> {
    return { ...this.config };
  }
}

// Singleton instance
let llmClientInstance: LLMClient | null = null;

// export function getLLMClient(config?: LLMClientConfig): LLMClient {
//   if (!llmClientInstance) {
//     llmClientInstance = new LLMClient(config || { provider: 'mock' });
//   }
//   return llmClientInstance;
// }
export function getLLMClient(config?: LLMClientConfig): LLMClient {
  if (!llmClientInstance) {
    // 从环境变量读取配置
    const defaultConfig: LLMClientConfig = {
      provider: (process.env.LLM_PROVIDER as 'mock' | 'openai' | 'anthropic') || 'mock',
      apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
      model: process.env.LLM_MODEL || 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
    };

    // 添加日志确认配置
    console.log('='.repeat(50));
    console.log('LLM Client Configuration:');
    console.log(`Provider: ${defaultConfig.provider}`);
    console.log(`Model: ${defaultConfig.model}`);
    console.log(`API Key: ${defaultConfig.apiKey ? defaultConfig.apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
    console.log('='.repeat(50));

    llmClientInstance = new LLMClient(config || defaultConfig);
  }
  return llmClientInstance;
}

export function resetLLMClient(): void {
  llmClientInstance = null;
}
