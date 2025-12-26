/**
 * 输入验证 - Zod Schema集合
 *
 * 统一的数据验证规则，防止注入攻击
 */

import { z } from 'zod';

// ==================== 基础验证规则 ====================

/**
 * 安全字符串 - 防止XSS和注入
 */
export const safeString = z
  .string()
  .transform((val) => val.trim())
  .refine((val) => !/<script\b/i.test(val), {
    message: '内容包含不允许的脚本标签',
  })
  .refine((val) => !/javascript:/i.test(val), {
    message: '内容包含不允许的JavaScript协议',
  });

/**
 * 邮箱验证
 */
export const emailSchema = z
  .string()
  .email('请输入有效的邮箱地址')
  .max(255, '邮箱地址过长')
  .toLowerCase()
  .transform((val) => val.trim());

/**
 * 密码验证
 */
export const passwordSchema = z
  .string()
  .min(8, '密码至少8个字符')
  .max(100, '密码最多100个字符')
  .regex(/[A-Z]/, '密码需包含至少一个大写字母')
  .regex(/[a-z]/, '密码需包含至少一个小写字母')
  .regex(/[0-9]/, '密码需包含至少一个数字');

/**
 * 弱密码验证（仅要求长度）
 */
export const weakPasswordSchema = z
  .string()
  .min(8, '密码至少8个字符')
  .max(100, '密码最多100个字符');

/**
 * 用户名验证
 */
export const usernameSchema = z
  .string()
  .min(2, '用户名至少2个字符')
  .max(50, '用户名最多50个字符')
  .regex(/^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/, '用户名只能包含中文、字母、数字、下划线和横线')
  .transform((val) => val.trim());

/**
 * URL验证
 */
export const urlSchema = z
  .string()
  .url('请输入有效的URL')
  .refine((url) => {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }, 'URL必须使用http或https协议');

/**
 * UUID验证
 */
export const uuidSchema = z.string().uuid('无效的ID格式');

// ==================== 用户相关Schema ====================

/**
 * 用户注册
 */
export const registerSchema = z.object({
  name: usernameSchema,
  email: emailSchema,
  password: weakPasswordSchema, // 商业项目可切换为passwordSchema
});

/**
 * 用户登录
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '请输入密码'),
});

/**
 * 修改密码
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '请输入当前密码'),
    newPassword: weakPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

/**
 * 用户资料更新
 */
export const updateProfileSchema = z.object({
  name: usernameSchema.optional(),
  avatar: urlSchema.optional().nullable(),
  bio: z.string().max(500, '个人简介最多500字').optional(),
});

// ==================== 文档相关Schema ====================

/**
 * 文档创建
 */
export const createDocumentSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题最多200字'),
  content: z.string().optional().default(''),
  type: z.enum(['markdown', 'ppt', 'doc', 'sheet']).default('markdown'),
  folderId: uuidSchema.optional().nullable(),
});

/**
 * 文档更新
 */
export const updateDocumentSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题最多200字').optional(),
  content: z.string().optional(),
  folderId: uuidSchema.optional().nullable(),
});

/**
 * 文档搜索
 */
export const searchDocumentSchema = z.object({
  query: z.string().min(1, '搜索关键词不能为空').max(100, '搜索关键词最多100字'),
  type: z.enum(['all', 'markdown', 'ppt', 'doc', 'sheet']).optional().default('all'),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

// ==================== AI相关Schema ====================

/**
 * AI文本生成
 */
export const aiGenerateSchema = z.object({
  prompt: z.string().min(1, '请输入提示词').max(10000, '提示词最多10000字'),
  type: z.enum(['text', 'outline', 'expand', 'summarize', 'translate']).default('text'),
  context: z.string().max(50000, '上下文内容过长').optional(),
  language: z.enum(['zh', 'en', 'auto']).optional().default('auto'),
});

/**
 * AI图片生成
 */
export const aiImageSchema = z.object({
  prompt: z.string().min(1, '请输入图片描述').max(1000, '描述最多1000字'),
  style: z.enum(['realistic', 'artistic', 'cartoon', 'sketch']).optional().default('realistic'),
  size: z.enum(['256', '512', '1024']).optional().default('512'),
});

// ==================== 文件上传Schema ====================

/**
 * 文件上传验证
 */
export const fileUploadSchema = z.object({
  filename: z
    .string()
    .min(1, '文件名不能为空')
    .max(255, '文件名过长')
    .refine((name) => !/[<>:"/\\|?*]/.test(name), '文件名包含非法字符'),
  size: z.number().int().min(1).max(100 * 1024 * 1024, '文件大小不能超过100MB'),
  mimeType: z.string().refine((type) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/markdown',
    ];
    return allowedTypes.includes(type);
  }, '不支持的文件类型'),
});

// ==================== 分页Schema ====================

/**
 * 分页参数
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ==================== 工具函数 ====================

/**
 * 验证数据并返回结果
 * @param schema Zod Schema
 * @param data 要验证的数据
 * @returns 验证结果
 */
export function validate<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): {
  success: boolean;
  data?: z.infer<T>;
  errors?: string[];
} {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map(
    (err) => `${err.path.join('.')}: ${err.message}`
  );
  return { success: false, errors };
}

/**
 * 快速验证（抛出错误）
 * @param schema Zod Schema
 * @param data 要验证的数据
 * @returns 验证后的数据
 */
export function validateOrThrow<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data);
}

export default {
  // 基础
  safeString,
  emailSchema,
  passwordSchema,
  weakPasswordSchema,
  usernameSchema,
  urlSchema,
  uuidSchema,
  // 用户
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  // 文档
  createDocumentSchema,
  updateDocumentSchema,
  searchDocumentSchema,
  // AI
  aiGenerateSchema,
  aiImageSchema,
  // 文件
  fileUploadSchema,
  // 分页
  paginationSchema,
  // 工具
  validate,
  validateOrThrow,
};
