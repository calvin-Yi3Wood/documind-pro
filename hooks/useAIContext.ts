/**
 * AI Context Hook
 *
 * 管理 AI 对话的上下文信息
 * - 添加/移除上下文
 * - 获取未使用的上下文
 * - 标记上下文为已使用
 * - 持久化存储
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { nanoid } from 'nanoid';
import type { AIContextItem, AIContextSource } from '@/types/chat';

/**
 * 上下文配置选项
 */
export interface UseAIContextOptions {
  /** 最大上下文数量 */
  maxItems?: number;
  /** 单条上下文最大长度 */
  maxTextLength?: number;
  /** 是否启用本地存储 */
  persist?: boolean;
  /** 本地存储键名 */
  storageKey?: string;
}

/**
 * useAIContext Hook 返回值
 */
export interface UseAIContextReturn {
  /** 上下文列表 */
  contextItems: AIContextItem[];
  /** 添加上下文 */
  addContext: (text: string, source?: AIContextSource, options?: AddContextOptions) => string;
  /** 移除上下文 */
  removeContext: (id: string) => void;
  /** 清空所有上下文 */
  clearContext: () => void;
  /** 标记上下文为已使用 */
  markAsUsed: (ids: string[]) => void;
  /** 标记所有上下文为已使用 */
  markAllAsUsed: () => void;
  /** 获取未使用的上下文文本 */
  getUnusedContext: () => string;
  /** 获取所有上下文文本 */
  getAllContext: () => string;
  /** 获取格式化的上下文（用于API请求） */
  getFormattedContext: () => string;
  /** 是否有上下文 */
  hasContext: boolean;
  /** 是否有未使用的上下文 */
  hasUnusedContext: boolean;
  /** 上下文数量 */
  contextCount: number;
  /** 未使用的上下文数量 */
  unusedCount: number;
  /** 上下文总字符数 */
  totalCharacters: number;
}

/**
 * 添加上下文的额外选项
 */
export interface AddContextOptions {
  /** 来源标签 */
  sourceLabel?: string;
  /** 关联的文档 ID */
  documentId?: string;
}

// 默认配置
const DEFAULT_OPTIONS: Required<UseAIContextOptions> = {
  maxItems: 10,
  maxTextLength: 2000,
  persist: false,
  storageKey: 'documind-ai-context',
};

/**
 * AI 上下文管理 Hook
 *
 * @param options - 配置选项
 * @returns 上下文管理接口
 *
 * @example
 * ```tsx
 * const {
 *   contextItems,
 *   addContext,
 *   removeContext,
 *   getFormattedContext,
 *   hasContext,
 * } = useAIContext({ maxItems: 5 });
 *
 * // 添加选中文本到上下文
 * addContext(selectedText, 'selection', { sourceLabel: '文档标题' });
 *
 * // 在发送消息时获取上下文
 * const context = getFormattedContext();
 * ```
 */
export function useAIContext(options: UseAIContextOptions = {}): UseAIContextReturn {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const [contextItems, setContextItems] = useState<AIContextItem[]>([]);

  // 从本地存储加载（如果启用）
  useEffect(() => {
    if (config.persist && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(config.storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          // 恢复日期对象
          const items = parsed.map((item: AIContextItem) => ({
            ...item,
            addedAt: new Date(item.addedAt),
          }));
          setContextItems(items);
        }
      } catch (error) {
        console.warn('[useAIContext] Failed to load from storage:', error);
      }
    }
  }, [config.persist, config.storageKey]);

  // 保存到本地存储（如果启用）
  useEffect(() => {
    if (config.persist && typeof window !== 'undefined' && contextItems.length > 0) {
      try {
        localStorage.setItem(config.storageKey, JSON.stringify(contextItems));
      } catch (error) {
        console.warn('[useAIContext] Failed to save to storage:', error);
      }
    }
  }, [contextItems, config.persist, config.storageKey]);

  /**
   * 添加上下文
   */
  const addContext = useCallback(
    (
      text: string,
      source: AIContextSource = 'selection',
      addOptions: AddContextOptions = {}
    ): string => {
      if (!text || !text.trim()) {
        console.warn('[useAIContext] Cannot add empty context');
        return '';
      }

      // 截断过长的文本
      const truncatedText = text.slice(0, config.maxTextLength);

      const newItem: AIContextItem = {
        id: nanoid(),
        text: truncatedText,
        addedAt: new Date(),
        used: false,
        source,
        ...(addOptions.sourceLabel !== undefined ? { sourceLabel: addOptions.sourceLabel } : {}),
        ...(addOptions.documentId !== undefined ? { documentId: addOptions.documentId } : {}),
      };

      setContextItems((prev) => {
        // 如果超过最大数量，移除最旧的
        let items = [...prev, newItem];
        if (items.length > config.maxItems) {
          // 优先移除已使用的
          const usedItems = items.filter((i) => i.used);
          const unusedItems = items.filter((i) => !i.used);

          if (usedItems.length > 0) {
            usedItems.shift();
            items = [...usedItems, ...unusedItems];
          } else {
            items = items.slice(-config.maxItems);
          }
        }
        return items;
      });

      return newItem.id;
    },
    [config.maxItems, config.maxTextLength]
  );

  /**
   * 移除上下文
   */
  const removeContext = useCallback((id: string) => {
    setContextItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  /**
   * 清空所有上下文
   */
  const clearContext = useCallback(() => {
    setContextItems([]);
    if (config.persist && typeof window !== 'undefined') {
      localStorage.removeItem(config.storageKey);
    }
  }, [config.persist, config.storageKey]);

  /**
   * 标记上下文为已使用
   */
  const markAsUsed = useCallback((ids: string[]) => {
    setContextItems((prev) =>
      prev.map((item) =>
        ids.includes(item.id) ? { ...item, used: true } : item
      )
    );
  }, []);

  /**
   * 标记所有上下文为已使用
   */
  const markAllAsUsed = useCallback(() => {
    setContextItems((prev) =>
      prev.map((item) => ({ ...item, used: true }))
    );
  }, []);

  /**
   * 获取未使用的上下文文本
   */
  const getUnusedContext = useCallback((): string => {
    return contextItems
      .filter((item) => !item.used)
      .map((item) => item.text)
      .join('\n\n---\n\n');
  }, [contextItems]);

  /**
   * 获取所有上下文文本
   */
  const getAllContext = useCallback((): string => {
    return contextItems.map((item) => item.text).join('\n\n---\n\n');
  }, [contextItems]);

  /**
   * 获取格式化的上下文（用于 API 请求）
   * 包含来源信息，更适合 AI 理解
   */
  const getFormattedContext = useCallback((): string => {
    if (contextItems.length === 0) return '';

    const formatItem = (item: AIContextItem, index: number): string => {
      const sourceMap: Record<AIContextSource, string> = {
        selection: '用户选中的文本',
        file: '导入的文件内容',
        manual: '用户手动添加',
        document: '当前文档内容',
      };

      const sourceDesc = item.sourceLabel
        ? `${sourceMap[item.source]} (${item.sourceLabel})`
        : sourceMap[item.source];

      return `[上下文 ${index + 1}] ${sourceDesc}:\n${item.text}`;
    };

    return contextItems.map((item, idx) => formatItem(item, idx)).join('\n\n---\n\n');
  }, [contextItems]);

  // 计算属性
  const hasContext = contextItems.length > 0;
  const hasUnusedContext = contextItems.some((item) => !item.used);
  const contextCount = contextItems.length;
  const unusedCount = contextItems.filter((item) => !item.used).length;
  const totalCharacters = useMemo(
    () => contextItems.reduce((sum, item) => sum + item.text.length, 0),
    [contextItems]
  );

  return {
    contextItems,
    addContext,
    removeContext,
    clearContext,
    markAsUsed,
    markAllAsUsed,
    getUnusedContext,
    getAllContext,
    getFormattedContext,
    hasContext,
    hasUnusedContext,
    contextCount,
    unusedCount,
    totalCharacters,
  };
}

// 重新导出类型
export type { AIContextItem, AIContextSource } from '@/types/chat';

export default useAIContext;
