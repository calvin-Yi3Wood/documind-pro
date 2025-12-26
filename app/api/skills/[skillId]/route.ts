/**
 * Skills API - 执行特定 Skill
 *
 * GET /api/skills/[skillId] - 获取 Skill 详情
 * POST /api/skills/[skillId] - 执行 Skill
 *
 * 实际连接到 AI 服务和搜索服务
 */

import { NextRequest } from 'next/server';
import { createApiResponse, createErrorResponse } from '@/lib/api/response';
import { AIProviderManager, type AIMessage } from '@/services/ai/provider';
import { createGeminiProvider } from '@/services/ai/gemini';
import { createDeepSeekProvider } from '@/services/ai/deepseek';
import { getSearchService } from '@/services/search';
import type { SkillContext, SkillResult, ChatMessage } from '@/types';

/**
 * 将 ChatMessage 转换为 AIMessage
 */
function convertToAIMessages(history: ChatMessage[] | undefined): AIMessage[] {
  if (!history) return [];

  return history.map((msg) => ({
    role: msg.sender === 'assistant' ? 'assistant' : msg.sender === 'system' ? 'system' : 'user',
    content: msg.content,
  }));
}

/**
 * 获取 AI Provider Manager
 */
function getAIProviderManager(): AIProviderManager {
  const providers = [];

  try {
    providers.push(createGeminiProvider());
  } catch {
    // Gemini not available
  }

  try {
    providers.push(createDeepSeekProvider());
  } catch {
    // DeepSeek not available
  }

  if (providers.length === 0) {
    throw new Error('No AI providers available');
  }

  return new AIProviderManager(providers);
}

/**
 * Skill 执行器映射
 * 实际调用 AI 和搜索服务
 */
const SKILL_EXECUTORS: Record<string, (context: SkillContext) => Promise<SkillResult>> = {
  /**
   * AI 智能对话
   */
  'ai-chat': async (context) => {
    const startTime = Date.now();

    try {
      const manager = getAIProviderManager();

      const messages: AIMessage[] = [
        { role: 'system', content: '你是 DocuFusion 的智能助手，专注于帮助用户处理文档和回答问题。' },
        ...convertToAIMessages(context.history),
        { role: 'user', content: context.query },
      ];

      const response = await manager.chat({
        messages,
        stream: false,
        temperature: 0.7,
        maxTokens: 2048,
      });

      // 非流式响应
      if ('content' in response && typeof response.content === 'string') {
        return {
          success: true,
          data: {
            content: response.content,
            model: response.model,
            usage: response.usage,
          },
          duration: Date.now() - startTime,
          quotaUsed: 1,
        };
      }

      throw new Error('Unexpected response format');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AI service failed',
        duration: Date.now() - startTime,
        quotaUsed: 0,
      };
    }
  },

  /**
   * AI 图片生成
   * 注意: 需要 IMAGEN 或 DALL-E API，当前返回提示信息
   */
  'image-generation': async (context) => {
    const startTime = Date.now();

    // TODO: 集成实际的图片生成 API (Gemini Imagen, DALL-E, Stable Diffusion)
    // 当前返回占位响应
    return {
      success: true,
      data: {
        status: 'pending',
        message: '图片生成功能正在开发中，敬请期待！',
        prompt: context.query,
        suggestedService: 'Gemini Imagen API 或 DALL-E',
        placeholder: 'https://via.placeholder.com/1024x1024/F97316/FDFBF7?text=AI+Image',
      },
      duration: Date.now() - startTime,
      quotaUsed: 0,
      metadata: {
        featureStatus: 'coming_soon',
      },
    };
  },

  /**
   * 文档智能分析
   * 使用 AI 分析文档内容
   */
  'document-analysis': async (context) => {
    const startTime = Date.now();

    try {
      const manager = getAIProviderManager();

      // 获取要分析的内容
      const contentToAnalyze = context.selection?.text ||
        context.document?.content ||
        context.query;

      if (!contentToAnalyze) {
        return {
          success: false,
          error: '没有提供要分析的内容',
          duration: Date.now() - startTime,
          quotaUsed: 0,
        };
      }

      const analysisPrompt = `请对以下内容进行深度分析，包括：
1. 摘要（100字以内）
2. 关键词（5-10个）
3. 主题分类
4. 情感倾向
5. 核心观点

内容：
${contentToAnalyze.slice(0, 4000)}`;

      const messages = [
        {
          role: 'system' as const,
          content: '你是专业的文档分析助手。请以JSON格式返回分析结果，包含 summary, keywords, topics, sentiment, keyPoints 字段。'
        },
        { role: 'user' as const, content: analysisPrompt },
      ];

      const response = await manager.chat({
        messages,
        stream: false,
        temperature: 0.3,
        maxTokens: 1024,
      });

      if ('content' in response && typeof response.content === 'string') {
        // 尝试解析 JSON
        let analysisResult;
        try {
          // 提取 JSON 内容
          const jsonMatch = response.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysisResult = JSON.parse(jsonMatch[0]);
          } else {
            analysisResult = {
              summary: response.content.slice(0, 200),
              keywords: [],
              topics: [],
              sentiment: 'neutral',
              keyPoints: [],
            };
          }
        } catch {
          analysisResult = {
            summary: response.content.slice(0, 200),
            keywords: [],
            topics: [],
            sentiment: 'neutral',
            keyPoints: [],
            rawAnalysis: response.content,
          };
        }

        return {
          success: true,
          data: {
            ...analysisResult,
            wordCount: contentToAnalyze.length,
            model: response.model,
          },
          duration: Date.now() - startTime,
          quotaUsed: 2,
        };
      }

      throw new Error('Analysis failed');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Document analysis failed',
        duration: Date.now() - startTime,
        quotaUsed: 0,
      };
    }
  },

  /**
   * 数据可视化
   * 解析用户请求生成图表配置
   */
  'visualization': async (context) => {
    const startTime = Date.now();

    try {
      const manager = getAIProviderManager();

      const vizPrompt = `根据用户请求生成图表配置。用户请求：${context.query}

请返回 JSON 格式的 ECharts 配置，包含：
1. chartType: 图表类型 (bar/line/pie/radar/scatter)
2. title: 图表标题
3. option: 完整的 ECharts option 配置

如果用户没有提供具体数据，请生成示例数据。`;

      const messages = [
        {
          role: 'system' as const,
          content: '你是数据可视化专家。请返回有效的 ECharts JSON 配置。只返回 JSON，不要其他内容。'
        },
        { role: 'user' as const, content: vizPrompt },
      ];

      const response = await manager.chat({
        messages,
        stream: false,
        temperature: 0.5,
        maxTokens: 2048,
      });

      if ('content' in response && typeof response.content === 'string') {
        let chartConfig;
        try {
          const jsonMatch = response.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            chartConfig = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found');
          }
        } catch {
          // 返回默认图表配置
          chartConfig = {
            chartType: 'bar',
            title: '示例数据',
            option: {
              title: { text: '数据可视化' },
              tooltip: { trigger: 'axis' },
              xAxis: {
                type: 'category',
                data: ['一月', '二月', '三月', '四月', '五月']
              },
              yAxis: { type: 'value' },
              series: [{
                type: 'bar',
                data: [120, 200, 150, 80, 270],
                itemStyle: { color: '#F97316' }
              }],
            },
          };
        }

        return {
          success: true,
          data: {
            type: 'chart',
            ...chartConfig,
          },
          duration: Date.now() - startTime,
          quotaUsed: 2,
        };
      }

      throw new Error('Visualization generation failed');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Visualization failed',
        duration: Date.now() - startTime,
        quotaUsed: 0,
      };
    }
  },

  /**
   * 网络搜索
   * 使用实际的搜索服务
   */
  'web-search': async (context) => {
    const startTime = Date.now();

    try {
      const searchService = getSearchService();

      const searchResponse = await searchService.search(context.query, {
        limit: 10,
        language: 'zh-CN',
      });

      return {
        success: true,
        data: {
          query: context.query,
          provider: searchResponse.provider,
          cached: searchResponse.cached,
          results: searchResponse.results.map((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.snippet,
            source: r.source || new URL(r.url).hostname,
          })),
          totalResults: searchResponse.results.length,
        },
        duration: Date.now() - startTime,
        quotaUsed: 1,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
        duration: Date.now() - startTime,
        quotaUsed: 0,
      };
    }
  },
};

/**
 * Skill 元数据
 */
const SKILL_METADATA: Record<string, {
  name: string;
  displayName: string;
  description: string;
  category: string;
  quotaCost: number;
  status: 'active' | 'beta' | 'coming_soon';
}> = {
  'ai-chat': {
    name: 'ai-chat',
    displayName: 'AI 智能对话',
    description: '基于大语言模型的智能对话助手，支持多轮对话和上下文记忆',
    category: 'ai-chat',
    quotaCost: 1,
    status: 'active',
  },
  'image-generation': {
    name: 'image-generation',
    displayName: 'AI 图片生成',
    description: '基于文本描述生成高质量图片（开发中）',
    category: 'image',
    quotaCost: 5,
    status: 'coming_soon',
  },
  'document-analysis': {
    name: 'document-analysis',
    displayName: '文档智能分析',
    description: '深度分析文档内容，提取关键信息、生成摘要、识别关键词',
    category: 'document',
    quotaCost: 2,
    status: 'active',
  },
  'visualization': {
    name: 'visualization',
    displayName: '数据可视化',
    description: '将数据转换为可视化图表，支持柱状图、折线图、饼图等',
    category: 'visualization',
    quotaCost: 2,
    status: 'active',
  },
  'web-search': {
    name: 'web-search',
    displayName: '网络搜索',
    description: '搜索互联网获取最新信息，支持多搜索引擎和结果缓存',
    category: 'search',
    quotaCost: 1,
    status: 'active',
  },
};

interface RouteParams {
  params: Promise<{ skillId: string }>;
}

/**
 * GET /api/skills/[skillId]
 *
 * 获取 Skill 详细信息
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { skillId } = await params;
    const metadata = SKILL_METADATA[skillId];

    if (!metadata) {
      return createErrorResponse(`Skill "${skillId}" not found`, 404);
    }

    return createApiResponse({
      skill: metadata,
      available: metadata.status === 'active',
    });
  } catch (error) {
    console.error('Failed to get skill:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to get skill',
      500
    );
  }
}

/**
 * POST /api/skills/[skillId]
 *
 * 执行 Skill
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { skillId } = await params;
    const executor = SKILL_EXECUTORS[skillId];

    if (!executor) {
      return createErrorResponse(`Skill "${skillId}" not found`, 404);
    }

    const body = await request.json();
    const { query, document, selection, params: skillParams, history } = body;

    if (!query) {
      return createErrorResponse('Query is required', 400);
    }

    // 构建执行上下文
    const context: SkillContext = {
      query,
      document,
      selection,
      history,
      params: skillParams,
    };

    // 执行 Skill
    const startTime = Date.now();
    const result = await executor(context);
    const duration = Date.now() - startTime;

    return createApiResponse({
      skillId,
      result: {
        ...result,
        duration: result.duration || duration,
      },
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to execute skill:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to execute skill',
      500
    );
  }
}
