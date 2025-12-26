/**
 * NextAuth.js API 路由
 *
 * 处理所有认证相关的 API 请求
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/config';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
