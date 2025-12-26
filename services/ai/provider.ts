/**
 * AI Provider Abstract Interface
 *
 * 定义统一的AI服务接口,支持多个AI提供商
 * 支持运行时切换模型和服务商
 */

/**
 * AI 服务商类型
 */
export type AIProviderType = 'gemini' | 'deepseek';

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
 * 管理多个AI提供商,支持自动降级和运行时切换
 */
export class AIProviderManager {
  private providers: Map<string, AIProvider> = new Map();
  private currentProviderName: string | null = null;
  private defaultProviderOrder: string[] = [];

  constructor(providers: AIProvider[]) {
    providers.forEach((p) => {
      this.providers.set(p.name.toLowerCase(), p);
      this.defaultProviderOrder.push(p.name.toLowerCase());
    });
    if (providers.length > 0 && providers[0]) {
      this.currentProviderName = providers[0].name.toLowerCase();
    }
  }

  /**
   * 根据名称获取提供商
   *
   * @param name - 提供商名称 (gemini / deepseek)
   * @returns AI提供商
   */
  getProviderByName(name: string): AIProvider | null {
    return this.providers.get(name.toLowerCase()) || null;
  }

  /**
   * 设置当前使用的提供商
   *
   * @param name - 提供商名称
   */
  setProvider(name: AIProviderType): void {
    const provider = this.providers.get(name.toLowerCase());
    if (provider) {
      this.currentProviderName = name.toLowerCase();
      console.log(`✅ Switched to provider: ${provider.name}`);
    } else {
      console.warn(`⚠️  Provider not found: ${name}`);
    }
  }

  /**
   * 获取当前可用的提供商
   *
   * @param preferredProvider - 优先使用的提供商名称
   * @returns AI提供商
   */
  async getCurrentProvider(preferredProvider?: string): Promise<AIProvider | null> {
    // 如果指定了优先提供商
    if (preferredProvider) {
      const preferred = this.providers.get(preferredProvider.toLowerCase());
      if (preferred && await preferred.isAvailable()) {
        return preferred;
      }
    }

    // 使用当前设定的提供商
    if (this.currentProviderName) {
      const current = this.providers.get(this.currentProviderName);
      if (current && await current.isAvailable()) {
        return current;
      }
    }

    // 按默认顺序查找可用的提供商
    for (const name of this.defaultProviderOrder) {
      const provider = this.providers.get(name);
      if (provider && await provider.isAvailable()) {
        return provider;
      }
    }

    return null;
  }

  /**
   * 发送聊天请求(自动降级)
   *
   * @param config - 请求配置
   * @param preferredProvider - 优先使用的提供商
   * @returns 流式响应或完整响应
   * @throws 如果所有提供商都不可用
   */
  async chat(
    config: AIRequestConfig,
    preferredProvider?: string
  ): Promise<AsyncIterable<AIStreamChunk> | AIResponse> {
    let lastError: Error | null = null;

    // 首先尝试优先/当前提供商
    const primary = await this.getCurrentProvider(preferredProvider);
    if (primary) {
      try {
        return await primary.chat(config);
      } catch (error) {
        console.error(`Provider ${primary.name} failed:`, error);
        lastError = error instanceof Error ? error : new Error('Unknown error');
      }
    }

    // 降级到其他提供商
    for (const name of this.defaultProviderOrder) {
      if (primary && name === primary.name.toLowerCase()) continue;

      const provider = this.providers.get(name);
      if (!provider) continue;

      try {
        if (await provider.isAvailable()) {
          console.log(`⚠️  Falling back to provider: ${provider.name}`);
          return await provider.chat(config);
        }
      } catch (error) {
        console.error(`Provider ${provider.name} failed:`, error);
        lastError = error instanceof Error ? error : new Error('Unknown error');
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
    const name = provider.name.toLowerCase();
    this.providers.set(name, provider);
    if (!this.defaultProviderOrder.includes(name)) {
      this.defaultProviderOrder.push(name);
    }
  }

  /**
   * 移除提供商
   *
   * @param name - 提供商名称
   */
  removeProvider(name: string): void {
    const lowerName = name.toLowerCase();
    this.providers.delete(lowerName);
    this.defaultProviderOrder = this.defaultProviderOrder.filter((n) => n !== lowerName);
    if (this.currentProviderName === lowerName) {
      this.currentProviderName = this.defaultProviderOrder[0] || null;
    }
  }

  /**
   * 获取所有提供商
   *
   * @returns 提供商数组
   */
  getProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * 获取当前提供商名称
   */
  getCurrentProviderName(): string | null {
    return this.currentProviderName;
  }

  /**
   * 获取可用的提供商列表
   */
  async getAvailableProviders(): Promise<string[]> {
    const available: string[] = [];
    for (const [name, provider] of this.providers) {
      if (await provider.isAvailable()) {
        available.push(name);
      }
    }
    return available;
  }
}
