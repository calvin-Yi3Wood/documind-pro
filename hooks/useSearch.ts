/**
 * Search Hooks
 *
 * 搜索相关的React Hooks
 */

import { useState, useCallback } from 'react';
import { getSearchClient } from '@/services/search/client';
import type { SearchResponse, SearchOptions } from '@/services/search/types';

/**
 * 搜索Hook
 *
 * 提供搜索功能和状态管理
 */
export function useSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);

  const search = useCallback(async (query: string, options?: SearchOptions) => {
    if (!query.trim()) {
      setResult(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const client = getSearchClient();
      const data = await client.search(query, options);

      setResult(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Search failed');
      setError(error);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    search,
    clear,
    loading,
    error,
    result,
    results: result?.results || [],
    provider: result?.provider,
    cached: result?.cached,
  };
}
