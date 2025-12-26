/**
 * 用户配额 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getQuotaStatus, getUsageStats } from '@/services/quota';

/**
 * GET /api/user/quota
 *
 * 获取当前用户的配额状态和使用统计
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET!,
    });

    if (!token?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '请先登录' },
        { status: 401 }
      );
    }

    const userId = token.sub;

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') as 'daily' | 'weekly' | 'monthly') || 'monthly';
    const includeStats = searchParams.get('includeStats') !== 'false';

    // 获取配额状态
    const quotaStatus = await getQuotaStatus(userId);
    if (!quotaStatus) {
      return NextResponse.json(
        { error: 'Failed to get quota status' },
        { status: 500 }
      );
    }

    // 可选：获取使用统计
    let usageStats = null;
    if (includeStats) {
      usageStats = await getUsageStats(userId, period);
    }

    return NextResponse.json({
      quota: {
        tier: quotaStatus.tier,
        ai: {
          total: quotaStatus.aiQuota.total,
          used: quotaStatus.aiQuota.used,
          remaining: quotaStatus.aiQuota.remaining,
          usagePercent: Math.round(quotaStatus.aiQuota.usagePercent * 10) / 10,
          resetAt: quotaStatus.aiQuota.resetAt.toISOString(),
        },
        storage: {
          totalMB: quotaStatus.storageQuota.totalMB,
          usedMB: quotaStatus.storageQuota.usedMB,
          remainingMB: quotaStatus.storageQuota.remainingMB,
          usagePercent: Math.round(quotaStatus.storageQuota.usagePercent * 10) / 10,
        },
        canUseAI: quotaStatus.canUseAI,
        isExceeded: quotaStatus.isExceeded,
      },
      stats: usageStats
        ? {
            period: usageStats.period,
            totalRequests: usageStats.totalRequests,
            totalUnits: usageStats.totalUnits,
            byType: usageStats.byType,
            byDay: usageStats.byDay,
            avgResponseTime: Math.round(usageStats.avgResponseTime),
            successRate: Math.round(usageStats.successRate * 1000) / 10,
          }
        : null,
    });
  } catch (error) {
    console.error('Quota API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
