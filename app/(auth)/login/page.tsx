/**
 * 登录页面
 */

import { LoginForm } from '@/components/auth';

export const metadata = {
  title: '登录 - DocuMind Pro',
  description: '登录您的 DocuMind Pro 账号',
};

export default function LoginPage() {
  return <LoginForm />;
}
