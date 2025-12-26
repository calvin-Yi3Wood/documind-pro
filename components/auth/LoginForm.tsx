'use client';

/**
 * 登录表单组件
 *
 * 支持：
 * - 邮箱密码登录
 * - GitHub OAuth
 * - Google OAuth
 */

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // 邮箱密码登录
  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setFormError(result.error);
      } else if (result?.ok) {
        router.push(callbackUrl as any);
        router.refresh();
      }
    } catch (err) {
      setFormError('登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // OAuth 登录
  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    setIsLoading(true);
    await signIn(provider, { callbackUrl });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-cream-50 rounded-card shadow-card border border-beige-200 p-8">
        <h1 className="text-2xl font-bold text-bronze-800 text-center mb-6">
          登录 DocuMind Pro
        </h1>

        {/* 错误提示 */}
        {(error || formError) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-btn text-red-700 text-sm">
            {formError || '登录失败，请重试'}
          </div>
        )}

        {/* OAuth 按钮 */}
        <div className="space-y-3 mb-6">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => handleOAuthLogin('github')}
            disabled={isLoading}
            className="!w-full !flex !items-center !justify-center !gap-2"
          >
            <i className="fab fa-github text-lg" aria-hidden="true"></i>
            使用 GitHub 登录
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={() => handleOAuthLogin('google')}
            disabled={isLoading}
            className="!w-full !flex !items-center !justify-center !gap-2"
          >
            <i className="fab fa-google text-lg" aria-hidden="true"></i>
            使用 Google 登录
          </Button>
        </div>

        {/* 分割线 */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-beige-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-cream-50 text-bronze-500">或使用邮箱登录</span>
          </div>
        </div>

        {/* 邮箱密码表单 */}
        <form onSubmit={handleCredentialsLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-bronze-700 mb-1">
              邮箱
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-bronze-700 mb-1">
              密码
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isLoading}
            className="!w-full"
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>
                登录中...
              </>
            ) : (
              '登录'
            )}
          </Button>
        </form>

        {/* 注册链接 */}
        <p className="mt-6 text-center text-sm text-bronze-600">
          还没有账号？{' '}
          <a href="/register" className="text-orange-600 hover:text-orange-700 font-medium">
            立即注册
          </a>
        </p>
      </div>
    </div>
  );
}

export default LoginForm;
