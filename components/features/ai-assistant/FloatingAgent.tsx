/**
 * FloatingAgent - AI 浮动助手组件
 *
 * TODO: Stage 10 完善实现
 * 当前为占位组件，需要在后续阶段对接实际服务
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface FloatingAgentProps {
  documentId?: string;
  documentContent?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  onInsertText?: (text: string) => void;
  onInsertImage?: (url: string) => void;
}

/**
 * AI 浮动助手组件
 *
 * 提供 AI 对话、文档分析、图片生成等功能
 * 当前为占位实现，完整功能在 Stage 10 实现
 */
export default function FloatingAgent({
  documentId: _documentId,
  documentContent: _documentContent,
  isOpen: controlledIsOpen,
  onToggle,
  onInsertText: _onInsertText,
  onInsertImage: _onInsertImage,
}: FloatingAgentProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  const isOpen = controlledIsOpen ?? internalIsOpen;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  const handleSend = () => {
    if (!message.trim()) return;
    console.log('[FloatingAgent] Message sent:', message);
    // TODO: 实际 AI 对话逻辑
    setMessage('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleToggle}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50"
        aria-label="打开 AI 助手"
      >
        <svg
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-h-[600px] bg-cream-50 border border-bronze-200 rounded-xl shadow-2xl z-50 flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-bronze-200 rounded-t-xl">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="font-bold text-bronze-800">AI 智能助手</span>
        </div>
        <button
          onClick={handleToggle}
          className="text-bronze-400 hover:text-bronze-600 transition-colors"
          aria-label="关闭"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
        <div className="text-center text-bronze-500 py-8">
          <div className="text-4xl mb-4">🚧</div>
          <p className="text-sm">AI 助手功能开发中...</p>
          <p className="text-xs text-bronze-400 mt-2">
            将在 Stage 10 完善实现
          </p>
        </div>
      </div>

      {/* 输入区 */}
      <div className="p-4 border-t border-bronze-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入消息..."
            className="flex-1 px-3 py-2 border border-bronze-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim()}
            size="sm"
          >
            发送
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            className="text-xs text-bronze-500 hover:text-orange-600 transition-colors"
            onClick={() => console.log('分析文档')}
          >
            📊 分析文档
          </button>
          <button
            className="text-xs text-bronze-500 hover:text-orange-600 transition-colors"
            onClick={() => console.log('生成图片')}
          >
            🎨 生成图片
          </button>
          <button
            className="text-xs text-bronze-500 hover:text-orange-600 transition-colors"
            onClick={() => console.log('搜索')}
          >
            🔍 网络搜索
          </button>
        </div>
      </div>
    </div>
  );
}
