/**
 * Search API Route
 *
 * 搜索API端点 - 隐藏真实API Keys
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { success, error as errorResponse } from '@/lib/api/response';
import { validateQuery } from '@/lib/api/validation';
import { withErrorHandler, withRateLimit, compose } from '@/lib/api/middleware';
import { getSearchService } from '@/services/search';
import type { RouteHandler } from '@/lib/api/middleware';

/**
 * 搜索请求验证Schema
 */
const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  language: z.string().length(2).optional(),
  region: z.string().length(2).optional(),
});

/**
 * 处理搜索请求
 */
async function handleSearchRequest(request: NextRequest) {
  // 验证查询参数
  const validation = await validateQuery(request, searchQuerySchema);

  if (!validation.success) {
    return validation.response;
  }

  const { q: query, limit, language, region } = validation.data;

  try {
    // 获取搜索服务
    const searchService = getSearchService();

    // 执行搜索
    const result = await searchService.search(query, {
      limit,
      language,
      region,
    });

    return success(result);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Search failed';
    return errorResponse(errorMessage, 500);
  }
}

/**
 * GET /api/search
 *
 * 执行搜索查询
 *
 * @param q - 搜索关键词 (required)
 * @param limit - 结果数量限制 (1-20, 默认10)
 * @param language - 语言代码 (可选, 如: en, zh)
 * @param region - 地区代码 (可选, 如: us, cn)
 *
 * @returns SearchResponse - 搜索结果
 *
 * @example
 * GET /api/search?q=Next.js&limit=5
 * GET /api/search?q=TypeScript&language=en&region=us
 */
export const GET = compose([
  withErrorHandler,
  withRateLimit({
    windowMs: 60000, // 1分钟
    max: 20, // 最多20次请求
  }),
])(handleSearchRequest as RouteHandler);
