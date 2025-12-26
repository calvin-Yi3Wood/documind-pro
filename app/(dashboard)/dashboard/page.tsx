/**
 * Dashboard 主页面 - 三栏布局
 *
 * 左侧: 导航 & 文档列表
 * 中间: 编辑器主区域
 * 右侧: AI 助手 & 知识库
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import dynamic from 'next/dynamic';

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
 * 文档项类型
 */
interface DocumentItem {
  id: string;
  title: string;
  updatedAt: Date;
  preview?: string;
}

/**
 * 知识源类型
 */
interface KnowledgeSource {
  id: string;
  name: string;
  type: 'file' | 'text' | 'url';
  content: string;
  enabled: boolean;
  size?: number;
  createdAt: Date;
}

export default function DashboardPage() {
  // 布局状态
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);

  // 文档状态
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [documentTitle, setDocumentTitle] = useState('未命名文档');

  // 知识库状态
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);

  // 加载本地文档
  useEffect(() => {
    const savedDocs = localStorage.getItem('documind_documents');
    if (savedDocs) {
      try {
        const parsed = JSON.parse(savedDocs);
        setDocuments(parsed.map((d: DocumentItem) => ({
          ...d,
          updatedAt: new Date(d.updatedAt),
        })));
      } catch {
        // 忽略解析错误
      }
    }
  }, []);

  // 保存文档
  const saveDocument = useCallback(() => {
    const docId = activeDocId || `doc_${Date.now()}`;
    const updatedDoc: DocumentItem = {
      id: docId,
      title: documentTitle,
      updatedAt: new Date(),
      preview: editorContent.slice(0, 100),
    };

    setDocuments((prev) => {
      const exists = prev.find((d) => d.id === docId);
      const updated = exists
        ? prev.map((d) => (d.id === docId ? updatedDoc : d))
        : [...prev, updatedDoc];
      localStorage.setItem('documind_documents', JSON.stringify(updated));
      return updated;
    });

    localStorage.setItem(`doc_content_${docId}`, editorContent);
    setActiveDocId(docId);
  }, [activeDocId, documentTitle, editorContent]);

  // 加载文档
  const loadDocument = useCallback((doc: DocumentItem) => {
    const content = localStorage.getItem(`doc_content_${doc.id}`) || '';
    setEditorContent(content);
    setDocumentTitle(doc.title);
    setActiveDocId(doc.id);
  }, []);

  // 新建文档
  const createNewDocument = useCallback(() => {
    setEditorContent('');
    setDocumentTitle('未命名文档');
    setActiveDocId(null);
  }, []);

  // 删除文档
  const deleteDocument = useCallback((id: string) => {
    setDocuments((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      localStorage.setItem('documind_documents', JSON.stringify(updated));
      return updated;
    });
    localStorage.removeItem(`doc_content_${id}`);
    if (activeDocId === id) {
      createNewDocument();
    }
  }, [activeDocId, createNewDocument]);

  // 知识库操作
  const handleAddSource = useCallback((file: File) => {
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
      setKnowledgeSources((prev) => [...prev, newSource]);
    };
    reader.readAsText(file);
  }, []);

  const handleRemoveSource = useCallback((id: string) => {
    setKnowledgeSources((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleToggleSource = useCallback((id: string) => {
    setKnowledgeSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  }, []);

  // 计算中间区域宽度
  const leftWidth = leftPanelOpen ? 280 : 0;
  const rightWidth = rightPanelOpen ? 360 : 0;
  const knowledgeWidth = knowledgeOpen ? 320 : 0;

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

          {/* 左侧面板切换 */}
          <Button
            variant={leftPanelOpen ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            title="文档列表"
          >
            <i className="fas fa-folder" />
          </Button>

          {/* 文档标题 */}
          <div className="hidden md:flex items-center gap-2 ml-4">
            <input
              type="text"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="bg-transparent border-none text-bronze-700 font-medium focus:outline-none focus:ring-2 focus:ring-orange-400 rounded px-2 py-1"
              placeholder="文档标题"
            />
            {activeDocId && (
              <span className="text-xs text-bronze-400">已保存</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 保存按钮 */}
          <Button variant="secondary" size="sm" onClick={saveDocument}>
            <i className="fas fa-save mr-2" />
            保存
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
        {/* 左侧面板 - 文档列表 */}
        {leftPanelOpen && (
          <aside
            className="bg-white border-r border-bronze-200 flex flex-col shrink-0"
            style={{ width: leftWidth }}
          >
            {/* 面板头部 */}
            <div className="p-4 border-b border-bronze-100">
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={createNewDocument}
              >
                <i className="fas fa-plus mr-2" />
                新建文档
              </Button>
            </div>

            {/* 文档列表 */}
            <div className="flex-1 overflow-y-auto p-2">
              {documents.length === 0 ? (
                <div className="text-center text-bronze-400 py-8">
                  <i className="fas fa-file-alt text-3xl mb-2 opacity-50" />
                  <p className="text-sm">暂无文档</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-3 rounded-lg cursor-pointer group transition-colors ${
                        activeDocId === doc.id
                          ? 'bg-orange-50 border border-orange-200'
                          : 'hover:bg-bronze-50'
                      }`}
                      onClick={() => loadDocument(doc)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-bronze-700 text-sm truncate">
                          {doc.title}
                        </span>
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDocument(doc.id);
                          }}
                        >
                          <i className="fas fa-trash-alt text-xs" />
                        </button>
                      </div>
                      <p className="text-xs text-bronze-400 mt-1">
                        {new Date(doc.updatedAt).toLocaleDateString()}
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
            onContentChange={setEditorContent}
          />
        </main>

        {/* 右侧 AI 助手面板 */}
        {rightPanelOpen && (
          <FloatingAgent
            isOpen={rightPanelOpen}
            onToggle={() => setRightPanelOpen(!rightPanelOpen)}
            documentContent={editorContent}
            onInsertText={(content: string) => {
              setEditorContent((prev) => prev + '\n\n' + content);
            }}
          />
        )}
      </div>

      {/* 知识库面板 */}
      <KnowledgeBase
        sources={knowledgeSources}
        onAddSource={handleAddSource}
        onRemoveSource={handleRemoveSource}
        onToggleSource={handleToggleSource}
        width={knowledgeWidth || 320}
        isOpen={knowledgeOpen}
        setIsOpen={setKnowledgeOpen}
      />
    </div>
  );
}
