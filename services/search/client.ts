/**
 * Search Service Client
 *
 * 客户端搜索服务 - 调用后端API
 */

import type { SearchResponse, SearchOptions } from './types';

/**
 * 客户端搜索服务
 */
export class SearchServiceClient {
  private baseUrl: string;

  constructor(baseUrl = '/api/search') {
    this.baseUrl = baseUrl;
  }

  /**
   * 执行搜索
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    const url = new URL(this.baseUrl, window.location.origin);

    url.searchParams.set('q', query);

    if (options?.limit) {
      url.searchParams.set('limit', String(options.limit));
    }

    if (options?.language) {
      url.searchParams.set('language', options.language);
    }

    if (options?.region) {
      url.searchParams.set('region', options.region);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Search failed');
    }

    const data = await response.json();
    return data.data as SearchResponse;
  }
}

/**
 * 全局客户端实例
 */
let globalClient: SearchServiceClient | null = null;

/**
 * 获取客户端实例
 */
export function getSearchClient(): SearchServiceClient {
  if (!globalClient) {
    globalClient = new SearchServiceClient();
  }
  return globalClient;
}
