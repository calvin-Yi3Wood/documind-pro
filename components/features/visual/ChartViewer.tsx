/**
 * ChartViewer - 图表查看器组件
 *
 * TODO: Stage 10 完善实现
 * 当前为占位组件
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface ChartViewerProps {
  isOpen: boolean;
  onClose: () => void;
  chartHtml: string;
  chartTitle: string;
  sourceTableHtml?: string;
  analysisNote?: string;
}

/**
 * 图表查看器组件
 *
 * 提供图表渲染、缩放、导出等功能
 * 当前为占位实现，完整功能在 Stage 10 实现
 */
export const ChartViewer: React.FC<ChartViewerProps> = ({
  isOpen,
  onClose,
  chartHtml,
  chartTitle,
  sourceTableHtml: _sourceTableHtml,
  analysisNote,
}) => {
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.innerHTML = chartHtml || '';
    }
  }, [isOpen, chartHtml]);

  if (!isOpen) return null;

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setScale(1);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-cream-50 rounded-xl shadow-2xl max-w-4xl w-full mx-4 overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-bronze-200">
          <div className="flex items-center gap-3">
            <span className="text-lg">📊</span>
            <span className="font-bold text-bronze-800">{chartTitle || '图表查看器'}</span>
            <span className="text-xs text-bronze-500 bg-bronze-100 px-2 py-0.5 rounded">
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
            <button
              onClick={onClose}
              className="text-bronze-400 hover:text-bronze-600 transition-colors ml-2"
            >
              <i className="fas fa-times text-lg" />
            </button>
          </div>
        </div>

        {/* 图表区域 */}
        <div className="p-6 bg-white min-h-[400px] overflow-auto">
          <div
            ref={containerRef}
            className="flex items-center justify-center"
            style={{ transform: `scale(${scale})`, transformOrigin: 'center top' }}
          />
          {!chartHtml && (
            <div className="text-center text-bronze-500 py-8">
              <div className="text-5xl mb-4">📈</div>
              <p className="text-lg font-medium text-bronze-700 mb-2">图表渲染区域</p>
              <p className="text-xs text-bronze-400 mt-4">🚧 图表功能开发中</p>
            </div>
          )}
        </div>

        {/* AI分析说明 */}
        {analysisNote && (
          <div className="px-6 py-3 bg-amber-50 border-t border-amber-200">
            <p className="text-sm text-amber-800">
              <i className="fas fa-lightbulb mr-2" />
              {analysisNote}
            </p>
          </div>
        )}

        {/* 底部工具栏 */}
        <div className="flex items-center justify-between px-6 py-4 bg-sand-50 border-t border-bronze-200">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">
              <i className="fas fa-download mr-2" />
              导出PNG
            </Button>
            <Button variant="secondary" size="sm">
              <i className="fas fa-file-code mr-2" />
              导出SVG
            </Button>
          </div>
          <span className="text-xs text-bronze-500">Stage 10 完善</span>
        </div>
      </div>
    </div>
  );
};

export default ChartViewer;
