/**
 * ContextMenu - 右键上下文菜单组件
 *
 * 提供编辑器右键菜单功能:
 * - 剪切、复制、粘贴
 * - 全选
 * - AI 改写、扩写、总结
 * - 添加到上下文
 */

'use client';

import { useEffect, useRef } from 'react';

interface ContextMenuProps {
  /** 菜单位置 */
  position: { x: number; y: number };
  /** 是否有选中文本 */
  hasSelection: boolean;
  /** 操作回调 */
  onAction: (action: string) => void;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * 右键上下文菜单组件
 */
export const ContextMenu: React.FC<ContextMenuProps> = ({
  position,
  hasSelection,
  onAction,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // 调整位置防止超出视口
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - 350),
  };

  const MenuItem = ({
    icon,
    label,
    action,
    shortcut,
    disabled = false,
    danger = false,
  }: {
    icon: string;
    label: string;
    action: string;
    shortcut?: string;
    disabled?: boolean;
    danger?: boolean;
  }) => (
    <button
      onClick={() => !disabled && onAction(action)}
      disabled={disabled}
      className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
        disabled
          ? 'text-bronze-300 cursor-not-allowed'
          : danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-bronze-700 hover:bg-bronze-50'
      }`}
    >
      <span className="flex items-center gap-2">
        <i className={`fas ${icon} w-4`} />
        {label}
      </span>
      {shortcut && (
        <span className="text-xs text-bronze-400">{shortcut}</span>
      )}
    </button>
  );

  const Divider = () => <div className="h-px bg-bronze-200 my-1" />;

  return (
    <div
      ref={menuRef}
      className="fixed z-[150] bg-white rounded-lg shadow-xl border border-bronze-200 py-1 min-w-[180px]"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* 基本编辑 */}
      <MenuItem icon="fa-cut" label="剪切" action="cut" shortcut="Ctrl+X" disabled={!hasSelection} />
      <MenuItem icon="fa-copy" label="复制" action="copy" shortcut="Ctrl+C" disabled={!hasSelection} />
      <MenuItem icon="fa-paste" label="粘贴" action="paste" shortcut="Ctrl+V" />
      <MenuItem icon="fa-object-group" label="全选" action="selectAll" shortcut="Ctrl+A" />

      <Divider />

      {/* AI 功能 */}
      <div className="px-3 py-1 text-xs text-bronze-400 font-medium">AI 功能</div>
      <MenuItem
        icon="fa-wand-magic-sparkles"
        label="AI 改写"
        action="aiRewrite"
        disabled={!hasSelection}
      />
      <MenuItem
        icon="fa-expand"
        label="AI 扩写"
        action="aiExpand"
        disabled={!hasSelection}
      />
      <MenuItem
        icon="fa-compress"
        label="AI 总结"
        action="aiSummarize"
        disabled={!hasSelection}
      />

      <Divider />

      {/* 其他 */}
      <MenuItem
        icon="fa-plus-circle"
        label="添加到上下文"
        action="addToContext"
        disabled={!hasSelection}
      />
    </div>
  );
};

export default ContextMenu;
