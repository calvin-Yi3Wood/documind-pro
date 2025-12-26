'use client';

/**
 * 注册表单组件
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function RegisterForm() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 验证密码
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 8) {
      setError('密码长度至少8位');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '注册失败');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || '注册失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-green-50 rounded-card shadow-card border border-green-200 p-8 text-center">
          <i className="fas fa-check-circle text-4xl text-green-500 mb-4" aria-hidden="true"></i>
          <h2 className="text-xl font-bold text-green-800 mb-2">注册成功！</h2>
          <p className="text-green-700">正在跳转到登录页面...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-cream-50 rounded-card shadow-card border border-beige-200 p-8">
        <h1 className="text-2xl font-bold text-bronze-800 text-center mb-6">
          创建账号
        </h1>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-btn text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-bronze-700 mb-1">
              用户名
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="您的昵称"
              required
              disabled={isLoading}
            />
          </div>

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
              placeholder="至少8位字符"
              required
              disabled={isLoading}
              minLength={8}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-bronze-700 mb-1">
              确认密码
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
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
                注册中...
              </>
            ) : (
              '创建账号'
            )}
          </Button>
        </form>

        {/* 登录链接 */}
        <p className="mt-6 text-center text-sm text-bronze-600">
          已有账号？{' '}
          <a href="/login" className="text-orange-600 hover:text-orange-700 font-medium">
            立即登录
          </a>
        </p>

        {/* 服务条款 */}
        <p className="mt-4 text-center text-xs text-bronze-500">
          注册即表示您同意我们的{' '}
          <a href="/terms" className="text-orange-600 hover:underline">服务条款</a>
          {' '}和{' '}
          <a href="/privacy" className="text-orange-600 hover:underline">隐私政策</a>
        </p>
      </div>
    </div>
  );
}

export default RegisterForm;
