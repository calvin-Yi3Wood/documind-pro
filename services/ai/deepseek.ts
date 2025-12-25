/**
 * DeepSeek AI Service
 *
 * 服务端DeepSeek API封装,支持流式响应
 */

import type {
  AIProvider,
  AIRequestConfig,
  AIStreamChunk,
  AIResponse,
  AIMessage,
} from './provider';

/**
 * DeepSeek API 配置
 */
interface DeepSeekConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

/**
 * DeepSeek 消息格式(OpenAI兼容)
 */
interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * DeepSeek 请求体(OpenAI兼容)
 */
interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * DeepSeek 响应(OpenAI兼容)
 */
interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * DeepSeek 流式响应块
 */
interface DeepSeekStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

/**
 * DeepSeek AI 提供商
 */
export class DeepSeekProvider implements AIProvider {
  name = 'DeepSeek';
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: DeepSeekConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'deepseek-chat';
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com/v1';
  }

  /**
   * 转换消息格式(已经是OpenAI格式,无需转换)
   */
  private convertMessages(messages: AIMessage[]): DeepSeekMessage[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * 发送聊天请求(流式)
   */
  private async *chatStream(config: AIRequestConfig): AsyncIterable<AIStreamChunk> {
    const url = `${this.baseUrl}/chat/completions`;

    const requestBody: DeepSeekRequest = {
      model: this.model,
      messages: this.convertMessages(config.messages),
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 2048,
      stream: true,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${error}`);
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

        // 处理SSE格式
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();

          // 跳过空行和注释
          if (!trimmed || trimmed.startsWith(':')) continue;

          // 解析data:前缀
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);

            // 检查是否完成
            if (data === '[DONE]') {
              yield {
                content: '',
                done: true,
              };
              return;
            }

            try {
              const chunk: DeepSeekStreamChunk = JSON.parse(data);
              const choice = chunk.choices[0];

              if (choice && choice.delta.content) {
                yield {
                  content: choice.delta.content,
                  done: choice.finish_reason === 'stop',
                };
              }
            } catch (e) {
              console.warn('Failed to parse SSE chunk:', data, e);
            }
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
    const url = `${this.baseUrl}/chat/completions`;

    const requestBody: DeepSeekRequest = {
      model: this.model,
      messages: this.convertMessages(config.messages),
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 2048,
      stream: false,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${error}`);
    }

    const data: DeepSeekResponse = await response.json();
    const choice = data.choices[0];

    if (!choice || !choice.message) {
      throw new Error('No response from DeepSeek');
    }

    return {
      content: choice.message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      model: data.model,
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
      const url = `${this.baseUrl}/models`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch (error) {
      console.error('DeepSeek availability check failed:', error);
      return false;
    }
  }
}

/**
 * 创建DeepSeek提供商实例
 *
 * @param apiKey - API密钥(从环境变量读取)
 * @param model - 模型名称
 * @returns DeepSeek提供商
 */
export function createDeepSeekProvider(apiKey?: string, model?: string): DeepSeekProvider {
  const key = apiKey || process.env.DEEPSEEK_API_KEY || '';

  if (!key) {
    throw new Error('DEEPSEEK_API_KEY environment variable is required');
  }

  return new DeepSeekProvider({
    apiKey: key,
    model: model || process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  });
}
