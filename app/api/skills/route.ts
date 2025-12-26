/**
 * Skills API - 获取可用 Skills 列表
 *
 * GET /api/skills - 获取所有可用 Skills
 * POST /api/skills/select - AI 选择最佳 Skill
 *
 * @module app/api/skills
 */

import { NextRequest } from 'next/server';
import { createApiResponse, createErrorResponse } from '@/lib/api/response';
import type { SkillCategory, SkillContext } from '@/types';

/**
 * Skill 信息（前端展示用）
 */
interface SkillInfo {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: SkillCategory;
  icon: string;
  triggers: string[];
  quotaCost: number;
  requiresSubscription?: string;
}

/**
 * 内置 Skills 元数据
 * 注意：这里只返回元数据，不暴露实现细节
 */
const SKILLS_METADATA: SkillInfo[] = [
  {
    id: 'ai-chat',
    name: 'ai-chat',
    displayName: 'AI 智能对话',
    description: '基于大语言模型的智能对话助手，支持多轮对话、上下文记忆和流式输出',
    category: 'ai-chat',
    icon: '💬',
    triggers: ['chat', '对话', '问', '回答', '询问', 'tell me', '解释', '帮我'],
    quotaCost: 1,
    requiresSubscription: 'free',
  },
  {
    id: 'image-generation',
    name: 'image-generation',
    displayName: 'AI 图片生成',
    description: '基于文本描述生成高质量图片，支持多种风格和分辨率',
    category: 'image',
    icon: '🎨',
    triggers: ['生成图片', '画图', '创建图像', 'generate image', 'draw', '插图', '配图'],
    quotaCost: 5,
    requiresSubscription: 'pro',
  },
  {
    id: 'document-analysis',
    name: 'document-analysis',
    displayName: '文档智能分析',
    description: '深度分析文档内容，提取关键信息、生成摘要、识别实体和关键词',
    category: 'document',
    icon: '📊',
    triggers: ['分析文档', '总结', '摘要', '提取', 'summarize', 'analyze', '关键词', '实体识别'],
    quotaCost: 2,
    requiresSubscription: 'free',
  },
  {
    id: 'visualization',
    name: 'visualization',
    displayName: '数据可视化',
    description: '将数据转换为图表、思维导图等可视化形式，支持多种图表类型和自定义样式',
    category: 'visualization',
    icon: '📈',
    triggers: ['图表', '可视化', 'chart', 'graph', '思维导图', 'mindmap', '流程图', '饼图', '柱状图', '折线图'],
    quotaCost: 2,
    requiresSubscription: 'free',
  },
  {
    id: 'web-search',
    name: 'web-search',
    displayName: '网络搜索',
    description: '搜索互联网获取最新信息，支持多种搜索引擎和智能结果整合',
    category: 'search',
    icon: '🔍',
    triggers: ['搜索', 'search', '查询', '查找', '找一下', '联网', '网上', '最新', '新闻'],
    quotaCost: 1,
    requiresSubscription: 'free',
  },
];

/**
 * GET /api/skills
 *
 * 获取所有可用 Skills 列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') as SkillCategory | null;

    let skills = SKILLS_METADATA;

    // 按分类筛选
    if (category) {
      skills = skills.filter((skill) => skill.category === category);
    }

    return createApiResponse({
      skills,
      total: skills.length,
      categories: [...new Set(SKILLS_METADATA.map((s) => s.category))],
    });
  } catch (error) {
    console.error('Failed to get skills:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to get skills',
      500
    );
  }
}

/**
 * POST /api/skills
 *
 * AI 驱动的 Skill 选择
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, documentId: _documentId, selection } = body as {
      query: string;
      documentId?: string;
      selection?: string;
    };

    if (!query) {
      return createErrorResponse('Query is required', 400);
    }

    // 简单的关键词匹配算法
    // TODO: 升级为 AI 语义匹配
    const context: SkillContext = {
      query,
      ...(selection ? { selection: { text: selection, start: 0, end: selection.length } } : {}),
    };

    const matchedSkills = selectBestSkills(query, context);

    return createApiResponse({
      query,
      recommendations: matchedSkills,
      topMatch: matchedSkills[0] || null,
    });
  } catch (error) {
    console.error('Failed to select skill:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to select skill',
      500
    );
  }
}

/**
 * 选择最佳匹配的 Skills
 */
function selectBestSkills(
  query: string,
  _context: SkillContext
): Array<{ skill: SkillInfo; confidence: number; reason: string }> {
  const lowerQuery = query.toLowerCase();

  const scoredSkills = SKILLS_METADATA.map((skill) => {
    let score = 0;
    let reasons: string[] = [];

    // 检查触发词匹配
    skill.triggers.forEach((trigger) => {
      if (lowerQuery.includes(trigger.toLowerCase())) {
        score += 10;
        reasons.push(`匹配触发词: ${trigger}`);
      }
    });

    // 检查描述相关性
    const words = query.split(/\s+/);
    words.forEach((word) => {
      if (word.length > 1 && skill.description.toLowerCase().includes(word.toLowerCase())) {
        score += 3;
      }
    });

    // 计算置信度 (0-1)
    const confidence = Math.min(score / 20, 1);

    return {
      skill,
      confidence,
      reason: reasons.length > 0 ? reasons.join(', ') : '语义相关',
    };
  });

  // 按置信度排序并过滤低分项
  return scoredSkills
    .filter(({ confidence }) => confidence > 0.1)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}
