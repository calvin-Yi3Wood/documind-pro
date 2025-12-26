/**
 * Editor - 文档编辑器组件
 *
 * 完整的富文本编辑器，支持:
 * - 文本格式化 (粗体、斜体、下划线等)
 * - 标题层级 (H1-H4)
 * - 列表 (有序、无序)
 * - 引用和代码块
 * - 图片和表格插入
 * - 撤销/重做
 * - 文档大纲
 * - 键盘快捷键
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Toolbar } from './Toolbar';
import { OutlinePanel } from './OutlinePanel';
import { ImageHandler } from './ImageHandler';
import { BlockMenu } from './BlockMenu';
import { useHistory, useSelection, useEditorState } from './hooks';

interface EditorProps {
  /** 初始内容 */
  initialContent?: string;
  /** 内容变化回调 */
  onContentChange?: (html: string) => void;
  /** 文档标题 */
  title?: string;
  /** 设置标题 */
  setTitle?: (title: string) => void;
  /** 选区操作回调 (AI功能) */
  onSelectionAction?: (action: string, selectedText: string, extraPrompt?: string) => void;
  /** 添加到上下文回调 */
  onAddToContext?: (text: string) => void;
  /** 是否平移模式 */
  isPanMode?: boolean;
  /** 刷新回调 */
  onRefresh?: () => void;
}

/**
 * 文档编辑器组件
 */
const Editor: React.FC<EditorProps> = ({
  initialContent = '',
  onContentChange,
  title: externalTitle,
  setTitle: setExternalTitle,
  isPanMode = false,
}) => {
  // 编辑器DOM引用
  const editorRef = useRef<HTMLDivElement>(null);

  // 使用自定义Hooks
  const history = useHistory(initialContent, { maxHistory: 50, debounceMs: 500 });
  const selection = useSelection(editorRef as React.RefObject<HTMLDivElement>);
  const editorState = useEditorState(externalTitle || '');

  // 本地状态
  const [showImageHandler, setShowImageHandler] = useState(false);
  const [blockMenuVisible, setBlockMenuVisible] = useState(false);
  const [blockMenuPosition, setBlockMenuPosition] = useState({ top: 0, left: 0 });
  const [blockMenuSearch, setBlockMenuSearch] = useState('');

  // 同步外部标题
  useEffect(() => {
    if (externalTitle !== undefined && externalTitle !== editorState.title) {
      editorState.setTitle(externalTitle);
    }
  }, [externalTitle]);

  // 标题变化同步到外部
  const handleTitleChange = useCallback((newTitle: string) => {
    editorState.setTitle(newTitle);
    setExternalTitle?.(newTitle);
  }, [editorState, setExternalTitle]);

  // 初始化编辑器内容
  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent;
      editorState.updateStats(initialContent);
      editorState.updateOutline(editorRef.current);
    }
  }, []);

  // 处理内容输入
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;

    const html = editorRef.current.innerHTML;

    // 推送到历史记录
    history.pushHistory(html);

    // 更新统计和大纲
    editorState.updateStats(html);
    editorState.updateOutline(editorRef.current);

    // 通知外部
    onContentChange?.(html);
  }, [history, editorState, onContentChange]);

  // 执行编辑命令
  const execCommand = useCallback((command: string, value?: string) => {
    // 确保焦点在编辑器上
    editorRef.current?.focus();

    // 特殊命令处理
    if (command === 'insertImage') {
      setShowImageHandler(true);
      return;
    }

    if (command === 'insertTable') {
      insertTable();
      return;
    }

    // 执行标准命令
    document.execCommand(command, false, value);
    handleInput();
  }, [handleInput]);

  // 插入表格
  const insertTable = useCallback(() => {
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr>
            <th style="border: 1px solid #C4B8A3; padding: 8px; background: #F5F1EC;">标题1</th>
            <th style="border: 1px solid #C4B8A3; padding: 8px; background: #F5F1EC;">标题2</th>
            <th style="border: 1px solid #C4B8A3; padding: 8px; background: #F5F1EC;">标题3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #C4B8A3; padding: 8px;">内容</td>
            <td style="border: 1px solid #C4B8A3; padding: 8px;">内容</td>
            <td style="border: 1px solid #C4B8A3; padding: 8px;">内容</td>
          </tr>
          <tr>
            <td style="border: 1px solid #C4B8A3; padding: 8px;">内容</td>
            <td style="border: 1px solid #C4B8A3; padding: 8px;">内容</td>
            <td style="border: 1px solid #C4B8A3; padding: 8px;">内容</td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `;
    document.execCommand('insertHTML', false, tableHtml);
    handleInput();
  }, [handleInput]);

  // 插入图片
  const handleInsertImage = useCallback((imageUrl: string, alt?: string) => {
    const imgHtml = `<img src="${imageUrl}" alt="${alt || ''}" style="max-width: 100%; height: auto; margin: 16px 0; border-radius: 8px;" />`;
    document.execCommand('insertHTML', false, imgHtml);
    handleInput();
  }, [handleInput]);

  // 撤销
  const handleUndo = useCallback(() => {
    const content = history.undo();
    if (content !== null && editorRef.current) {
      editorRef.current.innerHTML = content;
      editorState.updateStats(content);
      editorState.updateOutline(editorRef.current);
      onContentChange?.(content);
    }
  }, [history, editorState, onContentChange]);

  // 重做
  const handleRedo = useCallback(() => {
    const content = history.redo();
    if (content !== null && editorRef.current) {
      editorRef.current.innerHTML = content;
      editorState.updateStats(content);
      editorState.updateOutline(editorRef.current);
      onContentChange?.(content);
    }
  }, [history, editorState, onContentChange]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 仅在编辑器有焦点时处理
      if (!editorRef.current?.contains(document.activeElement)) return;

      const isMod = e.ctrlKey || e.metaKey;

      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((isMod && e.key === 'y') || (isMod && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        handleRedo();
      } else if (isMod && e.key === 'b') {
        e.preventDefault();
        execCommand('bold');
      } else if (isMod && e.key === 'i') {
        e.preventDefault();
        execCommand('italic');
      } else if (isMod && e.key === 'u') {
        e.preventDefault();
        execCommand('underline');
      }

      // "/" 触发块级菜单
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setBlockMenuPosition({
            top: rect.bottom + window.scrollY + 4,
            left: rect.left + window.scrollX,
          });
          setBlockMenuVisible(true);
          setBlockMenuSearch('');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, execCommand]);

  // 块级菜单选择
  const handleBlockMenuSelect = useCallback((command: string, value?: string) => {
    setBlockMenuVisible(false);
    setBlockMenuSearch('');

    // 删除触发的 "/" 字符
    document.execCommand('delete', false);

    // 执行命令
    execCommand(command, value);
  }, [execCommand]);

  return (
    <div className="flex h-full bg-cream-50">
      {/* 大纲面板 */}
      {editorState.showOutline && (
        <OutlinePanel
          outline={editorState.outline}
          visible={editorState.showOutline}
          onClose={() => editorState.setShowOutline(false)}
        />
      )}

      {/* 主编辑区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 标题栏 */}
        <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-bronze-200">
          {/* 大纲切换 */}
          <button
            onClick={() => editorState.setShowOutline(!editorState.showOutline)}
            className={`p-2 rounded-lg transition-colors ${
              editorState.showOutline
                ? 'bg-orange-100 text-orange-600'
                : 'text-bronze-500 hover:bg-bronze-100'
            }`}
            title="切换大纲"
          >
            <i className="fas fa-list-tree" />
          </button>

          {/* 标题输入 */}
          <input
            type="text"
            value={editorState.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="输入文档标题..."
            className="flex-1 text-xl font-bold text-bronze-800 bg-transparent border-none outline-none focus:ring-0 placeholder:text-bronze-300"
          />

          {/* 缩放控制 */}
          <div className="flex items-center gap-2 text-bronze-500">
            <button
              onClick={() => editorState.setZoomLevel(Math.max(50, editorState.config.zoomLevel - 10))}
              className="p-1.5 hover:bg-bronze-100 rounded"
              title="缩小"
            >
              <i className="fas fa-minus text-xs" />
            </button>
            <span className="text-sm min-w-[40px] text-center">
              {editorState.config.zoomLevel}%
            </span>
            <button
              onClick={() => editorState.setZoomLevel(Math.min(200, editorState.config.zoomLevel + 10))}
              className="p-1.5 hover:bg-bronze-100 rounded"
              title="放大"
            >
              <i className="fas fa-plus text-xs" />
            </button>
          </div>
        </div>

        {/* 工具栏 */}
        <Toolbar
          onCommand={execCommand}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          activeFormats={selection.activeFormats}
          onInsertImage={() => setShowImageHandler(true)}
          onInsertTable={insertTable}
        />

        {/* 编辑区域 */}
        <div
          className="flex-1 overflow-auto p-6"
          style={{
            cursor: isPanMode ? 'grab' : 'text',
          }}
        >
          <div
            className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-bronze-200"
            style={{
              transform: `scale(${editorState.config.zoomLevel / 100})`,
              transformOrigin: 'top center',
              minHeight: '800px',
            }}
          >
            <div
              ref={editorRef}
              contentEditable={!isPanMode}
              suppressContentEditableWarning
              onInput={handleInput}
              className="p-12 outline-none prose prose-bronze max-w-none min-h-[700px] text-bronze-700"
              style={{
                fontFamily: editorState.config.fontFamily,
                fontSize: editorState.config.fontSize,
                lineHeight: editorState.config.lineHeight,
              }}
              data-placeholder="开始输入内容，或输入 / 快速插入..."
            />
          </div>
        </div>

        {/* 状态栏 */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-bronze-200 text-xs text-bronze-500">
          <div className="flex items-center gap-4">
            <span>
              <i className="fas fa-file-alt mr-1.5" />
              {editorState.stats.words} 字
            </span>
            <span>
              <i className="fas fa-paragraph mr-1.5" />
              {editorState.stats.paragraphs} 段落
            </span>
            <span>
              <i className="fas fa-text-width mr-1.5" />
              {editorState.stats.charsNoSpace} 字符
            </span>
          </div>

          <div className="flex items-center gap-4">
            {selection.hasSelection && (
              <span className="text-orange-600">
                <i className="fas fa-i-cursor mr-1.5" />
                已选择 {selection.getSelectionStats().words} 字
              </span>
            )}
            <span>
              <i className="fas fa-clock mr-1.5" />
              {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* 图片处理对话框 */}
      {showImageHandler && (
        <ImageHandler
          onInsert={handleInsertImage}
          onClose={() => setShowImageHandler(false)}
        />
      )}

      {/* 块级菜单 */}
      <BlockMenu
        visible={blockMenuVisible}
        position={blockMenuPosition}
        searchTerm={blockMenuSearch}
        onSelect={handleBlockMenuSelect}
        onClose={() => setBlockMenuVisible(false)}
      />

      {/* 空内容占位样式 */}
      <style jsx global>{`
        [data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9C8B72;
          pointer-events: none;
          position: absolute;
        }

        /* 引用样式 */
        blockquote {
          border-left: 4px solid #F97316;
          padding-left: 16px;
          margin: 16px 0;
          color: #5A4A36;
          font-style: italic;
        }

        /* 代码块样式 */
        pre {
          background: #352A1E;
          color: #F5F1EC;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          font-family: monospace;
          margin: 16px 0;
        }

        /* 标题样式 */
        h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; color: #352A1E; }
        h2 { font-size: 1.5em; font-weight: bold; margin: 0.83em 0; color: #352A1E; }
        h3 { font-size: 1.17em; font-weight: bold; margin: 1em 0; color: #473929; }
        h4 { font-size: 1em; font-weight: bold; margin: 1.33em 0; color: #473929; }

        /* 列表样式 */
        ul, ol {
          padding-left: 24px;
          margin: 16px 0;
        }

        /* 高亮过渡 */
        .bg-orange-100 {
          transition: background-color 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default Editor;
