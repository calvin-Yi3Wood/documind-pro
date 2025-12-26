/**
 * useEditorState Hook - 编辑器状态管理
 *
 * 统一管理编辑器的各种状态和配置
 */

import { useState, useCallback } from 'react';

// 文档大纲节点
interface OutlineNode {
  id: string;
  text: string;
  level: number;
  children: OutlineNode[];
}

// 文档统计
interface DocumentStats {
  chars: number;
  charsNoSpace: number;
  words: number;
  paragraphs: number;
}

// 编辑器配置
interface EditorConfig {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  pageMargin: number;
  zoomLevel: number;
}

interface UseEditorStateReturn {
  // 文档信息
  title: string;
  setTitle: (title: string) => void;

  // 配置
  config: EditorConfig;
  setFontFamily: (font: string) => void;
  setFontSize: (size: string) => void;
  setLineHeight: (height: string) => void;
  setPageMargin: (margin: number) => void;
  setZoomLevel: (zoom: number) => void;

  // 大纲
  outline: OutlineNode[];
  updateOutline: (editorElement: HTMLElement) => void;

  // 统计
  stats: DocumentStats;
  updateStats: (content: string) => void;

  // UI状态
  showOutline: boolean;
  setShowOutline: (show: boolean) => void;
  isPanMode: boolean;
  setIsPanMode: (pan: boolean) => void;
}

const DEFAULT_CONFIG: EditorConfig = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: '16px',
  lineHeight: '1.8',
  pageMargin: 48,
  zoomLevel: 100,
};

/**
 * 编辑器状态管理 Hook
 *
 * @param initialTitle - 初始标题
 */
export function useEditorState(initialTitle: string = ''): UseEditorStateReturn {
  // 文档标题
  const [title, setTitle] = useState(initialTitle);

  // 编辑器配置
  const [config, setConfig] = useState<EditorConfig>(DEFAULT_CONFIG);

  // 大纲数据
  const [outline, setOutline] = useState<OutlineNode[]>([]);

  // 文档统计
  const [stats, setStats] = useState<DocumentStats>({
    chars: 0,
    charsNoSpace: 0,
    words: 0,
    paragraphs: 0,
  });

  // UI状态
  const [showOutline, setShowOutline] = useState(true);
  const [isPanMode, setIsPanMode] = useState(false);

  // 配置更新函数
  const setFontFamily = useCallback((font: string) => {
    setConfig(prev => ({ ...prev, fontFamily: font }));
  }, []);

  const setFontSize = useCallback((size: string) => {
    setConfig(prev => ({ ...prev, fontSize: size }));
  }, []);

  const setLineHeight = useCallback((height: string) => {
    setConfig(prev => ({ ...prev, lineHeight: height }));
  }, []);

  const setPageMargin = useCallback((margin: number) => {
    setConfig(prev => ({ ...prev, pageMargin: margin }));
  }, []);

  const setZoomLevel = useCallback((zoom: number) => {
    setConfig(prev => ({ ...prev, zoomLevel: zoom }));
  }, []);

  // 更新大纲
  const updateOutline = useCallback((editorElement: HTMLElement) => {
    const elements = Array.from(
      editorElement.querySelectorAll('h1, h2, h3, h4, h5, h6')
    );

    const headers: { id: string; text: string; level: number }[] = [];

    elements.forEach((el, index) => {
      const element = el as HTMLElement;
      const text = element.innerText.trim();
      if (!text || text.length > 100) return;

      const tagName = element.tagName.toLowerCase();
      const level = parseInt(tagName.charAt(1), 10);

      // 确保有 ID
      if (!element.id) {
        element.id = `heading-${Date.now()}-${index}`;
      }

      headers.push({
        id: element.id,
        text,
        level,
      });
    });

    // 构建树形结构
    const rootNodes: OutlineNode[] = [];
    const stack: OutlineNode[] = [];

    headers.forEach((h) => {
      const node: OutlineNode = {
        id: h.id,
        text: h.text,
        level: h.level,
        children: [],
      };

      while (stack.length > 0) {
        const last = stack[stack.length - 1];
        if (last && last.level >= h.level) {
          stack.pop();
        } else {
          break;
        }
      }

      if (stack.length === 0) {
        rootNodes.push(node);
      } else {
        const parent = stack[stack.length - 1];
        if (parent) {
          parent.children.push(node);
        }
      }
      stack.push(node);
    });

    setOutline(rootNodes);
  }, []);

  // 更新统计
  const updateStats = useCallback((content: string) => {
    // 移除HTML标签
    const text = content.replace(/<[^>]*>/g, '');

    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;

    // 中文字数 + 英文单词数
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const words = chineseChars + englishWords;

    // 段落数
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0).length;

    setStats({ chars, charsNoSpace, words, paragraphs });
  }, []);

  return {
    title,
    setTitle,
    config,
    setFontFamily,
    setFontSize,
    setLineHeight,
    setPageMargin,
    setZoomLevel,
    outline,
    updateOutline,
    stats,
    updateStats,
    showOutline,
    setShowOutline,
    isPanMode,
    setIsPanMode,
  };
}

export default useEditorState;
