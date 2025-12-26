/**
 * Editor - 文档编辑器组件
 *
 * TODO: Stage 10 完善实现
 * 当前为占位组件，需要在后续阶段完善富文本编辑功能
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';

interface EditorProps {
  initialContent?: string;
  onContentChange?: (html: string) => void;
  title?: string;
  setTitle?: (title: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onSelectionAction?: (action: string, selectedText: string, extraPrompt?: string) => void;
  onAddToContext?: (text: string) => void;
  onProactiveSuggest?: () => void;
  isPanMode?: boolean;
  onRefresh?: () => void;
}

/**
 * 文档编辑器组件
 *
 * 提供富文本编辑、格式工具栏、AI辅助等功能
 * 当前为占位实现，完整功能在 Stage 10 实现
 */
const Editor: React.FC<EditorProps> = ({
  initialContent = '',
  onContentChange,
  title = '',
  setTitle,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(initialContent);

  // 同步内容变化
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setContent(html);
      onContentChange?.(html);
    }
  }, [onContentChange]);

  // 初始化编辑器内容
  useEffect(() => {
    if (editorRef.current && initialContent !== content) {
      editorRef.current.innerHTML = initialContent;
      setContent(initialContent);
    }
  }, [initialContent]);

  // 格式化命令
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleInput();
  }, [handleInput]);

  return (
    <div className="flex flex-col h-full bg-cream-50">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-bronze-200">
        {/* 标题输入 */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle?.(e.target.value)}
          placeholder="文档标题"
          className="flex-1 px-3 py-1.5 text-lg font-bold text-bronze-800 bg-transparent border-none outline-none focus:ring-0"
        />

        <div className="h-6 w-px bg-bronze-200" />

        {/* 撤销/重做 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="撤销 (Ctrl+Z)"
        >
          <i className="fas fa-undo text-bronze-600" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          title="重做 (Ctrl+Y)"
        >
          <i className="fas fa-redo text-bronze-600" />
        </Button>

        <div className="h-6 w-px bg-bronze-200" />

        {/* 格式化按钮 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => execCommand('bold')}
          title="粗体 (Ctrl+B)"
        >
          <i className="fas fa-bold text-bronze-600" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => execCommand('italic')}
          title="斜体 (Ctrl+I)"
        >
          <i className="fas fa-italic text-bronze-600" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => execCommand('underline')}
          title="下划线 (Ctrl+U)"
        >
          <i className="fas fa-underline text-bronze-600" />
        </Button>

        <div className="h-6 w-px bg-bronze-200" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => execCommand('formatBlock', 'H1')}
          title="标题1"
        >
          H1
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => execCommand('formatBlock', 'H2')}
          title="标题2"
        >
          H2
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => execCommand('formatBlock', 'H3')}
          title="标题3"
        >
          H3
        </Button>

        <div className="h-6 w-px bg-bronze-200" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => execCommand('insertUnorderedList')}
          title="无序列表"
        >
          <i className="fas fa-list-ul text-bronze-600" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => execCommand('insertOrderedList')}
          title="有序列表"
        >
          <i className="fas fa-list-ol text-bronze-600" />
        </Button>
      </div>

      {/* 编辑区域 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-bronze-200 min-h-[600px]">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            className="p-8 outline-none prose prose-bronze max-w-none min-h-[500px] text-bronze-700"
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '16px',
              lineHeight: '1.8',
            }}
          />
        </div>
      </div>

      {/* 状态栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-bronze-200 text-xs text-bronze-500">
        <span>🚧 编辑器占位组件 - Stage 10 完善</span>
        <span>
          字数: {content.replace(/<[^>]*>/g, '').length}
        </span>
      </div>
    </div>
  );
};

export default Editor;
