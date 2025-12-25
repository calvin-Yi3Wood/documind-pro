/**
 * Storage Hooks
 *
 * React Hooks封装,提供便捷的存储操作接口
 */

import { useCallback, useEffect, useState } from 'react';
import { getStorageProvider } from '@/services/storage';
import type {
  EventEmittingStorageProvider,
  QueryOptions,
  PaginatedResult,
  SyncStatus,
  StorageEvent,
} from '@/services/storage';
import type {
  Document,
  CreateDocumentParams,
  UpdateDocumentParams,
} from '@/types';

/**
 * 存储Provider Hook
 *
 * 自动初始化并返回存储提供商实例
 */
export function useStorage() {
  const [provider, setProvider] = useState<EventEmittingStorageProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    getStorageProvider()
      .then((p) => {
        if (mounted) {
          setProvider(p);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize storage'));
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { provider, loading, error };
}

/**
 * 文档Hook
 *
 * 获取单个文档并自动订阅更新
 */
export function useDocument(id: string | null) {
  const { provider } = useStorage();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 加载文档
  const loadDocument = useCallback(async () => {
    if (!provider || !id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const doc = await provider.getDocument(id);
      setDocument(doc);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load document'));
    } finally {
      setLoading(false);
    }
  }, [provider, id]);

  // 初始加载
  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // 订阅更新事件
  useEffect(() => {
    if (!provider || !id) return;

    const handleEvent = (event: StorageEvent) => {
      if (event.type === 'document:updated' && event.document.id === id) {
        setDocument(event.document);
      } else if (event.type === 'document:deleted' && event.id === id) {
        setDocument(null);
      }
    };

    const unsubscribe = provider.addEventListener(handleEvent);
    return unsubscribe;
  }, [provider, id]);

  return {
    document,
    loading,
    error,
    reload: loadDocument,
  };
}

/**
 * 文档列表Hook
 *
 * 获取文档列表并支持分页、排序
 */
export function useDocuments(options?: QueryOptions) {
  const { provider } = useStorage();
  const [result, setResult] = useState<PaginatedResult<Document>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 20,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 加载文档列表
  const loadDocuments = useCallback(async () => {
    if (!provider) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const docs = await provider.listDocuments(options);
      setResult(docs);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load documents'));
    } finally {
      setLoading(false);
    }
  }, [provider, options]);

  // 初始加载
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // 订阅创建/删除事件
  useEffect(() => {
    if (!provider) return;

    const handleEvent = (event: StorageEvent) => {
      if (event.type === 'document:created') {
        // 重新加载列表
        loadDocuments();
      } else if (event.type === 'document:deleted') {
        // 从列表中移除
        setResult((prev) => ({
          ...prev,
          data: prev.data.filter((doc) => doc.id !== event.id),
          total: prev.total - 1,
        }));
      }
    };

    const unsubscribe = provider.addEventListener(handleEvent);
    return unsubscribe;
  }, [provider, loadDocuments]);

  return {
    documents: result.data,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.hasMore,
    loading,
    error,
    reload: loadDocuments,
  };
}

/**
 * 创建文档Hook
 *
 * 提供创建文档的函数和状态
 */
export function useCreateDocument() {
  const { provider } = useStorage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createDocument = useCallback(
    async (params: CreateDocumentParams): Promise<Document | null> => {
      if (!provider) {
        setError(new Error('Storage provider not initialized'));
        return null;
      }

      try {
        setLoading(true);
        setError(null);
        const doc = await provider.createDocument(params);
        return doc;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create document');
        setError(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [provider]
  );

  return {
    createDocument,
    loading,
    error,
  };
}

/**
 * 更新文档Hook
 *
 * 提供更新文档的函数,支持乐观更新
 */
export function useUpdateDocument() {
  const { provider } = useStorage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateDocument = useCallback(
    async (id: string, params: UpdateDocumentParams): Promise<Document | null> => {
      if (!provider) {
        setError(new Error('Storage provider not initialized'));
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        // 乐观更新会在provider层面通过事件触发
        const doc = await provider.updateDocument(id, params);
        return doc;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update document');
        setError(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [provider]
  );

  return {
    updateDocument,
    loading,
    error,
  };
}

/**
 * 删除文档Hook
 *
 * 提供删除文档的函数,支持乐观更新
 */
export function useDeleteDocument() {
  const { provider } = useStorage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteDocument = useCallback(
    async (id: string): Promise<boolean> => {
      if (!provider) {
        setError(new Error('Storage provider not initialized'));
        return false;
      }

      try {
        setLoading(true);
        setError(null);
        const success = await provider.deleteDocument(id);
        return success;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete document');
        setError(error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [provider]
  );

  return {
    deleteDocument,
    loading,
    error,
  };
}

/**
 * 搜索文档Hook
 *
 * 提供全文搜索功能
 */
export function useSearchDocuments() {
  const { provider } = useStorage();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<PaginatedResult<Document>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 20,
    hasMore: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(
    async (searchQuery: string, options?: QueryOptions) => {
      if (!provider || !searchQuery.trim()) {
        setResult({
          data: [],
          total: 0,
          page: 1,
          pageSize: 20,
          hasMore: false,
        });
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setQuery(searchQuery);
        const docs = await provider.searchDocuments(searchQuery, options);
        setResult(docs);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Search failed'));
      } finally {
        setLoading(false);
      }
    },
    [provider]
  );

  return {
    query,
    documents: result.data,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.hasMore,
    loading,
    error,
    search,
  };
}

/**
 * 上传文件Hook
 *
 * 提供文件上传功能
 */
export function useUploadFile() {
  const { provider } = useStorage();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!provider) {
        setError(new Error('Storage provider not initialized'));
        return null;
      }

      try {
        setLoading(true);
        setProgress(0);
        setError(null);

        // 模拟进度更新(实际可以通过Fetch API的上传进度事件实现)
        const progressInterval = setInterval(() => {
          setProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        const result = await provider.uploadFile(file, {
          filename: file.name,
          contentType: file.type,
          size: file.size,
        });

        clearInterval(progressInterval);
        setProgress(100);

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Upload failed');
        setError(error);
        return null;
      } finally {
        setLoading(false);
        setTimeout(() => setProgress(0), 1000);
      }
    },
    [provider]
  );

  return {
    uploadFile,
    loading,
    progress,
    error,
  };
}

/**
 * 同步状态Hook
 *
 * 获取同步状态并自动更新
 */
export function useSyncStatus() {
  const { provider } = useStorage();
  const [status, setStatus] = useState<SyncStatus>({
    isSyncing: false,
    pendingCount: 0,
  });

  // 加载同步状态
  useEffect(() => {
    if (!provider) return;

    provider.getSyncStatus().then(setStatus);
  }, [provider]);

  // 监听同步事件
  useEffect(() => {
    if (!provider) return;

    const handleEvent = (event: StorageEvent) => {
      if (event.type === 'sync:started') {
        setStatus((prev) => ({ ...prev, isSyncing: true }));
      } else if (event.type === 'sync:completed') {
        setStatus(event.status);
      } else if (event.type === 'sync:failed') {
        setStatus((prev) => ({
          ...prev,
          isSyncing: false,
          syncError: event.error,
        }));
      }
    };

    const unsubscribe = provider.addEventListener(handleEvent);
    return unsubscribe;
  }, [provider]);

  return status;
}

/**
 * 同步操作Hook
 *
 * 提供手动触发同步的函数
 */
export function useSync() {
  const { provider } = useStorage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sync = useCallback(async () => {
    if (!provider) {
      setError(new Error('Storage provider not initialized'));
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      const status = await provider.sync();
      return status;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sync failed');
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [provider]);

  return {
    sync,
    loading,
    error,
  };
}
