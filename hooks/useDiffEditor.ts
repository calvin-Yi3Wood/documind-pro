/**
 * Diff Editor Hook
 *
 * 管理AI差异编辑状态和操作
 * - 创建/销毁差异对比容器
 * - 处理接受/拒绝建议
 * - 选区保存恢复
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SavedSelection,
  DiffContainerConfig,
  saveSelection,
  restoreSelection,
  findTextInEditor,
  buildDiffContainer,
  handleAcceptSuggestion,
  removeDiffContainer,
  generateDiffId,
  parseMultipleSuggestions,
  cleanAIContent,
} from '@/lib/editor/aiEdit';

/**
 * 差异编辑状态
 */
export interface DiffEditorState {
  /** 当前差异ID */
  activeDiffId: string | null;
  /** 保存的选区 */
  savedSelection: SavedSelection | null;
  /** 是否正在显示差异 */
  isShowingDiff: boolean;
  /** 原始文本 */
  originalText: string;
  /** AI建议列表 */
  suggestions: string[];
}

/**
 * 差异编辑器Hook返回值
 */
export interface UseDiffEditorReturn {
  /** 当前状态 */
  state: DiffEditorState;
  /** 创建差异对比 */
  createDiff: (originalText: string, aiResponse: string) => string | null;
  /** 接受建议 */
  acceptSuggestion: (suggestionId: string) => string | null;
  /** 拒绝所有建议 */
  rejectAll: () => void;
  /** 关闭差异面板 */
  closeDiff: () => void;
  /** 保存当前选区 */
  saveCurrentSelection: () => SavedSelection | null;
  /** 恢复选区 */
  restoreToSelection: () => boolean;
  /** 在编辑器中插入差异容器 */
  insertDiffAtSelection: (editorElement: HTMLElement, aiResponse: string) => string | null;
  /** 清理所有状态 */
  reset: () => void;
}

/**
 * 差异编辑器配置
 */
export interface UseDiffEditorOptions {
  /** 编辑器元素引用 */
  editorRef?: React.RefObject<HTMLElement>;
  /** 接受建议后的回调 */
  onAccept?: (text: string, diffId: string) => void;
  /** 拒绝建议后的回调 */
  onReject?: (diffId: string) => void;
  /** 关闭差异面板后的回调 */
  onClose?: (diffId: string) => void;
}

/**
 * AI差异编辑Hook
 *
 * @param options - 配置选项
 * @returns 差异编辑器控制接口
 */
export function useDiffEditor(options: UseDiffEditorOptions = {}): UseDiffEditorReturn {
  const { editorRef, onAccept, onReject, onClose } = options;

  // 状态管理
  const [state, setState] = useState<DiffEditorState>({
    activeDiffId: null,
    savedSelection: null,
    isShowingDiff: false,
    originalText: '',
    suggestions: [],
  });

  // 用于存储差异容器配置
  const diffConfigRef = useRef<Map<string, DiffContainerConfig>>(new Map());

  /**
   * 保存当前选区
   */
  const saveCurrentSelection = useCallback((): SavedSelection | null => {
    const selection = saveSelection();
    if (selection) {
      setState((prev) => ({ ...prev, savedSelection: selection }));
    }
    return selection;
  }, []);

  /**
   * 恢复选区
   */
  const restoreToSelection = useCallback((): boolean => {
    if (!state.savedSelection || !editorRef?.current) {
      return false;
    }
    return restoreSelection(state.savedSelection, editorRef.current);
  }, [state.savedSelection, editorRef]);

  /**
   * 创建差异对比
   */
  const createDiff = useCallback(
    (originalText: string, aiResponse: string): string | null => {
      if (!originalText || !aiResponse) {
        return null;
      }

      // 清理并解析AI响应
      const cleanedResponse = cleanAIContent(aiResponse);
      const suggestions = parseMultipleSuggestions(cleanedResponse);

      if (suggestions.length === 0) {
        return null;
      }

      // 生成差异ID
      const diffId = generateDiffId();

      // 创建配置
      const config: DiffContainerConfig = {
        diffId,
        originalText,
        suggestions,
        showActions: true,
      };

      // 保存配置
      diffConfigRef.current.set(diffId, config);

      // 更新状态
      setState({
        activeDiffId: diffId,
        savedSelection: state.savedSelection,
        isShowingDiff: true,
        originalText,
        suggestions,
      });

      return diffId;
    },
    [state.savedSelection]
  );

  /**
   * 在编辑器中插入差异容器
   */
  const insertDiffAtSelection = useCallback(
    (editorElement: HTMLElement, aiResponse: string): string | null => {
      // 先保存选区
      const selection = saveSelection();
      if (!selection) {
        console.warn('[useDiffEditor] No selection to insert diff');
        return null;
      }

      // 创建差异
      const diffId = createDiff(selection.text, aiResponse);
      if (!diffId) {
        return null;
      }

      // 获取配置
      const config = diffConfigRef.current.get(diffId);
      if (!config) {
        return null;
      }

      // 构建HTML
      const diffHtml = buildDiffContainer(config);

      // 查找选区位置
      const range = findTextInEditor(
        editorElement,
        selection.text,
        selection.contextBefore,
        selection.contextAfter
      );

      if (!range) {
        console.warn('[useDiffEditor] Could not find selection text in editor');
        return diffId;
      }

      // 在选区位置插入差异容器（替换原文）
      const wrapper = document.createElement('span');
      wrapper.className = 'ai-diff-wrapper';
      wrapper.setAttribute('data-diff-id', diffId);
      wrapper.innerHTML = diffHtml;

      range.deleteContents();
      range.insertNode(wrapper);

      // 更新状态
      setState((prev) => ({
        ...prev,
        savedSelection: selection,
        isShowingDiff: true,
      }));

      return diffId;
    },
    [createDiff]
  );

  /**
   * 接受建议
   */
  const acceptSuggestion = useCallback(
    (suggestionId: string): string | null => {
      if (!state.activeDiffId) {
        return null;
      }

      // 查找容器
      const container = document.querySelector(
        `[data-diff-id="${state.activeDiffId}"]`
      ) as HTMLElement;
      if (!container) {
        return null;
      }

      // 获取建议文本
      const acceptedText = handleAcceptSuggestion(container, suggestionId);
      if (!acceptedText) {
        return null;
      }

      // 用文本替换整个差异容器
      const wrapper = container.closest('.ai-diff-wrapper') || container;
      const textNode = document.createTextNode(acceptedText);
      wrapper.parentNode?.replaceChild(textNode, wrapper);

      // 触发回调
      onAccept?.(acceptedText, state.activeDiffId);

      // 清理状态
      diffConfigRef.current.delete(state.activeDiffId);
      setState({
        activeDiffId: null,
        savedSelection: null,
        isShowingDiff: false,
        originalText: '',
        suggestions: [],
      });

      return acceptedText;
    },
    [state.activeDiffId, onAccept]
  );

  /**
   * 拒绝所有建议，恢复原文
   */
  const rejectAll = useCallback(() => {
    if (!state.activeDiffId) {
      return;
    }

    // 查找容器
    const container = document.querySelector(
      `[data-diff-id="${state.activeDiffId}"]`
    ) as HTMLElement;

    if (container) {
      // 恢复原文
      const wrapper = container.closest('.ai-diff-wrapper') || container;
      const textNode = document.createTextNode(state.originalText);
      wrapper.parentNode?.replaceChild(textNode, wrapper);
    }

    // 触发回调
    onReject?.(state.activeDiffId);

    // 清理状态
    diffConfigRef.current.delete(state.activeDiffId);
    setState({
      activeDiffId: null,
      savedSelection: null,
      isShowingDiff: false,
      originalText: '',
      suggestions: [],
    });
  }, [state.activeDiffId, state.originalText, onReject]);

  /**
   * 关闭差异面板
   */
  const closeDiff = useCallback(() => {
    if (!state.activeDiffId) {
      return;
    }

    // 移除容器，恢复原文
    const container = document.querySelector(
      `[data-diff-id="${state.activeDiffId}"]`
    ) as HTMLElement;

    if (container) {
      const wrapper = container.closest('.ai-diff-wrapper') || container;
      const textNode = document.createTextNode(state.originalText);
      wrapper.parentNode?.replaceChild(textNode, wrapper);
    }

    // 触发回调
    onClose?.(state.activeDiffId);

    // 清理状态
    diffConfigRef.current.delete(state.activeDiffId);
    setState({
      activeDiffId: null,
      savedSelection: null,
      isShowingDiff: false,
      originalText: '',
      suggestions: [],
    });
  }, [state.activeDiffId, state.originalText, onClose]);

  /**
   * 重置所有状态
   */
  const reset = useCallback(() => {
    // 移除所有差异容器
    diffConfigRef.current.forEach((_, diffId) => {
      removeDiffContainer(diffId);
    });

    diffConfigRef.current.clear();
    setState({
      activeDiffId: null,
      savedSelection: null,
      isShowingDiff: false,
      originalText: '',
      suggestions: [],
    });
  }, []);

  // 绑定全局事件处理
  useEffect(() => {
    const handleDiffAction = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const action = target.closest('[data-action]')?.getAttribute('data-action');
      const suggestionId = target.closest('[data-suggestion-id]')?.getAttribute('data-suggestion-id');

      if (!action) return;

      switch (action) {
        case 'accept':
          if (suggestionId) {
            acceptSuggestion(suggestionId);
          }
          break;
        case 'reject':
          rejectAll();
          break;
        case 'close':
          closeDiff();
          break;
      }
    };

    // 监听差异容器内的点击事件
    document.addEventListener('click', handleDiffAction);

    return () => {
      document.removeEventListener('click', handleDiffAction);
    };
  }, [acceptSuggestion, rejectAll, closeDiff]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      diffConfigRef.current.forEach((_, diffId) => {
        removeDiffContainer(diffId);
      });
      diffConfigRef.current.clear();
    };
  }, []);

  return {
    state,
    createDiff,
    acceptSuggestion,
    rejectAll,
    closeDiff,
    saveCurrentSelection,
    restoreToSelection,
    insertDiffAtSelection,
    reset,
  };
}

export default useDiffEditor;
