/**
 * Project Storage Service
 *
 * 项目/文档本地存储服务
 * - localStorage 持久化
 * - 完整的 CRUD 操作
 * - 自动保存支持
 */

import type { ChatMessage } from '@/types';

/**
 * 知识源类型
 */
export interface KnowledgeSource {
  id: string;
  name: string;
  type: 'file' | 'text' | 'url';
  content: string;
  enabled: boolean;
  size?: number;
  createdAt: Date;
}

/**
 * 项目接口
 */
export interface Project {
  /** 项目 ID */
  id: string;
  /** 项目标题 */
  title: string;
  /** 文档内容 (HTML/Markdown) */
  content: string;
  /** 知识库源列表 */
  sources: KnowledgeSource[];
  /** 聊天历史 */
  chatHistory: ChatMessage[];
  /** 最后保存时间 */
  lastSaved: Date;
  /** 创建时间 */
  createdAt: Date;
  /** 预览文本 */
  preview?: string;
  /** 是否收藏 */
  starred?: boolean;
  /** 标签 */
  tags?: string[];
}

/**
 * 项目列表项 (轻量级)
 */
export interface ProjectListItem {
  id: string;
  title: string;
  preview?: string;
  lastSaved: Date;
  createdAt: Date;
  starred?: boolean;
  tags?: string[];
}

// 存储键名
const STORAGE_KEYS = {
  PROJECTS_LIST: 'documind_projects_list',
  PROJECT_PREFIX: 'documind_project_',
  CURRENT_PROJECT: 'documind_current_project',
} as const;

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 安全解析 JSON
 */
function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * 检查是否在浏览器环境
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * 加载所有项目列表
 */
export function loadProjects(): ProjectListItem[] {
  if (!isBrowser()) return [];

  const stored = localStorage.getItem(STORAGE_KEYS.PROJECTS_LIST);
  const projects = safeJsonParse<ProjectListItem[]>(stored, []);

  // 转换日期字符串为 Date 对象
  return projects.map((p) => ({
    ...p,
    lastSaved: new Date(p.lastSaved),
    createdAt: new Date(p.createdAt),
  }));
}

/**
 * 加载单个项目完整数据
 */
export function loadProject(id: string): Project | null {
  if (!isBrowser()) return null;

  const stored = localStorage.getItem(`${STORAGE_KEYS.PROJECT_PREFIX}${id}`);
  if (!stored) return null;

  const project = safeJsonParse<Project | null>(stored, null);
  if (!project) return null;

  // 转换日期
  return {
    ...project,
    lastSaved: new Date(project.lastSaved),
    createdAt: new Date(project.createdAt),
    sources: project.sources.map((s) => ({
      ...s,
      createdAt: new Date(s.createdAt),
    })),
    chatHistory: project.chatHistory.map((m) => {
      const message = {
        ...m,
        createdAt: new Date(m.createdAt),
      };
      // 只有存在 updatedAt 时才添加（避免 exactOptionalPropertyTypes 问题）
      if (m.updatedAt) {
        return { ...message, updatedAt: new Date(m.updatedAt) };
      }
      return message;
    }),
  };
}

/**
 * 保存项目
 */
export function saveProject(project: Project): void {
  if (!isBrowser()) return;

  const projectWithTime: Project = {
    ...project,
    lastSaved: new Date(),
    preview: extractPreview(project.content),
  };

  // 保存完整项目数据
  localStorage.setItem(
    `${STORAGE_KEYS.PROJECT_PREFIX}${project.id}`,
    JSON.stringify(projectWithTime)
  );

  // 更新项目列表
  const projects = loadProjects();
  const listItem: ProjectListItem = {
    id: projectWithTime.id,
    title: projectWithTime.title,
    lastSaved: projectWithTime.lastSaved,
    createdAt: projectWithTime.createdAt,
    // 只有存在时才添加可选属性（避免 exactOptionalPropertyTypes 问题）
    ...(projectWithTime.preview && { preview: projectWithTime.preview }),
    ...(projectWithTime.starred !== undefined && { starred: projectWithTime.starred }),
    ...(projectWithTime.tags && projectWithTime.tags.length > 0 && { tags: projectWithTime.tags }),
  };

  const existingIndex = projects.findIndex((p) => p.id === project.id);
  if (existingIndex >= 0) {
    projects[existingIndex] = listItem;
  } else {
    projects.unshift(listItem);
  }

  localStorage.setItem(STORAGE_KEYS.PROJECTS_LIST, JSON.stringify(projects));
}

/**
 * 从内容提取预览文本
 */
function extractPreview(content: string): string {
  // 移除 HTML 标签
  const textContent = content.replace(/<[^>]*>/g, ' ').trim();
  // 截取前 100 字符
  return textContent.slice(0, 100) + (textContent.length > 100 ? '...' : '');
}

/**
 * 创建新项目
 */
export function createNewProject(title?: string): Project {
  const now = new Date();
  return {
    id: generateId(),
    title: title || '未命名文档',
    content: '',
    sources: [],
    chatHistory: [],
    lastSaved: now,
    createdAt: now,
    preview: '',
    starred: false,
    tags: [],
  };
}

/**
 * 重命名项目
 */
export function renameProject(id: string, newTitle: string): boolean {
  if (!isBrowser()) return false;

  const project = loadProject(id);
  if (!project) return false;

  project.title = newTitle;
  saveProject(project);
  return true;
}

/**
 * 删除项目
 */
export function deleteProject(id: string): boolean {
  if (!isBrowser()) return false;

  // 删除项目数据
  localStorage.removeItem(`${STORAGE_KEYS.PROJECT_PREFIX}${id}`);

  // 从列表中移除
  const projects = loadProjects();
  const filtered = projects.filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.PROJECTS_LIST, JSON.stringify(filtered));

  // 如果是当前项目，清除当前项目 ID
  const currentId = getCurrentProjectId();
  if (currentId === id) {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_PROJECT);
  }

  return true;
}

/**
 * 切换收藏状态
 */
export function toggleStarred(id: string): boolean {
  if (!isBrowser()) return false;

  const project = loadProject(id);
  if (!project) return false;

  project.starred = !project.starred;
  saveProject(project);
  return project.starred;
}

/**
 * 更新项目标签
 */
export function updateProjectTags(id: string, tags: string[]): boolean {
  if (!isBrowser()) return false;

  const project = loadProject(id);
  if (!project) return false;

  project.tags = tags;
  saveProject(project);
  return true;
}

/**
 * 复制项目
 */
export function duplicateProject(id: string): Project | null {
  if (!isBrowser()) return null;

  const original = loadProject(id);
  if (!original) return null;

  const duplicate = createNewProject(`${original.title} (副本)`);
  duplicate.content = original.content;
  duplicate.sources = original.sources.map((s) => ({
    ...s,
    id: `ks_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
  }));
  if (original.tags && original.tags.length > 0) {
    duplicate.tags = [...original.tags];
  }

  saveProject(duplicate);
  return duplicate;
}

/**
 * 获取当前项目 ID
 */
export function getCurrentProjectId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(STORAGE_KEYS.CURRENT_PROJECT);
}

/**
 * 设置当前项目 ID
 */
export function setCurrentProjectId(id: string | null): void {
  if (!isBrowser()) return;
  if (id) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT, id);
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_PROJECT);
  }
}

/**
 * 导出项目为 JSON
 */
export function exportProject(id: string): string | null {
  const project = loadProject(id);
  if (!project) return null;
  return JSON.stringify(project, null, 2);
}

/**
 * 导入项目从 JSON
 */
export function importProject(jsonData: string): Project | null {
  try {
    const imported = JSON.parse(jsonData) as Project;

    // 验证必要字段
    if (!imported.title || typeof imported.content !== 'string') {
      return null;
    }

    // 创建新项目并复制数据
    const project = createNewProject(imported.title);
    project.content = imported.content;
    project.sources = imported.sources || [];
    project.tags = imported.tags || [];

    saveProject(project);
    return project;
  } catch {
    return null;
  }
}

/**
 * 搜索项目
 */
export function searchProjects(query: string): ProjectListItem[] {
  if (!query.trim()) return loadProjects();

  const projects = loadProjects();
  const lowerQuery = query.toLowerCase();

  return projects.filter(
    (p) =>
      p.title.toLowerCase().includes(lowerQuery) ||
      p.preview?.toLowerCase().includes(lowerQuery) ||
      p.tags?.some((t) => t.toLowerCase().includes(lowerQuery))
  );
}

/**
 * 按日期排序项目
 */
export function sortProjectsByDate(
  order: 'asc' | 'desc' = 'desc'
): ProjectListItem[] {
  const projects = loadProjects();
  return projects.sort((a, b) => {
    const diff = a.lastSaved.getTime() - b.lastSaved.getTime();
    return order === 'desc' ? -diff : diff;
  });
}

/**
 * 获取收藏的项目
 */
export function getStarredProjects(): ProjectListItem[] {
  return loadProjects().filter((p) => p.starred);
}

/**
 * 获取最近访问的项目
 */
export function getRecentProjects(limit: number = 5): ProjectListItem[] {
  return sortProjectsByDate('desc').slice(0, limit);
}

/**
 * 清除所有项目数据 (危险操作)
 */
export function clearAllProjects(): void {
  if (!isBrowser()) return;

  const projects = loadProjects();
  for (const p of projects) {
    localStorage.removeItem(`${STORAGE_KEYS.PROJECT_PREFIX}${p.id}`);
  }
  localStorage.removeItem(STORAGE_KEYS.PROJECTS_LIST);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_PROJECT);
}

/**
 * 获取存储使用统计
 */
export function getStorageStats(): {
  projectCount: number;
  totalSize: number;
  averageSize: number;
} {
  const projects = loadProjects();
  let totalSize = 0;

  for (const p of projects) {
    const stored = localStorage.getItem(`${STORAGE_KEYS.PROJECT_PREFIX}${p.id}`);
    if (stored) {
      totalSize += new Blob([stored]).size;
    }
  }

  return {
    projectCount: projects.length,
    totalSize,
    averageSize: projects.length > 0 ? Math.round(totalSize / projects.length) : 0,
  };
}
