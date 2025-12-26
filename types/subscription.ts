/**
 * 订阅等级类型定义
 */

// 订阅等级
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

// 订阅配置
export interface SubscriptionConfig {
  tier: SubscriptionTier;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  limits: SubscriptionLimits;
  features: string[];
}

// 订阅限制
export interface SubscriptionLimits {
  // AI 配额
  monthlyAIQuota: number;       // 每月 AI 调用次数
  maxTokensPerRequest: number;  // 单次请求最大 Token

  // 存储配额
  storageQuotaMB: number;       // 存储空间 MB
  maxFileSizeMB: number;        // 单文件最大 MB
  maxKnowledgeSources: number;  // 知识库资料数量

  // 文档限制
  maxDocuments: number;         // 最大文档数
  maxVersionHistory: number;    // 版本历史保留数

  // 协作限制
  maxCollaborators: number;     // 单文档最大协作者
  maxSharedLinks: number;       // 共享链接数量

  // 功能限制
  allowExport: boolean;         // 导出功能
  allowPriority: boolean;       // 优先队列
  allowCustomBranding: boolean; // 自定义品牌
  allowAPIAccess: boolean;      // API 访问
}

// 订阅配置表
export const SUBSCRIPTION_CONFIGS: Record<SubscriptionTier, SubscriptionConfig> = {
  free: {
    tier: 'free',
    name: '免费版',
    description: '适合个人轻度使用',
    price: {
      monthly: 0,
      yearly: 0,
    },
    limits: {
      monthlyAIQuota: 100,
      maxTokensPerRequest: 4000,
      storageQuotaMB: 100,
      maxFileSizeMB: 10,
      maxKnowledgeSources: 20,
      maxDocuments: 50,
      maxVersionHistory: 10,
      maxCollaborators: 0,
      maxSharedLinks: 5,
      allowExport: true,
      allowPriority: false,
      allowCustomBranding: false,
      allowAPIAccess: false,
    },
    features: [
      '每月 100 次 AI 对话',
      '100MB 存储空间',
      '最多 50 个文档',
      '基础文档导出',
      '10 个版本历史',
    ],
  },

  pro: {
    tier: 'pro',
    name: '专业版',
    description: '适合专业用户和小团队',
    price: {
      monthly: 29,
      yearly: 290,
    },
    limits: {
      monthlyAIQuota: 1000,
      maxTokensPerRequest: 16000,
      storageQuotaMB: 1000,
      maxFileSizeMB: 50,
      maxKnowledgeSources: 200,
      maxDocuments: 500,
      maxVersionHistory: 50,
      maxCollaborators: 5,
      maxSharedLinks: 50,
      allowExport: true,
      allowPriority: true,
      allowCustomBranding: false,
      allowAPIAccess: false,
    },
    features: [
      '每月 1000 次 AI 对话',
      '1GB 存储空间',
      '最多 500 个文档',
      '5 人协作',
      '50 个版本历史',
      '优先响应队列',
      '高级导出格式',
    ],
  },

  enterprise: {
    tier: 'enterprise',
    name: '企业版',
    description: '适合企业和大型团队',
    price: {
      monthly: 99,
      yearly: 990,
    },
    limits: {
      monthlyAIQuota: 999999,
      maxTokensPerRequest: 32000,
      storageQuotaMB: 10000,
      maxFileSizeMB: 200,
      maxKnowledgeSources: 2000,
      maxDocuments: 99999,
      maxVersionHistory: 100,
      maxCollaborators: 100,
      maxSharedLinks: 500,
      allowExport: true,
      allowPriority: true,
      allowCustomBranding: true,
      allowAPIAccess: true,
    },
    features: [
      '无限 AI 对话',
      '10GB 存储空间',
      '无限文档',
      '100 人协作',
      '100 个版本历史',
      '最高优先级响应',
      '自定义品牌',
      'API 访问',
      '专属客服支持',
    ],
  },
};

/**
 * 获取订阅配置
 */
export function getSubscriptionConfig(tier: SubscriptionTier): SubscriptionConfig {
  return SUBSCRIPTION_CONFIGS[tier];
}

/**
 * 获取订阅限制
 */
export function getSubscriptionLimits(tier: SubscriptionTier): SubscriptionLimits {
  return SUBSCRIPTION_CONFIGS[tier].limits;
}

/**
 * 检查功能是否可用
 */
export function isFeatureAvailable(
  tier: SubscriptionTier,
  feature: keyof SubscriptionLimits
): boolean {
  const limits = getSubscriptionLimits(tier);
  const value = limits[feature];

  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value > 0;
  }
  return false;
}

/**
 * 检查是否超过限制
 */
export function isWithinLimit(
  tier: SubscriptionTier,
  limitKey: keyof SubscriptionLimits,
  currentValue: number
): boolean {
  const limits = getSubscriptionLimits(tier);
  const limit = limits[limitKey];

  if (typeof limit !== 'number') {
    return true;
  }

  return currentValue < limit;
}

/**
 * 获取剩余配额
 */
export function getRemainingQuota(
  tier: SubscriptionTier,
  limitKey: keyof SubscriptionLimits,
  usedValue: number
): number {
  const limits = getSubscriptionLimits(tier);
  const limit = limits[limitKey];

  if (typeof limit !== 'number') {
    return Infinity;
  }

  return Math.max(0, limit - usedValue);
}

/**
 * 计算配额使用百分比
 */
export function getQuotaUsagePercent(
  tier: SubscriptionTier,
  limitKey: keyof SubscriptionLimits,
  usedValue: number
): number {
  const limits = getSubscriptionLimits(tier);
  const limit = limits[limitKey];

  if (typeof limit !== 'number' || limit === 0) {
    return 0;
  }

  return Math.min(100, (usedValue / limit) * 100);
}

export default SUBSCRIPTION_CONFIGS;
