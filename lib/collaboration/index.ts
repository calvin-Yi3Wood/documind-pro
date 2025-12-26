/**
 * 协同编辑模块导出
 *
 * @module lib/collaboration
 */

export {
  CollaborationProvider,
  createCollaborationProvider,
  generateUserColor,
  DEFAULT_WEBSOCKET_URL,
} from './provider';

// 重新导出类型
export type {
  ICollaborationProvider,
  CollaborationProviderConfig,
  CollaborationProviderState,
  CollaborationEventType,
  CollaborationEventCallback,
  CollaborationParticipant,
  UserAwareness,
  CollaborationSnapshot,
  VersionHistoryItem,
  ConnectionStatus,
  CollaborationSyncStatus,
} from '@/types';
