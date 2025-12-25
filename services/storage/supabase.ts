/**
 * Supabase Storage Provider
 *
 * 云端存储实现,用于生产环境
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import type {
  EventEmittingStorageProvider,
  FileUploadOptions,
  FileUploadResult,
  QueryOptions,
  PaginatedResult,
  SyncStatus,
  StorageEvent,
  StorageEventListener,
} from './interface';
import type { Document, CreateDocumentParams, UpdateDocumentParams } from '@/types';

/**
 * Supabase配置
 */
interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

/**
 * Supabase存储提供商
 */
export class SupabaseStorageProvider implements EventEmittingStorageProvider {
  name = 'Supabase (Cloud)';
  supportsOffline = false;

  private client: SupabaseClient;
  private listeners: Set<StorageEventListener> = new Set();
  private userId?: string;

  constructor(config: SupabaseConfig) {
    this.client = createClient(config.url, config.anonKey);
  }

  async initialize(): Promise<void> {
    // 获取当前用户
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (user?.id) {
      this.userId = user.id;
    }
  }

  // ==================== 文档操作 ====================

  async createDocument(params: CreateDocumentParams): Promise<Document> {
    const now = new Date();
    const content = params.content || '';
    const document: Document = {
      id: nanoid(),
      title: params.title,
      content,
      type: params.type,
      owner: {
        id: this.userId || 'anonymous',
        name: null,
        avatar: null,
      },
      permissions: {
        isPublic: false,
        collaborators: [],
        allowComments: false,
        allowDownload: true,
      },
      version: 1,
      versionHistory: [],
      syncStatus: 'synced',
      metadata: {
        wordCount: content.split(/\s+/).filter((w) => w.length > 0).length,
        charCount: content.length,
        paragraphCount: 0,
        imageCount: 0,
        tableCount: 0,
        tags: params.tags || [],
      },
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: null,
      isDeleted: false,
      deletedAt: null,
    };

    const { data, error } = await this.client.from('documents').insert([document]).select().single();

    if (error) {
      throw new Error(`Failed to create document: ${error.message}`);
    }

    this.emit({ type: 'document:created', document: data as Document });
    return data as Document;
  }

  async getDocument(id: string): Promise<Document | null> {
    const { data, error } = await this.client.from('documents').select('*').eq('id', id).single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get document: ${error.message}`);
    }

    return data as Document;
  }

  async updateDocument(id: string, params: UpdateDocumentParams): Promise<Document> {
    const existing = await this.getDocument(id);
    if (!existing) {
      throw new Error(`Document ${id} not found`);
    }

    // 保存版本历史
    await this.saveVersion(existing);

    // 准备更新数据
    const updates: Partial<Document> = {
      ...params,
      updatedAt: new Date(),
    };

    if (params.content) {
      updates.metadata = {
        ...existing.metadata,
        wordCount: params.content.split(/\s+/).filter((w) => w.length > 0).length,
        charCount: params.content.length,
      };
    }

    const { data, error } = await this.client
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update document: ${error.message}`);
    }

    const updated = data as Document;
    this.emit({ type: 'document:updated', document: updated });
    return updated;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const { error } = await this.client.from('documents').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete document: ${error.message}`);
    }

    this.emit({ type: 'document:deleted', id });
    return true;
  }

  async listDocuments(options?: QueryOptions): Promise<PaginatedResult<Document>> {
    let query = this.client.from('documents').select('*', { count: 'exact' });

    // 应用筛选
    if (options?.where) {
      for (const [key, value] of Object.entries(options.where)) {
        query = query.eq(key, value);
      }
    }

    // 排序
    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.order === 'asc' });
    }

    // 分页
    const offset = options?.offset || 0;
    const limit = options?.limit || 20;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list documents: ${error.message}`);
    }

    const total = count || 0;
    return {
      data: (data as Document[]) || [],
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      hasMore: offset + limit < total,
    };
  }

  async searchDocuments(query: string, options?: QueryOptions): Promise<PaginatedResult<Document>> {
    // 使用Supabase全文搜索
    let dbQuery = this.client
      .from('documents')
      .select('*', { count: 'exact' })
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`);

    // 排序
    if (options?.orderBy) {
      dbQuery = dbQuery.order(options.orderBy, { ascending: options.order === 'asc' });
    }

    // 分页
    const offset = options?.offset || 0;
    const limit = options?.limit || 20;
    dbQuery = dbQuery.range(offset, offset + limit - 1);

    const { data, error, count } = await dbQuery;

    if (error) {
      throw new Error(`Failed to search documents: ${error.message}`);
    }

    const total = count || 0;
    return {
      data: (data as Document[]) || [],
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      hasMore: offset + limit < total,
    };
  }

  // ==================== 文件操作 ====================

  async uploadFile(file: File | Blob, options: FileUploadOptions): Promise<FileUploadResult> {
    const id = nanoid();
    const path = `${this.userId || 'anonymous'}/${id}/${options.filename}`;
    const bucket = 'documents';

    const { data, error } = await this.client.storage.from(bucket).upload(path, file, {
      contentType: options.contentType,
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = this.client.storage.from(bucket).getPublicUrl(data.path);

    return {
      id,
      url: publicUrl,
      path: data.path,
      size: options.size,
      uploadedAt: new Date(),
    };
  }

  async deleteFile(path: string): Promise<boolean> {
    const bucket = 'documents';
    const { error } = await this.client.storage.from(bucket).remove([path]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    return true;
  }

  async getFileUrl(path: string, expiresIn = 0): Promise<string> {
    const bucket = 'documents';

    if (expiresIn > 0) {
      const { data, error } = await this.client.storage.from(bucket).createSignedUrl(path, expiresIn);

      if (error) {
        throw new Error(`Failed to get signed URL: ${error.message}`);
      }

      return data.signedUrl;
    }

    const {
      data: { publicUrl },
    } = this.client.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  }

  // ==================== 版本控制 ====================

  async getDocumentVersions(documentId: string, limit = 10): Promise<Document[]> {
    const { data, error } = await this.client
      .from('document_versions')
      .select('document_data')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get versions: ${error.message}`);
    }

    return (data || []).map((v: any) => v.document_data as Document);
  }

  async restoreVersion(documentId: string, versionId: string): Promise<Document> {
    const { data, error } = await this.client
      .from('document_versions')
      .select('document_data')
      .eq('id', versionId)
      .eq('document_id', documentId)
      .single();

    if (error) {
      throw new Error(`Failed to get version: ${error.message}`);
    }

    const versionData = data.document_data as Document;
    return this.updateDocument(documentId, {
      title: versionData.title,
      content: versionData.content,
      tags: versionData.metadata.tags,
    });
  }

  // ==================== 同步功能 ====================

  async sync(): Promise<SyncStatus> {
    this.emit({ type: 'sync:started' });

    try {
      // Supabase是实时同步的,不需要额外同步逻辑
      const status: SyncStatus = {
        isSyncing: false,
        lastSyncedAt: new Date(),
        pendingCount: 0,
      };

      this.emit({ type: 'sync:completed', status });
      return status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit({ type: 'sync:failed', error: errorMessage });
      throw error;
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    return {
      isSyncing: false,
      lastSyncedAt: new Date(),
      pendingCount: 0,
    };
  }

  async clearCache(): Promise<boolean> {
    // Supabase不使用本地缓存
    return true;
  }

  // ==================== 事件系统 ====================

  addEventListener(listener: StorageEventListener): () => void {
    this.listeners.add(listener);
    return () => this.removeEventListener(listener);
  }

  removeEventListener(listener: StorageEventListener): void {
    this.listeners.delete(listener);
  }

  private emit(event: StorageEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  // ==================== 辅助方法 ====================

  private async saveVersion(document: Document): Promise<void> {
    const { error } = await this.client.from('document_versions').insert([
      {
        id: nanoid(),
        document_id: document.id,
        document_data: document,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.warn('Failed to save version:', error);
    }
  }
}

/**
 * 创建Supabase存储提供商
 *
 * @returns Supabase存储提供商
 */
export function createSupabaseProvider(): SupabaseStorageProvider {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
  }

  const config: SupabaseConfig = { url, anonKey };
  if (serviceRoleKey) {
    config.serviceRoleKey = serviceRoleKey;
  }

  return new SupabaseStorageProvider(config);
}
