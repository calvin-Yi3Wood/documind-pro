/**
 * AI Provider Abstract Interface
 *
 * 定义统一的AI服务接口,支持多个AI提供商
 */

/**
 * AI 消息角色
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * AI 消息
 */
export interface AIMessage {
  role: MessageRole;
  content: string;
}

/**
 * AI 请求配置
 */
export interface AIRequestConfig {
  /** 对话历史 */
  messages: AIMessage[];
  /** 是否流式响应 */
  stream?: boolean;
  /** 温度参数 (0-1) */
  temperature?: number;
  /** 最大token数 */
  maxTokens?: number;
  /** 模型名称 */
  model?: string;
}

/**
 * AI 响应块(流式)
 */
export interface AIStreamChunk {
  /** 内容 */
  content: string;
  /** 是否完成 */
  done: boolean;
  /** 使用的token数 */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * AI 完整响应(非流式)
 */
export interface AIResponse {
  /** 生成的内容 */
  content: string;
  /** 使用的token数 */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** 模型名称 */
  model: string;
}

/**
 * AI 提供商抽象接口
 *
 * 所有AI服务必须实现这个接口
 */
export interface AIProvider {
  /**
   * 提供商名称
   */
  name: string;

  /**
   * 发送聊天请求
   *
   * @param config - 请求配置
   * @returns 流式响应或完整响应
   */
  chat(config: AIRequestConfig): Promise<AsyncIterable<AIStreamChunk> | AIResponse>;

  /**
   * 检查服务可用性
   *
   * @returns 是否可用
   */
  isAvailable(): Promise<boolean>;
}

/**
 * AI 提供商管理器
 *
 * 管理多个AI提供商,支持自动降级
 */
export class AIProviderManager {
  private providers: AIProvider[] = [];
  private currentProviderIndex = 0;

  constructor(providers: AIProvider[]) {
    this.providers = providers;
  }

  /**
   * 获取当前可用的提供商
   *
   * @returns AI提供商
   */
  async getCurrentProvider(): Promise<AIProvider | null> {
    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[this.currentProviderIndex];
      if (!provider) continue;

      if (await provider.isAvailable()) {
        return provider;
      }

      // 切换到下一个提供商
      this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
    }

    return null;
  }

  /**
   * 发送聊天请求(自动降级)
   *
   * @param config - 请求配置
   * @returns 流式响应或完整响应
   * @throws 如果所有提供商都不可用
   */
  async chat(config: AIRequestConfig): Promise<AsyncIterable<AIStreamChunk> | AIResponse> {
    let lastError: Error | null = null;

    for (let i = 0; i < this.providers.length; i++) {
      const provider = await this.getCurrentProvider();

      if (!provider) {
        throw new Error('No AI provider available');
      }

      try {
        return await provider.chat(config);
      } catch (error) {
        console.error(`Provider ${provider.name} failed:`, error);
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // 切换到下一个提供商
        this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
      }
    }

    throw lastError || new Error('All AI providers failed');
  }

  /**
   * 添加提供商
   *
   * @param provider - AI提供商
   */
  addProvider(provider: AIProvider): void {
    this.providers.push(provider);
  }

  /**
   * 移除提供商
   *
   * @param name - 提供商名称
   */
  removeProvider(name: string): void {
    this.providers = this.providers.filter((p) => p.name !== name);
  }

  /**
   * 获取所有提供商
   *
   * @returns 提供商数组
   */
  getProviders(): AIProvider[] {
    return [...this.providers];
  }
}
