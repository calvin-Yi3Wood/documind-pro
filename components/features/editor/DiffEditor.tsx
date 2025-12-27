/**
 * Diff Editor Component
 *
 * AI差异编辑可视化组件
 * - 显示原文与AI建议的对比
 * - 支持多方案选择
 * - 接受/拒绝操作
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useDiffEditor, DiffEditorState, UseDiffEditorOptions } from '@/hooks/useDiffEditor';
import { buildDiffContainer } from '@/lib/editor/aiEdit';

/**
 * 差异编辑器属性
 */
export interface DiffEditorProps {
  /** 原始文本 */
  originalText: string;
  /** AI响应内容 */
  aiResponse: string;
  /** 是否可见 */
  visible?: boolean;
  /** 接受建议回调 */
  onAccept?: (text: string) => void;
  /** 拒绝建议回调 */
  onReject?: () => void;
  /** 关闭回调 */
  onClose?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 差异编辑器组件
 *
 * 用于显示AI编辑建议的对比视图
 */
export function DiffEditor({
  originalText,
  aiResponse,
  visible = true,
  onAccept,
  onReject,
  onClose,
  className = '',
}: DiffEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const diffEditorOptions: UseDiffEditorOptions = {
    onAccept: (text) => onAccept?.(text),
    onReject: () => onReject?.(),
    onClose: () => onClose?.(),
  };

  const {
    state,
    createDiff,
    acceptSuggestion,
    rejectAll,
    closeDiff,
    reset,
  } = useDiffEditor(diffEditorOptions);

  // 初始化差异
  useEffect(() => {
    if (visible && originalText && aiResponse) {
      createDiff(originalText, aiResponse);
    }
    return () => {
      reset();
    };
  }, [visible, originalText, aiResponse, createDiff, reset]);

  // 渲染差异容器
  useEffect(() => {
    if (!containerRef.current || !state.activeDiffId || !state.suggestions.length) {
      return;
    }

    const html = buildDiffContainer({
      diffId: state.activeDiffId,
      originalText: state.originalText,
      suggestions: state.suggestions,
      showActions: true,
    });

    containerRef.current.innerHTML = html;
  }, [state.activeDiffId, state.originalText, state.suggestions]);

  // 处理按钮点击
  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      const action = target.closest('[data-action]')?.getAttribute('data-action');
      const suggestionId = target.closest('[data-suggestion-id]')?.getAttribute('data-suggestion-id');

      if (!action) return;

      switch (action) {
        case 'accept':
          if (suggestionId) {
            const text = acceptSuggestion(suggestionId);
            if (text) {
              onAccept?.(text);
            }
          }
          break;
        case 'reject':
          rejectAll();
          onReject?.();
          break;
        case 'close':
          closeDiff();
          onClose?.();
          break;
      }
    },
    [acceptSuggestion, rejectAll, closeDiff, onAccept, onReject, onClose]
  );

  if (!visible || !state.isShowingDiff) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`diff-editor-container ${className}`}
      onClick={handleClick}
    />
  );
}

/**
 * 差异编辑器样式组件
 *
 * 提供内置CSS样式
 */
export function DiffEditorStyles() {
  return (
    <style jsx global>{`
      /* 差异容器主体 */
      .ai-diff-container {
        background: linear-gradient(to bottom, #fffbf5, #fff7ed);
        border: 2px solid #e6dfd4;
        border-radius: 12px;
        margin: 12px 0;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(139, 90, 43, 0.08);
        font-family: system-ui, -apple-system, sans-serif;
      }

      /* 头部 */
      .ai-diff-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: linear-gradient(to right, #fff7ed, #fffbeb);
        border-bottom: 1px solid #e6dfd4;
        color: #5a4a36;
        font-weight: 600;
        font-size: 14px;
      }

      .ai-diff-header i {
        color: #f97316;
        font-size: 16px;
      }

      .ai-diff-close {
        margin-left: auto;
        padding: 4px 8px;
        background: transparent;
        border: none;
        color: #9c8b72;
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.2s;
      }

      .ai-diff-close:hover {
        background: #f8f2e5;
        color: #5a4a36;
      }

      /* 原文区域 */
      .ai-diff-original {
        padding: 12px 16px;
        background: #fff;
        border-bottom: 1px solid #e6dfd4;
      }

      .ai-diff-label {
        font-size: 12px;
        font-weight: 600;
        color: #7d6a51;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .ai-diff-old-text {
        font-size: 14px;
        line-height: 1.6;
        color: #473929;
        background: #fef2f2;
        padding: 12px;
        border-radius: 8px;
        border-left: 3px solid #dc2626;
        text-decoration: line-through;
        text-decoration-color: #dc2626;
        opacity: 0.8;
      }

      /* 建议区域 */
      .ai-diff-suggestions {
        padding: 12px 16px;
      }

      .ai-diff-suggestion {
        background: #fff;
        border: 1px solid #e6dfd4;
        border-radius: 8px;
        margin-bottom: 12px;
        overflow: hidden;
      }

      .ai-diff-suggestion:last-child {
        margin-bottom: 0;
      }

      .ai-diff-suggestion-label {
        font-size: 12px;
        font-weight: 600;
        color: #7d6a51;
        padding: 8px 12px;
        background: #f8f2e5;
        border-bottom: 1px solid #e6dfd4;
      }

      .ai-diff-new-text {
        font-size: 14px;
        line-height: 1.6;
        color: #473929;
        padding: 12px;
        background: #f0fdf4;
        border-left: 3px solid #22c55e;
      }

      /* 操作按钮 */
      .ai-diff-actions {
        display: flex;
        gap: 8px;
        padding: 12px;
        background: #fafafa;
        border-top: 1px solid #e6dfd4;
      }

      .ai-diff-accept {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 16px;
        background: linear-gradient(to right, #22c55e, #16a34a);
        color: #fff;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .ai-diff-accept:hover {
        background: linear-gradient(to right, #16a34a, #15803d);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
      }

      .ai-diff-reject {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 16px;
        background: #fff;
        color: #dc2626;
        border: 2px solid #fecaca;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .ai-diff-reject:hover {
        background: #fef2f2;
        border-color: #dc2626;
      }

      /* 包装器样式 */
      .ai-diff-wrapper {
        display: inline-block;
        width: 100%;
      }

      /* 响应式调整 */
      @media (max-width: 640px) {
        .ai-diff-container {
          margin: 8px 0;
          border-radius: 8px;
        }

        .ai-diff-header {
          padding: 10px 12px;
          font-size: 13px;
        }

        .ai-diff-original,
        .ai-diff-suggestions {
          padding: 10px 12px;
        }

        .ai-diff-actions {
          flex-direction: column;
        }
      }
    `}</style>
  );
}

/**
 * 内联差异编辑器
 *
 * 直接在编辑器中显示差异对比
 */
export interface InlineDiffEditorProps extends UseDiffEditorOptions {
  /** 编辑器元素引用 */
  editorRef: React.RefObject<HTMLElement>;
}

export function useInlineDiffEditor(props: InlineDiffEditorProps) {
  const diffEditor = useDiffEditor(props);

  /**
   * 在当前选区插入AI差异对比
   */
  const insertAIDiff = useCallback(
    (aiResponse: string): string | null => {
      if (!props.editorRef.current) {
        console.warn('[InlineDiffEditor] Editor ref is not available');
        return null;
      }

      return diffEditor.insertDiffAtSelection(props.editorRef.current, aiResponse);
    },
    [diffEditor, props.editorRef]
  );

  return {
    ...diffEditor,
    insertAIDiff,
  };
}

export default DiffEditor;
