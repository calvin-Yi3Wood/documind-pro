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
 * - 格式刷功能
 * - AI 自动补全 (Ghost Text)
 * - 段落拖拽排序
 * - 图片高级编辑
 * - 右键上下文菜单
 * - AI 段落改写
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Toolbar } from './Toolbar';
import { OutlinePanel } from './OutlinePanel';
import { ImageHandler } from './ImageHandler';
import { BlockMenu } from './BlockMenu';
import { ContextMenu } from './ContextMenu';
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
  /** AI 自动补全预测函数 */
  predictCompletion?: (text: string) => Promise<string | null>;
  /** 字体列表 */
  fontFamily?: string;
  /** 字体大小 */
  fontSize?: number;
}

/**
 * 文档编辑器组件
 */
const Editor: React.FC<EditorProps> = ({
  initialContent = '',
  onContentChange,
  title: externalTitle,
  setTitle: setExternalTitle,
  onSelectionAction,
  onAddToContext,
  isPanMode = false,
  predictCompletion,
  fontFamily: _externalFontFamily,
  fontSize: _externalFontSize,
}) => {
  // 备注: _externalFontFamily 和 _externalFontSize 可用于未来的字体同步功能
  // 编辑器DOM引用
  const editorRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // 使用自定义Hooks
  const history = useHistory(initialContent, { maxHistory: 50, debounceMs: 500 });
  const selection = useSelection(editorRef as React.RefObject<HTMLDivElement>);
  const editorState = useEditorState(externalTitle || '');

  // 本地状态
  const [showImageHandler, setShowImageHandler] = useState(false);
  const [blockMenuVisible, setBlockMenuVisible] = useState(false);
  const [blockMenuPosition, setBlockMenuPosition] = useState({ top: 0, left: 0 });
  const [blockMenuSearch, setBlockMenuSearch] = useState('');

  // 🎨 格式刷状态
  const [isFormatPainterActive, setIsFormatPainterActive] = useState(false);
  const [formatPainterStyle, setFormatPainterStyle] = useState<any>(null);

  // 🤖 AI 自动补全状态
  const [isAutocompleteEnabled, setIsAutocompleteEnabled] = useState(false);
  const [ghostText, setGhostText] = useState<string | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  // 🔄 段落拖拽状态
  const [draggedElement, setDraggedElement] = useState<HTMLElement | null>(null);

  // 🖼️ 图片编辑状态 (用于 ImageEditor 组件集成)
  const [_showImageEditor, setShowImageEditor] = useState(false);
  const [editingImage, setEditingImage] = useState<{ src: string; wrapper: HTMLElement } | null>(null);
  void _showImageEditor; // 供未来 ImageEditor modal 使用

  // 📋 右键菜单状态
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuSelection, setContextMenuSelection] = useState<string>('');

  // 📝 Block Handle 状态
  const [hoverBlockTop, setHoverBlockTop] = useState<number | null>(null);
  const [activeBlockElement, setActiveBlockElement] = useState<HTMLElement | null>(null);
  const [isBlockMenuOpen, setIsBlockMenuOpen] = useState(false);

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

  // ==================== 格式刷功能 ====================

  /** 捕获当前格式 */
  const captureFormat = useCallback(() => {
    const styles = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      fontName: document.queryCommandValue('fontName'),
      fontSize: document.queryCommandValue('fontSize'),
      foreColor: document.queryCommandValue('foreColor'),
      hiliteColor: document.queryCommandValue('hiliteColor')
    };
    setFormatPainterStyle(styles);
    setIsFormatPainterActive(true);
    console.log('🎨 格式已捕获:', styles);
  }, []);

  /** 应用格式刷 */
  const applyFormatPainter = useCallback((styles: any) => {
    if (!styles) return;
    if (styles.bold !== document.queryCommandState('bold')) document.execCommand('bold');
    if (styles.italic !== document.queryCommandState('italic')) document.execCommand('italic');
    if (styles.underline !== document.queryCommandState('underline')) document.execCommand('underline');
    if (styles.fontName) document.execCommand('fontName', false, styles.fontName);
    if (styles.fontSize) document.execCommand('fontSize', false, styles.fontSize);
    if (styles.foreColor) document.execCommand('foreColor', false, styles.foreColor);
    if (styles.hiliteColor) document.execCommand('hiliteColor', false, styles.hiliteColor);
    handleInput();
    console.log('✅ 格式已应用');
  }, [handleInput]);

  // ==================== AI 自动补全 (Ghost Text) ====================

  /** 触发自动补全 */
  const triggerAutocomplete = useCallback(async () => {
    if (!editorRef.current || !predictCompletion || !isAutocompleteEnabled) return;

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const textContent = editorRef.current.innerText;
    if (textContent.length < 10) return;

    const range = sel.getRangeAt(0);
    const prediction = await predictCompletion(textContent);

    if (prediction && prediction.length > 0) {
      const span = document.createElement('span');
      span.className = 'ghost-text';
      span.setAttribute('contenteditable', 'false');
      span.innerText = prediction;

      try {
        range.insertNode(span);
        setGhostText(prediction);
        range.setStartBefore(span);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) {
        console.log('Failed to insert ghost text', e);
      }
    }
  }, [predictCompletion, isAutocompleteEnabled]);

  /** 接受 Ghost Text */
  const acceptGhostText = useCallback(() => {
    if (!editorRef.current || !ghostText) return;

    const ghostSpan = editorRef.current.querySelector('.ghost-text');
    if (ghostSpan) {
      const text = ghostSpan.textContent || '';
      const textNode = document.createTextNode(text);
      ghostSpan.parentNode?.replaceChild(textNode, ghostSpan);

      // 移动光标到文本末尾
      const range = document.createRange();
      range.setStartAfter(textNode);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);

      setGhostText(null);
      handleInput();
    }
  }, [ghostText, handleInput]);

  /** 清除 Ghost Text */
  const clearGhostText = useCallback(() => {
    if (!editorRef.current) return;
    const ghostSpan = editorRef.current.querySelector('.ghost-text');
    if (ghostSpan) {
      ghostSpan.remove();
      setGhostText(null);
    }
  }, []);

  // ==================== 右键上下文菜单 ====================

  /** 处理右键菜单 */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const sel = window.getSelection();
    const selectedText = sel?.toString() || '';
    setContextMenuSelection(selectedText);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  /** 右键菜单操作 */
  const handleContextMenuAction = useCallback((action: string) => {
    switch (action) {
      case 'cut':
        document.execCommand('cut');
        break;
      case 'copy':
        document.execCommand('copy');
        break;
      case 'paste':
        navigator.clipboard.readText().then(text => {
          document.execCommand('insertText', false, text);
        });
        break;
      case 'selectAll':
        document.execCommand('selectAll');
        break;
      case 'aiRewrite':
        if (contextMenuSelection && onSelectionAction) {
          onSelectionAction('rewrite', contextMenuSelection);
        }
        break;
      case 'aiExpand':
        if (contextMenuSelection && onSelectionAction) {
          onSelectionAction('expand', contextMenuSelection);
        }
        break;
      case 'aiSummarize':
        if (contextMenuSelection && onSelectionAction) {
          onSelectionAction('summarize', contextMenuSelection);
        }
        break;
      case 'addToContext':
        if (contextMenuSelection && onAddToContext) {
          onAddToContext(contextMenuSelection);
        }
        break;
    }
    setContextMenuPos(null);
  }, [contextMenuSelection, onSelectionAction, onAddToContext]);

  // ==================== 图片高级编辑 ====================

  /** 使现有图片可编辑 (添加 wrapper、删除按钮、编辑按钮、调整大小手柄) */
  const makeExistingImagesEditable = useCallback(() => {
    if (!editorRef.current) return;

    const allImages = editorRef.current.querySelectorAll('img:not(.processed-image)');

    allImages.forEach((img) => {
      const imgElement = img as HTMLImageElement;

      // 标记为已处理
      imgElement.classList.add('processed-image');

      // 创建包装 div
      const wrapper = document.createElement('div');
      wrapper.className = 'image-wrapper';
      wrapper.contentEditable = 'false';
      wrapper.style.cssText = 'position: relative; display: inline-block; margin: 10px 0; max-width: 100%;';

      // 创建删除按钮
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'image-delete-btn';
      deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
      deleteBtn.style.cssText = `
        position: absolute; top: 8px; right: 8px; width: 28px; height: 28px;
        background: rgba(220, 38, 38, 0.9); color: white; border: none; border-radius: 6px;
        cursor: pointer; display: none; align-items: center; justify-content: center;
        font-size: 12px; transition: all 0.2s; z-index: 10;
      `;
      deleteBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        wrapper.remove();
        handleInput();
      };

      // 创建编辑按钮
      const editBtn = document.createElement('button');
      editBtn.className = 'image-edit-btn';
      editBtn.innerHTML = '<i class="fas fa-edit"></i>';
      editBtn.style.cssText = `
        position: absolute; top: 8px; right: 44px; width: 28px; height: 28px;
        background: rgba(59, 130, 246, 0.9); color: white; border: none; border-radius: 6px;
        cursor: pointer; display: none; align-items: center; justify-content: center;
        font-size: 12px; transition: all 0.2s; z-index: 10;
      `;
      editBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingImage({ src: imgElement.src, wrapper });
        setShowImageEditor(true);
      };

      // 创建调整大小手柄
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'image-resize-handle';
      resizeHandle.style.cssText = `
        position: absolute; bottom: 0; right: 0; width: 16px; height: 16px;
        background: linear-gradient(135deg, transparent 50%, #F97316 50%);
        cursor: nwse-resize; display: none; z-index: 10;
      `;

      // 调整大小逻辑
      let isResizing = false;
      let startX = 0;
      let startWidth = 0;

      resizeHandle.onmousedown = (e) => {
        e.preventDefault();
        isResizing = true;
        startX = e.clientX;
        startWidth = imgElement.offsetWidth;
        document.body.style.cursor = 'nwse-resize';
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing) return;
        const deltaX = e.clientX - startX;
        const newWidth = Math.max(100, Math.min(startWidth + deltaX, editorRef.current?.offsetWidth || 800));
        imgElement.style.width = newWidth + 'px';
        imgElement.style.maxWidth = 'none';
      };

      const handleMouseUp = () => {
        if (isResizing) {
          isResizing = false;
          document.body.style.cursor = 'default';
          handleInput();
        }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      // 鼠标悬停显示控制按钮
      wrapper.onmouseenter = () => {
        deleteBtn.style.display = 'flex';
        editBtn.style.display = 'flex';
        resizeHandle.style.display = 'block';
      };
      wrapper.onmouseleave = () => {
        if (!isResizing) {
          deleteBtn.style.display = 'none';
          editBtn.style.display = 'none';
          resizeHandle.style.display = 'none';
        }
      };

      // 在原始图片位置插入 wrapper
      imgElement.parentNode?.insertBefore(wrapper, imgElement);
      wrapper.appendChild(imgElement);
      wrapper.appendChild(deleteBtn);
      wrapper.appendChild(editBtn);
      wrapper.appendChild(resizeHandle);
    });
  }, [handleInput]);

  /** 处理粘贴事件 (使粘贴的图片可编辑) */
  const handlePaste = useCallback(() => {
    setTimeout(() => makeExistingImagesEditable(), 300);
    setTimeout(() => makeExistingImagesEditable(), 800);
  }, [makeExistingImagesEditable]);

  /** 保存编辑后的图片 */
  const _handleSaveEditedImage = useCallback((editedImageDataUrl: string) => {
    if (!editingImage) return;

    const { wrapper } = editingImage;
    const img = wrapper.querySelector('img');
    if (img) {
      img.src = editedImageDataUrl;
      handleInput();
      console.log('✅ 图片编辑已保存');
    }

    setShowImageEditor(false);
    setEditingImage(null);
  }, [editingImage, handleInput]);
  void _handleSaveEditedImage; // 保留供未来ImageEditor使用

  // 关闭右键菜单
  useEffect(() => {
    if (!contextMenuPos) return;
    const handleClickOutside = () => setContextMenuPos(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenuPos]);

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

      // Tab 键接受 Ghost Text
      if (e.key === 'Tab' && ghostText) {
        e.preventDefault();
        acceptGhostText();
        return;
      }

      // Escape 键清除 Ghost Text 或取消格式刷
      if (e.key === 'Escape') {
        if (ghostText) {
          clearGhostText();
        }
        if (isFormatPainterActive) {
          setIsFormatPainterActive(false);
          setFormatPainterStyle(null);
        }
        return;
      }

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

      // 清除 Ghost Text (任意其他按键)
      if (ghostText && !['Tab', 'Escape'].includes(e.key)) {
        clearGhostText();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, execCommand, ghostText, acceptGhostText, clearGhostText, isFormatPainterActive]);

  // AI 自动补全触发 (输入后延迟触发)
  useEffect(() => {
    if (!isAutocompleteEnabled) return;

    const handleInputForAutocomplete = () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        triggerAutocomplete();
      }, 1500); // 1.5秒后触发
    };

    editorRef.current?.addEventListener('input', handleInputForAutocomplete);
    return () => {
      editorRef.current?.removeEventListener('input', handleInputForAutocomplete);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isAutocompleteEnabled, triggerAutocomplete]);

  // 块级菜单选择
  const handleBlockMenuSelect = useCallback((command: string, value?: string) => {
    setBlockMenuVisible(false);
    setBlockMenuSearch('');

    // 删除触发的 "/" 字符
    document.execCommand('delete', false);

    // 执行命令
    execCommand(command, value);
  }, [execCommand]);

  // ==================== 段落拖拽排序 & AI改写 (T按钮) ====================

  /** 鼠标移动时检测悬停的段落 */
  const handleEditorMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanMode || isBlockMenuOpen) return;

    const target = e.target as HTMLElement;
    const block = target.closest('p, h1, h2, h3, li, blockquote, div');

    if (block && editorRef.current?.contains(block) && pageRef.current && block !== editorRef.current) {
      const blockRect = block.getBoundingClientRect();
      const pageRect = pageRef.current.getBoundingClientRect();
      const top = blockRect.top - pageRect.top;

      setHoverBlockTop(top);
      setActiveBlockElement(block as HTMLElement);
    }
  }, [isPanMode, isBlockMenuOpen]);

  /** 打开 AI 改写菜单 */
  const openBlockMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBlockMenuOpen(true);
  }, []);

  /** AI 改写菜单操作 */
  const handleBlockMenuAction = useCallback((action: string) => {
    if (!activeBlockElement) return;
    const text = activeBlockElement.innerText;

    let prompt = "";
    if (action === 'improve') prompt = "请润色并优化这段文字，使其更专业流畅。";
    if (action === 'expand') prompt = "请扩写这段文字，增加细节和深度。";
    if (action === 'shorten') prompt = "请精简这段文字，保留核心含义。";
    if (action === 'translate') prompt = "请将这段文字翻译成英文。";
    if (action === 'delete') {
      activeBlockElement.remove();
      handleInput();
      setIsBlockMenuOpen(false);
      return;
    }

    onSelectionAction?.('block_edit', text, prompt);
    setIsBlockMenuOpen(false);
  }, [activeBlockElement, onSelectionAction, handleInput]);

  /** 段落拖拽开始 */
  const handleBlockDragStart = useCallback((e: React.DragEvent) => {
    if (!activeBlockElement) return;
    setDraggedElement(activeBlockElement);
    activeBlockElement.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', activeBlockElement.outerHTML);
  }, [activeBlockElement]);

  /** 段落拖拽经过 */
  const handleBlockDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const target = (e.target as HTMLElement).closest('p, h1, h2, h3, ul, ol, blockquote, table') as HTMLElement;
    if (target && draggedElement && target !== draggedElement && editorRef.current?.contains(target)) {
      const rect = target.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;

      if (e.clientY < midpoint) {
        target.parentNode?.insertBefore(draggedElement, target);
      } else {
        target.parentNode?.insertBefore(draggedElement, target.nextSibling);
      }
    }
  }, [draggedElement]);

  /** 段落拖拽结束 */
  const handleBlockDragEnd = useCallback(() => {
    if (draggedElement) {
      draggedElement.style.opacity = '1';
      setDraggedElement(null);
      handleInput();
    }
  }, [draggedElement, handleInput]);

  // 关闭 AI 改写菜单
  useEffect(() => {
    if (!isBlockMenuOpen) return;
    const handleClickOutside = () => setIsBlockMenuOpen(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isBlockMenuOpen]);

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
          // 格式刷功能
          isFormatPainterActive={isFormatPainterActive}
          onFormatPainterCapture={captureFormat}
          onFormatPainterCancel={() => {
            setIsFormatPainterActive(false);
            setFormatPainterStyle(null);
          }}
          // AI 自动补全
          isAutocompleteEnabled={isAutocompleteEnabled}
          onAutocompleteToggle={() => setIsAutocompleteEnabled(!isAutocompleteEnabled)}
        />

        {/* 编辑区域 */}
        <div
          ref={pageRef}
          className="flex-1 overflow-auto p-6 relative"
          style={{
            cursor: isPanMode ? 'grab' : isFormatPainterActive ? 'crosshair' : 'text',
          }}
          onMouseMove={handleEditorMouseMove}
        >
          <div
            className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-bronze-200 relative"
            style={{
              transform: `scale(${editorState.config.zoomLevel / 100})`,
              transformOrigin: 'top center',
              minHeight: '800px',
            }}
          >
            {/* 📝 Block Handle & AI "T" 按钮 */}
            {!isPanMode && hoverBlockTop !== null && (
              <div
                className={`block-handle-container ${isBlockMenuOpen ? 'visible' : ''}`}
                style={{
                  top: hoverBlockTop,
                  opacity: 1,
                  pointerEvents: 'auto',
                }}
              >
                {/* AI 改写按钮 (T) */}
                <div
                  className="handle-btn handle-btn-ai"
                  title="AI 助手 (点击展开)"
                  onClick={openBlockMenu}
                >
                  T
                </div>
                {/* 拖拽手柄 */}
                <div
                  className="handle-btn handle-btn-drag"
                  title="拖拽段落"
                  draggable
                  onDragStart={handleBlockDragStart}
                  onDragEnd={handleBlockDragEnd}
                >
                  <i className="fas fa-grip-vertical text-[10px]" />
                </div>

                {/* AI 改写菜单弹出层 */}
                {isBlockMenuOpen && (
                  <div
                    className="absolute left-full ml-2 top-0 w-40 bg-cream-50 rounded-lg shadow-lg border border-bronze-200 py-1 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3 py-1.5 border-b border-bronze-100 bg-bronze-50 text-[10px] font-bold text-bronze-400 uppercase tracking-wider">
                      AI 智能改写
                    </div>
                    <button
                      onClick={() => handleBlockMenuAction('improve')}
                      className="w-full text-left px-3 py-2 hover:bg-bronze-50 text-xs text-bronze-700 flex items-center gap-2"
                    >
                      <i className="fas fa-magic text-purple-500 w-4" />
                      <span>润色优化</span>
                    </button>
                    <button
                      onClick={() => handleBlockMenuAction('expand')}
                      className="w-full text-left px-3 py-2 hover:bg-bronze-50 text-xs text-bronze-700 flex items-center gap-2"
                    >
                      <i className="fas fa-align-left text-blue-500 w-4" />
                      <span>扩写内容</span>
                    </button>
                    <button
                      onClick={() => handleBlockMenuAction('shorten')}
                      className="w-full text-left px-3 py-2 hover:bg-bronze-50 text-xs text-bronze-700 flex items-center gap-2"
                    >
                      <i className="fas fa-compress-alt text-orange-500 w-4" />
                      <span>精简摘要</span>
                    </button>
                    <div className="h-px bg-bronze-100 my-1" />
                    <button
                      onClick={() => handleBlockMenuAction('translate')}
                      className="w-full text-left px-3 py-2 hover:bg-bronze-50 text-xs text-bronze-700 flex items-center gap-2"
                    >
                      <i className="fas fa-language text-green-500 w-4" />
                      <span>翻译成英文</span>
                    </button>
                    <button
                      onClick={() => handleBlockMenuAction('delete')}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 text-xs text-red-600 flex items-center gap-2"
                    >
                      <i className="fas fa-trash w-4" />
                      <span>删除段落</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <div
              ref={editorRef}
              contentEditable={!isPanMode}
              suppressContentEditableWarning
              onInput={handleInput}
              onContextMenu={handleContextMenu}
              onPaste={handlePaste}
              onDragOver={handleBlockDragOver}
              onClick={() => {
                // 格式刷点击应用
                if (isFormatPainterActive && formatPainterStyle) {
                  applyFormatPainter(formatPainterStyle);
                  setIsFormatPainterActive(false);
                  setFormatPainterStyle(null);
                }
              }}
              className={`p-12 outline-none prose prose-bronze max-w-none min-h-[700px] text-bronze-700 ${
                isFormatPainterActive ? 'cursor-crosshair' : ''
              }`}
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
            {/* 格式刷激活状态 */}
            {isFormatPainterActive && (
              <span className="text-orange-600 animate-pulse">
                <i className="fas fa-paint-roller mr-1.5" />
                格式刷已激活 (点击应用/Esc取消)
              </span>
            )}
            {/* AI 自动补全状态 */}
            {isAutocompleteEnabled && (
              <span className="text-blue-500">
                <i className="fas fa-robot mr-1.5" />
                AI续写已开启
              </span>
            )}
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

      {/* 右键上下文菜单 */}
      {contextMenuPos && (
        <ContextMenu
          position={contextMenuPos}
          hasSelection={!!contextMenuSelection}
          onAction={handleContextMenuAction}
          onClose={() => setContextMenuPos(null)}
        />
      )}

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

        /* Ghost Text 自动补全样式 */
        .ghost-text {
          color: #9CA3AF;
          opacity: 0.6;
          font-style: italic;
          pointer-events: none;
          user-select: none;
        }

        /* 图片包装器样式 */
        .image-wrapper {
          position: relative;
          display: inline-block;
          margin: 10px 0;
          max-width: 100%;
        }

        .image-wrapper img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          display: block;
        }

        .image-wrapper:hover .image-delete-btn,
        .image-wrapper:hover .image-edit-btn,
        .image-wrapper:hover .image-resize-handle {
          display: flex !important;
        }

        /* 格式刷激活时的光标 */
        .cursor-crosshair {
          cursor: crosshair !important;
        }

        /* Block Handle 样式 (T按钮和拖拽手柄) */
        .block-handle-container {
          position: absolute;
          left: 4px;
          z-index: 50;
          display: flex;
          flex-direction: column;
          gap: 2px;
          opacity: 0;
          transition: opacity 0.15s ease;
          pointer-events: none;
        }
        .block-handle-container:hover,
        .block-handle-container.visible {
          opacity: 1;
          pointer-events: auto;
        }

        .handle-btn {
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.15s ease;
          cursor: pointer;
          font-size: 12px;
          font-weight: bold;
        }

        .handle-btn-ai {
          width: 24px;
          color: #6B5A42;
          background: #FDFBF7;
          border: 1px solid #E6DFD4;
        }
        .handle-btn-ai:hover {
          background: #E6DFD4;
          color: #473929;
        }

        .handle-btn-drag {
          width: 16px;
          color: #C4B8A3;
          cursor: grab;
        }
        .handle-btn-drag:hover {
          color: #7D6A51;
          background: #F8F2E5;
        }
        .handle-btn-drag:active {
          cursor: grabbing;
        }

        /* 拖拽时的占位符样式 */
        [draggable="true"] {
          user-select: none;
        }

        .dragging {
          opacity: 0.4 !important;
        }
      `}</style>
    </div>
  );
};

export default Editor;
