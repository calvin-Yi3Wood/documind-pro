/**
 * 安全模块统一导出
 */

// XSS防护
export {
  sanitizeHtml,
  sanitizeText,
  isContentSafe,
  escapeHtml,
  createSafeHtml,
} from './sanitize';

// CSP配置
export {
  generateCSP,
  getCSPDirectives,
  getCSPHeader,
  securityHeaders,
  getSecurityHeadersConfig,
} from './csp';

// 限流
export {
  checkRateLimit,
  createRateLimiter,
  withRateLimit,
  resetRateLimit,
  getRateLimitStatus,
  defaultRateLimitConfigs,
} from './rateLimit';

// 输入验证
export {
  // 基础Schema
  safeString,
  emailSchema,
  passwordSchema,
  weakPasswordSchema,
  usernameSchema,
  urlSchema,
  uuidSchema,
  // 用户Schema
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  // 文档Schema
  createDocumentSchema,
  updateDocumentSchema,
  searchDocumentSchema,
  // AI Schema
  aiGenerateSchema,
  aiImageSchema,
  // 文件Schema
  fileUploadSchema,
  // 分页Schema
  paginationSchema,
  // 工具函数
  validate,
  validateOrThrow,
} from './validation';
