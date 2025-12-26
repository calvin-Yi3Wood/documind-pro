/**
 * CollaborationProvider - 协同编辑核心服务
 *
 * 基于 Yjs CRDT 的实时协作 Provider
 * 当前为接口预留，后续集成 Yjs 和 y-websocket
 *
 * @module lib/collaboration/provider
 */

import type {
  ICollaborationProvider,
  CollaborationProviderConfig,
  CollaborationProviderState,
  CollaborationEventType,
  CollaborationEventCallback,
  CollaborationParticipant,
  UserAwareness,
  CollaborationSnapshot,
  VersionHistoryItem,
} from '@/types';

/**
 * 生成随机用户颜色
 */
export function generateUserColor(): string {
  const colors = [
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
  return colors[Math.floor(Math.random() * colors.length)] ?? '#F97316';
}

/**
 * CollaborationProvider 类
 *
 * 实现协同编辑的核心功能：
 * - WebSocket 连接管理
 * - 用户感知（Awareness）
 * - 文档同步
 * - 版本管理
 *
 * 当前为预留实现，后续将集成：
 * - Yjs (Y.Doc)
 * - y-websocket (WebsocketProvider)
 * - y-indexeddb (本地持久化)
 */
export class CollaborationProvider implements ICollaborationProvider {
  private config: CollaborationProviderConfig;
  private state: CollaborationProviderState;
  private eventListeners: Map<CollaborationEventType, Set<CollaborationEventCallback>>;

  // Yjs 相关（后续集成）
  // private ydoc: Y.Doc | null = null;
  // private wsProvider: WebsocketProvider | null = null;
  // private indexeddbProvider: IndexeddbPersistence | null = null;

  constructor(config: CollaborationProviderConfig) {
    this.config = {
      autoReconnect: true,
      reconnectInterval: 1000,
      maxReconnectAttempts: 10,
      enableLocalPersistence: true,
      ...config,
    };

    this.state = {
      connectionStatus: 'disconnected',
      syncStatus: 'pending',
      onlineUsers: [],
      currentVersion: 0,
      hasLocalChanges: false,
      lastSyncedAt: null,
      error: null,
    };

    this.eventListeners = new Map();
  }

  // ==================== 连接管理 ====================

  /**
   * 连接到协作服务器
   */
  async connect(): Promise<void> {
    this.updateState({ connectionStatus: 'connecting' });
    this.emit('connection', { status: 'connecting' });

    try {
      // TODO: 集成 Yjs
      // this.ydoc = new Y.Doc();
      // this.wsProvider = new WebsocketProvider(
      //   this.config.websocketUrl,
      //   this.config.documentId,
      //   this.ydoc
      // );

      // 模拟连接成功
      await this.simulateConnection();

      this.updateState({
        connectionStatus: 'connected',
        syncStatus: 'synced',
        lastSyncedAt: new Date(),
      });

      this.emit('connection', { status: 'connected' });
      this.emit('sync', { synced: true });

      console.log('[CollaborationProvider] Connected to collaboration server');
    } catch (error) {
      this.updateState({
        connectionStatus: 'error',
        error: error instanceof Error ? error.message : 'Connection failed',
      });
      this.emit('error', { error });
      throw error;
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    // TODO: 清理 Yjs 资源
    // this.wsProvider?.destroy();
    // this.ydoc?.destroy();

    this.updateState({
      connectionStatus: 'disconnected',
      onlineUsers: [],
    });

    this.emit('connection', { status: 'disconnected' });
    console.log('[CollaborationProvider] Disconnected');
  }

  /**
   * 重新连接
   */
  async reconnect(): Promise<void> {
    this.disconnect();
    await this.connect();
  }

  // ==================== 状态查询 ====================

  /**
   * 获取当前状态
   */
  getState(): CollaborationProviderState {
    return { ...this.state };
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.state.connectionStatus === 'connected';
  }

  /**
   * 是否已同步
   */
  isSynced(): boolean {
    return this.state.syncStatus === 'synced';
  }

  // ==================== 文档操作 ====================

  /**
   * 获取 Yjs 文档
   * TODO: 返回实际的 Y.Doc
   */
  getDocument(): unknown {
    // return this.ydoc;
    console.warn('[CollaborationProvider] getDocument() - Yjs not yet integrated');
    return null;
  }

  /**
   * 获取 Awareness
   * TODO: 返回实际的 Awareness
   */
  getAwareness(): unknown {
    // return this.wsProvider?.awareness;
    console.warn('[CollaborationProvider] getAwareness() - Yjs not yet integrated');
    return null;
  }

  // ==================== 用户感知 ====================

  /**
   * 设置本地用户感知状态
   */
  setLocalAwareness(awareness: Partial<UserAwareness>): void {
    // TODO: 更新 Yjs Awareness
    // const currentAwareness = this.wsProvider?.awareness;
    // currentAwareness?.setLocalStateField('user', {
    //   ...currentAwareness.getLocalState()?.user,
    //   ...awareness,
    // });

    console.log('[CollaborationProvider] setLocalAwareness:', awareness);
    this.emit('awareness', { local: awareness });
  }

  /**
   * 获取在线用户列表
   */
  getOnlineUsers(): CollaborationParticipant[] {
    return [...this.state.onlineUsers];
  }

  // ==================== 版本管理 ====================

  /**
   * 创建版本快照
   */
  async createSnapshot(description?: string): Promise<CollaborationSnapshot> {
    // TODO: 使用 Y.encodeStateAsUpdate 创建快照
    const snapshot: CollaborationSnapshot = {
      id: crypto.randomUUID(),
      documentId: this.config.documentId,
      version: this.state.currentVersion + 1,
      snapshot: new Uint8Array(),
      createdBy: this.config.user,
      createdAt: new Date(),
      ...(description !== undefined ? { description } : {}),
      sizeBytes: 0,
    };

    this.updateState({ currentVersion: snapshot.version });
    console.log('[CollaborationProvider] Snapshot created:', snapshot.id);

    return snapshot;
  }

  /**
   * 恢复到指定快照
   */
  async restoreSnapshot(snapshotId: string): Promise<void> {
    // TODO: 实现快照恢复
    console.log('[CollaborationProvider] Restoring snapshot:', snapshotId);
  }

  /**
   * 获取版本历史
   */
  async getVersionHistory(): Promise<VersionHistoryItem[]> {
    // TODO: 从数据库获取版本历史
    return [];
  }

  // ==================== 事件订阅 ====================

  /**
   * 订阅事件
   */
  on<T>(event: CollaborationEventType, callback: CollaborationEventCallback<T>): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback as CollaborationEventCallback);
  }

  /**
   * 取消订阅
   */
  off(event: CollaborationEventType, callback: CollaborationEventCallback): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * 触发事件
   */
  private emit<T>(event: CollaborationEventType, data: T): void {
    this.eventListeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[CollaborationProvider] Event handler error for ${event}:`, error);
      }
    });
  }

  // ==================== 销毁 ====================

  /**
   * 销毁 Provider
   */
  destroy(): void {
    this.disconnect();
    this.eventListeners.clear();
    console.log('[CollaborationProvider] Destroyed');
  }

  // ==================== 私有方法 ====================

  /**
   * 更新状态
   */
  private updateState(partial: Partial<CollaborationProviderState>): void {
    this.state = { ...this.state, ...partial };
  }

  /**
   * 模拟连接（开发用）
   */
  private async simulateConnection(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 模拟当前用户加入
        const currentParticipant: CollaborationParticipant = {
          user: this.config.user,
          awareness: {
            userId: this.config.user.id,
            userName: this.config.user.name || 'Anonymous',
            userColor: this.config.userColor,
            cursor: null,
            selection: null,
            status: 'active',
            lastActive: Date.now(),
          },
          joinedAt: new Date(),
          isCurrentUser: true,
        };

        this.updateState({
          onlineUsers: [currentParticipant],
        });

        resolve();
      }, 500);
    });
  }
}

/**
 * 创建 CollaborationProvider 实例
 */
export function createCollaborationProvider(
  config: CollaborationProviderConfig
): CollaborationProvider {
  return new CollaborationProvider(config);
}

/**
 * 默认 WebSocket URL
 */
export const DEFAULT_WEBSOCKET_URL = process.env.NEXT_PUBLIC_COLLABORATION_WS_URL || 'ws://localhost:4444';
