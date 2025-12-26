/**
 * Data Visualization Skill Executor
 *
 * 完整实现数据可视化功能
 * - 解析用户请求（图表/思维导图）
 * - 生成 ECharts 配置
 * - 生成 Mermaid 语法
 * - 返回 VisualData 对象
 */

import type { SkillContext, SkillResult } from '@/types';

/**
 * 图表类型
 */
export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'scatter'
  | 'radar'
  | 'heatmap'
  | 'funnel'
  | 'gauge'
  | 'treemap';

/**
 * 图类型
 */
export type DiagramType =
  | 'mindmap'
  | 'flowchart'
  | 'timeline'
  | 'org-chart'
  | 'sequence'
  | 'class'
  | 'er';

/**
 * 可视化结果类型
 */
export interface VisualizationResult {
  /** 可视化类型：图表或图 */
  type: 'chart' | 'diagram';
  /** 图表子类型 */
  chartType?: ChartType;
  /** 图子类型 */
  diagramType?: DiagramType;
  /** ECharts 配置或 Mermaid 语法 */
  config: EChartsConfig | MermaidConfig;
  /** 原始数据 */
  data: unknown;
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
}

/**
 * ECharts 配置
 */
export interface EChartsConfig {
  title?: {
    text: string;
    left?: string;
    subtext?: string;
  };
  tooltip?: {
    trigger: 'item' | 'axis';
    formatter?: string;
  };
  legend?: {
    data: string[];
    bottom?: number;
    orient?: 'horizontal' | 'vertical';
  };
  xAxis?: {
    type: 'category' | 'value';
    data?: string[];
    name?: string;
  };
  yAxis?: {
    type: 'category' | 'value';
    name?: string;
  };
  series: Array<{
    name?: string;
    type: string;
    data: unknown[];
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * Mermaid 配置
 */
export interface MermaidConfig {
  /** Mermaid 图类型 */
  type: string;
  /** Mermaid 语法代码 */
  code: string;
  /** 主题 */
  theme?: 'default' | 'forest' | 'dark' | 'neutral';
}

/**
 * 可视化选项
 */
export interface VisualizationOptions {
  /** 指定图表类型 */
  chartType?: ChartType;
  /** 指定图类型 */
  diagramType?: DiagramType;
  /** 主题色 */
  theme?: 'light' | 'dark';
  /** 是否动画 */
  animation?: boolean;
}

/**
 * 可视化执行器
 *
 * @param context - Skill 执行上下文
 * @returns 执行结果
 */
export async function execute(
  context: SkillContext
): Promise<SkillResult<VisualizationResult>> {
  const startTime = Date.now();

  try {
    const { query, document, selection, params } = context;

    // 解析可视化类型
    const vizType = parseVisualizationType(query, params);

    // 提取数据源
    const dataSource = extractDataSource(document, selection, query);

    // 生成可视化配置
    const result = await generateVisualization(vizType, dataSource, query);

    const duration = Date.now() - startTime;

    return {
      success: true,
      data: result,
      duration,
      metadata: {
        visualizationType: `${result.type}:${result.chartType || result.diagramType}`,
        quotaUsed: 2,
      },
    };
  } catch (error) {
    console.error('Visualization generation failed:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Visualization generation failed',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * 解析可视化类型
 */
function parseVisualizationType(
  query: string,
  params?: Record<string, unknown>
): {
  type: 'chart' | 'diagram';
  subType: ChartType | DiagramType;
} {
  // 优先使用参数指定
  if (params?.chartType) {
    return { type: 'chart', subType: params.chartType as ChartType };
  }
  if (params?.diagramType) {
    return { type: 'diagram', subType: params.diagramType as DiagramType };
  }

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
  if (lowerQuery.includes('漏斗图') || lowerQuery.includes('funnel')) {
    return { type: 'chart', subType: 'funnel' };
  }
  if (lowerQuery.includes('仪表盘') || lowerQuery.includes('gauge')) {
    return { type: 'chart', subType: 'gauge' };
  }
  if (lowerQuery.includes('矩形树图') || lowerQuery.includes('treemap')) {
    return { type: 'chart', subType: 'treemap' };
  }

  // 图类型检测
  if (lowerQuery.includes('思维导图') || lowerQuery.includes('mindmap')) {
    return { type: 'diagram', subType: 'mindmap' };
  }
  if (
    lowerQuery.includes('流程图') ||
    lowerQuery.includes('flow') ||
    lowerQuery.includes('步骤')
  ) {
    return { type: 'diagram', subType: 'flowchart' };
  }
  if (lowerQuery.includes('时间线') || lowerQuery.includes('timeline')) {
    return { type: 'diagram', subType: 'timeline' };
  }
  if (lowerQuery.includes('组织图') || lowerQuery.includes('org')) {
    return { type: 'diagram', subType: 'org-chart' };
  }
  if (lowerQuery.includes('时序图') || lowerQuery.includes('sequence')) {
    return { type: 'diagram', subType: 'sequence' };
  }
  if (lowerQuery.includes('类图') || lowerQuery.includes('class')) {
    return { type: 'diagram', subType: 'class' };
  }
  if (
    lowerQuery.includes('er图') ||
    lowerQuery.includes('实体关系') ||
    lowerQuery.includes('entity')
  ) {
    return { type: 'diagram', subType: 'er' };
  }

  // 默认柱状图
  return { type: 'chart', subType: 'bar' };
}

/**
 * 提取数据源
 */
function extractDataSource(
  document?: SkillContext['document'],
  selection?: SkillContext['selection'],
  query?: string
): string {
  // 优先使用选中内容
  if (selection?.text) {
    return selection.text;
  }

  // 否则使用文档内容
  if (document?.content) {
    return document.content;
  }

  // 最后使用查询本身
  return query || '';
}

/**
 * 生成可视化配置
 */
async function generateVisualization(
  vizType: { type: 'chart' | 'diagram'; subType: ChartType | DiagramType },
  dataSource: string,
  query: string
): Promise<VisualizationResult> {
  // 使用 AI 分析数据并生成配置
  const aiConfig = await callAIForVisualization(vizType, dataSource, query);

  if (aiConfig) {
    return aiConfig;
  }

  // AI 调用失败，使用本地生成
  if (vizType.type === 'chart') {
    return generateChartConfig(vizType.subType as ChartType, dataSource, query);
  } else {
    return generateDiagramConfig(
      vizType.subType as DiagramType,
      dataSource,
      query
    );
  }
}

/**
 * 调用 AI 生成可视化配置
 */
async function callAIForVisualization(
  vizType: { type: 'chart' | 'diagram'; subType: ChartType | DiagramType },
  dataSource: string,
  query: string
): Promise<VisualizationResult | null> {
  const baseUrl =
    typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_BASE_URL || '';

  const prompt =
    vizType.type === 'chart'
      ? buildChartPrompt(vizType.subType as ChartType, dataSource, query)
      : buildDiagramPrompt(vizType.subType as DiagramType, dataSource, query);

  try {
    const response = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error('AI visualization request failed');
    }

    const data = await response.json();
    const aiContent = data.data?.content || data.content || '';

    // 解析 AI 返回的配置
    const parsed = parseAIResponse(aiContent, vizType);
    if (parsed) {
      return parsed;
    }
  } catch (error) {
    console.error('AI visualization failed:', error);
  }

  return null;
}

/**
 * 构建图表提示词
 */
function buildChartPrompt(
  chartType: ChartType,
  dataSource: string,
  query: string
): string {
  return `请根据以下数据生成 ECharts ${chartType}图表配置：

用户需求：${query}

数据源：
${dataSource.slice(0, 2000)}

请返回以下格式的JSON（直接返回JSON，不要包含markdown代码块）：
{
  "title": {"text": "图表标题"},
  "tooltip": {"trigger": "axis"},
  "legend": {"data": ["系列名"]},
  "xAxis": {"type": "category", "data": ["类目1", "类目2"]},
  "yAxis": {"type": "value"},
  "series": [{"name": "系列名", "type": "${chartType}", "data": [数值1, 数值2]}]
}

注意：
1. 从数据中提取有意义的标签和数值
2. 配置必须是有效的 ECharts 配置
3. 图表类型必须是 ${chartType}`;
}

/**
 * 构建图提示词
 */
function buildDiagramPrompt(
  diagramType: DiagramType,
  dataSource: string,
  query: string
): string {
  const mermaidTypeMap: Record<DiagramType, string> = {
    mindmap: 'mindmap',
    flowchart: 'flowchart TD',
    timeline: 'timeline',
    'org-chart': 'flowchart TD',
    sequence: 'sequenceDiagram',
    class: 'classDiagram',
    er: 'erDiagram',
  };

  return `请根据以下内容生成 Mermaid ${diagramType}语法：

用户需求：${query}

内容：
${dataSource.slice(0, 2000)}

请返回以下格式的JSON（直接返回JSON，不要包含markdown代码块）：
{
  "type": "${mermaidTypeMap[diagramType]}",
  "code": "完整的Mermaid代码",
  "title": "图表标题"
}

Mermaid语法示例（${diagramType}）：
${getMermaidExample(diagramType)}

注意：
1. 代码必须是有效的 Mermaid 语法
2. 从内容中提取关键信息
3. 保持结构清晰易读`;
}

/**
 * 获取 Mermaid 示例
 */
function getMermaidExample(diagramType: DiagramType): string {
  const examples: Record<DiagramType, string> = {
    mindmap: `mindmap
  root((中心主题))
    分支1
      子节点1
      子节点2
    分支2
      子节点3`,
    flowchart: `flowchart TD
    A[开始] --> B{判断}
    B -->|是| C[处理]
    B -->|否| D[结束]
    C --> D`,
    timeline: `timeline
    title 时间线标题
    2024-01 : 事件1
    2024-06 : 事件2`,
    'org-chart': `flowchart TD
    CEO --> CTO
    CEO --> CFO
    CTO --> Dev1
    CTO --> Dev2`,
    sequence: `sequenceDiagram
    参与者A->>参与者B: 消息1
    参与者B-->>参与者A: 响应`,
    class: `classDiagram
    class Animal{
      +String name
      +eat()
    }
    Animal <|-- Dog`,
    er: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains`,
  };

  return examples[diagramType] || examples.flowchart;
}

/**
 * 解析 AI 响应
 */
function parseAIResponse(
  content: string,
  vizType: { type: 'chart' | 'diagram'; subType: ChartType | DiagramType }
): VisualizationResult | null {
  try {
    // 清理可能的 markdown 代码块
    const jsonContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(jsonContent);

    if (vizType.type === 'chart') {
      // 验证 ECharts 配置
      if (parsed.series && Array.isArray(parsed.series)) {
        return {
          type: 'chart',
          chartType: vizType.subType as ChartType,
          config: parsed as EChartsConfig,
          data: parsed.series,
          title: parsed.title?.text || '数据可视化',
          description: `基于数据生成的${vizType.subType}图表`,
        };
      }
    } else {
      // 验证 Mermaid 配置
      if (parsed.code) {
        return {
          type: 'diagram',
          diagramType: vizType.subType as DiagramType,
          config: {
            type: parsed.type || 'flowchart TD',
            code: parsed.code,
            theme: 'default',
          } as MermaidConfig,
          data: parsed,
          title: parsed.title || `${vizType.subType}图`,
          description: `基于内容生成的${vizType.subType}`,
        };
      }
    }
  } catch {
    // JSON 解析失败
  }

  return null;
}

/**
 * 生成图表配置（本地回退）
 */
function generateChartConfig(
  chartType: ChartType,
  _dataSource: string,
  query: string
): VisualizationResult {
  const title = extractTitle(query) || '数据可视化';

  const baseConfig: EChartsConfig = {
    title: {
      text: title,
      left: 'center',
    },
    tooltip: {
      trigger: chartType === 'pie' ? 'item' : 'axis',
    },
    legend: {
      data: ['数据系列'],
      bottom: 10,
    },
    series: [],
  };

  let config: EChartsConfig = { ...baseConfig };

  switch (chartType) {
    case 'bar':
      config = {
        ...config,
        xAxis: {
          type: 'category',
          data: ['项目A', '项目B', '项目C', '项目D', '项目E'],
        },
        yAxis: { type: 'value' },
        series: [
          {
            name: '数据系列',
            type: 'bar',
            data: [120, 200, 150, 80, 70],
            itemStyle: { color: '#F97316' },
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
        yAxis: { type: 'value' },
        series: [
          {
            name: '数据系列',
            type: 'line',
            data: [120, 132, 101, 134, 90],
            smooth: true,
            lineStyle: { color: '#F97316' },
            areaStyle: { color: 'rgba(249, 115, 22, 0.2)' },
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
            radius: ['40%', '70%'],
            center: ['50%', '50%'],
            data: [
              { value: 335, name: '类型A' },
              { value: 310, name: '类型B' },
              { value: 234, name: '类型C' },
              { value: 135, name: '类型D' },
              { value: 148, name: '类型E' },
            ],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      };
      break;

    case 'radar':
      config = {
        ...config,
        radar: {
          indicator: [
            { name: '指标1', max: 100 },
            { name: '指标2', max: 100 },
            { name: '指标3', max: 100 },
            { name: '指标4', max: 100 },
            { name: '指标5', max: 100 },
          ],
        },
        series: [
          {
            name: '数据系列',
            type: 'radar',
            data: [{ value: [80, 90, 70, 85, 75], name: '评分' }],
          },
        ],
      };
      break;

    default:
      config.series = [
        { name: '数据系列', type: chartType, data: [100, 200, 150, 300, 250] },
      ];
  }

  return {
    type: 'chart',
    chartType,
    config,
    data: config.series,
    title,
    description: `基于查询生成的${chartType}图表`,
  };
}

/**
 * 生成图配置（本地回退）
 */
function generateDiagramConfig(
  diagramType: DiagramType,
  _dataSource: string,
  query: string
): VisualizationResult {
  const title = extractTitle(query) || `${diagramType}图`;
  let code = '';

  switch (diagramType) {
    case 'mindmap':
      code = `mindmap
  root((${title}))
    分支1
      子节点1.1
      子节点1.2
    分支2
      子节点2.1
      子节点2.2
    分支3
      子节点3.1`;
      break;

    case 'flowchart':
      code = `flowchart TD
    A[开始] --> B{判断条件}
    B -->|是| C[执行操作1]
    B -->|否| D[执行操作2]
    C --> E[结束]
    D --> E`;
      break;

    case 'timeline':
      code = `timeline
    title ${title}
    section 阶段1
      2024-01 : 事件1
      2024-03 : 事件2
    section 阶段2
      2024-06 : 事件3
      2024-09 : 事件4`;
      break;

    case 'org-chart':
      code = `flowchart TD
    CEO[CEO] --> CTO[CTO]
    CEO --> CFO[CFO]
    CEO --> COO[COO]
    CTO --> Dev1[研发主管]
    CTO --> Dev2[技术架构师]
    CFO --> Fin[财务主管]
    COO --> Ops[运营主管]`;
      break;

    case 'sequence':
      code = `sequenceDiagram
    participant A as 用户
    participant B as 系统
    participant C as 数据库
    A->>B: 发起请求
    B->>C: 查询数据
    C-->>B: 返回结果
    B-->>A: 响应请求`;
      break;

    case 'class':
      code = `classDiagram
    class Document{
      +String title
      +String content
      +Date createdAt
      +save()
      +delete()
    }
    class User{
      +String name
      +String email
      +createDocument()
    }
    User "1" --> "*" Document : creates`;
      break;

    case 'er':
      code = `erDiagram
    USER ||--o{ DOCUMENT : creates
    DOCUMENT ||--|{ VERSION : has
    USER {
        string id PK
        string name
        string email
    }
    DOCUMENT {
        string id PK
        string title
        string content
    }`;
      break;

    default:
      code = `flowchart TD
    A[节点A] --> B[节点B]
    B --> C[节点C]`;
  }

  return {
    type: 'diagram',
    diagramType,
    config: {
      type: getMermaidType(diagramType),
      code,
      theme: 'default',
    },
    data: { code },
    title,
    description: `基于查询生成的${diagramType}`,
  };
}

/**
 * 获取 Mermaid 图类型
 */
function getMermaidType(diagramType: DiagramType): string {
  const typeMap: Record<DiagramType, string> = {
    mindmap: 'mindmap',
    flowchart: 'flowchart',
    timeline: 'timeline',
    'org-chart': 'flowchart',
    sequence: 'sequenceDiagram',
    class: 'classDiagram',
    er: 'erDiagram',
  };
  return typeMap[diagramType] || 'flowchart';
}

/**
 * 从查询中提取标题
 */
function extractTitle(query: string): string {
  // 尝试提取引号中的内容作为标题
  const quotedMatch = query.match(/[""''](.+?)[""'']/);
  if (quotedMatch) {
    return quotedMatch[1] || '';
  }

  // 清理常见的动词前缀
  return query
    .replace(
      /^(生成|创建|画|绘制|制作|做一个|给我|帮我|请)/,
      ''
    )
    .replace(
      /(图表|图|chart|diagram|visualization)$/i,
      ''
    )
    .trim()
    .slice(0, 20);
}

/**
 * 便捷方法：生成特定类型的图表
 */
export async function generateChart(
  context: SkillContext,
  chartType: ChartType
): Promise<SkillResult<VisualizationResult>> {
  return execute({
    ...context,
    params: {
      ...context.params,
      chartType,
    },
  });
}

/**
 * 便捷方法：生成特定类型的图
 */
export async function generateDiagram(
  context: SkillContext,
  diagramType: DiagramType
): Promise<SkillResult<VisualizationResult>> {
  return execute({
    ...context,
    params: {
      ...context.params,
      diagramType,
    },
  });
}

export default execute;
