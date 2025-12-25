/**
 * API Request Validation Utilities
 *
 * 使用 Zod 进行请求验证
 */

import { z } from 'zod';
import { validationError } from './response';
import type { NextRequest } from 'next/server';

/**
 * 验证请求 Body
 *
 * @param request - Next.js Request
 * @param schema - Zod Schema
 * @returns 验证后的数据或错误响应
 */
export async function validateBody<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; response: ReturnType<typeof validationError> }
> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { success: true, data };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        success: false,
        response: validationError('Validation failed', {
          errors: err.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        }),
      };
    }

    return {
      success: false,
      response: validationError('Invalid JSON'),
    };
  }
}

/**
 * 验证 URL 查询参数
 *
 * @param request - Next.js Request
 * @param schema - Zod Schema
 * @returns 验证后的数据或错误响应
 */
export function validateQuery<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
):
  | { success: true; data: z.infer<T> }
  | { success: false; response: ReturnType<typeof validationError> }
{
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const data = schema.parse(params);
    return { success: true, data };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        success: false,
        response: validationError('Query validation failed', {
          errors: err.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        }),
      };
    }

    return {
      success: false,
      response: validationError('Invalid query parameters'),
    };
  }
}

/**
 * 验证路径参数
 *
 * @param params - 路径参数对象
 * @param schema - Zod Schema
 * @returns 验证后的数据或错误响应
 */
export function validateParams<T extends z.ZodTypeAny>(
  params: unknown,
  schema: T
):
  | { success: true; data: z.infer<T> }
  | { success: false; response: ReturnType<typeof validationError> }
{
  try {
    const data = schema.parse(params);
    return { success: true, data };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        success: false,
        response: validationError('Path parameter validation failed', {
          errors: err.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        }),
      };
    }

    return {
      success: false,
      response: validationError('Invalid path parameters'),
    };
  }
}

/**
 * 常用的 Zod Schema
 */
export const commonSchemas = {
  /** ID 验证（nanoid 格式） */
  id: z.string().min(1).max(64),

  /** 邮箱验证 */
  email: z.string().email(),

  /** URL 验证 */
  url: z.string().url(),

  /** 分页参数验证 */
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),

  /** 文档 ID 验证 */
  documentId: z.string().min(1).max(64),

  /** Skill ID 验证 */
  skillId: z.string().min(1).max(100),

  /** AI 聊天请求验证 */
  chatRequest: z.object({
    query: z.string().min(1).max(10000),
    documentId: z.string().min(1).max(64).optional(),
    history: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant', 'system']),
          content: z.string(),
        })
      )
      .max(20)
      .optional(),
    stream: z.boolean().default(true),
  }),

  /** Skills 执行请求验证 */
  skillExecuteRequest: z.object({
    query: z.string().min(1).max(10000),
    documentId: z.string().optional(),
    selection: z
      .object({
        text: z.string(),
        start: z.number(),
        end: z.number(),
      })
      .optional(),
    params: z.record(z.string(), z.any()).optional(),
  }),

  /** 文档创建请求验证 */
  createDocumentRequest: z.object({
    title: z.string().min(1).max(200),
    content: z.string().max(1000000),
    type: z.enum(['pdf', 'docx', 'pptx', 'xlsx', 'markdown', 'text']),
    tags: z.array(z.string()).max(10).optional(),
  }),

  /** 文档更新请求验证 */
  updateDocumentRequest: z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().max(1000000).optional(),
    tags: z.array(z.string()).max(10).optional(),
  }),
};
