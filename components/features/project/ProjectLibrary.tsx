/**
 * ProjectLibrary - 项目库弹窗组件
 *
 * 功能：
 * - 网格布局显示所有项目
 * - 项目卡片：图标、标题、时间
 * - 操作菜单：重命名、导出、复制、删除
 * - 删除确认对话框
 * - 搜索过滤
 * - 收藏筛选
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import type { ProjectListItem } from '@/services/storage/project';

/**
 * 组件属性
 */
interface ProjectLibraryProps {
  /** 是否显示 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 项目列表 */
  projects: ProjectListItem[];
  /** 当前项目 ID */
  currentProjectId: string | null;
  /** 选择项目回调 */
  onSelectProject: (id: string) => void;
  /** 创建新项目回调 */
  onCreateProject: () => void;
  /** 重命名项目回调 */
  onRenameProject: (id: string, newTitle: string) => void;
  /** 删除项目回调 */
  onDeleteProject: (id: string) => void;
  /** 复制项目回调 */
  onDuplicateProject: (id: string) => void;
  /** 切换收藏回调 */
  onToggleStarred: (id: string) => void;
  /** 导出项目回调 */
  onExportProject: (id: string) => void;
}

/**
 * 格式化日期
 */
function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes <= 1 ? '刚刚' : `${minutes}分钟前`;
    }
    return `${hours}小时前`;
  }
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  if (days < 30) return `${Math.floor(days / 7)}周前`;

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * 项目卡片组件
 */
interface ProjectCardProps {
  project: ProjectListItem;
  isActive: boolean;
  onSelect: () => void;
  onRename: (newTitle: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleStarred: () => void;
  onExport: () => void;
}

function ProjectCard({
  project,
  isActive,
  onSelect,
  onRename,
  onDelete,
  onDuplicate,
  onToggleStarred,
  onExport,
}: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(project.title);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // 自动聚焦重命名输入框
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue !== project.title) {
      onRename(renameValue.trim());
    } else {
      setRenameValue(project.title);
    }
    setIsRenaming(false);
  };

  const handleMenuAction = (action: () => void) => {
    action();
    setShowMenu(false);
  };

  return (
    <div
      className={`relative group p-4 rounded-xl border-2 transition-all cursor-pointer ${
        isActive
          ? 'border-orange-400 bg-orange-50 shadow-lg'
          : 'border-bronze-200 bg-white hover:border-bronze-300 hover:shadow-md'
      }`}
      onClick={onSelect}
    >
      {/* 收藏图标 */}
      {project.starred && (
        <div className="absolute top-2 left-2">
          <i className="fas fa-star text-amber-400 text-sm" />
        </div>
      )}

      {/* 更多操作按钮 */}
      <div
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="p-1.5 rounded-lg hover:bg-bronze-100 text-bronze-500 hover:text-bronze-700"
          onClick={() => setShowMenu(!showMenu)}
        >
          <i className="fas fa-ellipsis-v" />
        </button>

        {/* 下拉菜单 */}
        {showMenu && (
          <div
            ref={menuRef}
            className="absolute right-0 top-8 w-40 bg-white rounded-lg shadow-xl border border-bronze-200 py-1 z-50"
          >
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-bronze-50 flex items-center gap-2 text-bronze-700"
              onClick={() => {
                setIsRenaming(true);
                setShowMenu(false);
              }}
            >
              <i className="fas fa-edit w-4" />
              重命名
            </button>
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-bronze-50 flex items-center gap-2 text-bronze-700"
              onClick={() => handleMenuAction(onToggleStarred)}
            >
              <i className={`fas ${project.starred ? 'fa-star-half-alt' : 'fa-star'} w-4`} />
              {project.starred ? '取消收藏' : '收藏'}
            </button>
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-bronze-50 flex items-center gap-2 text-bronze-700"
              onClick={() => handleMenuAction(onDuplicate)}
            >
              <i className="fas fa-copy w-4" />
              复制
            </button>
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-bronze-50 flex items-center gap-2 text-bronze-700"
              onClick={() => handleMenuAction(onExport)}
            >
              <i className="fas fa-download w-4" />
              导出
            </button>
            <hr className="my-1 border-bronze-100" />
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
              onClick={() => handleMenuAction(onDelete)}
            >
              <i className="fas fa-trash-alt w-4" />
              删除
            </button>
          </div>
        )}
      </div>

      {/* 文档图标 */}
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-bronze-100 to-bronze-200 flex items-center justify-center mb-3">
        <i className="fas fa-file-alt text-xl text-bronze-500" />
      </div>

      {/* 标题 */}
      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit();
            if (e.key === 'Escape') {
              setRenameValue(project.title);
              setIsRenaming(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full font-medium text-bronze-800 bg-white border border-orange-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      ) : (
        <h3 className="font-medium text-bronze-800 truncate mb-1">{project.title}</h3>
      )}

      {/* 预览文本 */}
      {project.preview && (
        <p className="text-xs text-bronze-500 line-clamp-2 mb-2">{project.preview}</p>
      )}

      {/* 更新时间 */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-bronze-400">
          <i className="far fa-clock mr-1" />
          {formatDate(project.lastSaved)}
        </span>
        {project.tags && project.tags.length > 0 && (
          <div className="flex gap-1">
            {project.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0.5 bg-bronze-100 text-bronze-600 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 删除确认对话框
 */
interface DeleteConfirmDialogProps {
  isOpen: boolean;
  projectTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmDialog({
  isOpen,
  projectTitle,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 animate-in zoom-in-95">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <i className="fas fa-exclamation-triangle text-red-500 text-xl" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-bronze-800">确认删除</h3>
            <p className="text-sm text-bronze-600">
              确定要删除「{projectTitle}」吗？此操作无法撤销。
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            取消
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            className="bg-red-500 hover:bg-red-600"
          >
            <i className="fas fa-trash-alt mr-2" />
            删除
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * 主组件
 */
export function ProjectLibrary({
  isOpen,
  onClose,
  projects,
  currentProjectId,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onDuplicateProject,
  onToggleStarred,
  onExportProject,
}: ProjectLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'starred'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    projectId: string;
    projectTitle: string;
  }>({ isOpen: false, projectId: '', projectTitle: '' });

  // 过滤项目
  const filteredProjects = projects.filter((p) => {
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !p.title.toLowerCase().includes(query) &&
        !p.preview?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    // 收藏过滤
    if (filter === 'starred' && !p.starred) {
      return false;
    }
    return true;
  });

  // 处理选择项目
  const handleSelectProject = useCallback(
    (id: string) => {
      onSelectProject(id);
      onClose();
    },
    [onSelectProject, onClose]
  );

  // 处理创建新项目
  const handleCreateProject = useCallback(() => {
    onCreateProject();
    onClose();
  }, [onCreateProject, onClose]);

  // 处理删除确认
  const handleDeleteClick = useCallback((id: string, title: string) => {
    setDeleteConfirm({ isOpen: true, projectId: id, projectTitle: title });
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    onDeleteProject(deleteConfirm.projectId);
    setDeleteConfirm({ isOpen: false, projectId: '', projectTitle: '' });
  }, [deleteConfirm.projectId, onDeleteProject]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirm({ isOpen: false, projectId: '', projectTitle: '' });
  }, []);

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteConfirm.isOpen) {
          handleDeleteCancel();
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, deleteConfirm.isOpen, onClose, handleDeleteCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div className="relative bg-cream-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] mx-4 flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-bronze-200 bg-white shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-bronze-800 flex items-center gap-2">
              <i className="fas fa-folder-open text-orange-500" />
              项目库
            </h2>
            <button
              className="p-2 hover:bg-bronze-100 rounded-lg text-bronze-500 hover:text-bronze-700 transition-colors"
              onClick={onClose}
            >
              <i className="fas fa-times text-lg" />
            </button>
          </div>

          {/* 搜索和筛选 */}
          <div className="flex items-center gap-4">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-bronze-400" />
              <input
                type="text"
                placeholder="搜索项目..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-bronze-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-cream-50 text-bronze-700"
              />
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bronze-400 hover:text-bronze-600"
                  onClick={() => setSearchQuery('')}
                >
                  <i className="fas fa-times-circle" />
                </button>
              )}
            </div>

            {/* 筛选按钮 */}
            <div className="flex items-center gap-2">
              <Button
                variant={filter === 'all' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                全部
              </Button>
              <Button
                variant={filter === 'starred' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilter('starred')}
              >
                <i className="fas fa-star mr-1" />
                收藏
              </Button>
            </div>

            {/* 新建按钮 */}
            <Button variant="primary" size="sm" onClick={handleCreateProject}>
              <i className="fas fa-plus mr-2" />
              新建项目
            </Button>
          </div>
        </div>

        {/* 项目网格 */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-bronze-400">
              {searchQuery || filter === 'starred' ? (
                <>
                  <i className="fas fa-search text-4xl mb-4 opacity-50" />
                  <p className="text-lg mb-2">没有找到匹配的项目</p>
                  <p className="text-sm">尝试其他搜索词或筛选条件</p>
                </>
              ) : (
                <>
                  <i className="fas fa-folder-open text-4xl mb-4 opacity-50" />
                  <p className="text-lg mb-2">暂无项目</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCreateProject}
                    className="mt-4"
                  >
                    <i className="fas fa-plus mr-2" />
                    创建第一个项目
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isActive={project.id === currentProjectId}
                  onSelect={() => handleSelectProject(project.id)}
                  onRename={(newTitle) => onRenameProject(project.id, newTitle)}
                  onDelete={() => handleDeleteClick(project.id, project.title)}
                  onDuplicate={() => onDuplicateProject(project.id)}
                  onToggleStarred={() => onToggleStarred(project.id)}
                  onExport={() => onExportProject(project.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 底部统计 */}
        <div className="px-6 py-3 border-t border-bronze-200 bg-white shrink-0">
          <div className="flex items-center justify-between text-sm text-bronze-500">
            <span>
              共 {projects.length} 个项目
              {filter === 'starred' &&
                ` · 收藏 ${projects.filter((p) => p.starred).length} 个`}
            </span>
            <span className="text-xs">
              <i className="fas fa-info-circle mr-1" />
              数据存储在本地浏览器中
            </span>
          </div>
        </div>
      </div>

      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        isOpen={deleteConfirm.isOpen}
        projectTitle={deleteConfirm.projectTitle}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}

export default ProjectLibrary;
