/**
 * Toolbar - 编辑器工具栏
 *
 * 提供格式化按钮、标题选择、对齐方式等功能
 */

'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface ToolbarProps {
  /** 执行编辑命令 */
  onCommand: (command: string, value?: string) => void;
  /** 撤销 */
  onUndo?: () => void;
  /** 重做 */
  onRedo?: () => void;
  /** 是否可以撤销 */
  canUndo?: boolean;
  /** 是否可以重做 */
  canRedo?: boolean;
  /** 当前激活的格式 */
  activeFormats?: string[];
  /** 插入图片回调 */
  onInsertImage?: () => void;
  /** 插入表格回调 */
  onInsertTable?: () => void;
}

/**
 * 编辑器工具栏组件
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  onCommand,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  activeFormats = [],
  onInsertImage,
  onInsertTable,
}) => {
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);

  // 检查格式是否激活
  const isActive = useCallback((format: string) => {
    return activeFormats.includes(format);
  }, [activeFormats]);

  // 格式按钮样式
  const getButtonClass = (format: string) => {
    return isActive(format)
      ? 'bg-bronze-100 text-orange-600'
      : 'text-bronze-600 hover:bg-bronze-50';
  };

  // 分隔线
  const Divider = () => (
    <div className="h-6 w-px bg-bronze-200 mx-1" />
  );

  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-white border-b border-bronze-200 flex-wrap">
      {/* 撤销/重做 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onUndo}
        disabled={!canUndo}
        title="撤销 (Ctrl+Z)"
        className="p-2"
      >
        <i className="fas fa-undo text-bronze-600" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRedo}
        disabled={!canRedo}
        title="重做 (Ctrl+Y)"
        className="p-2"
      >
        <i className="fas fa-redo text-bronze-600" />
      </Button>

      <Divider />

      {/* 文字格式 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onCommand('bold')}
        title="粗体 (Ctrl+B)"
        className={`p-2 ${getButtonClass('bold')}`}
      >
        <i className="fas fa-bold" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onCommand('italic')}
        title="斜体 (Ctrl+I)"
        className={`p-2 ${getButtonClass('italic')}`}
      >
        <i className="fas fa-italic" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onCommand('underline')}
        title="下划线 (Ctrl+U)"
        className={`p-2 ${getButtonClass('underline')}`}
      >
        <i className="fas fa-underline" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onCommand('strikeThrough')}
        title="删除线"
        className={`p-2 ${getButtonClass('strikeThrough')}`}
      >
        <i className="fas fa-strikethrough" />
      </Button>

      <Divider />

      {/* 标题 */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowHeadingMenu(!showHeadingMenu)}
          title="标题"
          className="p-2 text-bronze-600 hover:bg-bronze-50 flex items-center gap-1"
        >
          <i className="fas fa-heading" />
          <i className="fas fa-chevron-down text-xs" />
        </Button>

        {showHeadingMenu && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-bronze-200 rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
            <button
              className="w-full px-3 py-1.5 text-left hover:bg-bronze-50 text-xl font-bold"
              onClick={() => { onCommand('formatBlock', 'H1'); setShowHeadingMenu(false); }}
            >
              标题 1
            </button>
            <button
              className="w-full px-3 py-1.5 text-left hover:bg-bronze-50 text-lg font-bold"
              onClick={() => { onCommand('formatBlock', 'H2'); setShowHeadingMenu(false); }}
            >
              标题 2
            </button>
            <button
              className="w-full px-3 py-1.5 text-left hover:bg-bronze-50 text-base font-bold"
              onClick={() => { onCommand('formatBlock', 'H3'); setShowHeadingMenu(false); }}
            >
              标题 3
            </button>
            <button
              className="w-full px-3 py-1.5 text-left hover:bg-bronze-50 text-sm font-semibold"
              onClick={() => { onCommand('formatBlock', 'H4'); setShowHeadingMenu(false); }}
            >
              标题 4
            </button>
            <div className="h-px bg-bronze-200 my-1" />
            <button
              className="w-full px-3 py-1.5 text-left hover:bg-bronze-50 text-sm"
              onClick={() => { onCommand('formatBlock', 'P'); setShowHeadingMenu(false); }}
            >
              正文
            </button>
          </div>
        )}
      </div>

      <Divider />

      {/* 列表 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onCommand('insertUnorderedList')}
        title="无序列表"
        className={`p-2 ${getButtonClass('unorderedList')}`}
      >
        <i className="fas fa-list-ul" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onCommand('insertOrderedList')}
        title="有序列表"
        className={`p-2 ${getButtonClass('orderedList')}`}
      >
        <i className="fas fa-list-ol" />
      </Button>

      <Divider />

      {/* 引用和代码 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onCommand('formatBlock', 'BLOCKQUOTE')}
        title="引用"
        className={`p-2 ${getButtonClass('blockquote')}`}
      >
        <i className="fas fa-quote-left" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onCommand('formatBlock', 'PRE')}
        title="代码块"
        className={`p-2 ${getButtonClass('code')}`}
      >
        <i className="fas fa-code" />
      </Button>

      <Divider />

      {/* 对齐 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onCommand('justifyLeft')}
        title="左对齐"
        className={`p-2 ${getButtonClass('alignLeft')}`}
      >
        <i className="fas fa-align-left" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onCommand('justifyCenter')}
        title="居中"
        className={`p-2 ${getButtonClass('alignCenter')}`}
      >
        <i className="fas fa-align-center" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onCommand('justifyRight')}
        title="右对齐"
        className={`p-2 ${getButtonClass('alignRight')}`}
      >
        <i className="fas fa-align-right" />
      </Button>

      <Divider />

      {/* 插入 */}
      {onInsertImage && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onInsertImage}
          title="插入图片"
          className="p-2 text-bronze-600 hover:bg-bronze-50"
        >
          <i className="fas fa-image" />
        </Button>
      )}
      {onInsertTable && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onInsertTable}
          title="插入表格"
          className="p-2 text-bronze-600 hover:bg-bronze-50"
        >
          <i className="fas fa-table" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const url = prompt('请输入链接地址:');
          if (url) onCommand('createLink', url);
        }}
        title="插入链接"
        className="p-2 text-bronze-600 hover:bg-bronze-50"
      >
        <i className="fas fa-link" />
      </Button>

      {/* 点击其他地方关闭菜单 */}
      {showHeadingMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowHeadingMenu(false)}
        />
      )}
    </div>
  );
};

export default Toolbar;
