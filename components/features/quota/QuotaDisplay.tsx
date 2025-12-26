/**
 * 配额显示组件
 *
 * 显示用户的 AI 配额和存储使用情况
 */

'use client';

import { useQuota, type QuotaData } from '@/hooks/useQuota';

interface QuotaDisplayProps {
  compact?: boolean;  // 紧凑模式
  showStorage?: boolean;  // 显示存储配额
  className?: string;
}

// 进度条组件
function ProgressBar({
  value,
  max,
  color = 'orange',
  size = 'md',
}: {
  value: number;
  max: number;
  color?: 'orange' | 'green' | 'red' | 'bronze';
  size?: 'sm' | 'md';
}) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  const colorClasses = {
    orange: 'bg-orange-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    bronze: 'bg-bronze-500',
  };

  const bgClass = percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-orange-500' : colorClasses[color];
  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div className={`w-full bg-bronze-200 rounded-full ${heightClass} overflow-hidden`}>
      <div
        className={`${bgClass} ${heightClass} rounded-full transition-all duration-300`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

// 订阅等级徽章
function TierBadge({ tier }: { tier: QuotaData['tier'] }) {
  const tierConfig = {
    free: { label: '免费版', bg: 'bg-bronze-100', text: 'text-bronze-600' },
    pro: { label: '专业版', bg: 'bg-orange-100', text: 'text-orange-600' },
    enterprise: { label: '企业版', bg: 'bg-amber-100', text: 'text-amber-700' },
  };

  const config = tierConfig[tier];

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

// 格式化日期
function formatResetDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return '即将重置';
  } else if (diffDays === 1) {
    return '明天重置';
  } else if (diffDays <= 7) {
    return `${diffDays} 天后重置`;
  } else {
    return `${date.getMonth() + 1}月${date.getDate()}日重置`;
  }
}

export function QuotaDisplay({
  compact = false,
  showStorage = true,
  className = '',
}: QuotaDisplayProps) {
  const { quota, isLoading, error, refresh } = useQuota({ includeStats: false });

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-bronze-200 rounded w-24 mb-2" />
        <div className="h-2 bg-bronze-200 rounded w-full" />
      </div>
    );
  }

  if (error || !quota) {
    return (
      <div className={`text-sm text-red-500 ${className}`}>
        加载配额失败
        <button
          onClick={refresh}
          className="ml-2 text-orange-500 hover:underline"
        >
          重试
        </button>
      </div>
    );
  }

  // 紧凑模式
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-xs text-bronze-500">
          AI: {quota.ai.remaining}/{quota.ai.total}
        </span>
        <ProgressBar
          value={quota.ai.used}
          max={quota.ai.total}
          color="orange"
          size="sm"
        />
      </div>
    );
  }

  // 完整模式
  return (
    <div className={`space-y-4 ${className}`}>
      {/* 标题和订阅等级 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-bronze-700">使用配额</h3>
        <TierBadge tier={quota.tier} />
      </div>

      {/* AI 配额 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-bronze-600">AI 调用</span>
          <span className="text-bronze-500">
            {quota.ai.used} / {quota.ai.total}
          </span>
        </div>
        <ProgressBar value={quota.ai.used} max={quota.ai.total} color="orange" />
        <div className="flex items-center justify-between text-xs text-bronze-400">
          <span>剩余 {quota.ai.remaining} 次</span>
          <span>{formatResetDate(quota.ai.resetAt)}</span>
        </div>
      </div>

      {/* 存储配额 */}
      {showStorage && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-bronze-600">存储空间</span>
            <span className="text-bronze-500">
              {quota.storage.usedMB} / {quota.storage.totalMB} MB
            </span>
          </div>
          <ProgressBar
            value={quota.storage.usedMB}
            max={quota.storage.totalMB}
            color="bronze"
          />
          <div className="text-xs text-bronze-400">
            剩余 {quota.storage.remainingMB} MB
          </div>
        </div>
      )}

      {/* 配额不足警告 */}
      {!quota.canUseAI && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">
            <i className="fa-solid fa-exclamation-triangle mr-2" />
            AI 配额已用尽，请升级订阅或等待配额重置
          </p>
        </div>
      )}

      {/* 升级按钮 */}
      {quota.tier === 'free' && (
        <button className="w-full py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all">
          <i className="fa-solid fa-rocket mr-2" />
          升级到专业版
        </button>
      )}
    </div>
  );
}

export default QuotaDisplay;
