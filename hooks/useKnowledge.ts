/**
 * useKnowledge - 知识库管理 Hook
 *
 * 提供知识库的增删改查功能
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  knowledgeService,
  type KnowledgeSource,
} from '@/services/knowledge';

interface UseKnowledgeReturn {
  sources: KnowledgeSource[];
  loading: boolean;
  error: string | null;
  addSource: (file: File) => Promise<void>;
  addTextSource: (name: string, content: string) => Promise<void>;
  removeSource: (id: string) => Promise<void>;
  toggleSource: (id: string) => Promise<void>;
  getEnabledContent: () => Promise<string>;
  refresh: () => Promise<void>;
}

export function useKnowledge(): UseKnowledgeReturn {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载知识源
  const loadSources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await knowledgeService.init();
      const data = await knowledgeService.getSources();
      setSources(data);
    } catch (err) {
      console.error('Failed to load knowledge sources:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sources');
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadSources();
  }, [loadSources]);

  // 添加文件源
  const addSource = useCallback(async (file: File) => {
    try {
      setError(null);
      const newSource = await knowledgeService.addFileSource(file);
      setSources((prev) => [...prev, newSource]);
    } catch (err) {
      console.error('Failed to add source:', err);
      setError(err instanceof Error ? err.message : 'Failed to add source');
      throw err;
    }
  }, []);

  // 添加文本源
  const addTextSource = useCallback(async (name: string, content: string) => {
    try {
      setError(null);
      const newSource = await knowledgeService.addSource(name, 'text', content);
      setSources((prev) => [...prev, newSource]);
    } catch (err) {
      console.error('Failed to add text source:', err);
      setError(err instanceof Error ? err.message : 'Failed to add text source');
      throw err;
    }
  }, []);

  // 删除源
  const removeSource = useCallback(async (id: string) => {
    try {
      setError(null);
      await knowledgeService.removeSource(id);
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to remove source:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove source');
      throw err;
    }
  }, []);

  // 切换启用状态
  const toggleSource = useCallback(async (id: string) => {
    try {
      setError(null);
      const updated = await knowledgeService.toggleSource(id);
      if (updated) {
        setSources((prev) =>
          prev.map((s) => (s.id === id ? updated : s))
        );
      }
    } catch (err) {
      console.error('Failed to toggle source:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle source');
      throw err;
    }
  }, []);

  // 获取启用的内容
  const getEnabledContent = useCallback(async () => {
    return knowledgeService.getEnabledContent();
  }, []);

  return {
    sources,
    loading,
    error,
    addSource,
    addTextSource,
    removeSource,
    toggleSource,
    getEnabledContent,
    refresh: loadSources,
  };
}

export default useKnowledge;
