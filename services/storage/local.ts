/**
 * Local Storage Provider (IndexedDB)
 *
 * 本地存储实现,用于开发环境和离线支持
 */

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
 * IndexedDB 数据库名称
 */
const DB_NAME = 'documind-pro';
const DB_VERSION = 1;

/**
 * 对象存储名称
 */
const STORE_DOCUMENTS = 'documents';
const STORE_FILES = 'files';
const STORE_VERSIONS = 'versions';

/**
 * 本地存储提供商
 */
export class LocalStorageProvider implements EventEmittingStorageProvider {
  name = 'Local (IndexedDB)';
  supportsOffline = true;

  private db: IDBDatabase | null = null;
  private listeners: Set<StorageEventListener> = new Set();

  /**
   * 初始化IndexedDB
   */
  async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('LocalStorageProvider can only be used in browser environment');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 文档存储
        if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
          const documentStore = db.createObjectStore(STORE_DOCUMENTS, { keyPath: 'id' });
          documentStore.createIndex('createdAt', 'createdAt', { unique: false });
          documentStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          documentStore.createIndex('title', 'title', { unique: false });
        }

        // 文件存储
        if (!db.objectStoreNames.contains(STORE_FILES)) {
          const fileStore = db.createObjectStore(STORE_FILES, { keyPath: 'id' });
          fileStore.createIndex('path', 'path', { unique: true });
        }

        // 版本存储
        if (!db.objectStoreNames.contains(STORE_VERSIONS)) {
          const versionStore = db.createObjectStore(STORE_VERSIONS, { keyPath: 'id' });
          versionStore.createIndex('documentId', 'documentId', { unique: false });
          versionStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  // ==================== 文档操作 ====================

  async createDocument(params: CreateDocumentParams): Promise<Document> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date();
    const content = params.content || '';
    const document: Document = {
      id: nanoid(),
      title: params.title,
      content,
      type: params.type,
      owner: {
        id: 'local-user',
        name: 'Local User',
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

    await this.putDocument(document);
    this.emit({ type: 'document:created', document });

    return document;
  }

  async getDocument(id: string): Promise<Document | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_DOCUMENTS], 'readonly');
      const store = transaction.objectStore(STORE_DOCUMENTS);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async updateDocument(id: string, params: UpdateDocumentParams): Promise<Document> {
    if (!this.db) throw new Error('Database not initialized');

    const existing = await this.getDocument(id);
    if (!existing) {
      throw new Error(`Document ${id} not found`);
    }

    // 保存版本历史
    await this.saveVersion(existing);

    // 更新文档
    const updated: Document = {
      ...existing,
      ...params,
      updatedAt: new Date(),
      syncStatus: 'pending',
    };

    if (params.content) {
      updated.metadata.wordCount = params.content.split(/\s+/).filter((w) => w.length > 0).length;
      updated.metadata.charCount = params.content.length;
    }

    await this.putDocument(updated);
    this.emit({ type: 'document:updated', document: updated });

    return updated;
  }

  async deleteDocument(id: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_DOCUMENTS], 'readwrite');
      const store = transaction.objectStore(STORE_DOCUMENTS);
      const request = store.delete(id);

      request.onsuccess = () => {
        this.emit({ type: 'document:deleted', id });
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async listDocuments(options?: QueryOptions): Promise<PaginatedResult<Document>> {
    if (!this.db) throw new Error('Database not initialized');

    const documents = await this.getAllDocuments();

    // 应用筛选
    let filtered = documents;
    if (options?.where) {
      filtered = documents.filter((doc) => {
        for (const [key, value] of Object.entries(options.where!)) {
          if (doc[key as keyof Document] !== value) return false;
        }
        return true;
      });
    }

    // 排序
    if (options?.orderBy) {
      const field = options.orderBy;
      const order = options.order || 'desc';
      filtered.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        // Handle null values
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // 分页
    const offset = options?.offset || 0;
    const limit = options?.limit || 20;
    const total = filtered.length;
    const data = filtered.slice(offset, offset + limit);

    return {
      data,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      hasMore: offset + limit < total,
    };
  }

  async searchDocuments(query: string, options?: QueryOptions): Promise<PaginatedResult<Document>> {
    if (!this.db) throw new Error('Database not initialized');

    const documents = await this.getAllDocuments();
    const lowerQuery = query.toLowerCase();

    // 简单的全文搜索
    const filtered = documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(lowerQuery) ||
        doc.content.toLowerCase().includes(lowerQuery) ||
        doc.metadata.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );

    return this.listDocuments({ ...options, where: { id: filtered.map((d) => d.id) } as any });
  }

  // ==================== 文件操作 ====================

  async uploadFile(file: File | Blob, options: FileUploadOptions): Promise<FileUploadResult> {
    if (!this.db) throw new Error('Database not initialized');

    const id = nanoid();
    const path = `files/${id}/${options.filename}`;

    // 将文件转为ArrayBuffer存储
    const arrayBuffer = await file.arrayBuffer();

    const fileRecord = {
      id,
      path,
      filename: options.filename,
      contentType: options.contentType,
      size: options.size,
      data: arrayBuffer,
      metadata: options.metadata || {},
      uploadedAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_FILES], 'readwrite');
      const store = transaction.objectStore(STORE_FILES);
      const request = store.put(fileRecord);

      request.onsuccess = () => {
        resolve({
          id,
          url: `indexeddb://${path}`,
          path,
          size: options.size,
          uploadedAt: fileRecord.uploadedAt,
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFile(path: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_FILES], 'readwrite');
      const store = transaction.objectStore(STORE_FILES);
      const index = store.index('path');
      const request = index.getKey(path);

      request.onsuccess = () => {
        if (request.result) {
          const deleteRequest = store.delete(request.result);
          deleteRequest.onsuccess = () => resolve(true);
          deleteRequest.onerror = () => reject(deleteRequest.error);
        } else {
          resolve(false);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getFileUrl(path: string): Promise<string> {
    // 本地存储返回IndexedDB协议URL
    return `indexeddb://${path}`;
  }

  // ==================== 版本控制 ====================

  async getDocumentVersions(documentId: string, limit = 10): Promise<Document[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_VERSIONS], 'readonly');
      const store = transaction.objectStore(STORE_VERSIONS);
      const index = store.index('documentId');
      const request = index.getAll(documentId, limit);

      request.onsuccess = () => {
        const versions = request.result || [];
        resolve(versions.map((v: any) => v.document));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async restoreVersion(documentId: string, versionId: string): Promise<Document> {
    if (!this.db) throw new Error('Database not initialized');

    const version = await this.getVersion(versionId);
    if (!version || version.documentId !== documentId) {
      throw new Error('Version not found');
    }

    const restored = {
      ...version.document,
      id: documentId,
      updatedAt: new Date(),
    };

    await this.putDocument(restored);
    this.emit({ type: 'document:updated', document: restored });

    return restored;
  }

  // ==================== 同步功能 ====================

  async sync(): Promise<SyncStatus> {
    // 本地存储不需要同步
    return {
      isSyncing: false,
      lastSyncedAt: new Date(),
      pendingCount: 0,
    };
  }

  async getSyncStatus(): Promise<SyncStatus> {
    return {
      isSyncing: false,
      lastSyncedAt: new Date(),
      pendingCount: 0,
    };
  }

  async clearCache(): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [STORE_DOCUMENTS, STORE_FILES, STORE_VERSIONS],
        'readwrite'
      );

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);

      transaction.objectStore(STORE_DOCUMENTS).clear();
      transaction.objectStore(STORE_FILES).clear();
      transaction.objectStore(STORE_VERSIONS).clear();
    });
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

  private async putDocument(document: Document): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_DOCUMENTS], 'readwrite');
      const store = transaction.objectStore(STORE_DOCUMENTS);
      const request = store.put(document);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getAllDocuments(): Promise<Document[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_DOCUMENTS], 'readonly');
      const store = transaction.objectStore(STORE_DOCUMENTS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async saveVersion(document: Document): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_VERSIONS], 'readwrite');
      const store = transaction.objectStore(STORE_VERSIONS);

      const versionRecord = {
        id: nanoid(),
        documentId: document.id,
        document,
        createdAt: new Date(),
      };

      const request = store.put(versionRecord);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getVersion(versionId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_VERSIONS], 'readonly');
      const store = transaction.objectStore(STORE_VERSIONS);
      const request = store.get(versionId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
}
