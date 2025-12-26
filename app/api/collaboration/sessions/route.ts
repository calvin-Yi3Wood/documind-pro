/**
 * 协作会话 API
 *
 * GET  /api/collaboration/sessions - 获取文档的活跃会话列表
 * POST /api/collaboration/sessions - 创建/加入协作会话
 *
 * @module api/collaboration/sessions
 */

import { NextRequest } from 'next/server';
import { createApiResponse, createErrorResponse } from '@/lib/api/response';

/**
 * 获取文档的活跃协作会话
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return createErrorResponse('documentId is required', 400);
    }

    // TODO: 从数据库获取活跃会话
    // const sessions = await db
    //   .select()
    //   .from(collaborationSessions)
    //   .where(eq(collaborationSessions.documentId, documentId))
    //   .where(eq(collaborationSessions.status, 'active'));

    // 临时返回空列表
    const sessions: any[] = [];

    return createApiResponse({
      documentId,
      sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error('[API] collaboration/sessions GET error:', error);
    return createErrorResponse('Failed to fetch collaboration sessions', 500);
  }
}

/**
 * 创建/加入协作会话
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, userId, userColor } = body;

    if (!documentId || !userId) {
      return createErrorResponse('documentId and userId are required', 400);
    }

    // TODO: 创建或更新会话记录
    // const session = await db
    //   .insert(collaborationSessions)
    //   .values({
    //     documentId,
    //     userId,
    //     userColor: userColor || generateUserColor(),
    //     status: 'active',
    //     connectedAt: new Date(),
    //     lastActiveAt: new Date(),
    //   })
    //   .onConflictDoUpdate({
    //     target: [collaborationSessions.documentId, collaborationSessions.userId],
    //     set: {
    //       status: 'active',
    //       lastActiveAt: new Date(),
    //     },
    //   })
    //   .returning();

    // 临时返回模拟数据
    const session = {
      id: crypto.randomUUID(),
      documentId,
      userId,
      userColor: userColor || '#F97316',
      status: 'active',
      connectedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    return createApiResponse(session, 201);
  } catch (error) {
    console.error('[API] collaboration/sessions POST error:', error);
    return createErrorResponse('Failed to create collaboration session', 500);
  }
}

/**
 * 更新会话状态（断开连接）
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return createErrorResponse('sessionId is required', 400);
    }

    // TODO: 更新会话状态为断开
    // await db
    //   .update(collaborationSessions)
    //   .set({
    //     status: 'disconnected',
    //     disconnectedAt: new Date(),
    //   })
    //   .where(eq(collaborationSessions.id, sessionId));

    return createApiResponse({ success: true, sessionId });
  } catch (error) {
    console.error('[API] collaboration/sessions DELETE error:', error);
    return createErrorResponse('Failed to end collaboration session', 500);
  }
}
