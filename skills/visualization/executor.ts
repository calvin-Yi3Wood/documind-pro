/**
 * Data Visualization Skill Executor
 *
 * 实现数据可视化功能 - 图表、思维导图等
 */

import type { SkillContext, SkillResult } from '@/types';

/**
 * 图表类型
 */
export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'radar' | 'heatmap';

/**
 * 图表类型
 */
export type DiagramType = 'mindmap' | 'flowchart' | 'timeline' | 'org-chart';

/**
 * 可视化结果类型
 */
export interface VisualizationResult {
  type: 'chart' | 'diagram';
  chartType?: ChartType;
  diagramType?: DiagramType;
  config: Record<string, any>;
  data: any;
  title?: string;
  description?: string;
}

/**
 * 可视化执行器
 *
 * @param context - Skill 执行上下文
 * @returns 执行结果
 */
export async function execute(context: SkillContext): Promise<SkillResult<VisualizationResult>> {
  try {
    const { query, document, selection } = context;

    // 解析可视化类型
    const vizType = parseVisualizationType(query);

    // 提取数据源
    const dataSource = extractDataSource(document, selection);

    // 生成可视化配置
    const result = await generateVisualization(vizType, dataSource, query);

    return {
      success: true,
      data: result,
      metadata: {
        visualizationType: vizType,
        quotaUsed: 2,
      },
    };
  } catch (error) {
    console.error('Visualization generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 解析可视化类型
 */
function parseVisualizationType(query: string): {
  type: 'chart' | 'diagram';
  subType: ChartType | DiagramType;
} {
  const lowerQuery = query.toLowerCase();

  // 图表类型检测
  if (lowerQuery.includes('柱状图') || lowerQuery.includes('bar')) {
    return { type: 'chart', subType: 'bar' };
  }
  if (lowerQuery.includes('折线图') || lowerQuery.includes('line')) {
    return { type: 'chart', subType: 'line' };
  }
  if (lowerQuery.includes('饼图') || lowerQuery.includes('pie')) {
    return { type: 'chart', subType: 'pie' };
  }
  if (lowerQuery.includes('散点图') || lowerQuery.includes('scatter')) {
    return { type: 'chart', subType: 'scatter' };
  }
  if (lowerQuery.includes('雷达图') || lowerQuery.includes('radar')) {
    return { type: 'chart', subType: 'radar' };
  }
  if (lowerQuery.includes('热力图') || lowerQuery.includes('heatmap')) {
    return { type: 'chart', subType: 'heatmap' };
  }

  // 图类型检测
  if (lowerQuery.includes('思维导图') || lowerQuery.includes('mindmap')) {
    return { type: 'diagram', subType: 'mindmap' };
  }
  if (lowerQuery.includes('流程图') || lowerQuery.includes('flow')) {
    return { type: 'diagram', subType: 'flowchart' };
  }
  if (lowerQuery.includes('时间线') || lowerQuery.includes('timeline')) {
    return { type: 'diagram', subType: 'timeline' };
  }
  if (lowerQuery.includes('组织图') || lowerQuery.includes('org')) {
    return { type: 'diagram', subType: 'org-chart' };
  }

  // 默认柱状图
  return { type: 'chart', subType: 'bar' };
}

/**
 * 提取数据源
 */
function extractDataSource(
  document?: SkillContext['document'],
  selection?: SkillContext['selection']
): string {
  // 优先使用选中内容
  if (selection?.text) {
    return selection.text;
  }

  // 否则使用文档内容
  if (document?.content) {
    return document.content;
  }

  return '';
}

/**
 * 生成可视化配置（占位符）
 */
async function generateVisualization(
  vizType: { type: 'chart' | 'diagram'; subType: ChartType | DiagramType },
  dataSource: string,
  _query: string
): Promise<VisualizationResult> {
  // TODO: 实际实现应该调用后端 AI 服务来分析数据并生成可视化配置
  // const response = await fetch('/api/ai/visualization', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ vizType, dataSource, query }),
  // });
  // return await response.json();

  // 占位符响应 - 根据类型返回不同的配置
  if (vizType.type === 'chart') {
    return generateChartConfig(vizType.subType as ChartType, dataSource);
  } else {
    return generateDiagramConfig(vizType.subType as DiagramType, dataSource);
  }
}

/**
 * 生成图表配置（占位符）
 */
function generateChartConfig(chartType: ChartType, _dataSource: string): VisualizationResult {
  // ECharts 配置示例
  const baseConfig = {
    title: {
      text: '数据可视化（占位符）',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['数据系列'],
      bottom: 10,
    },
  };

  let config: Record<string, any> = { ...baseConfig };

  switch (chartType) {
    case 'bar':
      config = {
        ...config,
        xAxis: {
          type: 'category',
          data: ['项目A', '项目B', '项目C', '项目D', '项目E'],
        },
        yAxis: {
          type: 'value',
        },
        series: [
          {
            name: '数据系列',
            type: 'bar',
            data: [120, 200, 150, 80, 70],
          },
        ],
      };
      break;

    case 'line':
      config = {
        ...config,
        xAxis: {
          type: 'category',
          data: ['周一', '周二', '周三', '周四', '周五'],
        },
        yAxis: {
          type: 'value',
        },
        series: [
          {
            name: '数据系列',
            type: 'line',
            data: [120, 132, 101, 134, 90],
            smooth: true,
          },
        ],
      };
      break;

    case 'pie':
      config = {
        ...config,
        series: [
          {
            name: '数据系列',
            type: 'pie',
            radius: '50%',
            data: [
              { value: 335, name: '类型A' },
              { value: 310, name: '类型B' },
              { value: 234, name: '类型C' },
              { value: 135, name: '类型D' },
              { value: 1548, name: '类型E' },
            ],
          },
        ],
      };
      break;

    default:
      config.series = [{ type: chartType, data: [100, 200, 150, 300, 250] }];
  }

  return {
    type: 'chart',
    chartType,
    config,
    data: config.series,
    title: '数据可视化',
    description: `基于文档内容生成的${chartType}图`,
  };
}

/**
 * 生成图配置（占位符）
 */
function generateDiagramConfig(diagramType: DiagramType, _dataSource: string): VisualizationResult {
  let config: Record<string, any> = {};
  let data: any;

  switch (diagramType) {
    case 'mindmap':
      data = {
        name: '中心主题',
        children: [
          {
            name: '分支1',
            children: [{ name: '子节点1.1' }, { name: '子节点1.2' }],
          },
          {
            name: '分支2',
            children: [{ name: '子节点2.1' }, { name: '子节点2.2' }],
          },
          {
            name: '分支3',
            children: [{ name: '子节点3.1' }],
          },
        ],
      };
      config = { type: 'mindmap', layout: 'radial' };
      break;

    case 'flowchart':
      data = {
        nodes: [
          { id: '1', label: '开始' },
          { id: '2', label: '步骤1' },
          { id: '3', label: '判断' },
          { id: '4', label: '步骤2' },
          { id: '5', label: '结束' },
        ],
        edges: [
          { source: '1', target: '2' },
          { source: '2', target: '3' },
          { source: '3', target: '4', label: '是' },
          { source: '3', target: '5', label: '否' },
          { source: '4', target: '5' },
        ],
      };
      config = { type: 'flowchart', direction: 'TB' };
      break;

    case 'timeline':
      data = {
        events: [
          { date: '2024-01', title: '事件1', description: '描述1' },
          { date: '2024-03', title: '事件2', description: '描述2' },
          { date: '2024-06', title: '事件3', description: '描述3' },
          { date: '2024-09', title: '事件4', description: '描述4' },
        ],
      };
      config = { type: 'timeline', orientation: 'horizontal' };
      break;

    case 'org-chart':
      data = {
        name: 'CEO',
        children: [
          {
            name: 'CTO',
            children: [{ name: '研发主管' }, { name: '技术架构师' }],
          },
          {
            name: 'CFO',
            children: [{ name: '财务主管' }],
          },
          {
            name: 'COO',
            children: [{ name: '运营主管' }, { name: '市场主管' }],
          },
        ],
      };
      config = { type: 'org-chart', layout: 'tree' };
      break;

    default:
      data = {};
      config = { type: diagramType };
  }

  return {
    type: 'diagram',
    diagramType,
    config,
    data,
    title: `${diagramType}可视化`,
    description: `基于文档内容生成的${diagramType}`,
  };
}

export default execute;
