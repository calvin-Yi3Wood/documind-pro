/**
 * FloatingAgent - AI 浮动助手组件
 *
 * 提供 AI 对话、文档分析、快捷操作等功能
 * 支持流式响应和多模型切换
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/Button';

// 消息角色
type MessageRole = 'user' | 'assistant' | 'system';

// 消息类型
interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

// AI模型类型
type AIModel = 'gemini' | 'deepseek' | 'deepseek-reasoner';

interface FloatingAgentProps {
  /** 文档ID */
  documentId?: string;
  /** 文档内容 */
  documentContent?: string;
  /** 是否打开 */
  isOpen?: boolean;
  /** 切换开关回调 */
  onToggle?: () => void;
  /** 插入文本到编辑器 */
  onInsertText?: (text: string) => void;
  /** 插入图片到编辑器 */
  onInsertImage?: (url: string) => void;
  /** 选区任务 */
  selectionTask?: {
    action: string;
    text: string;
    extraPrompt?: string;
  } | null;
  /** 清除任务 */
  onClearTask?: () => void;
}

// 生成唯一ID
const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// 快捷操作配置
const QUICK_ACTIONS = [
  { id: 'analyze', icon: 'fa-magnifying-glass-chart', label: '分析文档', prompt: '请分析当前文档的主要内容和结构' },
  { id: 'summarize', icon: 'fa-compress', label: '总结要点', prompt: '请用简洁的要点总结当前文档' },
  { id: 'improve', icon: 'fa-wand-magic-sparkles', label: '优化建议', prompt: '请对当前文档提出改进建议' },
  { id: 'outline', icon: 'fa-list-tree', label: '生成大纲', prompt: '请为当前文档生成详细的大纲' },
];

/**
 * AI 浮动助手组件
 */
export default function FloatingAgent({
  documentContent = '',
  isOpen: controlledIsOpen,
  onToggle,
  onInsertText,
  selectionTask,
  onClearTask,
}: FloatingAgentProps) {
  // 状态管理
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'system',
      content: '👋 你好！我是DocuFusion的AI助手。我可以帮你分析文档、回答问题、提供写作建议。有什么可以帮你的吗？',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>('deepseek');
  const [showSettings, setShowSettings] = useState(false);

  // 引用
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 计算isOpen状态
  const isOpen = controlledIsOpen ?? internalIsOpen;

  // 切换开关
  const handleToggle = useCallback(() => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  }, [onToggle]);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 消息变化时滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 处理选区任务
  useEffect(() => {
    if (selectionTask) {
      let prompt = '';
      if (selectionTask.extraPrompt) {
        prompt = `针对以下选中文本：\n"${selectionTask.text}"\n\n需求：${selectionTask.extraPrompt}`;
      } else {
        const actionMap: Record<string, string> = {
          improve: '优化润色',
          summarize: '总结摘要',
          rewrite: '重写',
          explain: '解释说明',
        };
        const actionName = actionMap[selectionTask.action] || selectionTask.action;
        prompt = `请对以下文本进行【${actionName}】：\n\n"${selectionTask.text}"`;
      }
      handleSendMessage(prompt);
      onClearTask?.();
    }
  }, [selectionTask, onClearTask]);

  // ESC键取消请求
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isProcessing) {
        handleCancelRequest();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isProcessing]);

  // 取消请求
  const handleCancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsProcessing(false);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'system',
          content: '⚠️ 请求已取消',
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  // 发送消息
  const handleSendMessage = useCallback(
    async (customQuery?: string) => {
      const query = customQuery || inputValue;
      if (!query.trim() || isProcessing) return;

      // 添加用户消息
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: query,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      if (!customQuery) setInputValue('');
      setIsProcessing(true);

      // 创建 AbortController
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // 创建AI响应消息占位
      const assistantMsgId = generateId();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true,
        },
      ]);

      try {
        // 构建请求 - 使用正确的API格式
        // API期望: query (当前消息), history (历史消息数组), stream, provider, model
        const historyMessages = messages
          .filter((m) => m.role !== 'system')
          .slice(-10)
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

        // 如果有文档上下文，添加到查询中
        const queryWithContext = documentContent
          ? `[文档上下文]\n${documentContent.slice(0, 4000)}\n\n[用户问题]\n${query}`
          : query;

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: queryWithContext,
            history: historyMessages,
            provider: selectedModel === 'gemini' ? 'gemini' : 'deepseek',
            model: selectedModel === 'deepseek-reasoner' ? 'deepseek-reasoner' : undefined,
            stream: true,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`请求失败: ${response.status}`);
        }

        // 处理流式响应
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    fullContent += parsed.content;
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMsgId
                          ? { ...m, content: fullContent }
                          : m
                      )
                    );
                  }
                } catch {
                  // 非JSON数据，可能是纯文本
                  if (data.trim()) {
                    fullContent += data;
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMsgId
                          ? { ...m, content: fullContent }
                          : m
                      )
                    );
                  }
                }
              }
            }
          }
        }

        // 完成流式响应
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, isStreaming: false, content: fullContent || '抱歉，我没能生成回复。请重试。' }
              : m
          )
        );
      } catch (error: any) {
        if (error.name === 'AbortError') {
          // 请求被取消
          return;
        }

        console.error('AI请求失败:', error);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  isStreaming: false,
                  content: `❌ 请求失败: ${error.message || '未知错误'}`,
                }
              : m
          )
        );
      } finally {
        setIsProcessing(false);
        abortControllerRef.current = null;
      }
    },
    [inputValue, isProcessing, messages, documentContent, selectedModel]
  );

  // 复制消息内容
  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  // 插入到编辑器
  const handleInsertToEditor = useCallback(
    (content: string) => {
      onInsertText?.(content);
    },
    [onInsertText]
  );

  // 快捷操作
  const handleQuickAction = useCallback(
    (prompt: string) => {
      handleSendMessage(prompt);
    },
    [handleSendMessage]
  );

  // 收起状态 - 显示浮动按钮
  if (!isOpen) {
    return (
      <button
        onClick={handleToggle}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50 hover:scale-110"
        aria-label="打开 AI 助手"
      >
        <i className="fas fa-robot text-xl" />
      </button>
    );
  }

  // 展开状态 - 显示完整面板
  return (
    <div className="fixed bottom-6 right-6 w-[400px] max-h-[600px] bg-cream-50 border border-bronze-200 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-bronze-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center">
            <i className="fas fa-robot text-white text-sm" />
          </div>
          <div>
            <span className="font-bold text-bronze-800 text-sm">AI 助手</span>
            <div className="text-[10px] text-bronze-500">
              {selectedModel === 'gemini' ? 'Gemini Flash' : selectedModel === 'deepseek-reasoner' ? 'DeepSeek R1' : 'DeepSeek V3'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-bronze-400 hover:text-bronze-600 hover:bg-bronze-100 rounded-lg transition-colors"
            title="设置"
          >
            <i className="fas fa-gear" />
          </button>
          <button
            onClick={handleToggle}
            className="p-2 text-bronze-400 hover:text-bronze-600 hover:bg-bronze-100 rounded-lg transition-colors"
            title="关闭"
          >
            <i className="fas fa-minus" />
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="px-4 py-3 bg-bronze-50 border-b border-bronze-200">
          <div className="text-xs font-medium text-bronze-600 mb-2">AI 模型</div>
          <div className="flex gap-2">
            {[
              { id: 'deepseek' as AIModel, label: 'DeepSeek V3' },
              { id: 'deepseek-reasoner' as AIModel, label: 'DeepSeek R1' },
              { id: 'gemini' as AIModel, label: 'Gemini' },
            ].map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  selectedModel === model.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-bronze-600 hover:bg-bronze-100'
                }`}
              >
                {model.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                  : msg.role === 'system'
                  ? 'bg-bronze-100 text-bronze-700'
                  : 'bg-white border border-bronze-200 text-bronze-700'
              }`}
            >
              <div className="text-sm break-words prose prose-sm prose-bronze max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_strong]:text-bronze-800 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5">
                {msg.role === 'user' ? (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                ) : (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                )}
                {msg.isStreaming && (
                  <span className="inline-block w-1.5 h-4 bg-orange-500 ml-1 animate-pulse" />
                )}
              </div>

              {/* 消息操作按钮 */}
              {msg.role === 'assistant' && !msg.isStreaming && msg.content && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-bronze-100">
                  <button
                    onClick={() => handleCopyMessage(msg.content)}
                    className="text-[10px] text-bronze-400 hover:text-bronze-600 flex items-center gap-1"
                    title="复制"
                  >
                    <i className="fas fa-copy" />
                    复制
                  </button>
                  {onInsertText && (
                    <button
                      onClick={() => handleInsertToEditor(msg.content)}
                      className="text-[10px] text-bronze-400 hover:text-orange-600 flex items-center gap-1"
                      title="插入到文档"
                    >
                      <i className="fas fa-file-import" />
                      插入
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 处理中指示器 */}
        {isProcessing && (
          <div className="flex items-center gap-2 text-bronze-500 text-sm">
            <i className="fas fa-spinner fa-spin" />
            <span>正在思考...</span>
            <button
              onClick={handleCancelRequest}
              className="text-xs text-bronze-400 hover:text-red-500 ml-2"
            >
              (ESC取消)
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 快捷操作 */}
      {messages.length <= 2 && !isProcessing && (
        <div className="px-4 py-2 border-t border-bronze-100">
          <div className="text-[10px] font-medium text-bronze-500 mb-2">快捷操作</div>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.prompt)}
                className="px-3 py-1.5 text-xs bg-white border border-bronze-200 rounded-lg text-bronze-600 hover:border-orange-400 hover:text-orange-600 transition-colors flex items-center gap-1.5"
              >
                <i className={`fas ${action.icon}`} />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入区 */}
      <div className="p-4 border-t border-bronze-200 bg-white">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="输入消息..."
            disabled={isProcessing}
            className="flex-1 px-4 py-2.5 border border-bronze-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isProcessing}
            className="px-4"
          >
            <i className={`fas ${isProcessing ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}
