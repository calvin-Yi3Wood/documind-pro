/**
 * VisualPanel - 可视化面板组件 (完整版)
 *
 * 功能特性:
 * - ECharts 图表 (echarts)
 * - D3.js 思维导图 (mindmap with Mermaid format)
 * - 流程图 (flowchart)
 * - Mermaid 图表 (mermaid)
 * - 节点点击交互 + AI 解释
 * - NodeDetailPanel (可拖拽/调整大小)
 * - 全屏模式
 * - 8方向面板调整大小
 */

'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import dynamic from 'next/dynamic';
import type { EChartsOption } from 'echarts';

// 动态导入 ECharts 避免 SSR 问题
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

// ============================================
// 类型定义
// ============================================

/**
 * 可视化数据类型
 */
interface VisualData {
  type: 'mindmap' | 'flowchart' | 'mermaid' | 'echarts';
  title: string;
  content: string;
  rawCode?: string;
  /** ECharts 配置 */
  echartsOption?: EChartsOption;
  /** Mermaid 格式的思维导图配置（触发 D3.js 渲染） */
  config?: string;
}

interface VisualPanelProps {
  data: VisualData | null;
  onClose: () => void;
  onInsertToDocument?: (imageDataUrl: string, title: string) => void;
  documentContent?: string;
  onNodeClick?: (nodeName: string, explanation: string) => void;
}

interface NodeDetailPanelProps {
  nodeName: string;
  isLoading: boolean;
  explanation: string;
  relatedContent: string;
  onClose: () => void;
  position: { x: number; y: number };
  documentContent?: string;
  onAskQuestion?: (question: string) => Promise<string>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface MindmapNode {
  name: string;
  children: MindmapNode[];
  level: number;
  parent?: MindmapNode;
  x?: number;
  y?: number;
}

// ============================================
// Markdown 渲染函数
// ============================================

/**
 * 简单的 Markdown 渲染（用于 AI 解释内容）
 */
function renderMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let codeLanguage = '';

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc pl-6 my-2 space-y-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-bronze-700">{formatInlineText(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const flushCode = () => {
    if (codeContent.length > 0) {
      elements.push(
        <pre key={`code-${elements.length}`} className="bg-bronze-100 p-3 rounded-lg my-2 overflow-x-auto">
          <code className={`language-${codeLanguage} text-sm text-bronze-800`}>
            {codeContent.join('\n')}
          </code>
        </pre>
      );
      codeContent = [];
      codeLanguage = '';
    }
  };

  // 处理行内格式
  const formatInlineText = (text: string): React.ReactNode => {
    // 处理粗体 **text** 或 __text__
    let result: React.ReactNode[] = [];
    const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/);

    parts.forEach((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        result.push(<strong key={idx}>{part.slice(2, -2)}</strong>);
      } else if (part.startsWith('__') && part.endsWith('__')) {
        result.push(<strong key={idx}>{part.slice(2, -2)}</strong>);
      } else if (part.startsWith('`') && part.endsWith('`')) {
        result.push(
          <code key={idx} className="bg-bronze-100 px-1 py-0.5 rounded text-sm text-orange-600">
            {part.slice(1, -1)}
          </code>
        );
      } else if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
        result.push(<em key={idx}>{part.slice(1, -1)}</em>);
      } else {
        result.push(part);
      }
    });

    return result.length === 1 ? result[0] : <>{result}</>;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // 代码块处理
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim() || 'text';
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // 标题处理
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-bold text-bronze-800 mt-4 mb-2">
          {formatInlineText(line.slice(4))}
        </h3>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${i}`} className="text-lg font-bold text-bronze-800 mt-4 mb-2">
          {formatInlineText(line.slice(3))}
        </h2>
      );
      continue;
    }

    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={`h1-${i}`} className="text-xl font-bold text-bronze-800 mt-4 mb-2">
          {formatInlineText(line.slice(2))}
        </h1>
      );
      continue;
    }

    // 列表处理
    if (line.match(/^[-*•]\s+/)) {
      listItems.push(line.replace(/^[-*•]\s+/, ''));
      continue;
    }

    if (line.match(/^\d+\.\s+/)) {
      // 有序列表
      if (listItems.length === 0 || !lines[i - 1]?.match(/^\d+\.\s+/)) {
        flushList();
      }
      listItems.push(line.replace(/^\d+\.\s+/, ''));
      continue;
    }

    // 普通段落
    flushList();

    if (line.trim()) {
      elements.push(
        <p key={`p-${i}`} className="text-bronze-700 my-2 leading-relaxed">
          {formatInlineText(line)}
        </p>
      );
    }
  }

  flushList();
  flushCode();

  return elements;
}

// ============================================
// NodeDetailPanel 组件
// ============================================

/**
 * 节点详情面板 - 显示 AI 解释和原文引用
 */
const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({
  nodeName,
  isLoading,
  explanation,
  relatedContent,
  onClose,
  position,
  documentContent: _documentContent,
  onAskQuestion,
}) => {
  // _documentContent 可用于未来扩展，如传递给 AI 进行更详细的上下文分析
  void _documentContent;
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [panelSize, setPanelSize] = useState({ width: 480, height: 500 });
  const [panelPosition, setPanelPosition] = useState(position);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [startSize, setStartSize] = useState({ width: 480, height: 500 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 滚动到底部
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, explanation]);

  // 初始化位置
  useEffect(() => {
    setPanelPosition(position);
  }, [position]);

  // 拖拽处理
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - panelPosition.x,
      y: e.clientY - panelPosition.y,
    });
    e.preventDefault();
  }, [panelPosition]);

  // 调整大小处理
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    setIsResizing(true);
    setResizeDirection(direction);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartSize({ ...panelSize });
    e.preventDefault();
    e.stopPropagation();
  }, [panelSize]);

  // 鼠标移动和释放
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - panelSize.width));
        const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - panelSize.height));
        setPanelPosition({ x: newX, y: newY });
      }

      if (isResizing && resizeDirection) {
        const dx = e.clientX - startPos.x;
        const dy = e.clientY - startPos.y;
        let newWidth = startSize.width;
        let newHeight = startSize.height;

        if (resizeDirection.includes('e')) newWidth = Math.max(360, Math.min(startSize.width + dx, window.innerWidth - panelPosition.x));
        if (resizeDirection.includes('w')) {
          newWidth = Math.max(360, startSize.width - dx);
          setPanelPosition(prev => ({ ...prev, x: Math.max(0, startPos.x + startSize.width - newWidth - dragOffset.x + dx) }));
        }
        if (resizeDirection.includes('s')) newHeight = Math.max(300, Math.min(startSize.height + dy, window.innerHeight - panelPosition.y));
        if (resizeDirection.includes('n')) {
          newHeight = Math.max(300, startSize.height - dy);
          setPanelPosition(prev => ({ ...prev, y: Math.max(0, startPos.y + startSize.height - newHeight - dragOffset.y + dy) }));
        }

        setPanelSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection(null);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [isDragging, isResizing, dragOffset, resizeDirection, startPos, startSize, panelSize, panelPosition]);

  // 追问处理
  const handleAskFollowUp = async () => {
    if (!inputValue.trim() || !onAskQuestion) return;

    const question = inputValue.trim();
    setInputValue('');
    setChatMessages(prev => [...prev, { role: 'user', content: question }]);
    setIsAsking(true);

    try {
      const answer = await onAskQuestion(question);
      setChatMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '抱歉，无法获取回答。请稍后重试。' }]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div
      ref={panelRef}
      className="fixed z-[100] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden select-none"
      style={{
        left: panelPosition.x,
        top: panelPosition.y,
        width: panelSize.width,
        height: panelSize.height,
      }}
    >
      {/* 调整大小手柄 */}
      {['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(dir => (
        <div
          key={dir}
          className={`resize-handle absolute ${
            dir === 'n' ? 'top-0 left-2 right-2 h-1 cursor-n-resize' :
            dir === 's' ? 'bottom-0 left-2 right-2 h-1 cursor-s-resize' :
            dir === 'e' ? 'right-0 top-2 bottom-2 w-1 cursor-e-resize' :
            dir === 'w' ? 'left-0 top-2 bottom-2 w-1 cursor-w-resize' :
            dir === 'ne' ? 'top-0 right-0 w-3 h-3 cursor-ne-resize' :
            dir === 'nw' ? 'top-0 left-0 w-3 h-3 cursor-nw-resize' :
            dir === 'se' ? 'bottom-0 right-0 w-3 h-3 cursor-se-resize' :
            'bottom-0 left-0 w-3 h-3 cursor-sw-resize'
          } z-10 hover:bg-orange-200/30`}
          onMouseDown={(e) => handleResizeStart(e, dir)}
        />
      ))}

      {/* 头部 - 可拖拽 */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-400/20 via-amber-400/20 to-orange-400/20 border-b border-white/30 cursor-move"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
            <i className="fas fa-lightbulb text-white text-sm" />
          </div>
          <div>
            <h3 className="font-bold text-bronze-800 text-sm truncate max-w-[280px]">
              {nodeName}
            </h3>
            <span className="text-xs text-bronze-500">节点详情</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-bronze-100 hover:bg-bronze-200 flex items-center justify-center transition-colors"
        >
          <i className="fas fa-times text-bronze-600 text-xs" />
        </button>
      </div>

      {/* 内容区域 */}
      <div
        ref={chatContainerRef}
        className="overflow-y-auto p-4 space-y-4"
        style={{ height: panelSize.height - 140 }}
      >
        {/* 原文引用 */}
        {relatedContent && (
          <div className="bg-amber-50/80 rounded-xl p-3 border border-amber-200/50">
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-quote-left text-amber-500 text-xs" />
              <span className="text-xs font-medium text-amber-700">原文引用</span>
            </div>
            <p className="text-sm text-bronze-700 leading-relaxed line-clamp-4">
              {relatedContent}
            </p>
          </div>
        )}

        {/* AI 解释 */}
        <div className="bg-gradient-to-br from-orange-50/50 to-amber-50/50 rounded-xl p-4 border border-orange-200/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
              <i className="fas fa-robot text-white text-xs" />
            </div>
            <span className="text-sm font-medium text-bronze-700">AI 解释</span>
            {isLoading && (
              <i className="fas fa-spinner fa-spin text-orange-500 text-sm" />
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-bronze-500 text-sm">
              <span>正在分析...</span>
            </div>
          ) : explanation ? (
            <div className="prose prose-sm max-w-none">
              {renderMarkdown(explanation)}
            </div>
          ) : (
            <p className="text-bronze-500 text-sm">暂无解释</p>
          )}
        </div>

        {/* 追问对话 */}
        {chatMessages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                  : 'bg-bronze-100 text-bronze-800'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none">
                  {renderMarkdown(msg.content)}
                </div>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isAsking && (
          <div className="flex justify-start">
            <div className="bg-bronze-100 rounded-xl px-4 py-2 text-bronze-600 text-sm">
              <i className="fas fa-spinner fa-spin mr-2" />
              思考中...
            </div>
          </div>
        )}
      </div>

      {/* 追问输入框 */}
      {onAskQuestion && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-white/90 backdrop-blur border-t border-bronze-200/50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAskFollowUp()}
              placeholder="追问关于这个节点..."
              className="flex-1 px-3 py-2 text-sm border border-bronze-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50"
              disabled={isAsking}
            />
            <button
              onClick={handleAskFollowUp}
              disabled={!inputValue.trim() || isAsking}
              className="w-9 h-9 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:from-orange-600 hover:to-amber-600 transition-all"
            >
              <i className="fas fa-paper-plane text-sm" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// VisualPanel 主组件
// ============================================

/**
 * 可视化面板组件
 */
const VisualPanel: React.FC<VisualPanelProps> = ({
  data,
  onClose,
  onInsertToDocument,
  documentContent,
  onNodeClick,
}) => {
  // 基础状态
  const [scale, setScale] = useState(1);
  const [showCode, setShowCode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 面板调整大小状态
  const [panelSize, setPanelSize] = useState({ width: 900, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 900, height: 600 });

  // 节点详情状态
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodeExplanation, setNodeExplanation] = useState('');
  const [relatedContent, setRelatedContent] = useState('');
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [nodeDetailPosition, setNodeDetailPosition] = useState({ x: 0, y: 0 });

  // refs
  const chartInstanceRef = useRef<any>(null);
  const d3ContainerRef = useRef<HTMLDivElement>(null);

  // 检测是否应该使用 D3.js 渲染
  const shouldUseD3 = useMemo(() => {
    if (data?.type !== 'mindmap') return false;
    if (!data?.config) return false;
    // 检测 Mermaid 格式
    const config = data.config.trim();
    return config.startsWith('mindmap') || config.includes('root((') || config.includes('root(');
  }, [data]);

  // ============================================
  // 面板调整大小
  // ============================================

  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    if (isFullscreen) return;
    setIsResizing(true);
    setResizeDirection(direction);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartSize({ ...panelSize });
    e.preventDefault();
  }, [panelSize, isFullscreen]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizeDirection) return;

      const dx = e.clientX - startPos.x;
      const dy = e.clientY - startPos.y;
      let newWidth = startSize.width;
      let newHeight = startSize.height;

      if (resizeDirection.includes('e')) newWidth = Math.max(600, Math.min(startSize.width + dx, window.innerWidth - 100));
      if (resizeDirection.includes('w')) newWidth = Math.max(600, startSize.width - dx);
      if (resizeDirection.includes('s')) newHeight = Math.max(400, Math.min(startSize.height + dy, window.innerHeight - 100));
      if (resizeDirection.includes('n')) newHeight = Math.max(400, startSize.height - dy);

      setPanelSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection(null);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [isResizing, resizeDirection, startPos, startSize]);

  // ============================================
  // 全屏切换
  // ============================================

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // ESC 退出全屏
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedNode) {
          setSelectedNode(null);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, selectedNode]);

  // ============================================
  // AI 节点解释
  // ============================================

  const generateNodeExplanation = async (nodeName: string, context: string): Promise<string> => {
    try {
      const response = await fetch('/api/ai/explain-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeName,
          context,
          documentContent: documentContent || '',
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const result = await response.json();
      return result.explanation || '无法生成解释';
    } catch (error) {
      console.error('Generate explanation failed:', error);
      return '抱歉，无法生成解释。请检查网络连接或稍后重试。';
    }
  };

  const handleNodeClick = useCallback(async (nodeName: string, clickPosition: { x: number; y: number }) => {
    setSelectedNode(nodeName);
    setNodeDetailPosition({
      x: Math.min(clickPosition.x + 20, window.innerWidth - 500),
      y: Math.min(clickPosition.y - 50, window.innerHeight - 550),
    });
    setIsLoadingExplanation(true);
    setNodeExplanation('');
    setRelatedContent('');

    // 从文档中检索相关段落
    let relatedParagraph = '';
    if (documentContent) {
      const paragraphs = documentContent.split(/\n\n+/);
      const nodeKeywords = nodeName.toLowerCase().split(/\s+/);

      for (const para of paragraphs) {
        const paraLower = para.toLowerCase();
        const matchCount = nodeKeywords.filter(kw => paraLower.includes(kw)).length;
        if (matchCount >= Math.ceil(nodeKeywords.length / 2)) {
          relatedParagraph = para.slice(0, 300) + (para.length > 300 ? '...' : '');
          break;
        }
      }
    }
    setRelatedContent(relatedParagraph);

    // 生成 AI 解释
    const explanation = await generateNodeExplanation(nodeName, relatedParagraph);
    setNodeExplanation(explanation);
    setIsLoadingExplanation(false);

    // 触发外部回调
    if (onNodeClick) {
      onNodeClick(nodeName, explanation);
    }
  }, [documentContent, onNodeClick]);

  const handleAskFollowUp = useCallback(async (question: string): Promise<string> => {
    try {
      const response = await fetch('/api/ai/explain-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeName: selectedNode,
          context: relatedContent,
          documentContent: documentContent || '',
          followUpQuestion: question,
          previousExplanation: nodeExplanation,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const result = await response.json();
      return result.explanation || '无法回答问题';
    } catch (error) {
      console.error('Follow-up question failed:', error);
      return '抱歉，无法回答问题。请稍后重试。';
    }
  }, [selectedNode, relatedContent, documentContent, nodeExplanation]);

  // ============================================
  // D3.js 思维导图渲染
  // ============================================

  useEffect(() => {
    if (!shouldUseD3 || !d3ContainerRef.current || !data?.config) return;

    // 动态加载 D3
    const loadD3AndRender = async () => {
      // 检查 D3 是否已加载
      if (!(window as any).d3) {
        const script = document.createElement('script');
        script.src = 'https://d3js.org/d3.v7.min.js';
        script.async = true;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      renderD3Mindmap();
    };

    loadD3AndRender();
  }, [shouldUseD3, data?.config, isFullscreen, panelSize]);

  const renderD3Mindmap = useCallback(() => {
    if (!d3ContainerRef.current || !data?.config) return;

    const d3 = (window as any).d3;
    if (!d3) return;

    // 清除旧内容
    d3.select(d3ContainerRef.current).selectAll('*').remove();

    const containerRect = d3ContainerRef.current.getBoundingClientRect();
    const width = containerRect.width || 800;
    const height = containerRect.height || 500;

    // 创建 SVG
    const svg = d3.select(d3ContainerRef.current)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`);

    // 添加缩放
    const g = svg.append('g');
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event: any) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // 解析 Mermaid 格式
    const rootNode = parseMermaidMindmap(data.config);
    if (!rootNode) return;

    // 计算布局
    const centerX = width / 2;
    const centerY = height / 2;
    rootNode.x = centerX;
    rootNode.y = centerY;

    // 左右分布子节点
    const leftChildren = rootNode.children.filter((_, i) => i % 2 === 0);
    const rightChildren = rootNode.children.filter((_, i) => i % 2 === 1);

    layoutBranch(leftChildren, centerX - 180, centerY, -1, 0, height);
    layoutBranch(rightChildren, centerX + 180, centerY, 1, 0, height);

    // 收集所有节点
    const allNodes: MindmapNode[] = [];
    const collectNodes = (node: MindmapNode) => {
      allNodes.push(node);
      node.children.forEach(collectNodes);
    };
    collectNodes(rootNode);

    // 收集所有连线
    const links: { source: MindmapNode; target: MindmapNode }[] = [];
    const collectLinks = (node: MindmapNode) => {
      node.children.forEach(child => {
        links.push({ source: node, target: child });
        collectLinks(child);
      });
    };
    collectLinks(rootNode);

    // 绘制连线
    g.selectAll('.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', (d: any) => {
        const sx = d.source.x || 0;
        const sy = d.source.y || 0;
        const tx = d.target.x || 0;
        const ty = d.target.y || 0;
        const mx = (sx + tx) / 2;
        return `M${sx},${sy} C${mx},${sy} ${mx},${ty} ${tx},${ty}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#F97316')
      .attr('stroke-width', 2)
      .attr('opacity', 0.6);

    // 绘制节点
    const nodeGroups = g.selectAll('.node')
      .data(allNodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        handleNodeClick(d.name, { x: event.clientX, y: event.clientY });
      });

    // 根节点 - 菱形
    nodeGroups.filter((d: any) => d.level === 0)
      .append('polygon')
      .attr('points', '-60,0 0,-35 60,0 0,35')
      .attr('fill', 'url(#rootGradient)')
      .attr('stroke', '#EA580C')
      .attr('stroke-width', 2);

    // 子节点 - 圆角矩形
    nodeGroups.filter((d: any) => d.level > 0)
      .append('rect')
      .attr('x', (d: any) => -Math.min(d.name.length * 7 + 16, 120))
      .attr('y', -18)
      .attr('width', (d: any) => Math.min(d.name.length * 14 + 32, 240))
      .attr('height', 36)
      .attr('rx', 18)
      .attr('fill', (d: any) => d.level === 1 ? 'url(#level1Gradient)' : 'url(#level2Gradient)')
      .attr('stroke', (d: any) => d.level === 1 ? '#FB923C' : '#FCD34D')
      .attr('stroke-width', 1.5);

    // 节点文字
    nodeGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', (d: any) => d.level === 0 ? '#FFF' : '#5A4A36')
      .attr('font-size', (d: any) => d.level === 0 ? '14px' : '12px')
      .attr('font-weight', (d: any) => d.level <= 1 ? 'bold' : 'normal')
      .text((d: any) => d.name.length > 16 ? d.name.slice(0, 15) + '...' : d.name);

    // 添加渐变定义
    const defs = svg.append('defs');

    // 根节点渐变
    const rootGradient = defs.append('linearGradient')
      .attr('id', 'rootGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');
    rootGradient.append('stop').attr('offset', '0%').attr('stop-color', '#F97316');
    rootGradient.append('stop').attr('offset', '100%').attr('stop-color', '#EA580C');

    // 一级节点渐变
    const level1Gradient = defs.append('linearGradient')
      .attr('id', 'level1Gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    level1Gradient.append('stop').attr('offset', '0%').attr('stop-color', '#FFF7ED');
    level1Gradient.append('stop').attr('offset', '100%').attr('stop-color', '#FFEDD5');

    // 二级节点渐变
    const level2Gradient = defs.append('linearGradient')
      .attr('id', 'level2Gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    level2Gradient.append('stop').attr('offset', '0%').attr('stop-color', '#FFFBEB');
    level2Gradient.append('stop').attr('offset', '100%').attr('stop-color', '#FEF3C7');

    // 初始缩放适配
    const bounds = g.node()?.getBBox();
    if (bounds) {
      const fullWidth = bounds.width + 100;
      const fullHeight = bounds.height + 100;
      const midX = bounds.x + bounds.width / 2;
      const midY = bounds.y + bounds.height / 2;
      const scale = Math.min(width / fullWidth, height / fullHeight, 1);
      const translate = [width / 2 - scale * midX, height / 2 - scale * midY];
      svg.call(zoom.transform as any, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
    }
  }, [data?.config, handleNodeClick]);

  // 布局分支
  const layoutBranch = (nodes: MindmapNode[], startX: number, centerY: number, direction: number, _parentY: number, availableHeight: number) => {
    if (nodes.length === 0) return;

    const spacing = Math.min(80, availableHeight / (nodes.length + 1));
    const startY = centerY - (nodes.length - 1) * spacing / 2;

    nodes.forEach((node, index) => {
      node.x = startX;
      node.y = startY + index * spacing;

      if (node.children.length > 0) {
        const childX = startX + direction * 160;
        const childSpacing = Math.min(60, spacing / node.children.length);
        const childStartY = node.y! - (node.children.length - 1) * childSpacing / 2;

        node.children.forEach((child, childIndex) => {
          child.x = childX;
          child.y = childStartY + childIndex * childSpacing;

          // 递归处理更深层级
          if (child.children.length > 0) {
            layoutBranch(child.children, childX + direction * 140, child.y!, direction, child.y!, childSpacing * child.children.length);
          }
        });
      }
    });
  };

  // ============================================
  // Mermaid 格式解析
  // ============================================

  const parseMermaidMindmap = (config: string): MindmapNode | null => {
    const lines = config.split('\n').filter(line => line.trim() && !line.trim().startsWith('mindmap'));
    if (lines.length === 0) return null;

    // 动态检测缩进级别
    const indentLevels = new Set<number>();
    for (const line of lines) {
      const match = line.match(/^(\s*)/);
      const indent = match && match[1] ? match[1].length : 0;
      if (indent > 0) indentLevels.add(indent);
    }
    const sortedIndents = Array.from(indentLevels).sort((a, b) => a - b);
    const first = sortedIndents[0] ?? 0;
    const second = sortedIndents[1] ?? first + 2;
    const indentUnit = sortedIndents.length > 1 ? second - first : 2;

    let rootNode: MindmapNode | null = null;
    const nodeStack: MindmapNode[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // 计算缩进级别
      const spaceMatch = line.match(/^(\s*)/);
      const leadingSpaces = spaceMatch && spaceMatch[1] ? spaceMatch[1].length : 0;
      const level = indentUnit > 0 ? Math.floor(leadingSpaces / indentUnit) : 0;

      // 解析节点名称
      let nodeName = trimmed;
      // 处理 root((名称)) 格式
      const rootMatch = trimmed.match(/^root\(\((.+)\)\)$/);
      if (rootMatch && rootMatch[1]) {
        nodeName = rootMatch[1];
      } else {
        // 处理 (名称) 或 [名称] 或普通文本
        const bracketMatch = trimmed.match(/^\((.+)\)$/) || trimmed.match(/^\[(.+)\]$/);
        if (bracketMatch && bracketMatch[1]) {
          nodeName = bracketMatch[1];
        }
      }

      const newNode: MindmapNode = {
        name: nodeName,
        children: [],
        level,
      };

      if (level === 0 || !rootNode) {
        rootNode = newNode;
        nodeStack.length = 0;
        nodeStack.push(newNode);
      } else {
        // 找到父节点
        let lastNode = nodeStack[nodeStack.length - 1];
        while (nodeStack.length > 0 && lastNode && lastNode.level >= level) {
          nodeStack.pop();
          lastNode = nodeStack[nodeStack.length - 1];
        }

        if (nodeStack.length > 0) {
          const parent = nodeStack[nodeStack.length - 1];
          if (parent) {
            newNode.parent = parent;
            parent.children.push(newNode);
          }
        }

        nodeStack.push(newNode);
      }
    }

    return rootNode;
  };

  // ============================================
  // ECharts 相关
  // ============================================

  const onChartReady = useCallback((instance: any) => {
    chartInstanceRef.current = instance;
  }, []);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.3));
  const handleResetZoom = () => setScale(1);

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'mindmap': return '🧠';
      case 'flowchart': return '📊';
      case 'mermaid': return '🧜‍♀️';
      case 'echarts': return '📈';
      default: return '📊';
    }
  };

  const getTypeName = (type?: string) => {
    switch (type) {
      case 'mindmap': return '思维导图';
      case 'flowchart': return '流程图';
      case 'mermaid': return 'Mermaid';
      case 'echarts': return 'ECharts';
      default: return '可视化';
    }
  };

  // 导出 PNG
  const handleExportPNG = useCallback(async () => {
    setIsExporting(true);
    try {
      if (shouldUseD3 && d3ContainerRef.current) {
        // D3 导出
        const svgElement = d3ContainerRef.current.querySelector('svg');
        if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();

          canvas.width = 1600;
          canvas.height = 1000;

          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve();
            };
            img.onerror = reject;
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
          });

          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `${data?.title || 'mindmap'}-${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
        }
      } else if (chartInstanceRef.current) {
        // ECharts 导出
        const dataUrl = chartInstanceRef.current.getDataURL({
          type: 'png',
          pixelRatio: 2,
          backgroundColor: '#fff',
        });
        const link = document.createElement('a');
        link.download = `${data?.title || 'visualization'}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error('Export PNG failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [data, shouldUseD3]);

  // 导出 SVG
  const handleExportSVG = useCallback(async () => {
    setIsExporting(true);
    try {
      if (shouldUseD3 && d3ContainerRef.current) {
        const svgElement = d3ContainerRef.current.querySelector('svg');
        if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const blob = new Blob([svgData], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `${data?.title || 'mindmap'}-${Date.now()}.svg`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
      } else if (chartInstanceRef.current) {
        const dataUrl = chartInstanceRef.current.getDataURL({ type: 'svg' });
        const link = document.createElement('a');
        link.download = `${data?.title || 'visualization'}-${Date.now()}.svg`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error('Export SVG failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [data, shouldUseD3]);

  // 插入文档
  const handleInsertToDocument = useCallback(async () => {
    if (!onInsertToDocument) return;

    try {
      let dataUrl = '';

      if (shouldUseD3 && d3ContainerRef.current) {
        const svgElement = d3ContainerRef.current.querySelector('svg');
        if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();

          canvas.width = 1600;
          canvas.height = 1000;

          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve();
            };
            img.onerror = reject;
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
          });

          dataUrl = canvas.toDataURL('image/png');
        }
      } else if (chartInstanceRef.current) {
        dataUrl = chartInstanceRef.current.getDataURL({
          type: 'png',
          pixelRatio: 2,
          backgroundColor: '#fff',
        });
      }

      if (dataUrl) {
        onInsertToDocument(dataUrl, data?.title || '可视化');
        onClose();
      }
    } catch (error) {
      console.error('Insert to document failed:', error);
    }
  }, [data, onInsertToDocument, onClose, shouldUseD3]);

  // ECharts 配置
  const getMindmapOption = (): EChartsOption => ({
    tooltip: { trigger: 'item', triggerOn: 'mousemove' },
    series: [
      {
        type: 'tree',
        data: [
          {
            name: data?.title || '思维导图',
            children: [
              { name: '分支 1', children: [{ name: '子节点 1.1' }, { name: '子节点 1.2' }] },
              { name: '分支 2', children: [{ name: '子节点 2.1' }, { name: '子节点 2.2' }] },
              { name: '分支 3', children: [{ name: '子节点 3.1' }] },
            ],
          },
        ],
        top: '1%', left: '7%', bottom: '1%', right: '20%',
        symbolSize: 7, orient: 'LR',
        label: { position: 'left', verticalAlign: 'middle', align: 'right', fontSize: 12 },
        leaves: { label: { position: 'right', verticalAlign: 'middle', align: 'left' } },
        emphasis: { focus: 'descendant' },
        expandAndCollapse: true,
        animationDuration: 550,
        animationDurationUpdate: 750,
        lineStyle: { color: '#F97316', width: 2 },
        itemStyle: { color: '#F97316', borderColor: '#EA580C' },
      },
    ],
  });

  const getFlowchartOption = (): EChartsOption => ({
    tooltip: {},
    series: [
      {
        type: 'graph',
        layout: 'none',
        symbolSize: 50,
        roam: true,
        label: { show: true, fontSize: 12 },
        edgeSymbol: ['circle', 'arrow'],
        edgeSymbolSize: [4, 10],
        data: [
          { name: '开始', x: 100, y: 100, itemStyle: { color: '#22C55E' } },
          { name: '处理', x: 300, y: 100, itemStyle: { color: '#F97316' } },
          { name: '判断', x: 500, y: 100, itemStyle: { color: '#FBBF24' } },
          { name: '结束', x: 700, y: 100, itemStyle: { color: '#EF4444' } },
        ],
        links: [
          { source: '开始', target: '处理' },
          { source: '处理', target: '判断' },
          { source: '判断', target: '结束' },
        ],
        lineStyle: { opacity: 0.9, width: 2, curveness: 0, color: '#9C8B72' },
      },
    ],
  });

  const getChartOption = (): EChartsOption | null => {
    if (data?.echartsOption) return data.echartsOption;
    switch (data?.type) {
      case 'mindmap': return getMindmapOption();
      case 'flowchart': return getFlowchartOption();
      case 'echarts':
        return {
          title: { text: data?.title || '数据可视化', left: 'center', textStyle: { color: '#473929' } },
          tooltip: { trigger: 'axis' },
          xAxis: { type: 'category', data: ['一月', '二月', '三月', '四月', '五月'] },
          yAxis: { type: 'value' },
          series: [{
            type: 'bar',
            data: [150, 230, 224, 218, 135],
            itemStyle: {
              color: {
                type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [{ offset: 0, color: '#F97316' }, { offset: 1, color: '#FBBF24' }],
              },
            },
          }],
        };
      default: return null;
    }
  };

  const chartOption = getChartOption();
  const canUseECharts = !shouldUseD3 && (data?.type === 'echarts' || data?.type === 'mindmap' || data?.type === 'flowchart');

  // 计算面板样式
  const panelStyle = isFullscreen
    ? { width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh' }
    : { width: panelSize.width, height: panelSize.height };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className={`bg-cream-50 rounded-xl shadow-2xl overflow-hidden flex flex-col relative ${
          isFullscreen ? 'rounded-none' : ''
        }`}
        style={panelStyle}
      >
        {/* 调整大小手柄 (非全屏时显示) */}
        {!isFullscreen && ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(dir => (
          <div
            key={dir}
            className={`absolute ${
              dir === 'n' ? 'top-0 left-4 right-4 h-1 cursor-n-resize' :
              dir === 's' ? 'bottom-0 left-4 right-4 h-1 cursor-s-resize' :
              dir === 'e' ? 'right-0 top-4 bottom-4 w-1 cursor-e-resize' :
              dir === 'w' ? 'left-0 top-4 bottom-4 w-1 cursor-w-resize' :
              dir === 'ne' ? 'top-0 right-0 w-4 h-4 cursor-ne-resize' :
              dir === 'nw' ? 'top-0 left-0 w-4 h-4 cursor-nw-resize' :
              dir === 'se' ? 'bottom-0 right-0 w-4 h-4 cursor-se-resize' :
              'bottom-0 left-0 w-4 h-4 cursor-sw-resize'
            } z-20 hover:bg-orange-300/20`}
            onMouseDown={(e) => handleResizeStart(e, dir)}
          />
        ))}

        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-bronze-200 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-lg">{getTypeIcon(data?.type)}</span>
            <span className="font-bold text-bronze-800">
              {data?.title || getTypeName(data?.type)}
            </span>
            <span className="text-xs text-bronze-500 bg-bronze-100 px-2 py-0.5 rounded">
              {shouldUseD3 ? 'D3.js' : getTypeName(data?.type)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleZoomOut} title="缩小">
              <i className="fas fa-search-minus" />
            </Button>
            <span className="text-sm text-bronze-600 min-w-[4rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={handleZoomIn} title="放大">
              <i className="fas fa-search-plus" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleResetZoom} title="重置">
              <i className="fas fa-compress-arrows-alt" />
            </Button>
            <div className="w-px h-6 bg-bronze-200 mx-2" />
            <Button
              variant={isFullscreen ? 'primary' : 'ghost'}
              size="sm"
              onClick={toggleFullscreen}
              title={isFullscreen ? '退出全屏' : '全屏'}
            >
              <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} />
            </Button>
            {data?.rawCode && (
              <Button
                variant={showCode ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setShowCode(!showCode)}
              >
                <i className="fas fa-code mr-2" />
                代码
              </Button>
            )}
            <button
              onClick={onClose}
              className="text-bronze-400 hover:text-bronze-600 transition-colors ml-2"
            >
              <i className="fas fa-times text-lg" />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden p-6 bg-white">
          {showCode && data?.rawCode ? (
            <pre className="bg-bronze-50 p-4 rounded-lg text-sm overflow-auto h-full">
              <code className="text-bronze-800">{data.rawCode}</code>
            </pre>
          ) : (
            <div
              className="flex items-center justify-center h-full"
              style={{ transform: shouldUseD3 ? 'none' : `scale(${scale})`, transformOrigin: 'center' }}
            >
              {shouldUseD3 ? (
                <div
                  ref={d3ContainerRef}
                  className="w-full h-full"
                  style={{ minHeight: '400px' }}
                />
              ) : canUseECharts && chartOption ? (
                <ReactECharts
                  option={chartOption}
                  style={{ width: '100%', height: '100%', minHeight: '400px' }}
                  opts={{ renderer: 'canvas' }}
                  notMerge={true}
                  onChartReady={onChartReady}
                />
              ) : data?.content ? (
                <div className="w-full" dangerouslySetInnerHTML={{ __html: data.content }} />
              ) : (
                <div className="text-center text-bronze-500">
                  <div className="text-6xl mb-4">{getTypeIcon(data?.type)}</div>
                  <p className="text-lg font-medium text-bronze-700 mb-2">{getTypeName(data?.type)}</p>
                  <p className="text-sm">暂无可视化数据</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部工具栏 */}
        <div className="flex items-center justify-between px-6 py-4 bg-sand-50 border-t border-bronze-200 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportPNG}
              disabled={isExporting}
            >
              <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-download'} mr-2`} />
              导出 PNG
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportSVG}
              disabled={isExporting}
            >
              <i className="fas fa-file-code mr-2" />
              导出 SVG
            </Button>
            {onInsertToDocument && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleInsertToDocument}
              >
                <i className="fas fa-file-import mr-2" />
                插入文档
              </Button>
            )}
          </div>
          <span className="text-xs text-bronze-500">
            Powered by {shouldUseD3 ? 'D3.js' : 'ECharts'}
          </span>
        </div>
      </div>

      {/* NodeDetailPanel */}
      {selectedNode && (
        <NodeDetailPanel
          nodeName={selectedNode}
          isLoading={isLoadingExplanation}
          explanation={nodeExplanation}
          relatedContent={relatedContent}
          onClose={() => setSelectedNode(null)}
          position={nodeDetailPosition}
          documentContent={documentContent || ''}
          onAskQuestion={handleAskFollowUp}
        />
      )}
    </div>
  );
};

export default VisualPanel;
