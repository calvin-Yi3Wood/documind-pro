/**
 * Context Panel Component
 *
 * AI 上下文显示和管理面板
 * - 显示已添加的上下文列表
 * - 支持移除单个上下文
 * - 清空全部上下文
 */

'use client';

import { useState, useCallback } from 'react';
import type { AIContextItem, AIContextSource } from '@/types/chat';

/**
 * 上下文面板属性
 */
export interface ContextPanelProps {
  /** 上下文列表 */
  items: AIContextItem[];
  /** 移除单个上下文回调 */
  onRemove: (id: string) => void;
  /** 清空全部上下文回调 */
  onClear: () => void;
  /** 自定义类名 */
  className?: string;
  /** 是否可折叠 */
  collapsible?: boolean;
  /** 默认展开状态 */
  defaultExpanded?: boolean;
  /** 最大显示高度 */
  maxHeight?: number;
}

/**
 * 来源图标映射
 */
const sourceIconMap: Record<AIContextSource, string> = {
  selection: 'fa-quote-left',
  file: 'fa-file-alt',
  manual: 'fa-edit',
  document: 'fa-file-lines',
};

/**
 * 来源标签映射
 */
const sourceLabelMap: Record<AIContextSource, string> = {
  selection: '选中文本',
  file: '文件内容',
  manual: '手动添加',
  document: '文档内容',
};

/**
 * 格式化时间
 */
function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

/**
 * 上下文面板组件
 */
export function ContextPanel({
  items,
  onRemove,
  onClear,
  className = '',
  collapsible = false,
  defaultExpanded = true,
  maxHeight = 160,
}: ContextPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = useCallback(() => {
    if (collapsible) {
      setIsExpanded((prev) => !prev);
    }
  }, [collapsible]);

  // 无上下文时不显示
  if (items.length === 0) {
    return null;
  }

  const usedCount = items.filter((item) => item.used).length;
  const unusedCount = items.length - usedCount;

  return (
    <div className={`context-panel border-t border-bronze-200 bg-gradient-to-b from-orange-50/50 to-cream-50 ${className}`}>
      {/* 头部 */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b border-orange-200/50 ${
          collapsible ? 'cursor-pointer hover:bg-orange-100/30' : ''
        }`}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2 text-sm text-orange-700">
          <i className="fas fa-layer-group" />
          <span className="font-medium">AI 上下文</span>
          <span className="text-xs text-orange-500/80">
            ({unusedCount}/{items.length})
          </span>
          {usedCount > 0 && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <i className="fas fa-check-circle text-[10px]" />
              {usedCount} 已使用
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-xs text-orange-500 hover:text-orange-700 hover:underline transition-colors"
          >
            清空全部
          </button>
          {collapsible && (
            <i
              className={`fas fa-chevron-down text-xs text-orange-400 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          )}
        </div>
      </div>

      {/* 上下文列表 */}
      {(!collapsible || isExpanded) && (
        <div
          className="overflow-y-auto p-2 space-y-1.5"
          style={{ maxHeight: `${maxHeight}px` }}
        >
          {items.map((item) => (
            <ContextItem
              key={item.id}
              item={item}
              onRemove={() => onRemove(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 单个上下文项属性
 */
interface ContextItemProps {
  item: AIContextItem;
  onRemove: () => void;
}

/**
 * 单个上下文项组件
 */
function ContextItem({ item, onRemove }: ContextItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`group flex items-start gap-2 p-2 rounded-lg text-xs transition-all ${
        item.used
          ? 'bg-bronze-100/50 text-bronze-500'
          : 'bg-white text-bronze-700 border border-orange-200/70 shadow-sm'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 来源图标 */}
      <div
        className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
          item.used
            ? 'bg-green-100 text-green-600'
            : 'bg-orange-100 text-orange-500'
        }`}
      >
        <i
          className={`fas ${
            item.used ? 'fa-check' : sourceIconMap[item.source]
          } text-[10px]`}
        />
      </div>

      {/* 内容区域 */}
      <div className="flex-1 min-w-0">
        {/* 来源和时间 */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`font-medium ${item.used ? 'text-bronze-400' : 'text-bronze-600'}`}>
            {item.sourceLabel || sourceLabelMap[item.source]}
          </span>
          <span className="text-bronze-400 text-[10px]">·</span>
          <span className="text-bronze-400 text-[10px]">
            {formatTime(item.addedAt)}
          </span>
        </div>

        {/* 文本内容 */}
        <div
          className={`line-clamp-2 leading-relaxed ${
            item.used ? 'text-bronze-400' : 'text-bronze-600'
          }`}
        >
          {item.text}
        </div>

        {/* 字符数提示 */}
        {isHovered && (
          <div className="mt-1 text-[10px] text-bronze-400">
            {item.text.length} 字符
          </div>
        )}
      </div>

      {/* 删除按钮 */}
      <button
        onClick={onRemove}
        className={`flex-shrink-0 p-1 rounded transition-all ${
          isHovered
            ? 'opacity-100 text-red-500 hover:bg-red-50'
            : 'opacity-0 text-bronze-400'
        }`}
        title="移除此上下文"
      >
        <i className="fas fa-times text-xs" />
      </button>
    </div>
  );
}

/**
 * 迷你上下文指示器
 *
 * 用于在输入框旁显示简洁的上下文状态
 */
export interface ContextIndicatorProps {
  /** 上下文数量 */
  count: number;
  /** 点击回调 */
  onClick?: () => void;
  /** 自定义类名 */
  className?: string;
}

export function ContextIndicator({
  count,
  onClick,
  className = '',
}: ContextIndicatorProps) {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors ${className}`}
      title={`${count} 个上下文已添加`}
    >
      <i className="fas fa-layer-group text-[10px]" />
      <span>{count}</span>
    </button>
  );
}

/**
 * 空状态提示组件
 */
export function ContextEmptyState({ className = '' }: { className?: string }) {
  return (
    <div className={`text-center py-4 text-bronze-400 text-sm ${className}`}>
      <i className="fas fa-layer-group text-2xl mb-2 text-bronze-300" />
      <p>暂无上下文</p>
      <p className="text-xs mt-1">选中文本后点击"添加到上下文"</p>
    </div>
  );
}

export default ContextPanel;
