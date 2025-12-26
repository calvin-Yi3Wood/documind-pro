/**
 * 注册页面
 */

import { RegisterForm } from '@/components/auth';

export const metadata = {
  title: '注册 - DocuFusion',
  description: '创建您的 DocuFusion 账号',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
