/**
 * Knowledge API - 知识库管理
 *
 * GET /api/knowledge - 获取知识源列表
 * POST /api/knowledge - 添加知识源
 * DELETE /api/knowledge?id=xxx - 删除知识源
 * PATCH /api/knowledge - 更新知识源（如启用/禁用）
 *
 * 使用内存存储，实际应用中应该使用数据库
 */

import { NextRequest } from 'next/server';
import { createApiResponse, createErrorResponse } from '@/lib/api/response';

/**
 * 知识源类型
 */
interface KnowledgeSource {
  id: string;
  name: string;
  type: 'file' | 'text' | 'url';
  content: string;
  enabled: boolean;
  size?: number;
  createdAt: string;
  updatedAt: string;
}

// 内存存储（生产环境应使用数据库）
const knowledgeSources: Map<string, KnowledgeSource> = new Map();

/**
 * GET /api/knowledge
 *
 * 获取所有知识源
 */
export async function GET() {
  try {
    const sources = Array.from(knowledgeSources.values());

    return createApiResponse({
      sources,
      total: sources.length,
      enabledCount: sources.filter((s) => s.enabled).length,
    });
  } catch (error) {
    console.error('Failed to get knowledge sources:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to get knowledge sources',
      500
    );
  }
}

/**
 * POST /api/knowledge
 *
 * 添加知识源
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, content } = body;

    if (!name || !type || !content) {
      return createErrorResponse('Missing required fields: name, type, content', 400);
    }

    if (!['file', 'text', 'url'].includes(type)) {
      return createErrorResponse('Invalid type. Must be: file, text, or url', 400);
    }

    const id = `ks_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();

    const newSource: KnowledgeSource = {
      id,
      name,
      type,
      content,
      enabled: true,
      size: content.length,
      createdAt: now,
      updatedAt: now,
    };

    knowledgeSources.set(id, newSource);

    return createApiResponse({
      source: newSource,
      message: 'Knowledge source added successfully',
    });
  } catch (error) {
    console.error('Failed to add knowledge source:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to add knowledge source',
      500
    );
  }
}

/**
 * DELETE /api/knowledge?id=xxx
 *
 * 删除知识源
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return createErrorResponse('Missing required parameter: id', 400);
    }

    if (!knowledgeSources.has(id)) {
      return createErrorResponse(`Knowledge source not found: ${id}`, 404);
    }

    knowledgeSources.delete(id);

    return createApiResponse({
      message: 'Knowledge source deleted successfully',
      deletedId: id,
    });
  } catch (error) {
    console.error('Failed to delete knowledge source:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to delete knowledge source',
      500
    );
  }
}

/**
 * PATCH /api/knowledge
 *
 * 更新知识源（如启用/禁用）
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, enabled, name } = body;

    if (!id) {
      return createErrorResponse('Missing required field: id', 400);
    }

    const source = knowledgeSources.get(id);
    if (!source) {
      return createErrorResponse(`Knowledge source not found: ${id}`, 404);
    }

    // 更新字段
    if (typeof enabled === 'boolean') {
      source.enabled = enabled;
    }
    if (name) {
      source.name = name;
    }
    source.updatedAt = new Date().toISOString();

    knowledgeSources.set(id, source);

    return createApiResponse({
      source,
      message: 'Knowledge source updated successfully',
    });
  } catch (error) {
    console.error('Failed to update knowledge source:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to update knowledge source',
      500
    );
  }
}
