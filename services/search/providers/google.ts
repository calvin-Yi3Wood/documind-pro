/**
 * Google Custom Search Provider
 *
 * 使用Google Custom Search API进行搜索
 */

import type { SearchProvider, SearchResult, SearchOptions } from '../types';

/**
 * Google搜索配置
 */
interface GoogleSearchConfig {
  apiKey: string;
  searchEngineId: string;
}

/**
 * Google API响应
 */
interface GoogleSearchResponse {
  items?: Array<{
    title: string;
    link: string;
    snippet: string;
    pagemap?: {
      cse_thumbnail?: Array<{
        src: string;
      }>;
    };
  }>;
  searchInformation?: {
    totalResults: string;
  };
}

/**
 * Google搜索提供商
 */
export class GoogleSearchProvider implements SearchProvider {
  name = 'Google';
  private apiKey: string;
  private searchEngineId: string;
  private baseUrl = 'https://www.googleapis.com/customsearch/v1';

  constructor(config: GoogleSearchConfig) {
    this.apiKey = config.apiKey;
    this.searchEngineId = config.searchEngineId;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey || !this.searchEngineId) {
      return false;
    }

    try {
      // 发送测试请求
      const url = new URL(this.baseUrl);
      url.searchParams.set('key', this.apiKey);
      url.searchParams.set('cx', this.searchEngineId);
      url.searchParams.set('q', 'test');
      url.searchParams.set('num', '1');

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const url = new URL(this.baseUrl);

    // 设置查询参数
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('cx', this.searchEngineId);
    url.searchParams.set('q', query);
    url.searchParams.set('num', String(options?.limit || 10));

    if (options?.language) {
      url.searchParams.set('lr', `lang_${options.language}`);
    }

    if (options?.region) {
      url.searchParams.set('gl', options.region);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Google Search API error: ${response.status}`);
    }

    const data: GoogleSearchResponse = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map((item) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      source: 'Google',
      thumbnail: item.pagemap?.cse_thumbnail?.[0]?.src,
    }));
  }
}

/**
 * 创建Google搜索提供商
 */
export function createGoogleSearchProvider(
  apiKey?: string,
  searchEngineId?: string
): GoogleSearchProvider {
  const key = apiKey || process.env.GOOGLE_SEARCH_API_KEY || '';
  const cx = searchEngineId || process.env.GOOGLE_SEARCH_ENGINE_ID || '';

  if (!key || !cx) {
    throw new Error('GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID are required');
  }

  return new GoogleSearchProvider({
    apiKey: key,
    searchEngineId: cx,
  });
}
