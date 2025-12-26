/**
 * useSelection Hook - 编辑器选区管理
 *
 * 提供文本选区的检测、获取和操作功能
 */

import { useState, useCallback, useEffect, RefObject } from 'react';

interface SelectionInfo {
  /** 选中的文本 */
  text: string;
  /** 选区是否有效 */
  hasSelection: boolean;
  /** 选区位置（用于定位浮动工具栏） */
  position: { top: number; left: number } | null;
  /** 当前激活的格式 */
  activeFormats: string[];
}

interface UseSelectionReturn extends SelectionInfo {
  /** 更新选区信息 */
  updateSelection: () => void;
  /** 清除选区 */
  clearSelection: () => void;
  /** 获取选区的字数统计 */
  getSelectionStats: () => { chars: number; words: number };
}

/**
 * 编辑器选区管理 Hook
 *
 * @param editorRef - 编辑器 DOM 引用
 */
export function useSelection(
  editorRef: RefObject<HTMLDivElement>
): UseSelectionReturn {
  const [text, setText] = useState('');
  const [hasSelection, setHasSelection] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);

  // 检测当前选区的格式
  const detectActiveFormats = useCallback((): string[] => {
    const formats: string[] = [];

    try {
      if (document.queryCommandState('bold')) formats.push('bold');
      if (document.queryCommandState('italic')) formats.push('italic');
      if (document.queryCommandState('underline')) formats.push('underline');
      if (document.queryCommandState('strikeThrough')) formats.push('strikeThrough');
      if (document.queryCommandState('insertOrderedList')) formats.push('orderedList');
      if (document.queryCommandState('insertUnorderedList')) formats.push('unorderedList');

      // 检测标题
      const formatBlock = document.queryCommandValue('formatBlock');
      if (formatBlock) {
        const tag = formatBlock.toLowerCase();
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
          formats.push(tag);
        }
        if (tag === 'blockquote') formats.push('blockquote');
        if (tag === 'pre') formats.push('code');
      }

      // 检测对齐方式
      if (document.queryCommandValue('justifyLeft') === 'true') formats.push('alignLeft');
      if (document.queryCommandValue('justifyCenter') === 'true') formats.push('alignCenter');
      if (document.queryCommandValue('justifyRight') === 'true') formats.push('alignRight');
    } catch {
      // 忽略错误
    }

    return formats;
  }, []);

  // 更新选区信息
  const updateSelection = useCallback(() => {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      setText('');
      setHasSelection(false);
      setPosition(null);
      setActiveFormats([]);
      return;
    }

    const selectedText = selection.toString().trim();

    if (!selectedText) {
      setText('');
      setHasSelection(false);
      setPosition(null);
      // 仍然更新格式，即使没有选中文本
      setActiveFormats(detectActiveFormats());
      return;
    }

    // 确保选区在编辑器内
    if (editorRef.current) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const isInEditor = editorRef.current.contains(container);

      if (!isInEditor) {
        setText('');
        setHasSelection(false);
        setPosition(null);
        return;
      }
    }

    setText(selectedText);
    setHasSelection(true);

    // 计算选区位置
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setPosition({
      top: rect.top + window.scrollY - 40, // 浮动工具栏在选区上方
      left: rect.left + window.scrollX + rect.width / 2, // 居中
    });

    setActiveFormats(detectActiveFormats());
  }, [editorRef, detectActiveFormats]);

  // 清除选区
  const clearSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
    setText('');
    setHasSelection(false);
    setPosition(null);
  }, []);

  // 获取选区字数统计
  const getSelectionStats = useCallback(() => {
    if (!text) return { chars: 0, words: 0 };

    const chars = text.length;
    // 中文字数 + 英文单词数
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const words = chineseChars + englishWords;

    return { chars, words };
  }, [text]);

  // 监听选区变化
  useEffect(() => {
    const handleSelectionChange = () => {
      // 使用 requestAnimationFrame 防止频繁更新
      requestAnimationFrame(updateSelection);
    };

    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [updateSelection]);

  return {
    text,
    hasSelection,
    position,
    activeFormats,
    updateSelection,
    clearSelection,
    getSelectionStats,
  };
}

export default useSelection;
