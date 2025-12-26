/**
 * Data Visualization Skill
 *
 * 数据可视化 - 图表、思维导图、流程图等
 *
 * @module skills/visualization
 */

import type { SkillDefinition, SkillManifest } from '@/types';
import { execute, type VisualizationResult } from './executor';
import manifestJson from './manifest.json';

// 导出结果类型
export type { VisualizationResult };

/**
 * 将 JSON manifest 转换为类型安全的 SkillManifest
 */
const manifest: SkillManifest = {
  name: 'visualization',
  displayName: manifestJson.name,
  description: manifestJson.description,
  category: 'visualization',
  version: manifestJson.version,
  triggers: manifestJson.triggers,
  requiredPermissions: ['ai:chat', 'document:read'],
  requiresSubscription: 'free',
  quotaCost: manifestJson.quotaCost,
  author: manifestJson.author,
  icon: '📈',
};

/**
 * Visualization Skill 定义
 */
export const visualizationSkill: SkillDefinition<VisualizationResult> = {
  manifest,
  execute,
  isAvailable: async (context) => {
    // 可视化需要有数据源（文档或选中内容）
    return !!(context.document || context.selection?.text);
  },
};

export default visualizationSkill;
