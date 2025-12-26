/**
 * FloatingAgent - AI 浮动助手组件
 *
 * 提供 AI 对话、文档分析、快捷操作等功能
 * 支持流式响应、多模型切换、图片生成、网络搜索等
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/Button';

// 消息角色
type MessageRole = 'user' | 'assistant' | 'system';

// 可视化数据类型
interface VisualData {
  type: 'chart' | 'mindmap' | 'flowchart';
  config: Record<string, unknown>;
  title?: string;
}

// 建议操作
interface SuggestedAction {
  type: 'APPEND_CONTENT' | 'SHOW_VISUAL' | 'OPEN_LINK';
  content?: string;
  data?: VisualData;
  label: string;
}

// 消息类型
interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  suggestedAction?: SuggestedAction;
  imageUrl?: string;
}

// AI上下文片段类型
export interface AIContextItem {
  id: string;
  text: string;
  addedAt: Date;
  used: boolean;
}

// 上传的文件类型
interface UploadedFile {
  name: string;
  content: string;
  type: string;
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
  /** AI上下文片段 */
  aiContextItems?: AIContextItem[];
  /** 删除上下文片段 */
  onRemoveContextItem?: (id: string) => void;
  /** 标记上下文为已使用 */
  onMarkContextUsed?: (ids: string[]) => void;
  /** 显示可视化数据 */
  onShowVisual?: (data: VisualData) => void;
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

// 图片生成关键词
const IMAGE_KEYWORDS = ['画', '生成图片', '生成图像', '画一张', '画个', 'draw', 'generate image', 'create image'];

// 检测是否需要生成图片
const isImageGenerationRequest = (query: string): boolean => {
  const lowerQuery = query.toLowerCase();
  return IMAGE_KEYWORDS.some(keyword => lowerQuery.includes(keyword.toLowerCase()));
};

// 检测是否需要网络搜索
const shouldSearch = (query: string): boolean => {
  const searchPatterns = [
    /最新|最近|今天|昨天|本周|本月/,
    /新闻|消息|报道|事件/,
    /什么是|是什么|介绍一下|解释一下/,
    /how to|what is|explain|latest|recent/i,
    /搜索|查询|查找|百度|谷歌/,
  ];
  return searchPatterns.some(pattern => pattern.test(query));
};

// 解析可视化数据
const parseVisualData = (content: string): { text: string; visualData: VisualData | null } => {
  const visualMatch = content.match(/\[VISUAL_DATA\]([\s\S]*?)\[\/VISUAL_DATA\]/);
  if (visualMatch && visualMatch[1]) {
    try {
      const visualData = JSON.parse(visualMatch[1]) as VisualData;
      const cleanText = content.replace(/\[VISUAL_DATA\][\s\S]*?\[\/VISUAL_DATA\]/, '').trim();
      return { text: cleanText, visualData };
    } catch {
      return { text: content, visualData: null };
    }
  }
  return { text: content, visualData: null };
};

/**
 * AI 浮动助手组件
 */
export default function FloatingAgent({
  documentContent = '',
  isOpen: controlledIsOpen,
  onToggle,
  onInsertText,
  onInsertImage,
  selectionTask,
  onClearTask,
  aiContextItems = [],
  onRemoveContextItem,
  onMarkContextUsed,
  onShowVisual,
}: FloatingAgentProps) {
  // 状态管理
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'system',
      content: '👋 你好！我是DocuFusion的AI助手。我可以帮你分析文档、回答问题、生成图片、搜索信息。\n\n💡 输入「你能帮我做什么」查看完整功能列表。',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>('deepseek');
  const [showSettings, setShowSettings] = useState(false);

  // 联网搜索开关
  const [isNetworkSearchEnabled, setIsNetworkSearchEnabled] = useState(true);

  // 消息编辑状态
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewScale, setPreviewScale] = useState(1);

  // 文件上传状态
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // 引用
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef<boolean>(false);

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
      isCancelledRef.current = true;
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

  // 处理文件上传
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setUploadedFiles(prev => [...prev, {
          name: file.name,
          content: content.slice(0, 10000), // 限制内容长度
          type: file.type,
        }]);
        setMessages(prev => [...prev, {
          id: generateId(),
          role: 'system',
          content: `📎 已上传文件: ${file.name}`,
          timestamp: new Date(),
        }]);
      };
      reader.readAsText(file);
    }
    e.target.value = ''; // 重置input
  }, []);

  // 删除上传的文件
  const handleRemoveFile = useCallback((fileName: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
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
      isCancelledRef.current = false;

      // 创建 AbortController
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // 获取未使用的上下文片段
      const unusedContextItems = aiContextItems.filter(item => !item.used);
      const contextText = unusedContextItems.length > 0
        ? unusedContextItems.map((item, idx) => `参考内容${idx + 1}: "${item.text}"`).join('\n')
        : '';

      try {
        // 🎨 检测是否是图片生成请求
        if (isImageGenerationRequest(query)) {
          setMessages((prev) => [...prev, {
            id: generateId(),
            role: 'system',
            content: '🎨 正在生成图片，请稍候...',
            timestamp: new Date(),
          }]);

          // 增强提示词
          let enhancedPrompt = query;
          if (unusedContextItems.length > 0) {
            enhancedPrompt = `[用户引用的上下文参考]\n${contextText}\n\n[图片生成需求]\n${query}`;
            onMarkContextUsed?.(unusedContextItems.map(item => item.id));
          }

          const response = await fetch('/api/ai/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: enhancedPrompt }),
            signal: abortController.signal,
          });

          if (isCancelledRef.current) return;

          const result = await response.json();
          if (result.imageBase64) {
            setMessages((prev) => [...prev, {
              id: generateId(),
              role: 'assistant',
              content: `**图片生成成功！**\n\n提示词: ${query}`,
              timestamp: new Date(),
              imageUrl: result.imageBase64,
              suggestedAction: {
                type: 'APPEND_CONTENT',
                content: `<img src="${result.imageBase64}" alt="AI生成图片" style="max-width: 100%;" />`,
                label: '插入图片到文档',
              },
            }]);
          } else {
            setMessages((prev) => [...prev, {
              id: generateId(),
              role: 'system',
              content: `❌ ${result.error || '图片生成失败，请重试'}`,
              timestamp: new Date(),
            }]);
          }
          setIsProcessing(false);
          return;
        }

        // 🌐 网络搜索
        let searchResults = '';
        if (isNetworkSearchEnabled && shouldSearch(query)) {
          setMessages((prev) => [...prev, {
            id: 'searching',
            role: 'system',
            content: '🌐 正在搜索网络信息...',
            timestamp: new Date(),
          }]);

          try {
            const searchResponse = await fetch('/api/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query }),
              signal: abortController.signal,
            });

            if (isCancelledRef.current) return;

            const searchData = await searchResponse.json();
            if (searchData.success && searchData.results?.length > 0) {
              searchResults = `\n\n[网络搜索结果]\n${searchData.results.slice(0, 5).map((r: { title: string; snippet: string }) => `- ${r.title}: ${r.snippet}`).join('\n')}`;
              setMessages((prev) => prev.map(m =>
                m.id === 'searching'
                  ? { ...m, content: `✅ 已找到 ${searchData.results.length} 条搜索结果` }
                  : m
              ));
            } else {
              setMessages((prev) => prev.map(m =>
                m.id === 'searching'
                  ? { ...m, content: '⚠️ 未找到搜索结果，使用AI知识库回答' }
                  : m
              ));
            }
          } catch {
            setMessages((prev) => prev.map(m =>
              m.id === 'searching'
                ? { ...m, content: '⚠️ 搜索服务暂时不可用' }
                : m
            ));
          }
        }

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

        // 构建上下文
        const historyMessages = messages
          .filter((m) => m.role !== 'system')
          .slice(-10)
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

        // 组合所有上下文
        let fullContext = '';
        if (documentContent) {
          fullContext += `[文档上下文]\n${documentContent.slice(0, 4000)}\n\n`;
        }
        if (contextText) {
          fullContext += `[用户选中的参考内容]\n${contextText}\n\n`;
          onMarkContextUsed?.(unusedContextItems.map(item => item.id));
        }
        if (uploadedFiles.length > 0) {
          fullContext += `[上传的文件]\n${uploadedFiles.map(f => `${f.name}:\n${f.content.slice(0, 2000)}`).join('\n\n')}\n\n`;
        }
        if (searchResults) {
          fullContext += searchResults + '\n\n';
        }
        fullContext += `[用户问题]\n${query}`;

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: fullContext,
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
            if (isCancelledRef.current) return;

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

        // 解析可视化数据
        const { text: cleanContent, visualData } = parseVisualData(fullContent);

        // 完成流式响应
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantMsgId) return m;
            const updatedMsg: ChatMessage = {
              ...m,
              isStreaming: false,
              content: cleanContent || '抱歉，我没能生成回复。请重试。',
            };
            if (visualData) {
              updatedMsg.suggestedAction = { type: 'SHOW_VISUAL', data: visualData, label: '查看可视化' };
            }
            return updatedMsg;
          })
        );
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        console.error('AI请求失败:', error);
        setMessages((prev) => [...prev, {
          id: generateId(),
          role: 'system',
          content: `❌ 请求失败: ${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: new Date(),
        }]);
      } finally {
        setIsProcessing(false);
        abortControllerRef.current = null;
      }
    },
    [inputValue, isProcessing, messages, documentContent, selectedModel, aiContextItems, uploadedFiles, isNetworkSearchEnabled, onMarkContextUsed]
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
        <div className="px-4 py-3 bg-bronze-50 border-b border-bronze-200 space-y-3">
          <div>
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
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-bronze-600">联网搜索</div>
            <button
              onClick={() => setIsNetworkSearchEnabled(!isNetworkSearchEnabled)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                isNetworkSearchEnabled ? 'bg-orange-500' : 'bg-bronze-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  isNetworkSearchEnabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* AI上下文片段显示 */}
      {aiContextItems.length > 0 && (
        <div className="px-4 py-2 bg-orange-50 border-b border-bronze-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-medium text-bronze-600 flex items-center gap-1">
              <i className="fas fa-paperclip text-orange-500" />
              AI上下文参考 ({aiContextItems.filter(i => !i.used).length}/{aiContextItems.length})
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
            {aiContextItems.map((item) => (
              <div
                key={item.id}
                className={`inline-flex items-center gap-1.5 px-2 py-1 text-[10px] rounded-lg border ${
                  item.used
                    ? 'bg-bronze-100 text-bronze-400 border-bronze-200 line-through'
                    : 'bg-white text-bronze-700 border-orange-300'
                }`}
              >
                <span className="max-w-[150px] truncate">{item.text}</span>
                {!item.used && onRemoveContextItem && (
                  <button
                    onClick={() => onRemoveContextItem(item.id)}
                    className="text-bronze-400 hover:text-red-500"
                    title="删除"
                  >
                    <i className="fas fa-times text-[8px]" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 上传的文件显示 */}
      {uploadedFiles.length > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-b border-bronze-200">
          <div className="text-[10px] font-medium text-bronze-600 flex items-center gap-1 mb-1">
            <i className="fas fa-file-alt text-blue-500" />
            已上传文件 ({uploadedFiles.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {uploadedFiles.map((file) => (
              <div
                key={file.name}
                className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] bg-white rounded-lg border border-blue-300 text-bronze-700"
              >
                <i className={`fas ${
                  file.type.includes('pdf') ? 'fa-file-pdf text-red-500' :
                  file.type.includes('word') ? 'fa-file-word text-blue-500' :
                  file.type.includes('image') ? 'fa-file-image text-green-500' :
                  'fa-file text-bronze-400'
                }`} />
                <span className="max-w-[100px] truncate">{file.name}</span>
                <button
                  onClick={() => handleRemoveFile(file.name)}
                  className="text-bronze-400 hover:text-red-500"
                  title="删除"
                >
                  <i className="fas fa-times text-[8px]" />
                </button>
              </div>
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
              onDoubleClick={() => {
                if (msg.role === 'user' && !isProcessing) {
                  setEditingMsgId(msg.id);
                  setEditingText(msg.content);
                }
              }}
            >
              {/* 消息编辑模式 */}
              {editingMsgId === msg.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="w-full px-2 py-1 text-sm bg-white text-bronze-700 rounded border border-bronze-200 focus:outline-none focus:ring-2 focus:ring-orange-400 min-h-[60px]"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setMessages(prev => prev.map(m =>
                          m.id === msg.id ? { ...m, content: editingText } : m
                        ));
                        setEditingMsgId(null);
                        handleSendMessage(editingText);
                      }}
                      className="px-2 py-1 text-[10px] bg-orange-500 text-white rounded hover:bg-orange-600"
                    >
                      重新发送
                    </button>
                    <button
                      onClick={() => setEditingMsgId(null)}
                      className="px-2 py-1 text-[10px] bg-bronze-200 text-bronze-600 rounded hover:bg-bronze-300"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
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

                  {/* 生成的图片显示 */}
                  {msg.imageUrl && (
                    <div className="mt-2">
                      <img
                        src={msg.imageUrl}
                        alt="AI生成图片"
                        className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          setPreviewImage(msg.imageUrl || null);
                          setPreviewScale(1);
                        }}
                      />
                      {onInsertImage && (
                        <button
                          onClick={() => onInsertImage(msg.imageUrl!)}
                          className="mt-2 px-3 py-1 text-[10px] bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-1"
                        >
                          <i className="fas fa-file-import" />
                          插入图片到文档
                        </button>
                      )}
                    </div>
                  )}

                  {/* 建议操作按钮 */}
                  {msg.suggestedAction && !msg.isStreaming && (
                    <div className="mt-2 pt-2 border-t border-bronze-100">
                      <button
                        onClick={() => {
                          if (msg.suggestedAction?.type === 'APPEND_CONTENT' && msg.suggestedAction.content) {
                            onInsertText?.(msg.suggestedAction.content);
                          } else if (msg.suggestedAction?.type === 'SHOW_VISUAL' && msg.suggestedAction.data) {
                            onShowVisual?.(msg.suggestedAction.data);
                          }
                        }}
                        className="px-3 py-1.5 text-[10px] bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 flex items-center gap-1.5"
                      >
                        <i className={`fas ${
                          msg.suggestedAction.type === 'SHOW_VISUAL' ? 'fa-chart-bar' :
                          msg.suggestedAction.type === 'APPEND_CONTENT' ? 'fa-file-import' :
                          'fa-external-link'
                        }`} />
                        {msg.suggestedAction.label}
                      </button>
                    </div>
                  )}

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

                  {/* 用户消息编辑提示 */}
                  {msg.role === 'user' && !isProcessing && (
                    <div className="text-[8px] text-white/60 mt-1">双击可编辑</div>
                  )}
                </>
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
          {/* 文件上传按钮 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-bronze-400 hover:text-bronze-600 hover:bg-bronze-100 rounded-xl transition-colors"
            title="上传文件 (PDF/Word/图片)"
            disabled={isProcessing}
          >
            <i className="fas fa-paperclip" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.gif"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="输入消息... (可发送「画一张...」生成图片)"
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
        <div className="text-[10px] text-bronze-400 mt-1.5 flex items-center gap-2">
          <span>💡 提示：输入「画...」生成图片</span>
          {isNetworkSearchEnabled && <span className="text-green-500">• 联网搜索已开启</span>}
        </div>
      </div>

      {/* 图片预览模态框 */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img
              src={previewImage}
              alt="图片预览"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
              style={{ transform: `scale(${previewScale})` }}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 px-4 py-2 rounded-full">
              <button
                onClick={() => setPreviewScale(s => Math.max(0.5, s - 0.25))}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded-full"
                title="缩小"
              >
                <i className="fas fa-minus" />
              </button>
              <span className="text-white text-sm min-w-[50px] text-center">
                {Math.round(previewScale * 100)}%
              </span>
              <button
                onClick={() => setPreviewScale(s => Math.min(3, s + 0.25))}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded-full"
                title="放大"
              >
                <i className="fas fa-plus" />
              </button>
              <div className="w-px h-4 bg-white/30 mx-1" />
              <button
                onClick={() => setPreviewImage(null)}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded-full"
                title="关闭"
              >
                <i className="fas fa-times" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
