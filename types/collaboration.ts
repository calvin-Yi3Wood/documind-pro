/**
 * DocuMind Pro - 协同编辑类型定义
 *
 * 基于 Yjs CRDT 的实时协作系统类型
 * 支持离线编辑、冲突自动解决、光标感知
 */

import type { UserProfile } from './user';

// ==================== 连接状态类型 ====================

/**
 * WebSocket 连接状态
 */
export type ConnectionStatus =
  | 'connecting'    // 连接中
  | 'connected'     // 已连接
  | 'disconnected'  // 已断开
  | 'reconnecting'  // 重连中
  | 'error';        // 连接错误

/**
 * 同步状态
 */
export type CollaborationSyncStatus =
  | 'synced'        // 已同步
  | 'syncing'       // 同步中
  | 'pending'       // 等待同步
  | 'offline'       // 离线模式
  | 'conflict';     // 存在冲突

// ==================== 用户感知类型 ====================

/**
 * 用户活跃状态
 */
export type UserActivityStatus =
  | 'active'        // 活跃中
  | 'idle'          // 空闲
  | 'offline';      // 离线

/**
 * 光标位置
 */
export interface CursorPosition {
  /** 锚点位置 */
  anchor: number;
  /** 头部位置 */
  head: number;
}

/**
 * 选区范围
 */
export interface SelectionRange {
  /** 起始位置 */
  start: number;
  /** 结束位置 */
  end: number;
}

/**
 * 用户感知信息（Awareness）
 * 用于显示其他用户的实时状态
 */
export interface UserAwareness {
  /** 用户 ID */
  userId: string;
  /** 用户名 */
  userName: string;
  /** 用户颜色（用于光标和选区高亮） */
  userColor: string;
  /** 光标位置 */
  cursor: CursorPosition | null;
  /** 选区范围 */
  selection: SelectionRange | null;
  /** 活跃状态 */
  status: UserActivityStatus;
  /** 最后活跃时间戳 */
  lastActive: number;
}

/**
 * 协作会话参与者
 */
export interface CollaborationParticipant {
  /** 用户信息 */
  user: UserProfile;
  /** 感知状态 */
  awareness: UserAwareness;
  /** 加入时间 */
  joinedAt: Date;
  /** 是否为当前用户 */
  isCurrentUser: boolean;
}

// ==================== 文档版本类型 ====================

/**
 * 协作文档版本快照
 */
export interface CollaborationSnapshot {
  /** 快照 ID */
  id: string;
  /** 文档 ID */
  documentId: string;
  /** 版本号 */
  version: number;
  /** Yjs 编码的快照数据 */
  snapshot: Uint8Array;
  /** 增量更新数据（可选，用于优化） */
  updates?: Uint8Array;
  /** 创建者 */
  createdBy: UserProfile;
  /** 创建时间 */
  createdAt: Date;
  /** 版本描述 */
  description?: string;
  /** 数据大小（字节） */
  sizeBytes: number;
}

/**
 * 版本历史记录
 */
export interface VersionHistoryItem {
  /** 版本 ID */
  id: string;
  /** 版本号 */
  version: number;
  /** 创建者 */
  createdBy: UserProfile;
  /** 创建时间 */
  createdAt: Date;
  /** 描述 */
  description?: string;
  /** 是否为自动保存版本 */
  isAutoSave: boolean;
  /** 数据大小 */
  sizeBytes: number;
}

// ==================== 操作类型 ====================

/**
 * 协作操作类型
 */
export type CollaborationOperationType =
  | 'insert'        // 插入
  | 'delete'        // 删除
  | 'format'        // 格式化
  | 'move'          // 移动
  | 'undo'          // 撤销
  | 'redo';         // 重做

/**
 * 协作操作记录
 */
export interface CollaborationOperation {
  /** 操作 ID */
  id: string;
  /** 操作类型 */
  type: CollaborationOperationType;
  /** 操作位置 */
  position: number;
  /** 操作长度 */
  length: number;
  /** 操作内容 */
  content?: string;
  /** 执行用户 */
  userId: string;
  /** 执行时间 */
  timestamp: number;
}

// ==================== 协作会话类型 ====================

/**
 * 协作会话状态
 */
export type CollaborationSessionStatus =
  | 'active'        // 活跃
  | 'idle'          // 空闲
  | 'disconnected'; // 已断开

/**
 * 协作会话
 */
export interface CollaborationSession {
  /** 会话 ID */
  id: string;
  /** 文档 ID */
  documentId: string;
  /** 用户 ID */
  userId: string;
  /** 会话状态 */
  status: CollaborationSessionStatus;
  /** 光标位置 */
  cursorPosition: CursorPosition | null;
  /** 选区范围 */
  selectionRange: SelectionRange | null;
  /** 用户颜色 */
  userColor: string;
  /** 连接时间 */
  connectedAt: Date;
  /** 最后活跃时间 */
  lastActiveAt: Date;
  /** 断开时间 */
  disconnectedAt: Date | null;
}

// ==================== Provider 接口类型 ====================

/**
 * 协作 Provider 配置
 */
export interface CollaborationProviderConfig {
  /** WebSocket 服务器 URL */
  websocketUrl: string;
  /** 文档 ID */
  documentId: string;
  /** 用户信息 */
  user: UserProfile;
  /** 用户颜色 */
  userColor: string;
  /** 自动重连 */
  autoReconnect?: boolean;
  /** 重连间隔（毫秒） */
  reconnectInterval?: number;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** 启用本地持久化 */
  enableLocalPersistence?: boolean;
}

/**
 * 协作 Provider 状态
 */
export interface CollaborationProviderState {
  /** 连接状态 */
  connectionStatus: ConnectionStatus;
  /** 同步状态 */
  syncStatus: CollaborationSyncStatus;
  /** 在线用户列表 */
  onlineUsers: CollaborationParticipant[];
  /** 当前版本号 */
  currentVersion: number;
  /** 是否有未同步的本地更改 */
  hasLocalChanges: boolean;
  /** 最后同步时间 */
  lastSyncedAt: Date | null;
  /** 错误信息 */
  error: string | null;
}

/**
 * 协作 Provider 事件类型
 */
export type CollaborationEventType =
  | 'sync'              // 同步完成
  | 'update'            // 文档更新
  | 'awareness'         // 用户感知更新
  | 'connection'        // 连接状态变化
  | 'error'             // 错误发生
  | 'user-join'         // 用户加入
  | 'user-leave';       // 用户离开

/**
 * 协作事件回调函数
 */
export type CollaborationEventCallback<T = any> = (data: T) => void;

/**
 * 协作 Provider 接口
 */
export interface ICollaborationProvider {
  // 连接管理
  connect(): Promise<void>;
  disconnect(): void;
  reconnect(): Promise<void>;

  // 状态查询
  getState(): CollaborationProviderState;
  isConnected(): boolean;
  isSynced(): boolean;

  // 文档操作
  getDocument(): unknown; // Y.Doc
  getAwareness(): unknown; // Awareness

  // 用户感知
  setLocalAwareness(awareness: Partial<UserAwareness>): void;
  getOnlineUsers(): CollaborationParticipant[];

  // 版本管理
  createSnapshot(description?: string): Promise<CollaborationSnapshot>;
  restoreSnapshot(snapshotId: string): Promise<void>;
  getVersionHistory(): Promise<VersionHistoryItem[]>;

  // 事件订阅
  on<T>(event: CollaborationEventType, callback: CollaborationEventCallback<T>): void;
  off(event: CollaborationEventType, callback: CollaborationEventCallback): void;

  // 销毁
  destroy(): void;
}

// ==================== 数据库相关类型 ====================

/**
 * 数据库 - 协作会话记录
 */
export interface DBCollaborationSession {
  id: string;
  document_id: string;
  user_id: string;
  status: CollaborationSessionStatus;
  cursor_position: string | null;  // JSON
  selection_range: string | null;  // JSON
  user_color: string;
  connected_at: string;            // ISO timestamp
  last_active_at: string;          // ISO timestamp
  disconnected_at: string | null;  // ISO timestamp
}

/**
 * 数据库 - 文档版本记录
 */
export interface DBDocumentVersion {
  id: string;
  document_id: string;
  version: number;
  snapshot: Buffer;                // BYTEA
  updates: Buffer | null;          // BYTEA
  created_by: string;
  created_at: string;              // ISO timestamp
  description: string | null;
  size_bytes: number;
}

// ==================== 工具函数类型 ====================

/**
 * 生成随机用户颜色
 */
export type GenerateUserColor = () => string;

/**
 * 协作颜色预设
 */
export const COLLABORATION_COLORS = [
  '#F97316', // orange
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#F59E0B', // amber
  '#06B6D4', // cyan
  '#6366F1', // indigo
  '#84CC16', // lime
  '#EF4444', // red
] as const;

export type CollaborationColor = typeof COLLABORATION_COLORS[number];

// ==================== 错误类型 ====================

/**
 * 协作错误类型
 */
export type CollaborationErrorType =
  | 'CONNECTION_FAILED'     // 连接失败
  | 'SYNC_FAILED'           // 同步失败
  | 'VERSION_CONFLICT'      // 版本冲突
  | 'PERMISSION_DENIED'     // 权限不足
  | 'DOCUMENT_NOT_FOUND'    // 文档不存在
  | 'SNAPSHOT_FAILED'       // 快照失败
  | 'RESTORE_FAILED'        // 恢复失败
  | 'NETWORK_ERROR'         // 网络错误
  | 'UNKNOWN_ERROR';        // 未知错误

/**
 * 协作错误
 */
export interface CollaborationError {
  type: CollaborationErrorType;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}
