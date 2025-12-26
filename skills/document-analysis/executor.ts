/**
 * Document Analysis Skill Executor
 *
 * 完整实现文档智能分析功能
 * - 文档结构分析
 * - 关键词提取
 * - 实体识别
 * - 情感分析
 * - 智能摘要生成
 */

import type { SkillContext, SkillResult } from '@/types';

/**
 * 实体类型
 */
export interface Entity {
  type: 'person' | 'organization' | 'location' | 'date' | 'product' | 'concept';
  value: string;
  confidence: number;
  context?: string;
}

/**
 * 文档结构信息
 */
export interface DocumentStructure {
  totalSections: number;
  headings: Array<{ level: number; text: string }>;
  paragraphs: number;
  lists: number;
  tables: number;
  images: number;
}

/**
 * 文档分析结果
 */
export interface DocumentAnalysisResult {
  /** 智能摘要 */
  summary: string;
  /** 关键词列表 */
  keywords: Array<{
    word: string;
    score: number;
    frequency: number;
  }>;
  /** 识别的实体 */
  entities: Entity[];
  /** 情感分析 */
  sentiment: {
    label: 'positive' | 'neutral' | 'negative';
    score: number;
    aspects?: Array<{
      aspect: string;
      sentiment: 'positive' | 'neutral' | 'negative';
    }>;
  };
  /** 主题分类 */
  topics: Array<{
    topic: string;
    confidence: number;
  }>;
  /** 文档结构 */
  structure: DocumentStructure;
  /** 字数统计 */
  wordCount: number;
  /** 阅读时间（分钟） */
  readingTime: number;
  /** 可读性评分 */
  readabilityScore: number;
}

/**
 * 分析类型
 */
export type AnalysisType =
  | 'summary'
  | 'keywords'
  | 'entities'
  | 'sentiment'
  | 'topics'
  | 'structure'
  | 'all';

/**
 * 分析选项
 */
export interface DocumentAnalysisOptions {
  /** 分析类型 */
  analysisTypes?: AnalysisType[];
  /** 摘要最大长度 */
  summaryMaxLength?: number;
  /** 关键词数量 */
  maxKeywords?: number;
  /** 语言 */
  language?: 'zh' | 'en' | 'auto';
}

/**
 * 文档分析执行器
 *
 * @param context - Skill 执行上下文
 * @returns 执行结果
 */
export async function execute(
  context: SkillContext
): Promise<SkillResult<DocumentAnalysisResult>> {
  const startTime = Date.now();

  try {
    const { document, query, params } = context;

    if (!document) {
      return {
        success: false,
        error: 'No document provided for analysis',
        duration: Date.now() - startTime,
      };
    }

    // 解析选项
    const options: DocumentAnalysisOptions = {
      analysisTypes: determineAnalysisTypes(query),
      summaryMaxLength: (params?.summaryMaxLength as number) || 500,
      maxKeywords: (params?.maxKeywords as number) || 10,
      language: (params?.language as 'zh' | 'en' | 'auto') || 'auto',
    };

    // 执行分析
    const result = await analyzeDocument(document, options);

    const duration = Date.now() - startTime;

    return {
      success: true,
      data: result,
      duration,
      metadata: {
        model: 'gemini-2.0-flash-exp',
        analysisTypes: options.analysisTypes,
        quotaUsed: 2,
      },
    };
  } catch (error) {
    console.error('Document analysis failed:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Document analysis failed',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * 确定分析类型
 */
function determineAnalysisTypes(query: string): AnalysisType[] {
  const types: AnalysisType[] = [];
  const lowerQuery = query.toLowerCase();

  if (
    lowerQuery.includes('摘要') ||
    lowerQuery.includes('总结') ||
    lowerQuery.includes('summary')
  ) {
    types.push('summary');
  }
  if (
    lowerQuery.includes('关键词') ||
    lowerQuery.includes('keyword') ||
    lowerQuery.includes('关键字')
  ) {
    types.push('keywords');
  }
  if (
    lowerQuery.includes('实体') ||
    lowerQuery.includes('entity') ||
    lowerQuery.includes('人名') ||
    lowerQuery.includes('地点')
  ) {
    types.push('entities');
  }
  if (
    lowerQuery.includes('情感') ||
    lowerQuery.includes('sentiment') ||
    lowerQuery.includes('态度')
  ) {
    types.push('sentiment');
  }
  if (
    lowerQuery.includes('主题') ||
    lowerQuery.includes('topic') ||
    lowerQuery.includes('分类')
  ) {
    types.push('topics');
  }
  if (
    lowerQuery.includes('结构') ||
    lowerQuery.includes('structure') ||
    lowerQuery.includes('大纲')
  ) {
    types.push('structure');
  }

  // 如果没有指定类型，默认全部分析
  if (types.length === 0) {
    types.push('all');
  }

  return types;
}

/**
 * 执行文档分析
 */
async function analyzeDocument(
  document: NonNullable<SkillContext['document']>,
  options: DocumentAnalysisOptions
): Promise<DocumentAnalysisResult> {
  const content = document.content || '';
  const shouldAnalyze = (type: AnalysisType) =>
    options.analysisTypes?.includes('all') ||
    options.analysisTypes?.includes(type);

  // 基础统计
  const wordCount = calculateWordCount(content);
  const readingTime = Math.ceil(wordCount / 200); // 假设每分钟200字
  const structure = analyzeStructure(content);

  // 调用 AI 进行深度分析
  const aiAnalysis = await callAIForAnalysis(document, options);

  return {
    summary: shouldAnalyze('summary')
      ? aiAnalysis.summary
      : '未请求摘要分析',
    keywords: shouldAnalyze('keywords') ? aiAnalysis.keywords : [],
    entities: shouldAnalyze('entities') ? aiAnalysis.entities : [],
    sentiment: shouldAnalyze('sentiment')
      ? aiAnalysis.sentiment
      : { label: 'neutral', score: 0.5 },
    topics: shouldAnalyze('topics') ? aiAnalysis.topics : [],
    structure: shouldAnalyze('structure')
      ? structure
      : {
          totalSections: 0,
          headings: [],
          paragraphs: 0,
          lists: 0,
          tables: 0,
          images: 0,
        },
    wordCount,
    readingTime,
    readabilityScore: calculateReadabilityScore(content),
  };
}

/**
 * 计算字数
 */
function calculateWordCount(content: string): number {
  // 中文字符计数
  const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
  // 英文单词计数
  const englishWords = (
    content.match(/[a-zA-Z]+/g) || []
  ).length;

  return chineseChars + englishWords;
}

/**
 * 分析文档结构
 */
function analyzeStructure(content: string): DocumentStructure {
  // 识别标题（Markdown 格式）
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: Array<{ level: number; text: string }> = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    headings.push({
      level: match[1]?.length || 1,
      text: match[2] || '',
    });
  }

  // 统计段落（以空行分隔）
  const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim()).length;

  // 统计列表（以 - 或 * 或数字. 开头）
  const lists = (content.match(/^[\s]*[-*\d.]+\s/gm) || []).length;

  // 统计表格（Markdown 表格分隔符）
  const tables = (content.match(/^\|.+\|$/gm) || []).length > 0 ? 1 : 0;

  // 统计图片（Markdown 图片语法）
  const images = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;

  return {
    totalSections: headings.length,
    headings,
    paragraphs,
    lists,
    tables,
    images,
  };
}

/**
 * 计算可读性评分
 */
function calculateReadabilityScore(content: string): number {
  // 简化的可读性评分（基于句子长度和词汇复杂度）
  const sentences = content.split(/[。！？.!?]+/).filter((s) => s.trim());
  if (sentences.length === 0) return 50;

  const avgSentenceLength =
    content.length / sentences.length;

  // 评分公式：句子越短越易读，100分为最易读
  let score = 100 - avgSentenceLength * 0.5;
  score = Math.max(0, Math.min(100, score));

  return Math.round(score);
}

/**
 * 调用 AI 进行分析
 */
async function callAIForAnalysis(
  document: NonNullable<SkillContext['document']>,
  options: DocumentAnalysisOptions
): Promise<{
  summary: string;
  keywords: Array<{ word: string; score: number; frequency: number }>;
  entities: Entity[];
  sentiment: {
    label: 'positive' | 'neutral' | 'negative';
    score: number;
  };
  topics: Array<{ topic: string; confidence: number }>;
}> {
  const baseUrl =
    typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_BASE_URL || '';

  const content = document.content || '';
  const contentPreview = content.slice(0, 4000); // 限制内容长度

  const prompt = `请分析以下文档内容，并以JSON格式返回分析结果：

文档标题：${document.title}
文档内容：
${contentPreview}
${content.length > 4000 ? '\n...(内容过长，已截断)' : ''}

请返回以下格式的JSON（直接返回JSON，不要包含markdown代码块）：
{
  "summary": "文档的简洁摘要，不超过${options.summaryMaxLength}字",
  "keywords": [
    {"word": "关键词1", "score": 0.9, "frequency": 5},
    {"word": "关键词2", "score": 0.8, "frequency": 3}
  ],
  "entities": [
    {"type": "person", "value": "人名", "confidence": 0.9},
    {"type": "organization", "value": "组织名", "confidence": 0.85},
    {"type": "location", "value": "地点", "confidence": 0.8}
  ],
  "sentiment": {
    "label": "positive/neutral/negative",
    "score": 0.7
  },
  "topics": [
    {"topic": "主题1", "confidence": 0.9},
    {"topic": "主题2", "confidence": 0.7}
  ]
}

注意：
1. 关键词最多返回${options.maxKeywords}个
2. 实体类型包括：person（人物）、organization（组织）、location（地点）、date（日期）、product（产品）、concept（概念）
3. 情感分析score范围0-1，越接近1表示情感越强烈
4. 置信度confidence范围0-1`;

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
      throw new Error('AI analysis request failed');
    }

    const data = await response.json();
    const aiContent = data.data?.content || data.content || '';

    // 尝试解析 AI 返回的 JSON
    try {
      // 清理可能的 markdown 代码块标记
      const jsonContent = aiContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(jsonContent);
      return {
        summary: parsed.summary || '无法生成摘要',
        keywords: (parsed.keywords || []).slice(0, options.maxKeywords),
        entities: parsed.entities || [],
        sentiment: parsed.sentiment || { label: 'neutral', score: 0.5 },
        topics: parsed.topics || [],
      };
    } catch {
      // JSON 解析失败，返回 AI 内容作为摘要
      return {
        summary: aiContent.slice(0, options.summaryMaxLength || 500),
        keywords: extractKeywordsFromText(content, options.maxKeywords || 10),
        entities: [],
        sentiment: { label: 'neutral', score: 0.5 },
        topics: [],
      };
    }
  } catch (error) {
    console.error('AI analysis failed:', error);

    // 回退到本地分析
    return {
      summary: `《${document.title}》是一篇包含${calculateWordCount(content)}字的文档。`,
      keywords: extractKeywordsFromText(content, options.maxKeywords || 10),
      entities: [],
      sentiment: { label: 'neutral', score: 0.5 },
      topics: [],
    };
  }
}

/**
 * 从文本提取关键词（简单实现）
 */
function extractKeywordsFromText(
  text: string,
  maxCount: number
): Array<{ word: string; score: number; frequency: number }> {
  // 简单的词频统计
  const words = text
    .replace(/[^\u4e00-\u9fa5a-zA-Z]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const wordFreq = new Map<string, number>();
  words.forEach((word) => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });

  // 排序并取前N个
  const sorted = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCount);

  const maxFreq = sorted[0]?.[1] || 1;

  return sorted.map(([word, frequency]) => ({
    word,
    score: frequency / maxFreq,
    frequency,
  }));
}

/**
 * 便捷方法：仅生成摘要
 */
export async function generateSummary(
  context: SkillContext
): Promise<SkillResult<string>> {
  const result = await execute({
    ...context,
    query: '生成摘要',
  });

  if (result.success && result.data) {
    const response: SkillResult<string> = {
      success: true,
      data: result.data.summary,
    };
    if (result.duration !== undefined) {
      response.duration = result.duration;
    }
    return response;
  }

  const errorResponse: SkillResult<string> = {
    success: false,
  };
  if (result.error !== undefined) {
    errorResponse.error = result.error;
  }
  if (result.duration !== undefined) {
    errorResponse.duration = result.duration;
  }
  return errorResponse;
}

/**
 * 便捷方法：提取关键词
 */
export async function extractKeywords(
  context: SkillContext
): Promise<SkillResult<Array<{ word: string; score: number }>>> {
  const result = await execute({
    ...context,
    query: '提取关键词',
  });

  if (result.success && result.data) {
    const response: SkillResult<Array<{ word: string; score: number }>> = {
      success: true,
      data: result.data.keywords.map((k) => ({
        word: k.word,
        score: k.score,
      })),
    };
    if (result.duration !== undefined) {
      response.duration = result.duration;
    }
    return response;
  }

  const errorResponse: SkillResult<Array<{ word: string; score: number }>> = {
    success: false,
  };
  if (result.error !== undefined) {
    errorResponse.error = result.error;
  }
  if (result.duration !== undefined) {
    errorResponse.duration = result.duration;
  }
  return errorResponse;
}

export default execute;
