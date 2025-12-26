/**
 * Document Analysis Skill
 *
 * 文档智能分析 - 提取关键信息、生成摘要、识别实体和关键词
 *
 * @module skills/document-analysis
 */

import type { SkillDefinition, SkillManifest } from '@/types';
import { execute, type DocumentAnalysisResult } from './executor';
import manifestJson from './manifest.json';

// 导出结果类型
export type { DocumentAnalysisResult };

/**
 * 将 JSON manifest 转换为类型安全的 SkillManifest
 */
const manifest: SkillManifest = {
  name: 'document-analysis',
  displayName: manifestJson.name,
  description: manifestJson.description,
  category: 'document',
  version: manifestJson.version,
  triggers: manifestJson.triggers,
  requiredPermissions: ['ai:chat', 'document:read'],
  requiresSubscription: 'free',
  quotaCost: manifestJson.quotaCost,
  author: manifestJson.author,
  icon: '📊',
};

/**
 * Document Analysis Skill 定义
 */
export const documentAnalysisSkill: SkillDefinition<DocumentAnalysisResult> = {
  manifest,
  execute,
  isAvailable: async (context) => {
    // 文档分析需要有文档
    return !!context.document;
  },
};

export default documentAnalysisSkill;
