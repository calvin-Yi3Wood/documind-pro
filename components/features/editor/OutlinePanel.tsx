/**
 * OutlinePanel - 文档大纲面板
 *
 * 显示文档的标题层级结构，支持点击跳转
 */

'use client';

import { useState, useCallback } from 'react';

// 大纲节点类型
interface OutlineNode {
  id: string;
  text: string;
  level: number;
  children: OutlineNode[];
}

interface OutlinePanelProps {
  /** 大纲数据 */
  outline: OutlineNode[];
  /** 是否显示 */
  visible?: boolean;
  /** 关闭回调 */
  onClose?: () => void;
}

/**
 * 递归渲染大纲节点
 */
const OutlineItem: React.FC<{
  node: OutlineNode;
  onNavigate: (id: string) => void;
}> = ({ node, onNavigate }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  // 根据标题级别计算缩进和样式
  const getStyles = () => {
    const baseIndent = (node.level - 1) * 12;
    const fontSizes: Record<number, string> = {
      1: 'text-base font-bold',
      2: 'text-sm font-semibold',
      3: 'text-sm font-medium',
      4: 'text-xs font-medium',
      5: 'text-xs',
      6: 'text-xs text-bronze-500',
    };
    return {
      paddingLeft: `${baseIndent}px`,
      className: fontSizes[node.level] || 'text-xs',
    };
  };

  const styles = getStyles();

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1.5 px-2 rounded hover:bg-bronze-50 cursor-pointer group ${styles.className}`}
        style={{ paddingLeft: styles.paddingLeft }}
        onClick={() => onNavigate(node.id)}
      >
        {/* 展开/收起按钮 */}
        {hasChildren && (
          <button
            className="w-4 h-4 flex items-center justify-center text-bronze-400 hover:text-bronze-600"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            <i className={`fas fa-chevron-${expanded ? 'down' : 'right'} text-[10px]`} />
          </button>
        )}
        {!hasChildren && <div className="w-4" />}

        {/* 标题文本 */}
        <span className="text-bronze-700 truncate flex-1 group-hover:text-orange-600">
          {node.text}
        </span>
      </div>

      {/* 子节点 */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <OutlineItem key={child.id} node={child} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * 文档大纲面板组件
 */
export const OutlinePanel: React.FC<OutlinePanelProps> = ({
  outline,
  visible = true,
  onClose,
}) => {
  // 导航到指定标题
  const handleNavigate = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      // 高亮闪烁效果
      element.classList.add('bg-orange-100');
      setTimeout(() => {
        element.classList.remove('bg-orange-100');
      }, 1500);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="w-64 bg-cream-50 border-r border-bronze-200 flex flex-col h-full">
      {/* 面板头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-bronze-200 bg-gradient-to-r from-orange-50 to-amber-50">
        <div className="flex items-center gap-2">
          <i className="fas fa-list-tree text-orange-500" />
          <span className="font-medium text-bronze-700">文档大纲</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-bronze-100 rounded text-bronze-500 hover:text-bronze-700"
          >
            <i className="fas fa-times" />
          </button>
        )}
      </div>

      {/* 大纲内容 */}
      <div className="flex-1 overflow-y-auto p-2">
        {outline.length === 0 ? (
          <div className="text-center py-8 text-bronze-400">
            <i className="fas fa-file-alt text-3xl mb-2 opacity-50" />
            <p className="text-sm">暂无大纲</p>
            <p className="text-xs mt-1">添加标题后自动生成</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {outline.map((node) => (
              <OutlineItem key={node.id} node={node} onNavigate={handleNavigate} />
            ))}
          </div>
        )}
      </div>

      {/* 统计信息 */}
      {outline.length > 0 && (
        <div className="px-4 py-2 border-t border-bronze-200 bg-bronze-50/50 text-xs text-bronze-500">
          共 {countNodes(outline)} 个标题
        </div>
      )}
    </div>
  );
};

/**
 * 计算大纲节点总数
 */
function countNodes(nodes: OutlineNode[]): number {
  let count = nodes.length;
  for (const node of nodes) {
    count += countNodes(node.children);
  }
  return count;
}

export default OutlinePanel;
