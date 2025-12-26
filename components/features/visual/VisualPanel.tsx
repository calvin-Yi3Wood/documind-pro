/**
 * VisualPanel - 可视化面板组件
 *
 * TODO: Stage 10 完善实现
 * 当前为占位组件
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

// 本地类型定义
interface VisualData {
  type: 'mindmap' | 'flowchart' | 'mermaid' | 'echarts';
  title: string;
  content: string;
  rawCode?: string;
}

interface VisualPanelProps {
  data: VisualData | null;
  onClose: () => void;
  onInsertToDocument?: (imageDataUrl: string, title: string) => void;
  documentContent?: string;
  onNodeClick?: (nodeName: string, explanation: string) => void;
}

/**
 * 可视化面板组件
 *
 * 提供思维导图、流程图、图表等可视化展示
 * 当前为占位实现，完整功能在 Stage 10 实现
 */
const VisualPanel: React.FC<VisualPanelProps> = ({
  data,
  onClose,
  onInsertToDocument: _onInsertToDocument,
  documentContent: _documentContent,
  onNodeClick: _onNodeClick,
}) => {
  const [scale, setScale] = useState(1);
  const [showCode, setShowCode] = useState(false);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.3));
  const handleResetZoom = () => setScale(1);

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'mindmap':
        return '🧠';
      case 'flowchart':
        return '📊';
      case 'mermaid':
        return '🧜‍♀️';
      case 'echarts':
        return '📈';
      default:
        return '📊';
    }
  };

  const getTypeName = (type?: string) => {
    switch (type) {
      case 'mindmap':
        return '思维导图';
      case 'flowchart':
        return '流程图';
      case 'mermaid':
        return 'Mermaid图表';
      case 'echarts':
        return 'ECharts图表';
      default:
        return '可视化';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-cream-50 rounded-xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-bronze-200 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-lg">{getTypeIcon(data?.type)}</span>
            <span className="font-bold text-bronze-800">
              {data?.title || getTypeName(data?.type)}
            </span>
            <span className="text-xs text-bronze-500 bg-bronze-100 px-2 py-0.5 rounded">
              {getTypeName(data?.type)}
            </span>
            <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
              占位组件
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleZoomOut}>
              <i className="fas fa-search-minus" />
            </Button>
            <span className="text-sm text-bronze-600 min-w-[4rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={handleZoomIn}>
              <i className="fas fa-search-plus" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleResetZoom}>
              <i className="fas fa-expand" />
            </Button>
            <div className="w-px h-6 bg-bronze-200 mx-2" />
            {data?.rawCode && (
              <Button
                variant={showCode ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setShowCode(!showCode)}
              >
                <i className="fas fa-code mr-2" />
                代码
              </Button>
            )}
            <button
              onClick={onClose}
              className="text-bronze-400 hover:text-bronze-600 transition-colors ml-2"
            >
              <i className="fas fa-times text-lg" />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto p-6 bg-white">
          {showCode && data?.rawCode ? (
            <pre className="bg-bronze-50 p-4 rounded-lg text-sm overflow-x-auto">
              <code className="text-bronze-800">{data.rawCode}</code>
            </pre>
          ) : (
            <div
              className="flex items-center justify-center min-h-[400px]"
              style={{ transform: `scale(${scale})`, transformOrigin: 'center top' }}
            >
              {data?.content ? (
                <div
                  className="w-full"
                  dangerouslySetInnerHTML={{ __html: data.content }}
                />
              ) : (
                <div className="text-center text-bronze-500">
                  <div className="text-6xl mb-4">{getTypeIcon(data?.type)}</div>
                  <p className="text-lg font-medium text-bronze-700 mb-2">
                    {getTypeName(data?.type)}渲染区域
                  </p>
                  <p className="text-sm">暂无可视化数据</p>
                  <p className="text-xs text-bronze-400 mt-4">
                    🚧 可视化功能开发中
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部工具栏 */}
        <div className="flex items-center justify-between px-6 py-4 bg-sand-50 border-t border-bronze-200 shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">
              <i className="fas fa-download mr-2" />
              导出PNG
            </Button>
            <Button variant="secondary" size="sm">
              <i className="fas fa-file-code mr-2" />
              导出SVG
            </Button>
            <Button variant="secondary" size="sm">
              <i className="fas fa-file-alt mr-2" />
              插入文档
            </Button>
          </div>
          <span className="text-xs text-bronze-500">
            🚧 可视化功能开发中 | Stage 10 完善
          </span>
        </div>
      </div>
    </div>
  );
};

export default VisualPanel;
