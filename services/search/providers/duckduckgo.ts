/**
 * DuckDuckGo Search Provider
 *
 * 使用DuckDuckGo Instant Answer API进行搜索
 * 注意：DuckDuckGo API免费但功能有限
 */

import type { SearchProvider, SearchResult, SearchOptions } from '../types';

/**
 * DuckDuckGo API响应
 */
interface DuckDuckGoResponse {
  Abstract?: string;
  AbstractText?: string;
  AbstractSource?: string;
  AbstractURL?: string;
  Image?: string;
  RelatedTopics?: Array<{
    Text?: string;
    FirstURL?: string;
    Icon?: {
      URL?: string;
    };
  }>;
}

/**
 * DuckDuckGo搜索提供商
 */
export class DuckDuckGoSearchProvider implements SearchProvider {
  name = 'DuckDuckGo';
  private baseUrl = 'https://api.duckduckgo.com/';

  async isAvailable(): Promise<boolean> {
    try {
      const url = new URL(this.baseUrl);
      url.searchParams.set('q', 'test');
      url.searchParams.set('format', 'json');
      url.searchParams.set('no_html', '1');
      url.searchParams.set('skip_disambig', '1');

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

    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('no_html', '1');
    url.searchParams.set('skip_disambig', '1');

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`DuckDuckGo API error: ${response.status}`);
    }

    const data: DuckDuckGoResponse = await response.json();
    const results: SearchResult[] = [];
    const limit = options?.limit || 10;

    // 主要答案
    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.Abstract || data.AbstractText.substring(0, 100),
        url: data.AbstractURL,
        snippet: data.AbstractText,
        source: data.AbstractSource || 'DuckDuckGo',
        ...(data.Image ? { thumbnail: data.Image } : {}),
      });
    }

    // 相关主题
    if (data.RelatedTopics && results.length < limit) {
      for (const topic of data.RelatedTopics) {
        if (results.length >= limit) break;

        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
            url: topic.FirstURL,
            snippet: topic.Text,
            source: 'DuckDuckGo',
            ...(topic.Icon?.URL ? { thumbnail: topic.Icon.URL } : {}),
          });
        }
      }
    }

    return results;
  }
}

/**
 * 创建DuckDuckGo搜索提供商
 */
export function createDuckDuckGoSearchProvider(): DuckDuckGoSearchProvider {
  return new DuckDuckGoSearchProvider();
}
