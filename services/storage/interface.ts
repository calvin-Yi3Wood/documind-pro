/**
 * Storage Provider Interface
 *
 * 定义统一的存储抽象接口,支持多种存储后端
 */

import type { Document, CreateDocumentParams, UpdateDocumentParams } from '@/types';

/**
 * 文件上传选项
 */
export interface FileUploadOptions {
  /** 文件名 */
  filename: string;
  /** 文件类型 */
  contentType: string;
  /** 文件大小(字节) */
  size: number;
  /** 是否公开访问 */
  isPublic?: boolean;
  /** 自定义元数据 */
  metadata?: Record<string, string>;
}

/**
 * 文件上传结果
 */
export interface FileUploadResult {
  /** 文件唯一ID */
  id: string;
  /** 文件URL */
  url: string;
  /** 文件路径 */
  path: string;
  /** 文件大小 */
  size: number;
  /** 上传时间 */
  uploadedAt: Date;
}

/**
 * 查询选项
 */
export interface QueryOptions {
  /** 排序字段 */
  orderBy?: keyof Document;
  /** 排序方向 */
  order?: 'asc' | 'desc';
  /** 限制数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
  /** 筛选条件 */
  where?: Partial<Document>;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  /** 数据列表 */
  data: T[];
  /** 总数 */
  total: number;
  /** 当前页 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 是否有下一页 */
  hasMore: boolean;
}

/**
 * 同步状态
 */
export interface SyncStatus {
  /** 是否正在同步 */
  isSyncing: boolean;
  /** 最后同步时间 */
  lastSyncedAt?: Date;
  /** 同步错误 */
  syncError?: string;
  /** 待同步数量 */
  pendingCount: number;
}

/**
 * 存储提供商抽象接口
 *
 * 所有存储实现必须实现这个接口
 */
export interface StorageProvider {
  /**
   * 提供商名称
   */
  name: string;

  /**
   * 是否支持离线
   */
  supportsOffline: boolean;

  /**
   * 初始化存储
   */
  initialize(): Promise<void>;

  // ==================== 文档操作 ====================

  /**
   * 创建文档
   *
   * @param params - 创建参数
   * @returns 创建的文档
   */
  createDocument(params: CreateDocumentParams): Promise<Document>;

  /**
   * 获取文档
   *
   * @param id - 文档ID
   * @returns 文档对象或null
   */
  getDocument(id: string): Promise<Document | null>;

  /**
   * 更新文档
   *
   * @param id - 文档ID
   * @param params - 更新参数
   * @returns 更新后的文档
   */
  updateDocument(id: string, params: UpdateDocumentParams): Promise<Document>;

  /**
   * 删除文档
   *
   * @param id - 文档ID
   * @returns 是否成功
   */
  deleteDocument(id: string): Promise<boolean>;

  /**
   * 列出文档
   *
   * @param options - 查询选项
   * @returns 文档列表
   */
  listDocuments(options?: QueryOptions): Promise<PaginatedResult<Document>>;

  /**
   * 搜索文档
   *
   * @param query - 搜索关键词
   * @param options - 查询选项
   * @returns 文档列表
   */
  searchDocuments(query: string, options?: QueryOptions): Promise<PaginatedResult<Document>>;

  // ==================== 文件操作 ====================

  /**
   * 上传文件
   *
   * @param file - 文件对象
   * @param options - 上传选项
   * @returns 上传结果
   */
  uploadFile(file: File | Blob, options: FileUploadOptions): Promise<FileUploadResult>;

  /**
   * 删除文件
   *
   * @param path - 文件路径
   * @returns 是否成功
   */
  deleteFile(path: string): Promise<boolean>;

  /**
   * 获取文件URL
   *
   * @param path - 文件路径
   * @param expiresIn - 有效期(秒),0表示永久
   * @returns 文件URL
   */
  getFileUrl(path: string, expiresIn?: number): Promise<string>;

  // ==================== 版本控制 ====================

  /**
   * 获取文档历史版本
   *
   * @param documentId - 文档ID
   * @param limit - 限制数量
   * @returns 版本列表
   */
  getDocumentVersions(documentId: string, limit?: number): Promise<Document[]>;

  /**
   * 恢复到指定版本
   *
   * @param documentId - 文档ID
   * @param versionId - 版本ID
   * @returns 恢复后的文档
   */
  restoreVersion(documentId: string, versionId: string): Promise<Document>;

  // ==================== 同步功能 ====================

  /**
   * 同步到云端
   *
   * @returns 同步状态
   */
  sync(): Promise<SyncStatus>;

  /**
   * 获取同步状态
   *
   * @returns 同步状态
   */
  getSyncStatus(): Promise<SyncStatus>;

  /**
   * 清除本地缓存
   *
   * @returns 是否成功
   */
  clearCache(): Promise<boolean>;
}

/**
 * 存储事件
 */
export type StorageEvent =
  | { type: 'document:created'; document: Document }
  | { type: 'document:updated'; document: Document }
  | { type: 'document:deleted'; id: string }
  | { type: 'sync:started' }
  | { type: 'sync:completed'; status: SyncStatus }
  | { type: 'sync:failed'; error: string };

/**
 * 事件监听器
 */
export type StorageEventListener = (event: StorageEvent) => void;

/**
 * 支持事件的存储提供商
 */
export interface EventEmittingStorageProvider extends StorageProvider {
  /**
   * 添加事件监听器
   *
   * @param listener - 监听器函数
   * @returns 取消监听的函数
   */
  addEventListener(listener: StorageEventListener): () => void;

  /**
   * 移除事件监听器
   *
   * @param listener - 监听器函数
   */
  removeEventListener(listener: StorageEventListener): void;
}
