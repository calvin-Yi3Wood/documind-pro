/**
 * BlockMenu - 块级菜单
 *
 * 在新行输入 "/" 时显示的快速插入菜单
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';

interface BlockMenuItem {
  id: string;
  icon: string;
  label: string;
  description: string;
  command: string;
  value?: string;
  category: 'heading' | 'list' | 'block' | 'media';
}

interface BlockMenuProps {
  /** 是否显示 */
  visible: boolean;
  /** 菜单位置 */
  position: { top: number; left: number };
  /** 搜索关键词 */
  searchTerm?: string;
  /** 选择菜单项回调 */
  onSelect: (command: string, value?: string) => void;
  /** 关闭菜单回调 */
  onClose: () => void;
}

// 菜单项配置
const MENU_ITEMS: BlockMenuItem[] = [
  // 标题
  { id: 'h1', icon: 'fa-heading', label: '标题 1', description: '大标题', command: 'formatBlock', value: 'H1', category: 'heading' },
  { id: 'h2', icon: 'fa-heading', label: '标题 2', description: '中标题', command: 'formatBlock', value: 'H2', category: 'heading' },
  { id: 'h3', icon: 'fa-heading', label: '标题 3', description: '小标题', command: 'formatBlock', value: 'H3', category: 'heading' },
  // 列表
  { id: 'ul', icon: 'fa-list-ul', label: '无序列表', description: '项目符号列表', command: 'insertUnorderedList', category: 'list' },
  { id: 'ol', icon: 'fa-list-ol', label: '有序列表', description: '编号列表', command: 'insertOrderedList', category: 'list' },
  // 块级元素
  { id: 'quote', icon: 'fa-quote-left', label: '引用', description: '引用块', command: 'formatBlock', value: 'BLOCKQUOTE', category: 'block' },
  { id: 'code', icon: 'fa-code', label: '代码块', description: '代码片段', command: 'formatBlock', value: 'PRE', category: 'block' },
  // 媒体
  { id: 'image', icon: 'fa-image', label: '图片', description: '插入图片', command: 'insertImage', category: 'media' },
  { id: 'table', icon: 'fa-table', label: '表格', description: '插入表格', command: 'insertTable', category: 'media' },
  { id: 'divider', icon: 'fa-minus', label: '分隔线', description: '水平分隔线', command: 'insertHorizontalRule', category: 'block' },
];

// 分类标签
const CATEGORY_LABELS: Record<string, string> = {
  heading: '标题',
  list: '列表',
  block: '块元素',
  media: '媒体',
};

/**
 * 块级菜单组件
 */
export const BlockMenu: React.FC<BlockMenuProps> = ({
  visible,
  position,
  searchTerm = '',
  onSelect,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 过滤菜单项
  const filteredItems = useMemo(() => {
    if (!searchTerm) return MENU_ITEMS;
    const term = searchTerm.toLowerCase();
    return MENU_ITEMS.filter(
      item =>
        item.label.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  // 按分类分组
  const groupedItems = useMemo(() => {
    const groups: Record<string, BlockMenuItem[]> = {};
    for (const item of filteredItems) {
      const category = item.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      const categoryArray = groups[category];
      if (categoryArray) {
        categoryArray.push(item);
      }
    }
    return groups;
  }, [filteredItems]);

  // 重置选中索引
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  // 键盘导航
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < filteredItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : filteredItems.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            const item = filteredItems[selectedIndex];
            onSelect(item.command, item.value);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, filteredItems, selectedIndex, onSelect, onClose]);

  // 处理点击选择
  const handleItemClick = useCallback((item: BlockMenuItem) => {
    onSelect(item.command, item.value);
  }, [onSelect]);

  if (!visible || filteredItems.length === 0) return null;

  // 计算全局索引用于选中状态
  let globalIndex = 0;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* 菜单 */}
      <div
        className="fixed z-50 bg-white border border-bronze-200 rounded-xl shadow-xl py-2 min-w-[280px] max-h-[320px] overflow-y-auto"
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        {/* 标题 */}
        <div className="px-3 py-2 text-xs font-medium text-bronze-500 border-b border-bronze-100 mb-1">
          {searchTerm ? (
            <span>搜索: {searchTerm}</span>
          ) : (
            <span>快速插入</span>
          )}
        </div>

        {/* 分组列表 */}
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category}>
            {/* 分类标签 */}
            <div className="px-3 py-1.5 text-[10px] font-medium text-bronze-400 uppercase tracking-wider">
              {CATEGORY_LABELS[category] || category}
            </div>

            {/* 菜单项 */}
            {items.map((item) => {
              const currentIndex = globalIndex++;
              const isSelected = currentIndex === selectedIndex;

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`w-full px-3 py-2 flex items-center gap-3 transition-colors ${
                    isSelected
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-bronze-700 hover:bg-bronze-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-orange-100' : 'bg-bronze-100'
                  }`}>
                    <i className={`fas ${item.icon} text-sm ${
                      isSelected ? 'text-orange-600' : 'text-bronze-500'
                    }`} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-bronze-500">{item.description}</div>
                  </div>
                  {isSelected && (
                    <div className="text-xs text-bronze-400">
                      <kbd className="px-1.5 py-0.5 bg-bronze-100 rounded">Enter</kbd>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* 无结果 */}
        {filteredItems.length === 0 && (
          <div className="px-3 py-4 text-center text-bronze-400 text-sm">
            <i className="fas fa-search mb-2 block text-lg opacity-50" />
            没有找到匹配的命令
          </div>
        )}
      </div>
    </>
  );
};

export default BlockMenu;
