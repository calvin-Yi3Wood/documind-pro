/**
 * 服务端 Session 工具函数
 *
 * 提供服务端获取 session 和权限检查的工具
 */

import { getServerSession } from 'next-auth';
import { authOptions } from './config';
import { redirect } from 'next/navigation';

// 扩展的 Session 类型
export interface ExtendedSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    subscription: 'free' | 'pro' | 'enterprise';
  };
  expires: string;
}

/**
 * 获取当前用户 Session (服务端)
 */
export async function getSession(): Promise<ExtendedSession | null> {
  const session = await getServerSession(authOptions);
  return session as ExtendedSession | null;
}

/**
 * 获取当前用户 (服务端)
 * 如果未登录返回 null
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}

/**
 * 要求用户登录
 * 如果未登录则重定向到登录页
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return session;
}

/**
 * 要求特定订阅等级
 * @param requiredLevel - 要求的最低订阅等级
 */
export async function requireSubscription(
  requiredLevel: 'free' | 'pro' | 'enterprise'
) {
  const session = await requireAuth();

  const levels = { free: 0, pro: 1, enterprise: 2 };
  const userLevel = levels[session.user.subscription] || 0;
  const required = levels[requiredLevel] || 0;

  if (userLevel < required) {
    redirect('/upgrade' as any);
  }

  return session;
}

/**
 * 检查用户是否有特定权限
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const session = await getSession();

  if (!session) return false;

  // 企业版用户拥有所有权限
  if (session.user.subscription === 'enterprise') return true;

  // 根据订阅等级定义权限
  const permissions: Record<string, string[]> = {
    free: ['read', 'create_document', 'ai_chat_limited'],
    pro: ['read', 'create_document', 'ai_chat', 'ai_image', 'export'],
    enterprise: ['*'],
  };

  const userPermissions = permissions[session.user.subscription] || [];
  return userPermissions.includes(permission) || userPermissions.includes('*');
}

/**
 * API 路由认证检查
 * 返回用户信息或 null
 */
export async function getApiUser() {
  const session = await getSession();
  return session?.user || null;
}

/**
 * API 路由认证保护
 * 如果未认证抛出错误
 */
export async function requireApiAuth() {
  const user = await getApiUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}
