/**
 * useProject Hook
 *
 * 项目管理 React Hook
 * - 项目列表管理
 * - 当前项目状态
 * - 自动保存
 * - 项目切换
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatMessage } from '@/types';
import {
  type Project,
  type ProjectListItem,
  type KnowledgeSource,
  loadProjects,
  loadProject,
  saveProject,
  createNewProject,
  renameProject as renameProjectService,
  deleteProject as deleteProjectService,
  toggleStarred as toggleStarredService,
  duplicateProject as duplicateProjectService,
  getCurrentProjectId,
  setCurrentProjectId,
  searchProjects,
  getRecentProjects,
  getStarredProjects,
  exportProject,
  importProject,
} from '@/services/storage/project';

/**
 * 自动保存配置
 */
interface AutoSaveConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 保存间隔 (毫秒) */
  interval: number;
}

/**
 * Hook 配置选项
 */
interface UseProjectOptions {
  /** 自动保存配置 */
  autoSave?: AutoSaveConfig;
  /** 自动加载上次项目 */
  autoLoadLast?: boolean;
}

/**
 * Hook 返回值类型
 */
interface UseProjectReturn {
  // 项目列表
  projects: ProjectListItem[];
  recentProjects: ProjectListItem[];
  starredProjects: ProjectListItem[];

  // 当前项目
  currentProject: Project | null;
  currentProjectId: string | null;
  isLoading: boolean;
  hasUnsavedChanges: boolean;

  // 项目操作
  createProject: (title?: string) => Project;
  loadProjectById: (id: string) => boolean;
  saveCurrentProject: () => void;
  renameProject: (id: string, newTitle: string) => boolean;
  deleteProject: (id: string) => boolean;
  duplicateProject: (id: string) => Project | null;
  toggleStarred: (id: string) => boolean;

  // 内容操作
  updateContent: (content: string) => void;
  updateTitle: (title: string) => void;
  updateSources: (sources: KnowledgeSource[]) => void;
  updateChatHistory: (messages: ChatMessage[]) => void;
  addChatMessage: (message: ChatMessage) => void;

  // 知识库操作
  addSource: (source: KnowledgeSource) => void;
  removeSource: (id: string) => void;
  toggleSource: (id: string) => void;

  // 搜索和筛选
  searchProjects: (query: string) => ProjectListItem[];

  // 导入导出
  exportCurrentProject: () => string | null;
  importProjectFromJson: (json: string) => Project | null;

  // 刷新列表
  refreshProjects: () => void;
}

/**
 * 默认自动保存配置
 */
const DEFAULT_AUTO_SAVE: AutoSaveConfig = {
  enabled: true,
  interval: 30000, // 30秒
};

/**
 * useProject Hook
 */
export function useProject(options: UseProjectOptions = {}): UseProjectReturn {
  const { autoSave = DEFAULT_AUTO_SAVE, autoLoadLast = true } = options;

  // 状态
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Refs
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');

  /**
   * 刷新项目列表
   */
  const refreshProjects = useCallback(() => {
    const allProjects = loadProjects();
    setProjects(allProjects);
  }, []);

  /**
   * 初始化加载
   */
  useEffect(() => {
    setIsLoading(true);

    // 加载项目列表
    refreshProjects();

    // 尝试加载上次打开的项目
    if (autoLoadLast) {
      const lastId = getCurrentProjectId();
      if (lastId) {
        const project = loadProject(lastId);
        if (project) {
          setCurrentProject(project);
          lastSavedContentRef.current = project.content;
        }
      }
    }

    setIsLoading(false);
  }, [autoLoadLast, refreshProjects]);

  /**
   * 自动保存逻辑
   */
  useEffect(() => {
    if (!autoSave.enabled || !currentProject) {
      return;
    }

    // 清除之前的定时器
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    // 设置新的定时器
    autoSaveTimerRef.current = setInterval(() => {
      if (hasUnsavedChanges && currentProject) {
        saveProject(currentProject);
        setHasUnsavedChanges(false);
        lastSavedContentRef.current = currentProject.content;
        refreshProjects();
      }
    }, autoSave.interval);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [autoSave.enabled, autoSave.interval, currentProject, hasUnsavedChanges, refreshProjects]);

  /**
   * 页面卸载前保存
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasUnsavedChanges && currentProject) {
        saveProject(currentProject);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, currentProject]);

  /**
   * 创建新项目
   */
  const createProject = useCallback((title?: string): Project => {
    const project = createNewProject(title);
    saveProject(project);
    setCurrentProject(project);
    setCurrentProjectId(project.id);
    setHasUnsavedChanges(false);
    lastSavedContentRef.current = project.content;
    refreshProjects();
    return project;
  }, [refreshProjects]);

  /**
   * 通过 ID 加载项目
   */
  const loadProjectById = useCallback((id: string): boolean => {
    const project = loadProject(id);
    if (!project) return false;

    // 保存当前项目的未保存更改
    if (hasUnsavedChanges && currentProject) {
      saveProject(currentProject);
    }

    setCurrentProject(project);
    setCurrentProjectId(id);
    setHasUnsavedChanges(false);
    lastSavedContentRef.current = project.content;
    return true;
  }, [currentProject, hasUnsavedChanges]);

  /**
   * 保存当前项目
   */
  const saveCurrentProject = useCallback(() => {
    if (!currentProject) return;

    saveProject(currentProject);
    setHasUnsavedChanges(false);
    lastSavedContentRef.current = currentProject.content;
    refreshProjects();
  }, [currentProject, refreshProjects]);

  /**
   * 重命名项目
   */
  const handleRenameProject = useCallback((id: string, newTitle: string): boolean => {
    const result = renameProjectService(id, newTitle);
    if (result) {
      refreshProjects();
      // 如果重命名的是当前项目，更新状态
      if (currentProject && currentProject.id === id) {
        setCurrentProject((prev) => prev ? { ...prev, title: newTitle } : null);
      }
    }
    return result;
  }, [currentProject, refreshProjects]);

  /**
   * 删除项目
   */
  const handleDeleteProject = useCallback((id: string): boolean => {
    const result = deleteProjectService(id);
    if (result) {
      refreshProjects();
      // 如果删除的是当前项目，清除当前状态
      if (currentProject && currentProject.id === id) {
        setCurrentProject(null);
        setCurrentProjectId(null);
        setHasUnsavedChanges(false);
      }
    }
    return result;
  }, [currentProject, refreshProjects]);

  /**
   * 复制项目
   */
  const handleDuplicateProject = useCallback((id: string): Project | null => {
    const duplicate = duplicateProjectService(id);
    if (duplicate) {
      refreshProjects();
    }
    return duplicate;
  }, [refreshProjects]);

  /**
   * 切换收藏状态
   */
  const handleToggleStarred = useCallback((id: string): boolean => {
    const newState = toggleStarredService(id);
    refreshProjects();
    if (currentProject && currentProject.id === id) {
      setCurrentProject((prev) => prev ? { ...prev, starred: newState } : null);
    }
    return newState;
  }, [currentProject, refreshProjects]);

  /**
   * 更新内容
   */
  const updateContent = useCallback((content: string) => {
    if (!currentProject) return;

    setCurrentProject((prev) => prev ? { ...prev, content } : null);
    setHasUnsavedChanges(content !== lastSavedContentRef.current);
  }, [currentProject]);

  /**
   * 更新标题
   */
  const updateTitle = useCallback((title: string) => {
    if (!currentProject) return;

    setCurrentProject((prev) => prev ? { ...prev, title } : null);
    setHasUnsavedChanges(true);
  }, [currentProject]);

  /**
   * 更新知识源
   */
  const updateSources = useCallback((sources: KnowledgeSource[]) => {
    if (!currentProject) return;

    setCurrentProject((prev) => prev ? { ...prev, sources } : null);
    setHasUnsavedChanges(true);
  }, [currentProject]);

  /**
   * 更新聊天历史
   */
  const updateChatHistory = useCallback((messages: ChatMessage[]) => {
    if (!currentProject) return;

    setCurrentProject((prev) => prev ? { ...prev, chatHistory: messages } : null);
    setHasUnsavedChanges(true);
  }, [currentProject]);

  /**
   * 添加聊天消息
   */
  const addChatMessage = useCallback((message: ChatMessage) => {
    if (!currentProject) return;

    setCurrentProject((prev) =>
      prev ? { ...prev, chatHistory: [...prev.chatHistory, message] } : null
    );
    setHasUnsavedChanges(true);
  }, [currentProject]);

  /**
   * 添加知识源
   */
  const addSource = useCallback((source: KnowledgeSource) => {
    if (!currentProject) return;

    setCurrentProject((prev) =>
      prev ? { ...prev, sources: [...prev.sources, source] } : null
    );
    setHasUnsavedChanges(true);
  }, [currentProject]);

  /**
   * 移除知识源
   */
  const removeSource = useCallback((id: string) => {
    if (!currentProject) return;

    setCurrentProject((prev) =>
      prev ? { ...prev, sources: prev.sources.filter((s) => s.id !== id) } : null
    );
    setHasUnsavedChanges(true);
  }, [currentProject]);

  /**
   * 切换知识源启用状态
   */
  const toggleSource = useCallback((id: string) => {
    if (!currentProject) return;

    setCurrentProject((prev) =>
      prev
        ? {
            ...prev,
            sources: prev.sources.map((s) =>
              s.id === id ? { ...s, enabled: !s.enabled } : s
            ),
          }
        : null
    );
    setHasUnsavedChanges(true);
  }, [currentProject]);

  /**
   * 搜索项目
   */
  const handleSearchProjects = useCallback((query: string): ProjectListItem[] => {
    return searchProjects(query);
  }, []);

  /**
   * 导出当前项目
   */
  const exportCurrentProject = useCallback((): string | null => {
    if (!currentProject) return null;
    return exportProject(currentProject.id);
  }, [currentProject]);

  /**
   * 导入项目
   */
  const importProjectFromJson = useCallback((json: string): Project | null => {
    const imported = importProject(json);
    if (imported) {
      refreshProjects();
    }
    return imported;
  }, [refreshProjects]);

  // 计算派生状态
  const recentProjects = getRecentProjects(5);
  const starredProjects = getStarredProjects();

  return {
    // 项目列表
    projects,
    recentProjects,
    starredProjects,

    // 当前项目
    currentProject,
    currentProjectId: currentProject?.id || null,
    isLoading,
    hasUnsavedChanges,

    // 项目操作
    createProject,
    loadProjectById,
    saveCurrentProject,
    renameProject: handleRenameProject,
    deleteProject: handleDeleteProject,
    duplicateProject: handleDuplicateProject,
    toggleStarred: handleToggleStarred,

    // 内容操作
    updateContent,
    updateTitle,
    updateSources,
    updateChatHistory,
    addChatMessage,

    // 知识库操作
    addSource,
    removeSource,
    toggleSource,

    // 搜索和筛选
    searchProjects: handleSearchProjects,

    // 导入导出
    exportCurrentProject,
    importProjectFromJson,

    // 刷新列表
    refreshProjects,
  };
}

export default useProject;
