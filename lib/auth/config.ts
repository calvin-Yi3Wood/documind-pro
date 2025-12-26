/**
 * NextAuth.js 配置
 *
 * 支持的认证方式：
 * - GitHub OAuth
 * - Google OAuth (可选)
 * - 邮箱密码登录 (Credentials)
 */

import { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createClient } from '@supabase/supabase-js';

// Supabase 客户端 (服务端)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const authOptions: NextAuthOptions = {
  providers: [
    // GitHub OAuth
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),

    // Google OAuth (可选)
    ...(process.env.GOOGLE_CLIENT_ID ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    ] : []),

    // 邮箱密码登录
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('请输入邮箱和密码');
        }

        // 从 Supabase 验证用户
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', credentials.email)
          .single();

        if (error || !user) {
          throw new Error('用户不存在');
        }

        // 验证密码 (使用 bcrypt)
        const bcrypt = await import('bcryptjs');
        const isValid = await bcrypt.compare(credentials.password, user.password_hash);

        if (!isValid) {
          throw new Error('密码错误');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar_url,
          subscription: user.subscription || 'free',
        };
      },
    }),
  ],

  // Session 策略
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 天
  },

  // JWT 配置
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 天
  },

  // 页面配置
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
    newUser: '/register',
  },

  // Callbacks
  callbacks: {
    // JWT callback - 在 JWT 创建/更新时调用
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.subscription = (user as any).subscription || 'free';
      }

      // OAuth 登录时同步到 Supabase
      if (account && account.provider !== 'credentials') {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, subscription')
          .eq('email', token.email)
          .single();

        if (existingUser) {
          token.id = existingUser.id;
          token.subscription = existingUser.subscription || 'free';
        } else {
          // 创建新用户
          const { data: newUser } = await supabase
            .from('users')
            .insert({
              email: token.email,
              name: token.name,
              avatar_url: token.picture,
              provider: account.provider,
              subscription: 'free',
            })
            .select()
            .single();

          if (newUser) {
            token.id = newUser.id;
            token.subscription = 'free';
          }
        }
      }

      return token;
    },

    // Session callback - 在获取 session 时调用
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).subscription = token.subscription;
      }
      return session;
    },

    // 授权回调
    async signIn() {
      // 可以在这里添加额外的登录验证逻辑
      return true;
    },
  },

  // 事件钩子
  events: {
    async signIn({ user, account }) {
      // 记录登录日志
      console.log(`用户登录: ${user.email} via ${account?.provider}`);
    },
    async signOut({ token }) {
      console.log(`用户登出: ${token.email}`);
    },
  },

  // 调试模式 (开发环境)
  debug: process.env.NODE_ENV === 'development',
};

export default authOptions;
