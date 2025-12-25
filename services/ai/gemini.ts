/**
 * Google Gemini AI Service
 *
 * 服务端Gemini API封装,支持流式响应
 */

import type {
  AIProvider,
  AIRequestConfig,
  AIStreamChunk,
  AIResponse,
  AIMessage,
} from './provider';

/**
 * Gemini API 配置
 */
interface GeminiConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

/**
 * Gemini 请求体
 */
interface GeminiRequest {
  contents: Array<{
    role: string;
    parts: Array<{ text: string }>;
  }>;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
}

/**
 * Gemini 响应
 */
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Gemini AI 提供商
 */
export class GeminiProvider implements AIProvider {
  name = 'Gemini';
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-1.5-flash';
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  }

  /**
   * 转换消息格式
   */
  private convertMessages(messages: AIMessage[]): GeminiRequest['contents'] {
    return messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }],
    }));
  }

  /**
   * 发送聊天请求(流式)
   */
  private async *chatStream(config: AIRequestConfig): AsyncIterable<AIStreamChunk> {
    const url = `${this.baseUrl}/models/${this.model}:streamGenerateContent?key=${this.apiKey}`;

    const requestBody: GeminiRequest = {
      contents: this.convertMessages(config.messages),
      generationConfig: {
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxTokens ?? 2048,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${error}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // 处理流式JSON响应
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('{')) continue;

          try {
            const chunk: GeminiResponse = JSON.parse(trimmed);
            const candidate = chunk.candidates[0];

            if (candidate && candidate.content.parts[0]) {
              const content = candidate.content.parts[0].text;
              const usage = chunk.usageMetadata;

              const streamChunk: AIStreamChunk = {
                content,
                done: candidate.finishReason === 'STOP',
              };

              if (usage) {
                streamChunk.usage = {
                  promptTokens: usage.promptTokenCount,
                  completionTokens: usage.candidatesTokenCount,
                  totalTokens: usage.totalTokenCount,
                };
              }

              yield streamChunk;
            }
          } catch (e) {
            console.warn('Failed to parse chunk:', trimmed, e);
          }
        }
      }

      // 最后的chunk
      yield {
        content: '',
        done: true,
      };
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 发送聊天请求(非流式)
   */
  private async chatComplete(config: AIRequestConfig): Promise<AIResponse> {
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody: GeminiRequest = {
      contents: this.convertMessages(config.messages),
      generationConfig: {
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxTokens ?? 2048,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${error}`);
    }

    const data: GeminiResponse = await response.json();
    const candidate = data.candidates[0];

    if (!candidate || !candidate.content.parts[0]) {
      throw new Error('No response from Gemini');
    }

    const usage = data.usageMetadata || {
      promptTokenCount: 0,
      candidatesTokenCount: 0,
      totalTokenCount: 0,
    };

    return {
      content: candidate.content.parts[0].text,
      usage: {
        promptTokens: usage.promptTokenCount,
        completionTokens: usage.candidatesTokenCount,
        totalTokens: usage.totalTokenCount,
      },
      model: this.model,
    };
  }

  /**
   * 发送聊天请求
   */
  async chat(config: AIRequestConfig): Promise<AsyncIterable<AIStreamChunk> | AIResponse> {
    if (config.stream) {
      return this.chatStream(config);
    }

    return this.chatComplete(config);
  }

  /**
   * 检查服务可用性
   */
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      // 发送简单测试请求
      const url = `${this.baseUrl}/models/${this.model}?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch (error) {
      console.error('Gemini availability check failed:', error);
      return false;
    }
  }
}

/**
 * 创建Gemini提供商实例
 *
 * @param apiKey - API密钥(从环境变量读取)
 * @param model - 模型名称
 * @returns Gemini提供商
 */
export function createGeminiProvider(apiKey?: string, model?: string): GeminiProvider {
  const key = apiKey || process.env.GEMINI_API_KEY || '';

  if (!key) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  return new GeminiProvider({
    apiKey: key,
    model: model || process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  });
}
