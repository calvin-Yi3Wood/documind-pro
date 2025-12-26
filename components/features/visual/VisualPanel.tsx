/**
 * VisualPanel - 可视化面板组件
 *
 * 支持多种可视化类型：
 * - ECharts 图表 (echarts)
 * - 思维导图 (mindmap)
 * - 流程图 (flowchart)
 * - Mermaid 图表 (mermaid)
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import dynamic from 'next/dynamic';
import type { EChartsOption } from 'echarts';

// 动态导入 ECharts 避免 SSR 问题
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

/**
 * 可视化数据类型
 */
interface VisualData {
  type: 'mindmap' | 'flowchart' | 'mermaid' | 'echarts';
  title: string;
  content: string;
  rawCode?: string;
  /** ECharts 配置 */
  echartsOption?: EChartsOption;
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
 */
const VisualPanel: React.FC<VisualPanelProps> = ({
  data,
  onClose,
  onInsertToDocument,
  documentContent: _documentContent,
  onNodeClick: _onNodeClick,
}) => {
  const [scale, setScale] = useState(1);
  const [showCode, setShowCode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const chartInstanceRef = useRef<any>(null);

  // ECharts 实例就绪回调
  const onChartReady = useCallback((instance: any) => {
    chartInstanceRef.current = instance;
  }, []);

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
        return 'Mermaid';
      case 'echarts':
        return 'ECharts';
      default:
        return '可视化';
    }
  };

  /**
   * 导出为 PNG
   */
  const handleExportPNG = useCallback(async () => {
    if (data?.type === 'echarts' && chartInstanceRef.current) {
      setIsExporting(true);
      try {
        const echartsInstance = chartInstanceRef.current;
        const dataUrl = echartsInstance.getDataURL({
          type: 'png',
          pixelRatio: 2,
          backgroundColor: '#fff',
        });

        const link = document.createElement('a');
        link.download = `${data.title || 'visualization'}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      } catch (error) {
        console.error('Export PNG failed:', error);
      } finally {
        setIsExporting(false);
      }
    }
  }, [data]);

  /**
   * 导出为 SVG
   */
  const handleExportSVG = useCallback(async () => {
    if (data?.type === 'echarts' && chartInstanceRef.current) {
      setIsExporting(true);
      try {
        const echartsInstance = chartInstanceRef.current;
        const dataUrl = echartsInstance.getDataURL({ type: 'svg' });

        const link = document.createElement('a');
        link.download = `${data.title || 'visualization'}-${Date.now()}.svg`;
        link.href = dataUrl;
        link.click();
      } catch (error) {
        console.error('Export SVG failed:', error);
      } finally {
        setIsExporting(false);
      }
    }
  }, [data]);

  /**
   * 插入到文档
   */
  const handleInsertToDocument = useCallback(async () => {
    if (!onInsertToDocument) return;

    if (data?.type === 'echarts' && chartInstanceRef.current) {
      try {
        const echartsInstance = chartInstanceRef.current;
        const dataUrl = echartsInstance.getDataURL({
          type: 'png',
          pixelRatio: 2,
          backgroundColor: '#fff',
        });

        onInsertToDocument(dataUrl, data.title || '可视化');
        onClose();
      } catch (error) {
        console.error('Insert to document failed:', error);
      }
    }
  }, [data, onInsertToDocument, onClose]);

  /**
   * 获取默认 ECharts 配置（思维导图样式）
   */
  const getMindmapOption = (): EChartsOption => ({
    tooltip: { trigger: 'item', triggerOn: 'mousemove' },
    series: [
      {
        type: 'tree',
        data: [
          {
            name: data?.title || '思维导图',
            children: [
              {
                name: '分支 1',
                children: [
                  { name: '子节点 1.1' },
                  { name: '子节点 1.2' },
                ],
              },
              {
                name: '分支 2',
                children: [
                  { name: '子节点 2.1' },
                  { name: '子节点 2.2' },
                ],
              },
              {
                name: '分支 3',
                children: [
                  { name: '子节点 3.1' },
                ],
              },
            ],
          },
        ],
        top: '1%',
        left: '7%',
        bottom: '1%',
        right: '20%',
        symbolSize: 7,
        orient: 'LR',
        label: {
          position: 'left',
          verticalAlign: 'middle',
          align: 'right',
          fontSize: 12,
        },
        leaves: {
          label: {
            position: 'right',
            verticalAlign: 'middle',
            align: 'left',
          },
        },
        emphasis: {
          focus: 'descendant',
        },
        expandAndCollapse: true,
        animationDuration: 550,
        animationDurationUpdate: 750,
        lineStyle: {
          color: '#F97316',
          width: 2,
        },
        itemStyle: {
          color: '#F97316',
          borderColor: '#EA580C',
        },
      },
    ],
  });

  /**
   * 获取默认流程图配置
   */
  const getFlowchartOption = (): EChartsOption => ({
    tooltip: {},
    series: [
      {
        type: 'graph',
        layout: 'none',
        symbolSize: 50,
        roam: true,
        label: { show: true, fontSize: 12 },
        edgeSymbol: ['circle', 'arrow'],
        edgeSymbolSize: [4, 10],
        data: [
          { name: '开始', x: 100, y: 100, itemStyle: { color: '#22C55E' } },
          { name: '处理', x: 300, y: 100, itemStyle: { color: '#F97316' } },
          { name: '判断', x: 500, y: 100, itemStyle: { color: '#FBBF24' } },
          { name: '结束', x: 700, y: 100, itemStyle: { color: '#EF4444' } },
        ],
        links: [
          { source: '开始', target: '处理' },
          { source: '处理', target: '判断' },
          { source: '判断', target: '结束' },
        ],
        lineStyle: {
          opacity: 0.9,
          width: 2,
          curveness: 0,
          color: '#9C8B72',
        },
      },
    ],
  });

  /**
   * 获取 ECharts 配置
   */
  const getChartOption = (): EChartsOption | null => {
    if (data?.echartsOption) {
      return data.echartsOption;
    }

    switch (data?.type) {
      case 'mindmap':
        return getMindmapOption();
      case 'flowchart':
        return getFlowchartOption();
      case 'echarts':
        // 默认柱状图
        return {
          title: {
            text: data?.title || '数据可视化',
            left: 'center',
            textStyle: { color: '#473929' },
          },
          tooltip: { trigger: 'axis' },
          xAxis: {
            type: 'category',
            data: ['一月', '二月', '三月', '四月', '五月'],
          },
          yAxis: { type: 'value' },
          series: [
            {
              type: 'bar',
              data: [150, 230, 224, 218, 135],
              itemStyle: {
                color: {
                  type: 'linear',
                  x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [
                    { offset: 0, color: '#F97316' },
                    { offset: 1, color: '#FBBF24' },
                  ],
                },
              },
            },
          ],
        };
      default:
        return null;
    }
  };

  const chartOption = getChartOption();
  const canUseECharts = data?.type === 'echarts' || data?.type === 'mindmap' || data?.type === 'flowchart';

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
              {canUseECharts && chartOption ? (
                <ReactECharts
                  option={chartOption}
                  style={{ width: '100%', height: '500px' }}
                  opts={{ renderer: 'canvas' }}
                  notMerge={true}
                  onChartReady={onChartReady}
                />
              ) : data?.content ? (
                <div
                  className="w-full"
                  dangerouslySetInnerHTML={{ __html: data.content }}
                />
              ) : (
                <div className="text-center text-bronze-500">
                  <div className="text-6xl mb-4">{getTypeIcon(data?.type)}</div>
                  <p className="text-lg font-medium text-bronze-700 mb-2">
                    {getTypeName(data?.type)}
                  </p>
                  <p className="text-sm">暂无可视化数据</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部工具栏 */}
        <div className="flex items-center justify-between px-6 py-4 bg-sand-50 border-t border-bronze-200 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportPNG}
              disabled={isExporting || !canUseECharts}
            >
              <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-download'} mr-2`} />
              导出 PNG
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportSVG}
              disabled={isExporting || !canUseECharts}
            >
              <i className="fas fa-file-code mr-2" />
              导出 SVG
            </Button>
            {onInsertToDocument && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleInsertToDocument}
                disabled={!canUseECharts}
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

export default VisualPanel;
