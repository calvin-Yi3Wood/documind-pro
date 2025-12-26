/**
 * CollaborationStatus - 协作状态指示组件
 *
 * 显示连接状态、同步状态、离线指示
 *
 * @module components/features/collaboration/CollaborationStatus
 */

'use client';

import type { ConnectionStatus, CollaborationSyncStatus } from '@/types';

interface CollaborationStatusProps {
  /** 连接状态 */
  connectionStatus: ConnectionStatus;
  /** 同步状态 */
  syncStatus: CollaborationSyncStatus;
  /** 是否有本地更改 */
  hasLocalChanges?: boolean;
  /** 最后同步时间 */
  lastSyncedAt?: Date | null;
  /** 点击回调（用于手动重连） */
  onClick?: () => void;
}

/**
 * 状态配置
 */
const STATUS_CONFIG: Record<
  ConnectionStatus,
  {
    icon: string;
    label: string;
    color: string;
    bgColor: string;
  }
> = {
  connected: {
    icon: '●',
    label: '已连接',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  connecting: {
    icon: '◐',
    label: '连接中...',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  reconnecting: {
    icon: '↻',
    label: '重连中...',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  disconnected: {
    icon: '○',
    label: '已断开',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
  },
  error: {
    icon: '✕',
    label: '连接错误',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
};

/**
 * 同步状态配置
 */
const SYNC_CONFIG: Record<
  CollaborationSyncStatus,
  {
    icon: string;
    label: string;
  }
> = {
  synced: {
    icon: '✓',
    label: '已同步',
  },
  syncing: {
    icon: '↻',
    label: '同步中...',
  },
  pending: {
    icon: '○',
    label: '等待同步',
  },
  offline: {
    icon: '⚡',
    label: '离线模式',
  },
  conflict: {
    icon: '!',
    label: '存在冲突',
  },
};

/**
 * 格式化时间
 */
function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) {
    return '刚刚';
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else {
    return date.toLocaleDateString('zh-CN');
  }
}

/**
 * 协作状态指示组件
 */
export function CollaborationStatus({
  connectionStatus,
  syncStatus,
  hasLocalChanges = false,
  lastSyncedAt,
  onClick,
}: CollaborationStatusProps) {
  const config = STATUS_CONFIG[connectionStatus];
  const syncConfig = SYNC_CONFIG[syncStatus];

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
        ${config.bgColor} ${config.color}
        hover:opacity-80 transition-opacity
      `}
      title={
        lastSyncedAt
          ? `最后同步: ${formatTime(lastSyncedAt)}`
          : '点击重新连接'
      }
    >
      {/* 连接状态图标 */}
      <span
        className={`${
          connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
            ? 'animate-spin'
            : ''
        }`}
      >
        {config.icon}
      </span>

      {/* 状态文本 */}
      <span>{config.label}</span>

      {/* 同步状态（仅在已连接时显示） */}
      {connectionStatus === 'connected' && syncStatus !== 'synced' && (
        <>
          <span className="text-bronze-300">|</span>
          <span
            className={`${
              syncStatus === 'syncing' ? 'animate-spin' : ''
            } ${syncStatus === 'conflict' ? 'text-red-600' : ''}`}
          >
            {syncConfig.icon}
          </span>
          <span>{syncConfig.label}</span>
        </>
      )}

      {/* 本地更改指示 */}
      {hasLocalChanges && (
        <span className="w-2 h-2 rounded-full bg-amber-500" title="有未保存的更改" />
      )}
    </button>
  );
}

export default CollaborationStatus;
