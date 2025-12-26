/**
 * useHistory Hook - 编辑器撤销/重做功能
 *
 * 提供历史记录管理，支持撤销(Undo)和重做(Redo)操作
 */

import { useState, useCallback, useRef } from 'react';

interface HistoryState {
  content: string;
  timestamp: number;
}

interface UseHistoryOptions {
  maxHistory?: number;
  debounceMs?: number;
}

interface UseHistoryReturn {
  /** 当前内容 */
  currentContent: string;
  /** 是否可以撤销 */
  canUndo: boolean;
  /** 是否可以重做 */
  canRedo: boolean;
  /** 推送新内容到历史 */
  pushHistory: (content: string) => void;
  /** 撤销操作 */
  undo: () => string | null;
  /** 重做操作 */
  redo: () => string | null;
  /** 重置历史 */
  resetHistory: (initialContent?: string) => void;
}

/**
 * 编辑器历史管理 Hook
 *
 * @param initialContent - 初始内容
 * @param options - 配置选项
 */
export function useHistory(
  initialContent: string = '',
  options: UseHistoryOptions = {}
): UseHistoryReturn {
  const { maxHistory = 100, debounceMs = 500 } = options;

  // 历史栈
  const [historyStack, setHistoryStack] = useState<HistoryState[]>([
    { content: initialContent, timestamp: Date.now() }
  ]);

  // 当前位置
  const [currentIndex, setCurrentIndex] = useState(0);

  // 防抖计时器
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef(initialContent);

  // 推送新内容到历史
  const pushHistory = useCallback((content: string) => {
    // 如果内容没变化，不记录
    if (content === lastContentRef.current) return;

    // 清除防抖计时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 防抖处理
    debounceTimerRef.current = setTimeout(() => {
      setHistoryStack(prev => {
        // 如果不在末尾，截断之后的历史
        const newStack = prev.slice(0, currentIndex + 1);

        // 添加新记录
        newStack.push({
          content,
          timestamp: Date.now()
        });

        // 限制最大历史数量
        if (newStack.length > maxHistory) {
          newStack.shift();
          return newStack;
        }

        return newStack;
      });

      setCurrentIndex(prev => {
        const newIndex = Math.min(prev + 1, maxHistory - 1);
        return newIndex;
      });

      lastContentRef.current = content;
    }, debounceMs);
  }, [currentIndex, maxHistory, debounceMs]);

  // 撤销
  const undo = useCallback((): string | null => {
    if (currentIndex <= 0) return null;

    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    const content = historyStack[newIndex]?.content ?? null;
    if (content) {
      lastContentRef.current = content;
    }
    return content;
  }, [currentIndex, historyStack]);

  // 重做
  const redo = useCallback((): string | null => {
    if (currentIndex >= historyStack.length - 1) return null;

    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    const content = historyStack[newIndex]?.content ?? null;
    if (content) {
      lastContentRef.current = content;
    }
    return content;
  }, [currentIndex, historyStack]);

  // 重置历史
  const resetHistory = useCallback((newContent?: string) => {
    const content = newContent ?? '';
    setHistoryStack([{ content, timestamp: Date.now() }]);
    setCurrentIndex(0);
    lastContentRef.current = content;
  }, []);

  return {
    currentContent: historyStack[currentIndex]?.content ?? '',
    canUndo: currentIndex > 0,
    canRedo: currentIndex < historyStack.length - 1,
    pushHistory,
    undo,
    redo,
    resetHistory,
  };
}

export default useHistory;
