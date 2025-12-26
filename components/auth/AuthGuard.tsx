'use client';

/**
 * 认证守卫组件
 *
 * 保护需要登录才能访问的页面
 */

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/Spinner';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredSubscription?: 'free' | 'pro' | 'enterprise';
  fallback?: React.ReactNode;
}

export function AuthGuard({
  children,
  requiredSubscription = 'free',
  fallback,
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 加载中
  if (status === 'loading') {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-cream-50">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-bronze-600">正在验证身份...</p>
          </div>
        </div>
      )
    );
  }

  // 未登录
  if (!session) {
    // 在客户端进行重定向
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      router.push(`/login?callbackUrl=${encodeURIComponent(currentPath)}`);
    }

    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-cream-50">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-bronze-600">正在跳转到登录页面...</p>
          </div>
        </div>
      )
    );
  }

  // 检查订阅等级
  const userSubscription = (session.user as any).subscription || 'free';
  const levels = { free: 0, pro: 1, enterprise: 2 };
  const userLevel = levels[userSubscription as keyof typeof levels] || 0;
  const required = levels[requiredSubscription] || 0;

  if (userLevel < required) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-card shadow-card border border-beige-200">
          <i className="fas fa-crown text-4xl text-orange-500 mb-4" aria-hidden="true"></i>
          <h2 className="text-xl font-bold text-bronze-800 mb-2">需要升级</h2>
          <p className="text-bronze-600 mb-4">
            此功能需要 {requiredSubscription === 'pro' ? 'Pro' : '企业版'} 订阅。
          </p>
          <button
            onClick={() => router.push('/upgrade' as any)}
            className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-btn hover:from-orange-600 hover:to-amber-600 transition-all"
          >
            立即升级
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthGuard;
