/**
 * DocuMind Pro - Skills Registry
 *
 * Skills系统注册表 - 支持动态加载和AI驱动选择
 * 所有Skill都需要在此注册才能被系统识别
 */

import type {
  SkillDefinition,
  SkillContext,
  SkillResult,
  SkillCategory,
  SkillPermission,
} from '@/types';

// 类型别名，保持向后兼容
type Skill = SkillDefinition;

/**
 * Skills 注册表
 *
 * 使用 Map 存储，key 为 skill ID，value 为 skill 配置
 */
export const skillRegistry = new Map<string, Skill>();

/**
 * 注册 Skill
 *
 * @param id - Skill 唯一标识符
 * @param skill - Skill 定义
 * @throws 如果 Skill ID 重复会发出警告
 */
export function registerSkill(id: string, skill: Skill): void {
  if (skillRegistry.has(id)) {
    console.warn(`⚠️  Skill ${id} already registered, overwriting...`);
  }

  // 验证 manifest 必填字段
  if (!skill.manifest.name || !skill.manifest.description) {
    throw new Error(`Invalid skill manifest for ${id}: missing name or description`);
  }

  skillRegistry.set(id, skill);
  console.log(`✅ Skill registered: ${id} (${skill.manifest.name})`);
}

/**
 * 批量注册 Skills
 *
 * @param skills - Skills 数组（Record 格式，key 为 ID）
 */
export function registerSkills(skills: Record<string, Skill>): void {
  Object.entries(skills).forEach(([id, skill]) => registerSkill(id, skill));
}

/**
 * 获取 Skill
 *
 * @param id - Skill ID
 * @returns Skill 定义或 undefined
 */
export function getSkill(id: string): Skill | undefined {
  return skillRegistry.get(id);
}

/**
 * 获取所有 Skill
 *
 * @returns 所有已注册的 Skills
 */
export function getAllSkills(): Skill[] {
  return Array.from(skillRegistry.values());
}

/**
 * 获取所有启用的 Skills
 *
 * @returns 所有已注册的 Skills（假设都是启用的）
 */
export function getEnabledSkills(): Skill[] {
  // 由于 SkillDefinition 没有 status 字段，所有已注册的 Skills 都被视为启用
  return getAllSkills();
}

/**
 * 按分类获取 Skills
 *
 * @param category - Skill 分类
 * @returns 指定分类的 Skills
 */
export function getSkillsByCategory(category: SkillCategory): Skill[] {
  return getAllSkills().filter((skill) => skill.manifest.category === category);
}

/**
 * 按权限过滤 Skills
 *
 * @param userPermissions - 用户拥有的权限
 * @returns 用户有权限使用的 Skills
 */
export function getSkillsByPermissions(userPermissions: SkillPermission[]): Skill[] {
  return getAllSkills().filter((skill) => {
    const requiredPerms = skill.manifest.requiredPermissions;
    return requiredPerms.every((perm: SkillPermission) => userPermissions.includes(perm));
  });
}

/**
 * AI 驱动的 Skill 选择
 *
 * 根据用户查询和上下文智能推荐最合适的 Skills
 *
 * @param context - 执行上下文
 * @returns 推荐的 Skills 列表（按相关性排序）
 */
export async function selectSkillsByContext(context: SkillContext): Promise<Skill[]> {
  const enabledSkills = getEnabledSkills();

  // 简单的关键词匹配算法（后续可升级为AI语义匹配）
  const query = context.query.toLowerCase();

  const scoredSkills = enabledSkills.map((skill) => {
    let score = 0;

    // 检查触发词匹配
    skill.manifest.triggers.forEach((trigger: string) => {
      if (query.includes(trigger.toLowerCase())) {
        score += 10;
      }
    });

    // 检查描述相关性
    const firstWord = query.split(' ')[0];
    if (firstWord && skill.manifest.description.toLowerCase().includes(firstWord)) {
      score += 5;
    }

    return { skill, score };
  });

  // 按分数排序并过滤掉0分的
  return scoredSkills
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ skill }) => skill);
}

/**
 * 执行 Skill
 *
 * @param id - Skill ID
 * @param context - 执行上下文
 * @returns Skill 执行结果
 * @throws 如果 Skill 不存在或未启用
 */
export async function executeSkill(id: string, context: SkillContext): Promise<SkillResult> {
  const skill = getSkill(id);

  if (!skill) {
    return {
      success: false,
      error: `Skill ${id} not found`,
    };
  }

  try {
    const result = await skill.execute(context);
    return result;
  } catch (error) {
    console.error(`❌ Skill ${id} execution failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 取消注册 Skill
 *
 * @param id - Skill ID
 * @returns 是否成功取消注册
 */
export function unregisterSkill(id: string): boolean {
  return skillRegistry.delete(id);
}
