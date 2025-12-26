/**
 * 配额状态 Hook
 *
 * 获取和管理用户配额状态
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

// 配额数据类型
export interface QuotaData {
  tier: 'free' | 'pro' | 'enterprise';
  ai: {
    total: number;
    used: number;
    remaining: number;
    usagePercent: number;
    resetAt: string;
  };
  storage: {
    totalMB: number;
    usedMB: number;
    remainingMB: number;
    usagePercent: number;
  };
  canUseAI: boolean;
  isExceeded: boolean;
}

// 使用统计类型
export interface UsageStatsData {
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

export interface UseQuotaReturn {
  quota: QuotaData | null;
  stats: UsageStatsData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  canUseAI: boolean;
}

/**
 * 配额状态 Hook
 */
export function useQuota(
  options: {
    includeStats?: boolean;
    period?: 'daily' | 'weekly' | 'monthly';
    autoRefresh?: boolean;
    refreshInterval?: number;
  } = {}
): UseQuotaReturn {
  const {
    includeStats = true,
    period = 'monthly',
    autoRefresh = false,
    refreshInterval = 60000, // 1分钟
  } = options;

  const { status } = useSession();
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [stats, setStats] = useState<UsageStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取配额数据
  const fetchQuota = useCallback(async () => {
    if (status !== 'authenticated') {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const params = new URLSearchParams({
        period,
        includeStats: includeStats.toString(),
      });

      const response = await fetch(`/api/user/quota?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch quota');
      }

      const data = await response.json();
      setQuota(data.quota);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取配额失败');
    } finally {
      setIsLoading(false);
    }
  }, [status, period, includeStats]);

  // 初始获取
  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchQuota, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchQuota]);

  return {
    quota,
    stats,
    isLoading,
    error,
    refresh: fetchQuota,
    canUseAI: quota?.canUseAI ?? false,
  };
}

/**
 * 简化的配额检查 Hook
 */
export function useCanUseAI(): { canUse: boolean; isLoading: boolean } {
  const { quota, isLoading } = useQuota({ includeStats: false });
  return {
    canUse: quota?.canUseAI ?? false,
    isLoading,
  };
}

export default useQuota;
