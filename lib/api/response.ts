/**
 * API Response Utilities
 *
 * 统一的 API 响应格式和错误处理
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, ApiError, ApiErrorCode } from '@/types';

/**
 * 成功响应
 *
 * @param data - 响应数据
 * @param status - HTTP 状态码（默认 200）
 * @returns NextResponse
 */
export function success<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: Date.now(),
    },
    { status }
  );
}

/**
 * 错误响应
 *
 * @param error - 错误信息（字符串或 ApiError 对象）
 * @param status - HTTP 状态码（默认 500）
 * @returns NextResponse
 */
export function error(
  error: string | ApiError,
  status = 500
): NextResponse<ApiResponse<never>> {
  const errorData: ApiError =
    typeof error === 'string'
      ? {
          code: 'INTERNAL_ERROR' as ApiErrorCode,
          message: error,
        }
      : error;

  return NextResponse.json(
    {
      success: false,
      error: errorData,
      timestamp: Date.now(),
    },
    { status }
  );
}

/**
 * 验证错误响应 (400)
 */
export function validationError(message: string, details?: unknown) {
  return error(
    {
      code: 'VALIDATION_ERROR' as ApiErrorCode,
      message,
      details,
    },
    400
  );
}

/**
 * 未授权响应 (401)
 */
export function unauthorized(message = 'Unauthorized') {
  return error(
    {
      code: 'UNAUTHORIZED' as ApiErrorCode,
      message,
    },
    401
  );
}

/**
 * 禁止访问响应 (403)
 */
export function forbidden(message = 'Forbidden') {
  return error(
    {
      code: 'FORBIDDEN' as ApiErrorCode,
      message,
    },
    403
  );
}

/**
 * 资源未找到响应 (404)
 */
export function notFound(resource = 'Resource') {
  return error(
    {
      code: 'NOT_FOUND' as ApiErrorCode,
      message: `${resource} not found`,
    },
    404
  );
}

/**
 * 配额超限响应 (429)
 */
export function quotaExceeded(message = 'Quota exceeded') {
  return error(
    {
      code: 'QUOTA_EXCEEDED' as ApiErrorCode,
      message,
    },
    429
  );
}

/**
 * AI 服务错误响应 (503)
 */
export function aiServiceError(message = 'AI service unavailable', details?: unknown) {
  return error(
    {
      code: 'AI_SERVICE_ERROR' as ApiErrorCode,
      message,
      details,
    },
    503
  );
}

/**
 * 速率限制响应 (429)
 */
export function rateLimitError(retryAfter?: number) {
  const headers = retryAfter ? { 'Retry-After': retryAfter.toString() } : undefined;

  return new NextResponse(
    JSON.stringify({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED' as ApiErrorCode,
        message: 'Too many requests',
      },
      timestamp: Date.now(),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }
  );
}

/**
 * 流式响应（用于 AI 流式输出）
 *
 * @param stream - ReadableStream
 * @returns NextResponse with streaming
 */
export function streamResponse(stream: ReadableStream): NextResponse {
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/**
 * 创建 API 响应（success 的别名）
 */
export const createApiResponse = success;

/**
 * 创建错误响应（error 的别名）
 */
export const createErrorResponse = error;
