/**
 * Supabase 客户端（浏览器端）
 *
 * 用于客户端组件的 Supabase 连接
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * 创建浏览器端 Supabase 客户端
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * 单例客户端（用于客户端组件中的复用）
 */
let browserClient: ReturnType<typeof createClient> | null = null;

export function getClient() {
  if (!browserClient) {
    browserClient = createClient();
  }
  return browserClient;
}

/**
 * 重置客户端（用于登出等场景）
 */
export function resetClient() {
  browserClient = null;
}

export default createClient;
