/**
 * ChartViewer - 图表查看器组件
 *
 * 使用 ECharts 渲染各种类型的图表
 * 支持缩放、导出 PNG/SVG 功能
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import dynamic from 'next/dynamic';
import type { EChartsOption } from 'echarts';

// 动态导入 ECharts 避免 SSR 问题
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface ChartViewerProps {
  /** 是否打开 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** ECharts 配置 */
  chartOption?: EChartsOption;
  /** 图表 HTML (兼容旧版) */
  chartHtml?: string;
  /** 图表标题 */
  chartTitle: string;
  /** 源数据表格 HTML */
  sourceTableHtml?: string;
  /** AI 分析说明 */
  analysisNote?: string;
  /** 插入文档回调 */
  onInsertToDocument?: (imageDataUrl: string, title: string) => void;
}

/**
 * 图表查看器组件
 */
export const ChartViewer: React.FC<ChartViewerProps> = ({
  isOpen,
  onClose,
  chartOption,
  chartHtml,
  chartTitle,
  sourceTableHtml,
  analysisNote,
  onInsertToDocument,
}) => {
  const [scale, setScale] = useState(1);
  const [activeTab, setActiveTab] = useState<'chart' | 'data' | 'code'>('chart');
  const [isExporting, setIsExporting] = useState(false);
  const chartInstanceRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ECharts 实例就绪回调
  const onChartReady = useCallback((instance: any) => {
    chartInstanceRef.current = instance;
  }, []);

  // 处理 HTML 图表渲染
  useEffect(() => {
    if (isOpen && containerRef.current && chartHtml && !chartOption) {
      containerRef.current.innerHTML = chartHtml;
    }
  }, [isOpen, chartHtml, chartOption]);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setScale(1);

  /**
   * 导出为 PNG
   */
  const handleExportPNG = useCallback(async () => {
    if (!chartInstanceRef.current) return;

    setIsExporting(true);
    try {
      const echartsInstance = chartInstanceRef.current;
      const dataUrl = echartsInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff',
      });

      // 创建下载链接
      const link = document.createElement('a');
      link.download = `${chartTitle || 'chart'}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Export PNG failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [chartTitle]);

  /**
   * 导出为 SVG
   */
  const handleExportSVG = useCallback(async () => {
    if (!chartInstanceRef.current) return;

    setIsExporting(true);
    try {
      const echartsInstance = chartInstanceRef.current;
      const dataUrl = echartsInstance.getDataURL({
        type: 'svg',
      });

      const link = document.createElement('a');
      link.download = `${chartTitle || 'chart'}-${Date.now()}.svg`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Export SVG failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [chartTitle]);

  /**
   * 插入到文档
   */
  const handleInsertToDocument = useCallback(async () => {
    if (!chartInstanceRef.current || !onInsertToDocument) return;

    try {
      const echartsInstance = chartInstanceRef.current;
      const dataUrl = echartsInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff',
      });

      onInsertToDocument(dataUrl, chartTitle);
      onClose();
    } catch (error) {
      console.error('Insert to document failed:', error);
    }
  }, [chartTitle, onInsertToDocument, onClose]);

  if (!isOpen) return null;

  // 默认图表配置
  const defaultOption: EChartsOption = chartOption || {
    title: {
      text: chartTitle || '数据可视化',
      left: 'center',
      textStyle: { color: '#473929' },
    },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['一月', '二月', '三月', '四月', '五月', '六月'],
    },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'bar',
        data: [120, 200, 150, 80, 270, 210],
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#F97316' },
              { offset: 1, color: '#FBBF24' },
            ],
          },
        },
      },
    ],
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-cream-50 rounded-xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-bronze-200 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-lg">📊</span>
            <span className="font-bold text-bronze-800">{chartTitle || '图表查看器'}</span>
            <span className="text-xs text-bronze-500 bg-bronze-100 px-2 py-0.5 rounded">
              ECharts
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleZoomOut} title="缩小">
              <i className="fas fa-search-minus" />
            </Button>
            <span className="text-sm text-bronze-600 min-w-[4rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={handleZoomIn} title="放大">
              <i className="fas fa-search-plus" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleResetZoom} title="重置">
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

        {/* 标签栏 */}
        {(sourceTableHtml || chartOption) && (
          <div className="flex gap-1 px-6 pt-3 bg-white border-b border-bronze-100">
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'chart'
                  ? 'bg-orange-100 text-orange-700 border-b-2 border-orange-500'
                  : 'text-bronze-600 hover:bg-bronze-50'
              }`}
            >
              <i className="fas fa-chart-bar mr-2" />
              图表
            </button>
            {sourceTableHtml && (
              <button
                onClick={() => setActiveTab('data')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'data'
                    ? 'bg-orange-100 text-orange-700 border-b-2 border-orange-500'
                    : 'text-bronze-600 hover:bg-bronze-50'
                }`}
              >
                <i className="fas fa-table mr-2" />
                数据
              </button>
            )}
            {chartOption && (
              <button
                onClick={() => setActiveTab('code')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'code'
                    ? 'bg-orange-100 text-orange-700 border-b-2 border-orange-500'
                    : 'text-bronze-600 hover:bg-bronze-50'
                }`}
              >
                <i className="fas fa-code mr-2" />
                配置
              </button>
            )}
          </div>
        )}

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto p-6 bg-white">
          {activeTab === 'chart' && (
            <div
              style={{ transform: `scale(${scale})`, transformOrigin: 'center top' }}
              className="flex justify-center"
            >
              {chartOption ? (
                <ReactECharts
                  option={defaultOption}
                  style={{ width: '100%', height: '400px' }}
                  opts={{ renderer: 'canvas' }}
                  notMerge={true}
                  onChartReady={onChartReady}
                />
              ) : chartHtml ? (
                <div ref={containerRef} className="w-full" />
              ) : (
                <div className="text-center text-bronze-500 py-8">
                  <div className="text-5xl mb-4">📈</div>
                  <p className="text-lg font-medium text-bronze-700 mb-2">图表渲染区域</p>
                  <p className="text-sm">暂无图表数据</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'data' && sourceTableHtml && (
            <div
              className="prose prose-bronze max-w-none"
              dangerouslySetInnerHTML={{ __html: sourceTableHtml }}
            />
          )}

          {activeTab === 'code' && chartOption && (
            <pre className="bg-bronze-50 p-4 rounded-lg text-sm overflow-x-auto">
              <code className="text-bronze-800">
                {JSON.stringify(chartOption, null, 2)}
              </code>
            </pre>
          )}
        </div>

        {/* AI分析说明 */}
        {analysisNote && (
          <div className="px-6 py-3 bg-amber-50 border-t border-amber-200 shrink-0">
            <p className="text-sm text-amber-800">
              <i className="fas fa-lightbulb mr-2 text-amber-500" />
              {analysisNote}
            </p>
          </div>
        )}

        {/* 底部工具栏 */}
        <div className="flex items-center justify-between px-6 py-4 bg-sand-50 border-t border-bronze-200 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportPNG}
              disabled={isExporting || !chartOption}
            >
              <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-download'} mr-2`} />
              导出 PNG
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportSVG}
              disabled={isExporting || !chartOption}
            >
              <i className="fas fa-file-code mr-2" />
              导出 SVG
            </Button>
            {onInsertToDocument && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleInsertToDocument}
                disabled={!chartOption}
              >
                <i className="fas fa-file-import mr-2" />
                插入文档
              </Button>
            )}
          </div>
          <span className="text-xs text-bronze-500">
            Powered by ECharts
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChartViewer;
