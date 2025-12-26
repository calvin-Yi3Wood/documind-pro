/**
 * Next.js 中间件
 *
 * 保护需要认证的路由
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ============================================
// 🔧 开发模式配置
// 设置 NEXT_PUBLIC_DEV_MODE=true 可跳过所有认证检查
// ============================================
const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

// 模拟的开发用户信息
const DEV_USER = {
  id: 'dev-user-001',
  email: 'dev@documind.local',
  name: '开发者',
  subscription_tier: 'pro' as const,
};

// 需要认证的路径
const protectedPaths = [
  '/dashboard',
  '/documents',
  '/settings',
  '/editor',
];

// 需要认证的 API 路径
const protectedApiPaths = [
  '/api/documents',
  '/api/ai',
  '/api/skills',
  '/api/user',
];

// 认证页面（已登录用户不应访问）
const authPaths = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 🔧 开发模式：跳过所有认证检查
  if (isDevMode) {
    // 如果访问登录/注册页，直接重定向到 dashboard
    if (authPaths.some(path => pathname.startsWith(path))) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // 添加开发用户信息到请求头，同时保留安全头
    const response = NextResponse.next();
    response.headers.set('X-Dev-Mode', 'true');
    response.headers.set('X-Dev-User-Id', DEV_USER.id);
    response.headers.set('X-Dev-User-Email', DEV_USER.email);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return response;
  }

  // 获取 JWT Token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET!,
  });

  const isAuthenticated = !!token;

  // 检查是否是受保护的页面路径
  const isProtectedPath = protectedPaths.some(path =>
    pathname.startsWith(path)
  );

  // 检查是否是受保护的 API 路径
  const isProtectedApiPath = protectedApiPaths.some(path =>
    pathname.startsWith(path)
  );

  // 检查是否是认证页面
  const isAuthPath = authPaths.some(path => pathname.startsWith(path));

  // 未登录用户访问受保护的页面 -> 重定向到登录页
  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 未登录用户访问受保护的 API -> 返回 401
  if (isProtectedApiPath && !isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized', message: '请先登录' },
      { status: 401 }
    );
  }

  // 已登录用户访问认证页面 -> 重定向到仪表盘
  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 添加安全相关的响应头
  const response = NextResponse.next();

  // 基本安全头
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (网站图标)
     * - public 目录下的文件
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
