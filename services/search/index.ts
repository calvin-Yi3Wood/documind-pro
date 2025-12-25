/**
 * Search Service
 *
 * 搜索服务管理器,支持多提供商和结果缓存
 */

import type { SearchProvider, SearchResponse, SearchOptions, SearchResult } from './types';
import {
  GoogleSearchProvider,
  createGoogleSearchProvider,
} from './providers/google';
import {
  DuckDuckGoSearchProvider,
  createDuckDuckGoSearchProvider,
} from './providers/duckduckgo';
import {
  WikipediaSearchProvider,
  createWikipediaSearchProvider,
} from './providers/wikipedia';

/**
 * 缓存项
 */
interface CacheItem {
  data: SearchResult[];
  timestamp: number;
  provider: string;
}

/**
 * 搜索服务管理器
 */
export class SearchService {
  private providers: SearchProvider[] = [];
  private cache: Map<string, CacheItem> = new Map();
  private cacheExpiry = 5 * 60 * 1000; // 5分钟

  /**
   * 添加搜索提供商
   */
  addProvider(provider: SearchProvider): void {
    this.providers.push(provider);
  }

  /**
   * 获取可用的提供商
   */
  async getAvailableProvider(): Promise<SearchProvider | null> {
    for (const provider of this.providers) {
      try {
        if (await provider.isAvailable()) {
          return provider;
        }
      } catch (error) {
        console.warn(`Provider ${provider.name} availability check failed:`, error);
      }
    }
    return null;
  }

  /**
   * 执行搜索
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    // 检查缓存
    const cacheKey = this.getCacheKey(query, options);
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      return {
        results: cached.data,
        query,
        provider: cached.provider,
        cached: true,
      };
    }

    // 获取可用提供商
    const provider = await this.getAvailableProvider();

    if (!provider) {
      throw new Error('No available search provider');
    }

    // 执行搜索
    try {
      const results = await provider.search(query, options);

      // 保存到缓存
      this.saveToCache(cacheKey, {
        data: results,
        timestamp: Date.now(),
        provider: provider.name,
      });

      return {
        results,
        query,
        provider: provider.name,
        cached: false,
      };
    } catch (error) {
      throw new Error(
        `Search failed with ${provider.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(query: string, options?: SearchOptions): string {
    const key = `${query}|${options?.limit || 10}|${options?.language || ''}|${options?.region || ''}`;
    return key.toLowerCase();
  }

  /**
   * 从缓存获取
   */
  private getFromCache(key: string): CacheItem | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }

    return item;
  }

  /**
   * 保存到缓存
   */
  private saveToCache(key: string, item: CacheItem): void {
    this.cache.set(key, item);

    // 限制缓存大小
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * 创建搜索服务实例
 *
 * 服务端使用（带API Keys）
 */
export function createSearchService(): SearchService {
  const service = new SearchService();

  // 尝试添加Google搜索
  try {
    const googleProvider = createGoogleSearchProvider();
    service.addProvider(googleProvider);
  } catch (error) {
    console.warn('Google Search provider not available:', error);
  }

  // 添加DuckDuckGo（免费，无需API Key）
  service.addProvider(createDuckDuckGoSearchProvider());

  // 添加Wikipedia（免费，无需API Key）
  service.addProvider(createWikipediaSearchProvider());

  return service;
}

/**
 * 全局搜索服务实例（服务端）
 */
let globalSearchService: SearchService | null = null;

/**
 * 获取全局搜索服务
 */
export function getSearchService(): SearchService {
  if (!globalSearchService) {
    globalSearchService = createSearchService();
  }
  return globalSearchService;
}

// 导出类型
export * from './types';
export { GoogleSearchProvider } from './providers/google';
export { DuckDuckGoSearchProvider } from './providers/duckduckgo';
export { WikipediaSearchProvider } from './providers/wikipedia';
