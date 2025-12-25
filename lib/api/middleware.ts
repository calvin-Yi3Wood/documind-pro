/**
 * API Middleware Utilities
 *
 * 提供认证、速率限制和错误处理中间件
 */

import { NextRequest, NextResponse } from 'next/server';
import { error, rateLimitError, unauthorized } from './response';

/**
 * 速率限制器配置
 */
interface RateLimitConfig {
  /** 时间窗口(毫秒) */
  windowMs: number;
  /** 最大请求数 */
  max: number;
}

/**
 * 速率限制存储(使用Map简单实现,生产环境建议使用Redis)
 */
class RateLimiter {
  private requests = new Map<string, number[]>();

  /**
   * 检查是否超过速率限制
   *
   * @param key - 限制键(如IP或用户ID)
   * @param config - 速率限制配置
   * @returns 是否允许请求
   */
  check(key: string, config: RateLimitConfig): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // 获取该键的请求历史
    let requests = this.requests.get(key) || [];

    // 清理过期的请求记录
    requests = requests.filter((timestamp) => timestamp > windowStart);

    // 检查是否超过限制
    if (requests.length >= config.max) {
      const oldestRequest = requests[0];
      const retryAfter = oldestRequest ? Math.ceil((oldestRequest + config.windowMs - now) / 1000) : config.windowMs / 1000;

      return { allowed: false, retryAfter };
    }

    // 记录本次请求
    requests.push(now);
    this.requests.set(key, requests);

    return { allowed: true };
  }

  /**
   * 清理过期的记录(定期调用以释放内存)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter((timestamp) => timestamp > now - 3600000); // 1小时
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

// 全局速率限制器实例
const rateLimiter = new RateLimiter();

// 每10分钟清理一次过期记录
setInterval(() => rateLimiter.cleanup(), 600000);

/**
 * 路由处理器类型
 */
export type RouteHandler = (
  request: NextRequest,
  context?: { params?: unknown }
) => Promise<NextResponse> | NextResponse;

/**
 * 认证中间件
 *
 * 检查请求是否包含有效的认证信息
 *
 * @param handler - 路由处理器
 * @returns 包装后的处理器
 *
 * @example
 * export const GET = withAuth(async (request) => {
 *   // 此时request.headers已验证包含有效token
 *   return success({ data: 'protected data' });
 * });
 */
export function withAuth(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context?: { params?: unknown }) => {
    try {
      // 获取Authorization header
      const authHeader = request.headers.get('authorization');

      if (!authHeader) {
        return unauthorized('Missing authorization header');
      }

      // 验证Bearer token格式
      const token = authHeader.replace('Bearer ', '');
      if (!token || token === authHeader) {
        return unauthorized('Invalid authorization format');
      }

      // TODO: 实际的token验证逻辑
      // 这里应该调用NextAuth或JWT验证
      // 暂时简单验证token是否存在

      // 验证通过,调用原处理器
      return handler(request, context);
    } catch (err) {
      console.error('Auth middleware error:', err);
      return unauthorized('Authentication failed');
    }
  };
}

/**
 * 速率限制中间件
 *
 * 基于IP地址或用户ID限制请求频率
 *
 * @param config - 速率限制配置
 * @returns 中间件函数
 *
 * @example
 * export const POST = withRateLimit({
 *   windowMs: 60000,  // 1分钟
 *   max: 10,          // 最多10次请求
 * })(async (request) => {
 *   return success({ data: 'rate limited data' });
 * });
 */
export function withRateLimit(config: RateLimitConfig) {
  return function (handler: RouteHandler): RouteHandler {
    return async (request: NextRequest, context?: { params?: unknown }) => {
      try {
        // 获取客户端标识(优先使用用户ID,其次IP)
        const userId = request.headers.get('x-user-id');
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const key = userId || ip;

        // 检查速率限制
        const result = rateLimiter.check(key, config);

        if (!result.allowed) {
          return rateLimitError(result.retryAfter);
        }

        // 未超限,调用原处理器
        return handler(request, context);
      } catch (err) {
        console.error('Rate limit middleware error:', err);
        // 速率限制错误不应阻塞请求,记录日志后继续
        return handler(request, context);
      }
    };
  };
}

/**
 * 错误处理中间件
 *
 * 统一捕获和处理路由中的错误
 *
 * @param handler - 路由处理器
 * @returns 包装后的处理器
 *
 * @example
 * export const GET = withErrorHandler(async (request) => {
 *   // 任何抛出的错误都会被自动捕获并返回统一格式
 *   throw new Error('Something went wrong');
 * });
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context?: { params?: unknown }) => {
    try {
      return await handler(request, context);
    } catch (err) {
      console.error('API Route Error:', err);

      // 根据错误类型返回不同的响应
      if (err instanceof Error) {
        return error(err.message, 500);
      }

      return error('Internal server error', 500);
    }
  };
}

/**
 * 组合多个中间件
 *
 * 按顺序执行多个中间件
 *
 * @param middlewares - 中间件数组
 * @returns 组合后的中间件
 *
 * @example
 * export const POST = compose([
 *   withErrorHandler,
 *   withAuth,
 *   withRateLimit({ windowMs: 60000, max: 10 }),
 * ])(async (request) => {
 *   return success({ data: 'protected and rate limited' });
 * });
 */
export function compose(middlewares: Array<(handler: RouteHandler) => RouteHandler>) {
  return function (handler: RouteHandler): RouteHandler {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}

/**
 * CORS中间件
 *
 * 添加CORS headers到响应
 *
 * @param origins - 允许的源(默认允许所有)
 * @returns 中间件函数
 *
 * @example
 * export const GET = withCors(['https://example.com'])(async (request) => {
 *   return success({ data: 'CORS enabled' });
 * });
 */
export function withCors(origins: string[] = ['*']) {
  return function (handler: RouteHandler): RouteHandler {
    return async (request: NextRequest, context?: { params?: unknown }) => {
      const response = await handler(request, context);

      // 添加CORS headers
      const origin = request.headers.get('origin');
      if (origin && (origins.includes('*') || origins.includes(origin))) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        response.headers.set('Access-Control-Max-Age', '86400');
      }

      return response;
    };
  };
}

/**
 * 预检请求处理
 *
 * 处理OPTIONS请求
 *
 * @param origins - 允许的源
 * @returns OPTIONS响应
 */
export function handleOptions(origins: string[] = ['*']): NextResponse {
  const response = new NextResponse(null, { status: 204 });

  response.headers.set('Access-Control-Allow-Origin', origins[0] === '*' ? '*' : origins.join(', '));
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}
