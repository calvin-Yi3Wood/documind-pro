/**
 * Search Service Types
 *
 * 搜索服务类型定义
 */

/**
 * 搜索结果
 */
export interface SearchResult {
  /** 结果标题 */
  title: string;
  /** 结果链接 */
  url: string;
  /** 结果摘要 */
  snippet: string;
  /** 来源（可选） */
  source?: string;
  /** 缩略图（可选） */
  thumbnail?: string;
}

/**
 * 搜索响应
 */
export interface SearchResponse {
  /** 搜索结果列表 */
  results: SearchResult[];
  /** 总结果数（估计） */
  totalResults?: number;
  /** 查询关键词 */
  query: string;
  /** 搜索提供商 */
  provider: string;
  /** 是否来自缓存 */
  cached?: boolean;
}

/**
 * 搜索选项
 */
export interface SearchOptions {
  /** 最大结果数 */
  limit?: number;
  /** 语言 */
  language?: string;
  /** 地区 */
  region?: string;
}

/**
 * 搜索提供商接口
 */
export interface SearchProvider {
  /** 提供商名称 */
  name: string;
  /** 是否可用 */
  isAvailable(): Promise<boolean>;
  /** 执行搜索 */
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}
