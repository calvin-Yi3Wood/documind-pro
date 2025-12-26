/**
 * API 限流保护
 *
 * 防止暴力攻击、DDoS和API滥用
 */

import { NextRequest, NextResponse } from 'next/server';

// 限流配置类型
interface RateLimitConfig {
  windowMs: number;      // 时间窗口（毫秒）
  maxRequests: number;   // 最大请求数
  message?: string;      // 超限提示消息
  keyGenerator?: (req: NextRequest) => string; // 限流键生成器
}

// 内存存储（生产环境建议使用Redis）
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// 清理过期记录
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// 每分钟清理一次
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 60000);
}

/**
 * 默认限流配置
 */
export const defaultRateLimitConfigs: Record<string, RateLimitConfig> = {
  // 通用API限流
  default: {
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 100,
    message: '请求过于频繁，请稍后重试',
  },

  // 登录限流（更严格）
  auth: {
    windowMs: 15 * 60 * 1000, // 15分钟
    maxRequests: 5,
    message: '登录尝试次数过多，请15分钟后重试',
  },

  // 注册限流
  register: {
    windowMs: 60 * 60 * 1000, // 1小时
    maxRequests: 3,
    message: '注册请求过于频繁，请1小时后重试',
  },

  // AI API限流
  ai: {
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 20,
    message: 'AI请求过于频繁，请稍后重试',
  },

  // 文件上传限流
  upload: {
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 10,
    message: '文件上传过于频繁，请稍后重试',
  },
};

/**
 * 获取客户端标识（IP地址或其他唯一标识）
 */
function getClientIdentifier(req: NextRequest): string {
  // 优先使用X-Forwarded-For（代理环境）
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0];
    return firstIp ? firstIp.trim() : 'unknown';
  }

  // 使用X-Real-IP
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // 回退到连接IP（可能不可用）
  return 'unknown';
}

/**
 * 检查是否超过限流
 * @param key 限流键
 * @param config 限流配置
 * @returns 是否允许请求
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // 新记录或已过期
  if (!record || now > record.resetTime) {
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }

  // 检查是否超限
  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // 增加计数
  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * 创建限流中间件
 * @param configName 配置名称或自定义配置
 * @returns 限流中间件函数
 */
export function createRateLimiter(
  configName: keyof typeof defaultRateLimitConfigs | RateLimitConfig = 'default'
) {
  const config: RateLimitConfig =
    typeof configName === 'string'
      ? (defaultRateLimitConfigs[configName] ?? defaultRateLimitConfigs['default'])!
      : configName;

  return (req: NextRequest) => {
    const clientId = config.keyGenerator
      ? config.keyGenerator(req)
      : getClientIdentifier(req);

    const endpoint = new URL(req.url).pathname;
    const key = `${clientId}:${endpoint}`;

    const result = checkRateLimit(key, config);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: config.message || '请求过于频繁，请稍后重试',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(
              Math.ceil((result.resetTime - Date.now()) / 1000)
            ),
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(result.resetTime),
          },
        }
      );
    }

    // 返回null表示允许继续
    return null;
  };
}

/**
 * API路由限流装饰器
 * @param handler API处理函数
 * @param configName 限流配置名称
 * @returns 包装后的处理函数
 */
export function withRateLimit<T>(
  handler: (req: NextRequest) => Promise<T>,
  configName: keyof typeof defaultRateLimitConfigs = 'default'
) {
  const rateLimiter = createRateLimiter(configName);

  return async (req: NextRequest): Promise<T | NextResponse> => {
    const rateLimitResult = rateLimiter(req);
    if (rateLimitResult) {
      return rateLimitResult;
    }
    return handler(req);
  };
}

/**
 * 重置特定键的限流记录（用于密码重置等场景）
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * 获取限流状态（用于调试和监控）
 */
export function getRateLimitStatus(key: string): {
  exists: boolean;
  count?: number;
  resetTime?: number;
} {
  const record = rateLimitStore.get(key);
  if (!record) {
    return { exists: false };
  }
  return {
    exists: true,
    count: record.count,
    resetTime: record.resetTime,
  };
}

export default {
  checkRateLimit,
  createRateLimiter,
  withRateLimit,
  resetRateLimit,
  getRateLimitStatus,
  defaultRateLimitConfigs,
};
