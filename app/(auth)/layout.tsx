/**
 * 认证页面布局
 *
 * 用于登录、注册等认证相关页面
 */

import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-sand-100 flex flex-col">
      {/* 头部 Logo */}
      <header className="p-6">
        <a href="/" className="inline-flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <i className="fas fa-file-alt text-white text-lg" aria-hidden="true"></i>
          </div>
          <span className="text-xl font-bold text-bronze-800">DocuMind Pro</span>
        </a>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 flex items-center justify-center p-6">
        {children}
      </main>

      {/* 底部 */}
      <footer className="p-6 text-center text-sm text-bronze-500">
        <p>© 2025 DocuMind Pro. All rights reserved.</p>
      </footer>
    </div>
  );
}
