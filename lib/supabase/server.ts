/**
 * Supabase 服务端客户端
 *
 * 用于 API Routes 和服务端组件
 * 支持优雅降级：未配置 Supabase 时返回 mock 客户端
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// ============================================
// 🔧 开发模式配置检测
// ============================================
const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
const hasSupabaseConfig = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Mock Supabase 客户端 (用于开发模式或未配置 Supabase 时)
 */
function createMockClient() {
  const mockResult = { data: null, error: null };
  const mockQuery = {
    select: () => mockQuery,
    insert: () => mockQuery,
    update: () => mockQuery,
    delete: () => mockQuery,
    eq: () => mockQuery,
    neq: () => mockQuery,
    gt: () => mockQuery,
    gte: () => mockQuery,
    lt: () => mockQuery,
    lte: () => mockQuery,
    like: () => mockQuery,
    ilike: () => mockQuery,
    is: () => mockQuery,
    in: () => mockQuery,
    order: () => mockQuery,
    limit: () => mockQuery,
    single: () => Promise.resolve(mockResult),
    maybeSingle: () => Promise.resolve(mockResult),
    then: (resolve: (value: typeof mockResult) => void) => Promise.resolve(mockResult).then(resolve),
  };

  return {
    from: () => mockQuery,
    rpc: () => Promise.resolve(mockResult),
    auth: {
      getUser: () => Promise.resolve({
        data: {
          user: isDevMode ? {
            id: 'dev-user-001',
            email: 'dev@documind.local',
            app_metadata: {},
            user_metadata: { name: '开发者' },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          } : null,
        },
        error: null,
      }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        download: () => Promise.resolve({ data: null, error: null }),
        remove: () => Promise.resolve({ data: null, error: null }),
        list: () => Promise.resolve({ data: [], error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  } as unknown as ReturnType<typeof createServiceClient<Database>>;
}

/**
 * 创建服务端 Supabase 客户端（带用户上下文）
 *
 * 用于需要用户认证的操作
 * 未配置 Supabase 时返回 mock 客户端
 */
export async function createClient() {
  // 未配置 Supabase 时返回 mock 客户端
  if (!hasSupabaseConfig) {
    console.log('ℹ️  Supabase not configured, using mock client');
    return createMockClient();
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component 中无法设置 cookie
            // 在 middleware 中处理
          }
        },
      },
    }
  );
}

/**
 * 创建管理员客户端（使用 Service Role Key）
 *
 * ⚠️ 仅用于服务端，绕过 RLS
 * 用于：用户注册、配额管理、后台任务等
 * 未配置 Supabase 时返回 mock 客户端
 */
export function createAdminClient() {
  // 未配置 Supabase 或 Service Role Key 时返回 mock 客户端
  if (!hasSupabaseConfig || !hasServiceRoleKey) {
    if (!hasSupabaseConfig) {
      console.log('ℹ️  Supabase not configured, using mock admin client');
    } else {
      console.log('ℹ️  Service Role Key not configured, using mock admin client');
    }
    return createMockClient();
  }

  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * 获取当前用户
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * 获取当前用户的完整信息（包含订阅、配额等）
 */
export async function getCurrentUserWithProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}

/**
 * 检查用户配额
 */
export async function checkUserQuota(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  total: number;
  resetAt: Date;
}> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('users')
    .select('monthly_ai_quota, monthly_ai_used, quota_reset_at')
    .eq('id', userId)
    .single();

  const user = data as { monthly_ai_quota: number; monthly_ai_used: number; quota_reset_at: string } | null;

  if (error || !user) {
    return {
      allowed: false,
      remaining: 0,
      total: 0,
      resetAt: new Date(),
    };
  }

  // 检查是否需要重置配额
  const resetAt = new Date(user.quota_reset_at);
  if (resetAt <= new Date()) {
    // 重置配额
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    await (admin
      .from('users') as any)
      .update({
        monthly_ai_used: 0,
        quota_reset_at: nextMonth.toISOString(),
      })
      .eq('id', userId);

    return {
      allowed: true,
      remaining: user.monthly_ai_quota,
      total: user.monthly_ai_quota,
      resetAt: nextMonth,
    };
  }

  const remaining = user.monthly_ai_quota - user.monthly_ai_used;

  return {
    allowed: remaining > 0,
    remaining,
    total: user.monthly_ai_quota,
    resetAt,
  };
}

/**
 * 增加用户 AI 使用量
 */
export async function incrementAIUsage(
  userId: string,
  amount: number = 1
): Promise<boolean> {
  const admin = createAdminClient();

  const { error } = await (admin.rpc as any)('increment_ai_usage', {
    user_id: userId,
    amount,
  });

  return !error;
}

/**
 * 记录 AI 使用日志
 */
export async function logAIUsage(params: {
  userId: string;
  skillName?: string;
  model?: string;
  provider?: string;
  requestType: string;
  inputTokens?: number;
  outputTokens?: number;
  usageUnits?: number;
  responseStatus?: 'success' | 'error' | 'timeout' | 'rate_limited';
  responseTimeMs?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  const admin = createAdminClient();

  const insertData = {
    user_id: params.userId,
    request_type: params.requestType,
    input_tokens: params.inputTokens || 0,
    output_tokens: params.outputTokens || 0,
    usage_units: params.usageUnits || 1,
    response_status: params.responseStatus || 'success',
    request_metadata: params.metadata || {},
    ...(params.skillName !== undefined ? { skill_name: params.skillName } : {}),
    ...(params.model !== undefined ? { model: params.model } : {}),
    ...(params.provider !== undefined ? { provider: params.provider } : {}),
    ...(params.responseTimeMs !== undefined ? { response_time_ms: params.responseTimeMs } : {}),
    ...(params.errorMessage !== undefined ? { error_message: params.errorMessage } : {}),
  };

  const { data, error } = await (admin
    .from('ai_usage_logs') as any)
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to log AI usage:', error);
    return null;
  }

  const result = data as { id: string } | null;
  return result?.id ?? null;
}

export default createClient;
