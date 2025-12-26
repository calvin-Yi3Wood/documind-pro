/**
 * 统一类型导出
 * 提供清晰的类型导入路径
 */

// ==================== 用户相关类型 ====================
export type {
  User,
  UserProfile,
  Subscription,
  SubscriptionQuota,
  UsageStats,
  UserPreferences,
  SubscriptionTier,
} from './user';

export { DEFAULT_QUOTAS } from './user';

// ==================== 文档相关类型 ====================
export type {
  Document,
  DocumentMetadata,
  DocumentPermissions,
  DocumentVersion,
  Collaborator,
  CollaboratorRole,
  SyncStatus,
  DocumentType,
  DocumentListItem,
  CreateDocumentParams,
  UpdateDocumentParams,
  ShareLink,
} from './document';

// ==================== Skills 系统类型 ====================
export type {
  SkillDefinition,
  SkillManifest,
  SkillContext,
  SkillResult,
  SkillExecutor,
  SkillCategory,
  SkillPermission,
  SkillAvailabilityChecker,
  SkillRegistry,
  SkillSelection,
  SkillExecutionLog,
} from './skill';

// 为兼容性添加 Skill 类型别名
export type { SkillDefinition as Skill } from './skill';

// ==================== 聊天相关类型 ====================
export type {
  ChatMessage,
  MessageAttachment,
  StreamChunk,
  MessageSender,
  MessageType,
  MessageStatus,
  ChatSession,
  ChatContext,
  ChatRequest,
  ChatResponse,
} from './chat';

// ==================== API 相关类型 ====================
export type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  PaginationParams,
  BatchRequest,
  BatchResponse,
  UploadResponse,
  WebhookEvent,
} from './api';

export { ApiErrorCode, ApiStatusCode } from './api';

// ==================== 协同编辑类型 ====================
export type {
  // 连接状态
  ConnectionStatus,
  CollaborationSyncStatus,
  // 用户感知
  UserActivityStatus,
  CursorPosition,
  SelectionRange,
  UserAwareness,
  CollaborationParticipant,
  // 版本控制
  CollaborationSnapshot,
  VersionHistoryItem,
  // 操作记录
  CollaborationOperationType,
  CollaborationOperation,
  // 会话管理
  CollaborationSessionStatus,
  CollaborationSession,
  // Provider
  CollaborationProviderConfig,
  CollaborationProviderState,
  CollaborationEventType,
  CollaborationEventCallback,
  ICollaborationProvider,
  // 数据库类型
  DBCollaborationSession,
  DBDocumentVersion,
  // 工具类型
  GenerateUserColor,
  CollaborationColor,
  // 错误处理
  CollaborationErrorType,
  CollaborationError,
} from './collaboration';

export { COLLABORATION_COLORS } from './collaboration';

// ==================== 通用类型工具 ====================

/**
 * 提取 Promise 的返回类型
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * 深度部分类型（递归可选）
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 深度只读类型（递归只读）
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * 提取对象值的类型联合
 */
export type ValueOf<T> = T[keyof T];

/**
 * 排除 null 和 undefined
 */
export type NonNullable<T> = Exclude<T, null | undefined>;
