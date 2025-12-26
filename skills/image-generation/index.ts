/**
 * Image Generation Skill
 *
 * AI 图片生成 - 支持多种风格和分辨率
 *
 * @module skills/image-generation
 */

import type { SkillDefinition, SkillManifest } from '@/types';
import { execute, type ImageGenerationResult } from './executor';
import manifestJson from './manifest.json';

// 导出结果类型
export type { ImageGenerationResult };

/**
 * 将 JSON manifest 转换为类型安全的 SkillManifest
 */
const manifest: SkillManifest = {
  name: 'image-generation',
  displayName: manifestJson.name,
  description: manifestJson.description,
  category: 'image',
  version: manifestJson.version,
  triggers: manifestJson.triggers,
  requiredPermissions: ['ai:image'],
  requiresSubscription: 'pro',
  quotaCost: manifestJson.quotaCost,
  author: manifestJson.author,
  icon: '🎨',
};

/**
 * Image Generation Skill 定义
 */
export const imageGenerationSkill: SkillDefinition<ImageGenerationResult> = {
  manifest,
  execute,
  isAvailable: async (_context) => {
    // 图片生成需要 Pro 订阅
    // TODO: 检查用户订阅状态
    return true;
  },
};

export default imageGenerationSkill;
