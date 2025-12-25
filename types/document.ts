/**
 * DocuMind Pro - 文档类型定义
 * 
 * 支持版本控制、协同编辑和云同步
 */

import type { UserProfile } from './user';

/**
 * 文档类型
 */
export type DocumentType = 
  | 'rich-text'     // 富文本文档
  | 'markdown'      // Markdown
  | 'ppt'          // PPT
  | 'excel'        // Excel
  | 'visualization' // 可视化图表
  | 'mindmap';     // 思维导图

/**
 * 同步状态
 */
export type SyncStatus = 
  | 'synced'        // 已同步
  | 'syncing'       // 同步中
  | 'pending'       // 等待同步
  | 'conflict'      // 冲突
  | 'error';        // 同步错误

/**
 * 协作者权限
 */
export type CollaboratorRole = 
  | 'owner'         // 所有者
  | 'editor'        // 编辑者
  | 'viewer';       // 查看者

/**
 * 协作者信息
 */
export interface Collaborator {
  user: UserProfile;
  role: CollaboratorRole;
  /** 添加时间 */
  addedAt: Date;
  /** 最后活跃时间 */
  lastActiveAt: Date | null;
}

/**
 * 文档权限
 */
export interface DocumentPermissions {
  /** 是否公开 */
  isPublic: boolean;
  /** 协作者列表 */
  collaborators: Collaborator[];
  /** 是否允许评论 */
  allowComments: boolean;
  /** 是否允许下载 */
  allowDownload: boolean;
}

/**
 * 文档版本
 */
export interface DocumentVersion {
  /** 版本 ID */
  id: string;
  /** 版本号 */
  version: number;
  /** 内容快照 */
  content: string;
  /** 创建者 */
  createdBy: UserProfile;
  /** 创建时间 */
  createdAt: Date;
  /** 版本描述 */
  description?: string;
  /** 文件大小（字节） */
  size: number;
}

/**
 * 文档元数据
 */
export interface DocumentMetadata {
  /** 字数统计 */
  wordCount: number;
  /** 字符数 */
  charCount: number;
  /** 段落数 */
  paragraphCount: number;
  /** 图片数量 */
  imageCount: number;
  /** 表格数量 */
  tableCount: number;
  /** 标签 */
  tags: string[];
  /** 自定义元数据 */
  custom?: Record<string, any>;
}

/**
 * 文档
 */
export interface Document {
  /** 文档 ID（UUID） */
  id: string;
  /** 文档标题 */
  title: string;
  /** 文档类型 */
  type: DocumentType;
  /** 文档内容 */
  content: string;
  /** 所有者 */
  owner: UserProfile;
  /** 权限设置 */
  permissions: DocumentPermissions;
  /** 当前版本号 */
  version: number;
  /** 版本历史（仅ID列表） */
  versionHistory: string[];
  /** 同步状态 */
  syncStatus: SyncStatus;
  /** 元数据 */
  metadata: DocumentMetadata;
  /** 创建时间 */
  createdAt: Date;
  /** 最后更新时间 */
  updatedAt: Date;
  /** 最后访问时间 */
  lastAccessedAt: Date | null;
  /** 是否已删除（软删除） */
  isDeleted: boolean;
  /** 删除时间 */
  deletedAt: Date | null;
}

/**
 * 文档列表项（轻量级）
 */
export interface DocumentListItem {
  id: string;
  title: string;
  type: DocumentType;
  owner: UserProfile;
  syncStatus: SyncStatus;
  wordCount: number;
  updatedAt: Date;
  lastAccessedAt: Date | null;
}

/**
 * 文档创建参数
 */
export interface CreateDocumentParams {
  title: string;
  type: DocumentType;
  content?: string;
  tags?: string[];
}

/**
 * 文档更新参数
 */
export interface UpdateDocumentParams {
  title?: string;
  content?: string;
  tags?: string[];
  versionDescription?: string;
}

/**
 * 文档分享链接
 */
export interface ShareLink {
  /** 链接 ID */
  id: string;
  /** 文档 ID */
  documentId: string;
  /** 访问令牌 */
  token: string;
  /** 权限 */
  permission: 'viewer' | 'editor';
  /** 过期时间（null 表示永久） */
  expiresAt: Date | null;
  /** 创建时间 */
  createdAt: Date;
  /** 创建者 */
  createdBy: UserProfile;
}
