/**
 * DocuMind Pro - 用户类型定义
 * 
 * 支持多用户系统和订阅管理
 */

/**
 * 订阅等级
 */
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

/**
 * 订阅配额
 */
export interface SubscriptionQuota {
  /** AI 调用次数限制（月度） */
  aiCalls: number;
  /** 文档数量限制 */
  documents: number;
  /** 存储空间限制（MB） */
  storage: number;
  /** 协作者数量限制 */
  collaborators: number;
  /** 是否支持高级功能 */
  advancedFeatures: boolean;
}

/**
 * 订阅信息
 */
export interface Subscription {
  tier: SubscriptionTier;
  quota: SubscriptionQuota;
  /** 订阅开始时间 */
  startDate: Date;
  /** 订阅结束时间（null 表示永久） */
  endDate: Date | null;
  /** 是否自动续费 */
  autoRenew: boolean;
}

/**
 * 用户使用量统计
 */
export interface UsageStats {
  /** 本月 AI 调用次数 */
  aiCallsThisMonth: number;
  /** 文档总数 */
  documentCount: number;
  /** 存储使用量（MB） */
  storageUsed: number;
  /** 协作者数量 */
  collaboratorCount: number;
  /** 统计更新时间 */
  lastUpdated: Date;
}

/**
 * 用户偏好设置
 */
export interface UserPreferences {
  /** 主题 */
  theme: 'light' | 'dark' | 'auto';
  /** 语言 */
  language: 'zh-CN' | 'en-US';
  /** 默认 AI 模型 */
  defaultAiModel: 'gemini' | 'deepseek';
  /** 是否启用实时协作 */
  enableCollaboration: boolean;
  /** 是否启用自动保存 */
  autoSave: boolean;
  /** 自动保存间隔（秒） */
  autoSaveInterval: number;
}

/**
 * 用户信息
 */
export interface User {
  /** 用户 ID（UUID） */
  id: string;
  /** 邮箱 */
  email: string;
  /** 用户名 */
  name: string | null;
  /** 头像 URL */
  avatar: string | null;
  /** 订阅信息 */
  subscription: Subscription;
  /** 使用量统计 */
  usage: UsageStats;
  /** 用户偏好 */
  preferences: UserPreferences;
  /** 创建时间 */
  createdAt: Date;
  /** 最后更新时间 */
  updatedAt: Date;
  /** 最后登录时间 */
  lastLoginAt: Date | null;
}

/**
 * 用户配置文件（公开信息）
 */
export interface UserProfile {
  id: string;
  name: string | null;
  avatar: string | null;
}

/**
 * 默认配额配置
 */
export const DEFAULT_QUOTAS: Record<SubscriptionTier, SubscriptionQuota> = {
  free: {
    aiCalls: 100,
    documents: 10,
    storage: 50,
    collaborators: 0,
    advancedFeatures: false,
  },
  pro: {
    aiCalls: 1000,
    documents: 100,
    storage: 500,
    collaborators: 5,
    advancedFeatures: true,
  },
  enterprise: {
    aiCalls: -1, // 无限制
    documents: -1,
    storage: -1,
    collaborators: -1,
    advancedFeatures: true,
  },
};
