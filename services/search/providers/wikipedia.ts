/**
 * Wikipedia Search Provider
 *
 * 使用Wikipedia API进行搜索
 */

import type { SearchProvider, SearchResult, SearchOptions } from '../types';

/**
 * Wikipedia搜索响应
 */
interface WikipediaSearchResponse {
  query?: {
    search?: Array<{
      title: string;
      pageid: number;
      snippet: string;
    }>;
    searchinfo?: {
      totalhits: number;
    };
  };
}

/**
 * Wikipedia页面信息响应
 */
interface WikipediaPageResponse {
  query?: {
    pages?: {
      [key: string]: {
        pageid: number;
        title: string;
        extract?: string;
        thumbnail?: {
          source: string;
        };
      };
    };
  };
}

/**
 * Wikipedia搜索提供商
 */
export class WikipediaSearchProvider implements SearchProvider {
  name = 'Wikipedia';
  private baseUrl = 'https://en.wikipedia.org/w/api.php';

  async isAvailable(): Promise<boolean> {
    try {
      const url = new URL(this.baseUrl);
      url.searchParams.set('action', 'query');
      url.searchParams.set('format', 'json');
      url.searchParams.set('list', 'search');
      url.searchParams.set('srsearch', 'test');
      url.searchParams.set('srlimit', '1');
      url.searchParams.set('origin', '*');

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const limit = options?.limit || 10;

    // 第一步：搜索文章
    const searchUrl = new URL(this.baseUrl);
    searchUrl.searchParams.set('action', 'query');
    searchUrl.searchParams.set('format', 'json');
    searchUrl.searchParams.set('list', 'search');
    searchUrl.searchParams.set('srsearch', query);
    searchUrl.searchParams.set('srlimit', String(limit));
    searchUrl.searchParams.set('origin', '*');

    const searchResponse = await fetch(searchUrl.toString());

    if (!searchResponse.ok) {
      throw new Error(`Wikipedia API error: ${searchResponse.status}`);
    }

    const searchData: WikipediaSearchResponse = await searchResponse.json();

    if (!searchData.query?.search || searchData.query.search.length === 0) {
      return [];
    }

    // 第二步：获取页面详情（包括缩略图）
    const pageIds = searchData.query.search.map((item) => item.pageid).join('|');

    const pageUrl = new URL(this.baseUrl);
    pageUrl.searchParams.set('action', 'query');
    pageUrl.searchParams.set('format', 'json');
    pageUrl.searchParams.set('pageids', pageIds);
    pageUrl.searchParams.set('prop', 'extracts|pageimages');
    pageUrl.searchParams.set('exintro', '1');
    pageUrl.searchParams.set('explaintext', '1');
    pageUrl.searchParams.set('pithumbsize', '200');
    pageUrl.searchParams.set('origin', '*');

    const pageResponse = await fetch(pageUrl.toString());

    if (!pageResponse.ok) {
      // 如果获取详情失败,返回基本搜索结果
      return searchData.query.search.map((item) => ({
        title: item.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
        snippet: this.stripHtml(item.snippet),
        source: 'Wikipedia',
      }));
    }

    const pageData: WikipediaPageResponse = await pageResponse.json();

    // 合并搜索结果和页面详情
    return searchData.query.search.map((searchItem) => {
      const pageInfo = pageData.query?.pages?.[searchItem.pageid];

      return {
        title: searchItem.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(searchItem.title.replace(/ /g, '_'))}`,
        snippet: pageInfo?.extract?.substring(0, 200) || this.stripHtml(searchItem.snippet),
        source: 'Wikipedia',
        thumbnail: pageInfo?.thumbnail?.source,
      };
    });
  }

  /**
   * 去除HTML标签
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]+>/g, '')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
}

/**
 * 创建Wikipedia搜索提供商
 */
export function createWikipediaSearchProvider(): WikipediaSearchProvider {
  return new WikipediaSearchProvider();
}
