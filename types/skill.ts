/**
 * DocuMind Pro - Skill 系统类型定义
 * 
 * Skills 是模型自主调用的功能模块
 */

import type { Document } from './document';
import type { ChatMessage } from './chat';

/**
 * Skill 分类
 */
export type SkillCategory = 
  | 'ai-chat'          // AI 对话
  | 'image'           // 图片生成/编辑
  | 'visualization'   // 数据可视化
  | 'document'        // 文档处理
  | 'search'          // 网络搜索
  | 'analysis';       // 数据分析

/**
 * Skill 执行上下文
 */
export interface SkillContext {
  /** 用户查询 */
  query: string;
  /** 当前文档 */
  document?: Document;
  /** 用户选中的内容 */
  selection?: {
    text: string;
    start: number;
    end: number;
  };
  /** 对话历史（最近10条） */
  history?: ChatMessage[];
  /** 附加参数 */
  params?: Record<string, any>;
}

/**
 * Skill 执行结果
 */
export interface SkillResult<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 结果数据 */
  data?: T;
  /** 错误信息（字符串或详细对象） */
  error?: string | {
    code: string;
    message: string;
    details?: any;
  };
  /** 执行耗时（毫秒） */
  duration?: number;
  /** 消耗的配额 */
  quotaUsed?: number;
  /** 附加元数据 */
  metadata?: Record<string, any>;
}

/**
 * Skill 权限要求
 */
export type SkillPermission = 
  | 'document:read'
  | 'document:write'
  | 'ai:chat'
  | 'ai:image'
  | 'storage:read'
  | 'storage:write'
  | 'network:access';

/**
 * Skill 元数据（manifest.json）
 */
export interface SkillManifest {
  /** Skill 唯一标识 */
  name: string;
  /** 显示名称 */
  displayName: string;
  /** 描述（给 AI 看的，用于决策） */
  description: string;
  /** 分类 */
  category: SkillCategory;
  /** 版本 */
  version: string;
  /** 触发关键词（用于匹配） */
  triggers: string[];
  /** 所需权限 */
  requiredPermissions: SkillPermission[];
  /** 是否需要订阅 */
  requiresSubscription?: 'free' | 'pro' | 'enterprise';
  /** 配额消耗（每次调用） */
  quotaCost: number;
  /** 作者 */
  author?: string;
  /** 图标 */
  icon?: string;
}

/**
 * Skill 执行函数
 */
export type SkillExecutor<TResult = any> = (
  context: SkillContext
) => Promise<SkillResult<TResult>>;

/**
 * Skill 可用性检查函数
 */
export type SkillAvailabilityChecker = (
  context: SkillContext
) => Promise<boolean> | boolean;

/**
 * Skill 定义
 */
export interface SkillDefinition<TResult = any> {
  /** 元数据 */
  manifest: SkillManifest;
  /** 执行函数 */
  execute: SkillExecutor<TResult>;
  /** 可用性检查 */
  isAvailable?: SkillAvailabilityChecker;
}

/**
 * Skill 注册表
 */
export type SkillRegistry = Map<string, SkillDefinition>;

/**
 * Skill 选择结果
 */
export interface SkillSelection {
  /** 选中的 Skill */
  skill: SkillDefinition;
  /** 匹配度分数（0-1） */
  confidence: number;
  /** 匹配原因 */
  reason: string;
}

/**
 * Skill 执行记录
 */
export interface SkillExecutionLog {
  /** 记录 ID */
  id: string;
  /** Skill 名称 */
  skillName: string;
  /** 用户 ID */
  userId: string;
  /** 执行上下文（简化） */
  context: {
    query: string;
    documentId?: string;
  };
  /** 执行结果 */
  result: {
    success: boolean;
    duration: number;
    quotaUsed: number;
  };
  /** 执行时间 */
  executedAt: Date;
}
