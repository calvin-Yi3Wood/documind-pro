/**
 * 配额服务
 *
 * 管理用户的 AI 调用配额和使用量
 */

import { createAdminClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import {
  SubscriptionTier,
  getRemainingQuota,
  getQuotaUsagePercent,
} from '@/types/subscription';

// 配额状态
export interface QuotaStatus {
  tier: SubscriptionTier;
  aiQuota: {
    total: number;
    used: number;
    remaining: number;
    usagePercent: number;
    resetAt: Date;
  };
  storageQuota: {
    totalMB: number;
    usedMB: number;
    remainingMB: number;
    usagePercent: number;
  };
  isExceeded: boolean;
  canUseAI: boolean;
}

// 使用量统计
export interface UsageStats {
  period: 'daily' | 'weekly' | 'monthly';
  totalRequests: number;
  totalUnits: number;
  byType: {
    chat: number;
    image: number;
    other: number;
  };
  byDay: {
    date: string;
    units: number;
  }[];
  avgResponseTime: number;
  successRate: number;
}

/**
 * 获取用户配额状态
 */
export async function getQuotaStatus(userId: string): Promise<QuotaStatus | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('users')
    .select(
      'subscription, monthly_ai_quota, monthly_ai_used, quota_reset_at, storage_quota, storage_used'
    )
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Failed to get user quota:', error);
    return null;
  }

  type UserQuotaData = {
    subscription: string;
    monthly_ai_quota: number;
    monthly_ai_used: number;
    quota_reset_at: string;
    storage_quota: number;
    storage_used: number;
  };
  const user = data as UserQuotaData;

  const tier = user.subscription as SubscriptionTier;
  const resetAt = new Date(user.quota_reset_at);

  // 检查是否需要重置
  const now = new Date();
  let used = user.monthly_ai_used;
  let actualResetAt = resetAt;

  if (resetAt <= now) {
    // 重置配额
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    await (admin
      .from('users') as any)
      .update({
        monthly_ai_used: 0,
        quota_reset_at: nextMonth.toISOString(),
      })
      .eq('id', userId);

    used = 0;
    actualResetAt = nextMonth;
  }

  const aiRemaining = getRemainingQuota(tier, 'monthlyAIQuota', used);
  const aiUsagePercent = getQuotaUsagePercent(tier, 'monthlyAIQuota', used);

  const storageRemaining = getRemainingQuota(tier, 'storageQuotaMB', user.storage_used);
  const storageUsagePercent = getQuotaUsagePercent(tier, 'storageQuotaMB', user.storage_used);

  return {
    tier,
    aiQuota: {
      total: user.monthly_ai_quota,
      used,
      remaining: aiRemaining,
      usagePercent: aiUsagePercent,
      resetAt: actualResetAt,
    },
    storageQuota: {
      totalMB: user.storage_quota,
      usedMB: user.storage_used,
      remainingMB: storageRemaining,
      usagePercent: storageUsagePercent,
    },
    isExceeded: aiRemaining <= 0 || storageRemaining <= 0,
    canUseAI: aiRemaining > 0,
  };
}

/**
 * 检查用户是否可以使用 AI
 */
export async function canUseAI(userId: string): Promise<boolean> {
  const status = await getQuotaStatus(userId);
  return status?.canUseAI ?? false;
}

/**
 * 消耗 AI 配额
 */
export async function consumeAIQuota(
  userId: string,
  units: number = 1
): Promise<{ success: boolean; remaining: number }> {
  const admin = createAdminClient();

  // 先检查配额
  const status = await getQuotaStatus(userId);
  if (!status || status.aiQuota.remaining < units) {
    return { success: false, remaining: status?.aiQuota.remaining ?? 0 };
  }

  // 消耗配额
  const { error } = await (admin.rpc as any)('increment_ai_usage', {
    user_id: userId,
    amount: units,
  });

  if (error) {
    console.error('Failed to consume quota:', error);
    return { success: false, remaining: status.aiQuota.remaining };
  }

  return { success: true, remaining: status.aiQuota.remaining - units };
}

/**
 * 获取使用量统计
 */
export async function getUsageStats(
  userId: string,
  period: 'daily' | 'weekly' | 'monthly' = 'monthly'
): Promise<UsageStats | null> {
  const admin = createAdminClient();

  // 计算日期范围
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'weekly':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'monthly':
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // 获取使用记录
  const { data: logsData, error } = await admin
    .from('ai_usage_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to get usage stats:', error);
    return null;
  }

  type AILogRow = Database['public']['Tables']['ai_usage_logs']['Row'];
  const logs = (logsData || []) as AILogRow[];

  // 统计数据
  let totalRequests = 0;
  let totalUnits = 0;
  let chatUnits = 0;
  let imageUnits = 0;
  let otherUnits = 0;
  let totalResponseTime = 0;
  let successCount = 0;

  const byDayMap = new Map<string, number>();

  for (const log of logs) {
    totalRequests++;
    totalUnits += log.usage_units;

    if (log.request_type === 'chat') {
      chatUnits += log.usage_units;
    } else if (log.request_type === 'image_generation') {
      imageUnits += log.usage_units;
    } else {
      otherUnits += log.usage_units;
    }

    if (log.response_time_ms) {
      totalResponseTime += log.response_time_ms;
    }

    if (log.response_status === 'success') {
      successCount++;
    }

    // 按日统计
    const day = log.created_at.split('T')[0] ?? '';
    if (day) {
      byDayMap.set(day, (byDayMap.get(day) || 0) + log.usage_units);
    }
  }

  return {
    period,
    totalRequests,
    totalUnits,
    byType: {
      chat: chatUnits,
      image: imageUnits,
      other: otherUnits,
    },
    byDay: Array.from(byDayMap.entries()).map(([date, units]) => ({
      date,
      units,
    })),
    avgResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
    successRate: totalRequests > 0 ? successCount / totalRequests : 1,
  };
}

/**
 * 更新存储使用量
 */
export async function updateStorageUsage(
  userId: string,
  deltaMB: number
): Promise<boolean> {
  const admin = createAdminClient();

  const { data, error: fetchError } = await admin
    .from('users')
    .select('storage_used, storage_quota')
    .eq('id', userId)
    .single();

  if (fetchError || !data) {
    return false;
  }

  const user = data as { storage_used: number; storage_quota: number };
  const newUsed = Math.max(0, user.storage_used + deltaMB);

  // 检查是否超限
  if (newUsed > user.storage_quota) {
    return false;
  }

  const { error: updateError } = await (admin
    .from('users') as any)
    .update({ storage_used: newUsed })
    .eq('id', userId);

  return !updateError;
}

export default {
  getQuotaStatus,
  canUseAI,
  consumeAIQuota,
  getUsageStats,
  updateStorageUsage,
};
