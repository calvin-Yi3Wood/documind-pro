'use client';

/**
 * 用户菜单组件
 *
 * 显示用户头像和下拉菜单
 */

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/Button';

export function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (status === 'loading') {
    return (
      <div className="w-8 h-8 rounded-full bg-beige-200 animate-pulse"></div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.location.href = '/login'}
        >
          登录
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => window.location.href = '/register'}
        >
          注册
        </Button>
      </div>
    );
  }

  const user = session.user;
  const subscription = (user as { subscription?: string }).subscription || 'free';

  const subscriptionLabels: Record<string, { label: string; color: string }> = {
    free: { label: '免费版', color: 'text-bronze-500' },
    pro: { label: 'Pro', color: 'text-orange-600' },
    enterprise: { label: '企业版', color: 'text-purple-600' },
  };

  const sub = subscriptionLabels[subscription] ?? subscriptionLabels.free;

  return (
    <div className="relative" ref={menuRef}>
      {/* 用户头像按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-sand-100 transition-colors"
        aria-label="用户菜单"
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name ?? '用户头像'}
            className="w-8 h-8 rounded-full border border-beige-200"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-sm">
            {user.name?.[0] ?? user.email?.[0] ?? 'U'}
          </div>
        )}
        <i
          className={`fas fa-chevron-down text-xs text-bronze-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        ></i>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-cream-50 rounded-card shadow-lg border border-beige-200 py-2 z-50">
          {/* 用户信息 */}
          <div className="px-4 py-3 border-b border-beige-200">
            <p className="font-medium text-bronze-800 truncate">
              {user.name ?? '用户'}
            </p>
            <p className="text-sm text-bronze-500 truncate">{user.email ?? ''}</p>
            <span className={`text-xs font-medium ${sub?.color ?? 'text-bronze-500'}`}>
              {sub?.label ?? '免费版'}
            </span>
          </div>

          {/* 菜单项 */}
          <div className="py-1">
            <a
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-2 text-sm text-bronze-700 hover:bg-sand-100 transition-colors"
            >
              <i className="fas fa-home w-4 text-center" aria-hidden="true"></i>
              仪表盘
            </a>
            <a
              href="/settings"
              className="flex items-center gap-3 px-4 py-2 text-sm text-bronze-700 hover:bg-sand-100 transition-colors"
            >
              <i className="fas fa-cog w-4 text-center" aria-hidden="true"></i>
              设置
            </a>
            <a
              href="/documents"
              className="flex items-center gap-3 px-4 py-2 text-sm text-bronze-700 hover:bg-sand-100 transition-colors"
            >
              <i className="fas fa-file-alt w-4 text-center" aria-hidden="true"></i>
              我的文档
            </a>
            {subscription === 'free' && (
              <a
                href="/upgrade"
                className="flex items-center gap-3 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 transition-colors"
              >
                <i className="fas fa-crown w-4 text-center" aria-hidden="true"></i>
                升级 Pro
              </a>
            )}
          </div>

          {/* 退出登录 */}
          <div className="border-t border-beige-200 pt-1">
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <i className="fas fa-sign-out-alt w-4 text-center" aria-hidden="true"></i>
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
