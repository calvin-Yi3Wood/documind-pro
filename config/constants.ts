/**
 * DocuMind Pro - 全局常量配置
 */

/**
 * 应用配置
 */
export const APP_CONFIG = {
  name: "DocuMind Pro",
  description: "AI驱动的文档智能处理平台",
  version: "0.1.0",
} as const;

/**
 * 文件上传配置
 */
export const FILE_CONFIG = {
  maxSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: ['.pdf', '.docx', '.pptx', '.xlsx', '.md', '.txt'],
  allowedMimeTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/markdown',
    'text/plain',
  ],
} as const;

/**
 * AI服务配置
 */
export const AI_CONFIG = {
  gemini: {
    model: 'gemini-2.0-flash-exp',
    maxTokens: 8192,
    temperature: 0.7,
  },
  deepseek: {
    model: 'deepseek-chat',
    maxTokens: 4096,
    temperature: 0.7,
  },
} as const;

/**
 * 分页配置
 */
export const PAGINATION_CONFIG = {
  defaultPageSize: 20,
  maxPageSize: 100,
} as const;
