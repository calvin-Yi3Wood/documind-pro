/**
 * OnlineUsers - 在线用户列表组件
 *
 * 显示当前文档的在线协作者
 * 支持头像、颜色标识、活跃状态
 *
 * @module components/features/collaboration/OnlineUsers
 */

'use client';

import { useState } from 'react';
import type { CollaborationParticipant } from '@/types';

interface OnlineUsersProps {
  /** 在线用户列表 */
  users: CollaborationParticipant[];
  /** 最大显示数量（超出显示 +N） */
  maxDisplay?: number;
  /** 点击用户回调 */
  onUserClick?: (user: CollaborationParticipant) => void;
}

/**
 * 在线用户头像组件
 */
function UserAvatar({
  user,
  onClick,
}: {
  user: CollaborationParticipant;
  onClick?: () => void;
}) {
  const initials = user.user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <button
      onClick={onClick}
      className="relative group"
      title={`${user.user.name}${user.isCurrentUser ? ' (you)' : ''}`}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold transition-transform group-hover:scale-110"
        style={{ backgroundColor: user.awareness.userColor }}
      >
        {initials}
      </div>

      {/* 活跃状态指示器 */}
      <span
        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
          user.awareness.status === 'active'
            ? 'bg-green-500'
            : user.awareness.status === 'idle'
            ? 'bg-amber-500'
            : 'bg-gray-400'
        }`}
      />

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-bronze-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {user.user.name}
        {user.isCurrentUser && ' (you)'}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-bronze-800" />
      </div>
    </button>
  );
}

/**
 * 在线用户列表组件
 */
export function OnlineUsers({
  users,
  maxDisplay = 5,
  onUserClick,
}: OnlineUsersProps) {
  const [expanded, setExpanded] = useState(false);

  if (users.length === 0) {
    return null;
  }

  const displayUsers = expanded ? users : users.slice(0, maxDisplay);
  const remainingCount = users.length - maxDisplay;

  return (
    <div className="flex items-center gap-1">
      {/* 用户头像列表 */}
      <div className="flex -space-x-2">
        {displayUsers.map((user) => (
          <UserAvatar
            key={user.user.id}
            user={user}
            onClick={() => onUserClick?.(user)}
          />
        ))}
      </div>

      {/* 超出数量指示 */}
      {remainingCount > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-8 h-8 rounded-full bg-bronze-200 text-bronze-600 text-xs font-bold flex items-center justify-center hover:bg-bronze-300 transition-colors"
        >
          +{remainingCount}
        </button>
      )}

      {/* 收起按钮 */}
      {expanded && users.length > maxDisplay && (
        <button
          onClick={() => setExpanded(false)}
          className="text-xs text-bronze-500 hover:text-bronze-700 ml-2"
        >
          收起
        </button>
      )}
    </div>
  );
}

export default OnlineUsers;
