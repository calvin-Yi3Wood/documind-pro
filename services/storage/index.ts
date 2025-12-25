/**
 * Storage Service Entry Point
 *
 * 根据环境自动选择存储后端
 * - 开发环境: LocalStorage (IndexedDB)
 * - 生产环境: Supabase (Cloud)
 */

import type { EventEmittingStorageProvider } from './interface';
import { LocalStorageProvider } from './local';
import { createSupabaseProvider } from './supabase';

/**
 * 存储模式
 */
export type StorageMode = 'local' | 'cloud' | 'auto';

/**
 * 全局存储实例
 */
let storageInstance: EventEmittingStorageProvider | null = null;

/**
 * 获取存储提供商
 *
 * @param mode - 存储模式 ('local' | 'cloud' | 'auto')
 * @returns 存储提供商实例
 */
export async function getStorageProvider(mode: StorageMode = 'auto'): Promise<EventEmittingStorageProvider> {
  if (storageInstance) {
    return storageInstance;
  }

  let provider: EventEmittingStorageProvider;

  // 自动选择模式
  if (mode === 'auto') {
    // 检查是否配置了Supabase
    const hasSupabase =
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // 生产环境且有Supabase配置 → 使用云端
    // 否则使用本地
    mode = process.env.NODE_ENV === 'production' && hasSupabase ? 'cloud' : 'local';
  }

  // 创建对应的提供商
  if (mode === 'cloud') {
    try {
      provider = createSupabaseProvider();
      console.log('✅ Using Supabase storage (cloud mode)');
    } catch (error) {
      console.warn('⚠️  Failed to create Supabase provider, falling back to local:', error);
      provider = new LocalStorageProvider();
      console.log('✅ Using IndexedDB storage (local mode - fallback)');
    }
  } else {
    provider = new LocalStorageProvider();
    console.log('✅ Using IndexedDB storage (local mode)');
  }

  // 初始化
  await provider.initialize();

  // 缓存实例
  storageInstance = provider;

  return provider;
}

/**
 * 重置存储提供商
 *
 * 用于测试或切换存储模式
 */
export function resetStorageProvider(): void {
  storageInstance = null;
}

/**
 * 检查存储是否已初始化
 *
 * @returns 是否已初始化
 */
export function isStorageInitialized(): boolean {
  return storageInstance !== null;
}

// 导出类型和工具
export * from './interface';
export { LocalStorageProvider } from './local';
export { SupabaseStorageProvider, createSupabaseProvider } from './supabase';
