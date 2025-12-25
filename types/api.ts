/**
 * DocuMind Pro - API 类型定义
 * 
 * 统一的 API 请求和响应格式
 */

/**
 * API 响应状态码
 */
export enum ApiStatusCode {
  /** 成功 */
  SUCCESS = 200,
  /** 已创建 */
  CREATED = 201,
  /** 无内容 */
  NO_CONTENT = 204,
  /** 错误的请求 */
  BAD_REQUEST = 400,
  /** 未授权 */
  UNAUTHORIZED = 401,
  /** 禁止访问 */
  FORBIDDEN = 403,
  /** 未找到 */
  NOT_FOUND = 404,
  /** 请求超时 */
  TIMEOUT = 408,
  /** 配额超限 */
  QUOTA_EXCEEDED = 429,
  /** 服务器错误 */
  INTERNAL_ERROR = 500,
  /** 服务不可用 */
  SERVICE_UNAVAILABLE = 503,
}

/**
 * API 错误代码
 */
export enum ApiErrorCode {
  /** 未知错误 */
  UNKNOWN = 'UNKNOWN',
  /** 验证失败 */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** 认证失败 */
  AUTH_ERROR = 'AUTH_ERROR',
  /** 权限不足 */
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  /** 资源未找到 */
  NOT_FOUND = 'NOT_FOUND',
  /** 配额超限 */
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  /** 网络错误 */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** AI 服务错误 */
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  /** 数据库错误 */
  DATABASE_ERROR = 'DATABASE_ERROR',
  /** 存储错误 */
  STORAGE_ERROR = 'STORAGE_ERROR',
}

/**
 * API 错误详情
 */
export interface ApiError {
  /** 错误代码 */
  code: ApiErrorCode;
  /** 错误消息 */
  message: string;
  /** 详细信息 */
  details?: any;
  /** 堆栈追踪（仅开发环境） */
  stack?: string;
}

/**
 * API 响应基础接口
 */
export interface ApiResponse<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: T;
  /** 错误信息 */
  error?: ApiError;
  /** 响应时间戳 */
  timestamp: number;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  /** 页码（从 1 开始） */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
  /** 排序字段 */
  sortBy?: string;
  /** 排序顺序 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  items: T[];
  /** 分页信息 */
  pagination: {
    /** 当前页码 */
    page: number;
    /** 每页数量 */
    pageSize: number;
    /** 总数量 */
    total: number;
    /** 总页数 */
    totalPages: number;
    /** 是否有下一页 */
    hasNext: boolean;
    /** 是否有上一页 */
    hasPrev: boolean;
  };
}

/**
 * 文件上传响应
 */
export interface UploadResponse {
  /** 文件 ID */
  id: string;
  /** 文件名 */
  filename: string;
  /** 文件 URL */
  url: string;
  /** 文件大小（字节） */
  size: number;
  /** MIME 类型 */
  mimeType: string;
  /** 上传时间 */
  uploadedAt: Date;
}

/**
 * 批量操作请求
 */
export interface BatchRequest<T> {
  /** 操作项列表 */
  items: T[];
  /** 是否在遇到错误时继续 */
  continueOnError?: boolean;
}

/**
 * 批量操作响应
 */
export interface BatchResponse<T> {
  /** 成功的结果 */
  succeeded: T[];
  /** 失败的项 */
  failed: Array<{
    item: T;
    error: ApiError;
  }>;
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failureCount: number;
}

/**
 * Webhook 事件
 */
export interface WebhookEvent<T = any> {
  /** 事件 ID */
  id: string;
  /** 事件类型 */
  type: string;
  /** 事件数据 */
  data: T;
  /** 时间戳 */
  timestamp: number;
}
