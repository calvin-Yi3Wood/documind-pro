/**
 * 登录页面
 */

import { Suspense } from 'react';
import { LoginForm } from '@/components/auth';

export const metadata = {
  title: '登录 - DocuFusion',
  description: '登录您的 DocuFusion 账号',
};

function LoginFormFallback() {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-cream-50 rounded-card shadow-card border border-beige-200 p-8 animate-pulse">
        <div className="h-8 bg-bronze-200 rounded mb-6 mx-auto w-3/4"></div>
        <div className="space-y-4">
          <div className="h-12 bg-bronze-100 rounded"></div>
          <div className="h-12 bg-bronze-100 rounded"></div>
          <div className="h-12 bg-bronze-100 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
