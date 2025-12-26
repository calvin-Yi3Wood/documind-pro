/**
 * DocuMind Pro - Skills System
 *
 * 统一导出所有 Skills 及相关工具
 *
 * @module skills
 */

// ==================== Skills 定义导出 ====================

export { aiChatSkill } from './ai-chat';
export { imageGenerationSkill } from './image-generation';
export { documentAnalysisSkill } from './document-analysis';
export { visualizationSkill } from './visualization';
export { webSearchSkill } from './web-search';

// ==================== 类型导出 ====================

export type { ImageGenerationResult } from './image-generation';
export type { DocumentAnalysisResult } from './document-analysis';
export type { VisualizationResult } from './visualization';
export type { WebSearchResult } from './web-search';

// ==================== 注册表和加载器导出 ====================

export {
  skillRegistry,
  registerSkill,
  registerSkills,
  getSkill,
  getAllSkills,
  getEnabledSkills,
  getSkillsByCategory,
  getSkillsByPermissions,
  selectSkillsByContext,
  executeSkill,
  unregisterSkill,
} from './registry';

export {
  skillLoader,
  loadSkill,
  loadSkills,
  preloadAllSkills,
  type LoadStatus,
} from './loader';

// ==================== Skills 列表 ====================

import { aiChatSkill } from './ai-chat';
import { imageGenerationSkill } from './image-generation';
import { documentAnalysisSkill } from './document-analysis';
import { visualizationSkill } from './visualization';
import { webSearchSkill } from './web-search';
import { registerSkills } from './registry';
import type { SkillDefinition } from '@/types';

/**
 * 所有内置 Skills
 */
export const builtinSkills: Record<string, SkillDefinition> = {
  'ai-chat': aiChatSkill,
  'image-generation': imageGenerationSkill,
  'document-analysis': documentAnalysisSkill,
  'visualization': visualizationSkill,
  'web-search': webSearchSkill,
};

/**
 * Skills ID 列表
 */
export const SKILL_IDS = [
  'ai-chat',
  'image-generation',
  'document-analysis',
  'visualization',
  'web-search',
] as const;

export type SkillId = typeof SKILL_IDS[number];

/**
 * 初始化所有内置 Skills
 *
 * 在应用启动时调用此函数注册所有 Skills
 */
export function initializeBuiltinSkills(): void {
  console.log('🚀 Initializing DocuMind Pro Skills...');
  registerSkills(builtinSkills);
  console.log(`✅ ${Object.keys(builtinSkills).length} skills registered successfully`);
}

/**
 * 获取 Skill 的显示信息
 */
export function getSkillDisplayInfo(skillId: SkillId): {
  name: string;
  description: string;
  icon: string;
  category: string;
} | null {
  const skill = builtinSkills[skillId];
  if (!skill) return null;

  return {
    name: skill.manifest.displayName,
    description: skill.manifest.description,
    icon: skill.manifest.icon || '⚡',
    category: skill.manifest.category,
  };
}

/**
 * 检查 Skill 是否可用
 */
export async function checkSkillAvailability(
  skillId: SkillId,
  context: Parameters<NonNullable<SkillDefinition['isAvailable']>>[0]
): Promise<boolean> {
  const skill = builtinSkills[skillId];
  if (!skill) return false;

  if (skill.isAvailable) {
    return skill.isAvailable(context);
  }

  return true;
}
