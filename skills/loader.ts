/**
 * DocuMind Pro - Skills Loader
 *
 * Skills 懒加载系统 - 按需动态加载 Skills
 * 支持从文件系统读取 manifest.json 和动态导入执行器
 */

import type { SkillDefinition, SkillManifest, SkillExecutor } from '@/types';
import { registerSkill } from './registry';

// 类型别名
type Skill = SkillDefinition;

/**
 * 加载状态
 */
export type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * 加载记录
 */
interface LoadRecord {
  skillId: string;
  status: LoadStatus;
  loadedAt?: Date;
  error?: string;
}

/**
 * 加载状态管理器
 */
class SkillLoaderManager {
  private loadRecords = new Map<string, LoadRecord>();
  private loadPromises = new Map<string, Promise<Skill>>();

  /**
   * 从 manifest.json 和执行器文件动态加载 Skill
   *
   * @param skillId - Skill 唯一标识符（对应文件夹名）
   * @returns 加载的 Skill 定义
   */
  async loadSkill(skillId: string): Promise<Skill> {
    // 检查是否正在加载
    const existingPromise = this.loadPromises.get(skillId);
    if (existingPromise) {
      return existingPromise;
    }

    // 检查是否已加载
    const record = this.loadRecords.get(skillId);
    if (record?.status === 'loaded') {
      throw new Error(`Skill ${skillId} already loaded`);
    }

    // 创建加载 Promise
    const loadPromise = this._loadSkillInternal(skillId);
    this.loadPromises.set(skillId, loadPromise);

    try {
      const skill = await loadPromise;
      this.loadRecords.set(skillId, {
        skillId,
        status: 'loaded',
        loadedAt: new Date(),
      });
      return skill;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.loadRecords.set(skillId, {
        skillId,
        status: 'error',
        error: errorMessage,
      });
      throw error;
    } finally {
      this.loadPromises.delete(skillId);
    }
  }

  /**
   * 内部加载逻辑
   */
  private async _loadSkillInternal(skillId: string): Promise<Skill> {
    this.loadRecords.set(skillId, { skillId, status: 'loading' });

    try {
      // 动态导入 manifest.json
      const manifestModule = await import(`@/skills/${skillId}/manifest.json`);
      const manifest: SkillManifest = manifestModule.default || manifestModule;

      // 动态导入执行器
      const executorModule = await import(`@/skills/${skillId}/executor`);
      const execute: SkillExecutor = executorModule.default || executorModule.execute;

      if (!execute) {
        throw new Error(`Skill ${skillId} executor not found (export default or execute)`);
      }

      // 构建完整的 Skill 对象
      const skill: Skill = {
        manifest,
        execute,
      };

      // 注册到全局注册表（使用 skillId 作为 key）
      registerSkill(skillId, skill);

      return skill;
    } catch (error) {
      console.error(`❌ Failed to load skill ${skillId}:`, error);
      throw new Error(`Failed to load skill ${skillId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 批量加载多个 Skills
   *
   * @param skillIds - Skill ID 数组
   * @returns 加载结果（成功和失败分开）
   */
  async loadSkills(skillIds: string[]): Promise<{
    loaded: Skill[];
    failed: Array<{ skillId: string; error: string }>;
  }> {
    const results = await Promise.allSettled(skillIds.map((id) => this.loadSkill(id)));

    const loaded: Skill[] = [];
    const failed: Array<{ skillId: string; error: string }> = [];

    results.forEach((result, index) => {
      const skillId = skillIds[index];
      if (!skillId) return; // 防御性检查

      if (result.status === 'fulfilled') {
        loaded.push(result.value);
      } else {
        failed.push({
          skillId,
          error: result.reason?.message || 'Unknown error',
        });
      }
    });

    return { loaded, failed };
  }

  /**
   * 预加载所有 Skills（用于应用启动时）
   *
   * @returns 加载统计信息
   */
  async preloadAllSkills(): Promise<{
    total: number;
    loaded: number;
    failed: number;
    skills: Skill[];
  }> {
    // 在实际应用中，这里应该扫描 skills 目录获取所有可用的 Skills
    // 目前暂时硬编码几个示例 Skills
    const availableSkillIds = [
      'ai-chat',
      'image-generation',
      'document-analysis',
      'data-visualization',
      'web-search',
    ];

    const { loaded, failed } = await this.loadSkills(availableSkillIds);

    return {
      total: availableSkillIds.length,
      loaded: loaded.length,
      failed: failed.length,
      skills: loaded,
    };
  }

  /**
   * 获取加载状态
   *
   * @param skillId - Skill ID
   * @returns 加载记录
   */
  getLoadStatus(skillId: string): LoadRecord | undefined {
    return this.loadRecords.get(skillId);
  }

  /**
   * 获取所有加载记录
   *
   * @returns 所有加载记录
   */
  getAllLoadRecords(): LoadRecord[] {
    return Array.from(this.loadRecords.values());
  }

  /**
   * 重新加载 Skill（热重载）
   *
   * @param skillId - Skill ID
   * @returns 重新加载的 Skill
   */
  async reloadSkill(skillId: string): Promise<Skill> {
    // 清除加载记录
    this.loadRecords.delete(skillId);
    this.loadPromises.delete(skillId);

    // 重新加载
    return this.loadSkill(skillId);
  }
}

/**
 * 全局 Loader 实例
 */
export const skillLoader = new SkillLoaderManager();

/**
 * 便捷函数：加载单个 Skill
 */
export async function loadSkill(skillId: string): Promise<Skill> {
  return skillLoader.loadSkill(skillId);
}

/**
 * 便捷函数：批量加载 Skills
 */
export async function loadSkills(skillIds: string[]): Promise<{
  loaded: Skill[];
  failed: Array<{ skillId: string; error: string }>;
}> {
  return skillLoader.loadSkills(skillIds);
}

/**
 * 便捷函数：预加载所有 Skills
 */
export async function preloadAllSkills(): Promise<{
  total: number;
  loaded: number;
  failed: number;
  skills: Skill[];
}> {
  return skillLoader.preloadAllSkills();
}
