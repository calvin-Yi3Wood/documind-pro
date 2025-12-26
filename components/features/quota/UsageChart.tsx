/**
 * 使用量图表组件
 *
 * 显示 AI 使用量的可视化图表
 */

'use client';

import { useMemo } from 'react';
import { useQuota } from '@/hooks/useQuota';

interface UsageChartProps {
  period?: 'daily' | 'weekly' | 'monthly';
  height?: number;
  className?: string;
}

export function UsageChart({
  period = 'monthly',
  height = 200,
  className = '',
}: UsageChartProps) {
  const { stats, isLoading, error } = useQuota({
    includeStats: true,
    period,
  });

  // 计算图表数据
  const chartData = useMemo(() => {
    if (!stats?.byDay.length) return [];

    // 获取最近的天数
    const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
    const today = new Date();
    const data: { date: string; label: string; value: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0] ?? '';
      const dayData = stats.byDay.find((d) => d.date === dateStr);

      data.push({
        date: dateStr,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        value: dayData?.units || 0,
      });
    }

    return data;
  }, [stats, period]);

  // 最大值（用于计算柱状图高度）
  const maxValue = useMemo(() => {
    if (!chartData.length) return 10;
    return Math.max(...chartData.map((d) => d.value), 10);
  }, [chartData]);

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`} style={{ height }}>
        <div className="h-full bg-bronze-100 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center text-bronze-400 ${className}`}
        style={{ height }}
      >
        加载使用数据失败
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 统计摘要 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-bronze-700">
            {stats?.totalRequests || 0}
          </div>
          <div className="text-xs text-bronze-400">总请求</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-500">
            {stats?.totalUnits || 0}
          </div>
          <div className="text-xs text-bronze-400">消耗配额</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">
            {stats ? `${(stats.successRate).toFixed(1)}%` : '-'}
          </div>
          <div className="text-xs text-bronze-400">成功率</div>
        </div>
      </div>

      {/* 类型分布 */}
      {stats && (
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-bronze-500">对话 {stats.byType.chat}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-bronze-500">图片 {stats.byType.image}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-bronze-400" />
            <span className="text-bronze-500">其他 {stats.byType.other}</span>
          </div>
        </div>
      )}

      {/* 柱状图 */}
      <div
        className="flex items-end justify-between gap-1 pt-4"
        style={{ height: height - 80 }}
      >
        {chartData.map((item, index) => {
          const barHeight = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

          return (
            <div
              key={item.date}
              className="flex-1 flex flex-col items-center gap-1"
            >
              {/* 数值标签 */}
              {item.value > 0 && (
                <span className="text-[10px] text-bronze-400">{item.value}</span>
              )}

              {/* 柱状图 */}
              <div
                className={`w-full rounded-t transition-all duration-300 ${
                  item.value > 0
                    ? 'bg-gradient-to-t from-orange-500 to-amber-400'
                    : 'bg-bronze-100'
                }`}
                style={{
                  height: `${Math.max(barHeight, 2)}%`,
                  minHeight: '4px',
                }}
                title={`${item.label}: ${item.value} 次`}
              />

              {/* 日期标签（每隔几个显示） */}
              {(index % Math.ceil(chartData.length / 7) === 0 ||
                index === chartData.length - 1) && (
                <span className="text-[10px] text-bronze-400 whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 平均响应时间 */}
      {stats && stats.avgResponseTime > 0 && (
        <div className="text-xs text-bronze-400 text-center">
          平均响应时间: {stats.avgResponseTime}ms
        </div>
      )}
    </div>
  );
}

export default UsageChart;
