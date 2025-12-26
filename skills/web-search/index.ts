/**
 * Web Search Skill
 *
 * 网络搜索 - 搜索互联网获取最新信息
 *
 * @module skills/web-search
 */

import type { SkillDefinition, SkillManifest } from '@/types';
import { execute, type WebSearchResult } from './executor';
import manifestJson from './manifest.json';

// 导出结果类型
export type { WebSearchResult };

/**
 * 将 JSON manifest 转换为类型安全的 SkillManifest
 */
const manifest: SkillManifest = {
  name: 'web-search',
  displayName: manifestJson.name,
  description: manifestJson.description,
  category: 'search',
  version: manifestJson.version,
  triggers: manifestJson.triggers,
  requiredPermissions: ['network:access'],
  requiresSubscription: 'free',
  quotaCost: manifestJson.quotaCost,
  author: manifestJson.author,
  icon: '🔍',
};

/**
 * Web Search Skill 定义
 */
export const webSearchSkill: SkillDefinition<WebSearchResult> = {
  manifest,
  execute,
  isAvailable: async () => {
    // 网络搜索始终可用（除非离线）
    // TODO: 检查网络连接状态
    return true;
  },
};

export default webSearchSkill;
