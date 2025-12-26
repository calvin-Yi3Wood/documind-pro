/**
 * DeepSeek AI Service
 *
 * 服务端DeepSeek API封装,支持流式响应
 * 支持双模型:
 * - deepseek-chat (V3标准模型,快速)
 * - deepseek-reasoner (R1思考模型,包含推理过程)
 */

import type {
  AIProvider,
  AIRequestConfig,
  AIStreamChunk,
  AIResponse,
  AIMessage,
} from './provider';

// ============================================
// DeepSeek 模型定义
// ============================================

/**
 * DeepSeek 模型类型
 */
export type DeepSeekModel = 'deepseek-chat' | 'deepseek-reasoner';

/**
 * DeepSeek 模型信息
 */
export const DEEPSEEK_MODELS: Record<DeepSeekModel, {
  name: string;
  description: string;
  maxTokens: number;
  supportsReasoning: boolean;
}> = {
  'deepseek-chat': {
    name: 'DeepSeek V3',
    description: '标准模型，快速响应',
    maxTokens: 4096,
    supportsReasoning: false,
  },
  'deepseek-reasoner': {
    name: 'DeepSeek R1',
    description: '思考模型，包含推理过程',
    maxTokens: 8192,
    supportsReasoning: true,
  },
};

/**
 * DeepSeek API 配置
 */
interface DeepSeekConfig {
  apiKey: string;
  model?: DeepSeekModel;
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
 * DeepSeek 响应(OpenAI兼容) - 支持R1思考过程
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
      reasoning_content?: string; // R1模型的思考过程
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
 * DeepSeek 流式响应块 - 支持R1思考过程
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
      reasoning_content?: string; // R1模型的思考过程
    };
    finish_reason: string | null;
  }>;
}

/**
 * DeepSeek AI 提供商
 * 支持运行时模型切换
 */
export class DeepSeekProvider implements AIProvider {
  name = 'DeepSeek';
  private apiKey: string;
  private model: DeepSeekModel;
  private baseUrl: string;

  constructor(config: DeepSeekConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'deepseek-chat';
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com';
  }

  /**
   * 获取当前模型
   */
  getModel(): DeepSeekModel {
    return this.model;
  }

  /**
   * 设置模型（运行时切换）
   */
  setModel(model: DeepSeekModel): void {
    if (!DEEPSEEK_MODELS[model]) {
      throw new Error(`Unknown DeepSeek model: ${model}`);
    }
    this.model = model;
    console.log(`✅ DeepSeek model switched to: ${DEEPSEEK_MODELS[model].name}`);
  }

  /**
   * 检查当前模型是否支持思考过程
   */
  supportsReasoning(): boolean {
    return DEEPSEEK_MODELS[this.model]?.supportsReasoning ?? false;
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
   * 支持 R1 模型的 reasoning_content 思考过程
   */
  private async *chatStream(config: AIRequestConfig): AsyncIterable<AIStreamChunk> {
    const url = `${this.baseUrl}/chat/completions`;
    const modelToUse = config.model || this.model;
    const modelInfo = DEEPSEEK_MODELS[modelToUse as DeepSeekModel];

    const requestBody: DeepSeekRequest = {
      model: modelToUse,
      messages: this.convertMessages(config.messages),
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? (modelInfo?.maxTokens || 2048),
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
    let isInReasoningPhase = false;

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

              if (choice) {
                // 处理 R1 模型的思考过程
                if (choice.delta.reasoning_content) {
                  if (!isInReasoningPhase) {
                    isInReasoningPhase = true;
                    yield {
                      content: '\n<thinking>\n',
                      done: false,
                      reasoning: true,
                    } as AIStreamChunk & { reasoning?: boolean };
                  }
                  yield {
                    content: choice.delta.reasoning_content,
                    done: false,
                    reasoning: true,
                  } as AIStreamChunk & { reasoning?: boolean };
                }

                // 处理正常内容
                if (choice.delta.content) {
                  if (isInReasoningPhase) {
                    isInReasoningPhase = false;
                    yield {
                      content: '\n</thinking>\n\n',
                      done: false,
                      reasoning: false,
                    } as AIStreamChunk & { reasoning?: boolean };
                  }
                  yield {
                    content: choice.delta.content,
                    done: choice.finish_reason === 'stop',
                  };
                }
              }
            } catch (e) {
              console.warn('Failed to parse SSE chunk:', data, e);
            }
          }
        }
      }

      // 如果还在思考阶段，关闭标签
      if (isInReasoningPhase) {
        yield {
          content: '\n</thinking>\n\n',
          done: false,
        };
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
   * 支持 R1 模型的 reasoning_content 思考过程
   */
  private async chatComplete(config: AIRequestConfig): Promise<AIResponse> {
    const url = `${this.baseUrl}/chat/completions`;
    const modelToUse = config.model || this.model;
    const modelInfo = DEEPSEEK_MODELS[modelToUse as DeepSeekModel];

    const requestBody: DeepSeekRequest = {
      model: modelToUse,
      messages: this.convertMessages(config.messages),
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? (modelInfo?.maxTokens || 2048),
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

    // 组合思考过程和最终答案
    let content = choice.message.content;
    if (choice.message.reasoning_content) {
      content = `<thinking>\n${choice.message.reasoning_content}\n</thinking>\n\n${content}`;
    }

    return {
      content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      model: data.model,
      reasoning: choice.message.reasoning_content,
    } as AIResponse & { reasoning?: string };
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
 * @param model - 模型名称 (deepseek-chat | deepseek-reasoner)
 * @returns DeepSeek提供商
 */
export function createDeepSeekProvider(
  apiKey?: string,
  model?: DeepSeekModel
): DeepSeekProvider {
  const key = apiKey || process.env.DEEPSEEK_API_KEY || '';

  if (!key) {
    throw new Error('DEEPSEEK_API_KEY environment variable is required');
  }

  const defaultModel = (process.env.DEFAULT_DEEPSEEK_MODEL as DeepSeekModel) || 'deepseek-chat';
  const selectedModel = model || defaultModel;

  // 验证模型有效性
  if (!DEEPSEEK_MODELS[selectedModel]) {
    console.warn(`⚠️  Unknown model: ${selectedModel}, falling back to deepseek-chat`);
  }

  console.log(`✅ Creating DeepSeek provider with model: ${DEEPSEEK_MODELS[selectedModel]?.name || selectedModel}`);

  return new DeepSeekProvider({
    apiKey: key,
    model: DEEPSEEK_MODELS[selectedModel] ? selectedModel : 'deepseek-chat',
  });
}

/**
 * 获取可用的 DeepSeek 模型列表
 */
export function getAvailableDeepSeekModels() {
  return Object.entries(DEEPSEEK_MODELS).map(([id, info]) => ({
    id,
    ...info,
  }));
}
