/**
 * Dashboard 主页面 - 三栏布局
 *
 * 左侧: 导航 & 文档列表
 * 中间: 编辑器主区域
 * 右侧: AI 助手 & 知识库
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import dynamic from 'next/dynamic';
import { useProject } from '@/hooks/useProject';
import { exportProject } from '@/services/storage/project';
import type { KnowledgeSource } from '@/services/storage/project';

// 动态导入组件避免 SSR 问题
const Editor = dynamic(
  () => import('@/components/features/editor/Editor'),
  { ssr: false, loading: () => <EditorSkeleton /> }
);

const FloatingAgent = dynamic(
  () => import('@/components/features/ai-assistant/FloatingAgent'),
  { ssr: false }
);

const KnowledgeBase = dynamic(
  () => import('@/components/features/knowledge/KnowledgeBase'),
  { ssr: false }
);

const ProjectLibrary = dynamic(
  () => import('@/components/features/project/ProjectLibrary'),
  { ssr: false }
);

/**
 * 编辑器加载骨架屏
 */
function EditorSkeleton() {
  return (
    <div className="h-full flex items-center justify-center bg-cream-50">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
          <i className="fas fa-spinner fa-spin text-orange-500 text-xl" />
        </div>
        <p className="text-bronze-500">正在加载编辑器...</p>
      </div>
    </div>
  );
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

  return date.toLocaleDateString('zh-CN');
}

export default function DashboardPage() {
  // 项目管理 Hook
  const {
    projects,
    recentProjects,
    currentProject,
    currentProjectId,
    hasUnsavedChanges,
    isLoading,
    createProject,
    loadProjectById,
    saveCurrentProject,
    renameProject,
    deleteProject,
    duplicateProject,
    toggleStarred,
    updateContent,
    updateTitle,
    addSource,
    removeSource,
    toggleSource,
    refreshProjects,
  } = useProject({
    autoSave: { enabled: true, interval: 30000 },
    autoLoadLast: true,
  });

  // 布局状态
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [projectLibraryOpen, setProjectLibraryOpen] = useState(false);

  // 编辑器内容 - 与项目同步
  const editorContent = currentProject?.content || '';
  const documentTitle = currentProject?.title || '未命名文档';
  const knowledgeSources = currentProject?.sources || [];

  // 处理内容变化
  const handleContentChange = useCallback(
    (content: string) => {
      updateContent(content);
    },
    [updateContent]
  );

  // 处理标题变化
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateTitle(e.target.value);
    },
    [updateTitle]
  );

  // 保存文档
  const handleSave = useCallback(() => {
    saveCurrentProject();
  }, [saveCurrentProject]);

  // 新建文档
  const handleCreateNew = useCallback(() => {
    createProject();
  }, [createProject]);

  // 切换项目
  const handleSwitchProject = useCallback(
    (id: string) => {
      loadProjectById(id);
    },
    [loadProjectById]
  );

  // 知识库操作
  const handleAddSource = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        const newSource: KnowledgeSource = {
          id: `ks_${Date.now()}`,
          name: file.name,
          type: 'file',
          content,
          enabled: true,
          size: file.size,
          createdAt: new Date(),
        };
        addSource(newSource);
      };
      reader.readAsText(file);
    },
    [addSource]
  );

  // 导出项目
  const handleExportProject = useCallback((id: string) => {
    const jsonData = exportProject(id);
    if (jsonData) {
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project_${id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, []);

  // 插入文本到编辑器
  const handleInsertText = useCallback(
    (content: string) => {
      updateContent(editorContent + '\n\n' + content);
    },
    [editorContent, updateContent]
  );

  // 计算布局宽度
  const leftWidth = leftPanelOpen ? 280 : 0;
  const rightWidth = rightPanelOpen ? 360 : 0;
  const knowledgeWidth = knowledgeOpen ? 320 : 0;

  // 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl/Cmd + N 新建
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleCreateNew();
      }
      // Ctrl/Cmd + O 打开项目库
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        setProjectLibraryOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSave, handleCreateNew]);

  // 自动创建项目如果没有
  useEffect(() => {
    if (!isLoading && !currentProject && projects.length === 0) {
      createProject();
    }
  }, [isLoading, currentProject, projects.length, createProject]);

  // 排序后的最近项目
  const sortedRecentProjects = useMemo(() => {
    return [...recentProjects].sort(
      (a, b) => b.lastSaved.getTime() - a.lastSaved.getTime()
    );
  }, [recentProjects]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-cream-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <i className="fas fa-spinner fa-spin text-white text-2xl" />
          </div>
          <p className="text-bronze-600 font-medium">正在加载项目...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-cream-50 overflow-hidden">
      {/* 顶部导航栏 */}
      <header className="h-14 bg-white border-b border-bronze-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <span className="font-bold text-bronze-800 hidden md:block">DocuFusion</span>
          </div>

          {/* 项目库按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setProjectLibraryOpen(true)}
            title="项目库 (Ctrl+O)"
          >
            <i className="fas fa-folder-open mr-2" />
            <span className="hidden md:inline">项目库</span>
          </Button>

          {/* 左侧面板切换 */}
          <Button
            variant={leftPanelOpen ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            title="最近文档"
          >
            <i className="fas fa-list" />
          </Button>

          {/* 文档标题 */}
          <div className="hidden md:flex items-center gap-2 ml-4">
            <input
              type="text"
              value={documentTitle}
              onChange={handleTitleChange}
              className="bg-transparent border-none text-bronze-700 font-medium focus:outline-none focus:ring-2 focus:ring-orange-400 rounded px-2 py-1"
              placeholder="文档标题"
            />
            {hasUnsavedChanges ? (
              <span className="text-xs text-orange-500 flex items-center gap-1">
                <i className="fas fa-circle text-[6px]" />
                未保存
              </span>
            ) : currentProjectId ? (
              <span className="text-xs text-bronze-400">已保存</span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 保存按钮 */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            title="保存 (Ctrl+S)"
          >
            <i className="fas fa-save mr-2" />
            保存
          </Button>

          {/* 新建按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCreateNew}
            title="新建文档 (Ctrl+N)"
          >
            <i className="fas fa-plus" />
          </Button>

          {/* 知识库按钮 */}
          <Button
            variant={knowledgeOpen ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setKnowledgeOpen(!knowledgeOpen)}
          >
            <i className="fas fa-book mr-2" />
            知识库
            {knowledgeSources.length > 0 && (
              <span className="ml-1 bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-xs">
                {knowledgeSources.length}
              </span>
            )}
          </Button>

          {/* AI 助手按钮 */}
          <Button
            variant={rightPanelOpen ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
          >
            <i className="fas fa-robot mr-2" />
            AI 助手
          </Button>

          {/* 用户头像 */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-sm font-bold ml-2">
            U
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧面板 - 最近文档列表 */}
        {leftPanelOpen && (
          <aside
            className="bg-white border-r border-bronze-200 flex flex-col shrink-0"
            style={{ width: leftWidth }}
          >
            {/* 面板头部 */}
            <div className="p-4 border-b border-bronze-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-bronze-700">最近文档</h3>
                <button
                  className="text-xs text-orange-500 hover:text-orange-600"
                  onClick={() => setProjectLibraryOpen(true)}
                >
                  查看全部
                </button>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={handleCreateNew}
              >
                <i className="fas fa-plus mr-2" />
                新建文档
              </Button>
            </div>

            {/* 文档列表 */}
            <div className="flex-1 overflow-y-auto p-2">
              {sortedRecentProjects.length === 0 ? (
                <div className="text-center text-bronze-400 py-8">
                  <i className="fas fa-file-alt text-3xl mb-2 opacity-50" />
                  <p className="text-sm">暂无文档</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {sortedRecentProjects.map((project) => (
                    <div
                      key={project.id}
                      className={`p-3 rounded-lg cursor-pointer group transition-colors ${
                        currentProjectId === project.id
                          ? 'bg-orange-50 border border-orange-200'
                          : 'hover:bg-bronze-50'
                      }`}
                      onClick={() => handleSwitchProject(project.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {project.starred && (
                            <i className="fas fa-star text-amber-400 text-xs shrink-0" />
                          )}
                          <span className="font-medium text-bronze-700 text-sm truncate">
                            {project.title}
                          </span>
                        </div>
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1 text-bronze-400 hover:text-bronze-600 transition-all shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStarred(project.id);
                            refreshProjects();
                          }}
                        >
                          <i
                            className={`fas ${
                              project.starred ? 'fa-star text-amber-400' : 'fa-star'
                            } text-xs`}
                          />
                        </button>
                      </div>
                      {project.preview && (
                        <p className="text-xs text-bronze-500 truncate mt-1">
                          {project.preview}
                        </p>
                      )}
                      <p className="text-xs text-bronze-400 mt-1">
                        {formatDate(project.lastSaved)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* 中间编辑区域 */}
        <main
          className="flex-1 flex flex-col overflow-hidden"
          style={{
            marginRight: rightPanelOpen ? rightWidth : 0,
          }}
        >
          <Editor
            initialContent={editorContent}
            onContentChange={handleContentChange}
          />
        </main>

        {/* 右侧 AI 助手面板 */}
        {rightPanelOpen && (
          <FloatingAgent
            isOpen={rightPanelOpen}
            onToggle={() => setRightPanelOpen(!rightPanelOpen)}
            documentContent={editorContent}
            onInsertText={handleInsertText}
          />
        )}
      </div>

      {/* 知识库面板 */}
      <KnowledgeBase
        sources={knowledgeSources}
        onAddSource={handleAddSource}
        onRemoveSource={removeSource}
        onToggleSource={toggleSource}
        width={knowledgeWidth || 320}
        isOpen={knowledgeOpen}
        setIsOpen={setKnowledgeOpen}
      />

      {/* 项目库弹窗 */}
      <ProjectLibrary
        isOpen={projectLibraryOpen}
        onClose={() => setProjectLibraryOpen(false)}
        projects={projects}
        currentProjectId={currentProjectId}
        onSelectProject={handleSwitchProject}
        onCreateProject={handleCreateNew}
        onRenameProject={renameProject}
        onDeleteProject={deleteProject}
        onDuplicateProject={duplicateProject}
        onToggleStarred={toggleStarred}
        onExportProject={handleExportProject}
      />
    </div>
  );
}
