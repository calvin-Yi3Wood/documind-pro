/**
 * AI Chat Skill
 *
 * 智能对话助手 - 支持多轮对话、上下文记忆和流式输出
 *
 * @module skills/ai-chat
 */

import type { SkillDefinition, SkillManifest } from '@/types';
import { execute } from './executor';
import manifestJson from './manifest.json';

/**
 * 将 JSON manifest 转换为类型安全的 SkillManifest
 */
const manifest: SkillManifest = {
  name: 'ai-chat',
  displayName: manifestJson.name,
  description: manifestJson.description,
  category: 'ai-chat',
  version: manifestJson.version,
  triggers: manifestJson.triggers,
  requiredPermissions: ['ai:chat', 'document:read'],
  requiresSubscription: 'free',
  quotaCost: manifestJson.quotaCost,
  author: manifestJson.author,
  icon: '💬',
};

/**
 * AI Chat Skill 定义
 */
export const aiChatSkill: SkillDefinition<string> = {
  manifest,
  execute,
  isAvailable: async (_context) => {
    // AI 对话始终可用
    return true;
  },
};

export default aiChatSkill;
