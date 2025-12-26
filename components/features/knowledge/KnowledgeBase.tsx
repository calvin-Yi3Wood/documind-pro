/**
 * KnowledgeBase - 知识库管理组件
 *
 * 功能：
 * - 资料预览（PreviewModal）
 * - 粘贴文本添加（PasteTextModal）
 * - 文件拖放上传
 * - 内容展开/折叠
 * - 文件类型标识
 * - 3D 文件夹图标
 */

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';

// 本地类型定义
interface KnowledgeSource {
  id: string;
  name: string;
  type: 'file' | 'text' | 'url' | string;
  content: string;
  enabled: boolean;
  size?: number;
  createdAt: Date;
}

interface KnowledgeBaseProps {
  sources: KnowledgeSource[];
  onAddSource: (file: File) => void;
  onAddTextSource?: (name: string, content: string) => void;
  onRemoveSource: (id: string) => void;
  onToggleSource: (id: string) => void;
  width: number;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

// 预览阈值
const PREVIEW_THRESHOLD = 150;

/**
 * 预览弹窗组件
 */
const PreviewModal: React.FC<{
  source: KnowledgeSource;
  onClose: () => void;
}> = ({ source, onClose }) => {
  const [scale, setScale] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(source.content);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setScale(1);

  // 获取文件图标样式
  const getIconStyle = () => {
    const type = source.type.toLowerCase();
    if (type.includes('pdf')) return { icon: 'fa-file-pdf', color: 'text-red-500' };
    if (type.includes('word') || type.includes('docx'))
      return { icon: 'fa-file-word', color: 'text-blue-500' };
    return { icon: 'fa-file-alt', color: 'text-bronze-500' };
  };

  const iconStyle = getIconStyle();

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-cream-50 rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 弹窗头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bronze-200 bg-gradient-to-r from-orange-50 to-amber-50 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg flex items-center justify-center shadow-sm">
              <i className={`fas ${iconStyle.icon} ${iconStyle.color} text-lg`} />
            </div>
            <div>
              <h3 className="font-bold text-bronze-800 text-base">{source.name}</h3>
              <p className="text-xs text-bronze-400">
                {source.content.length.toLocaleString()} 字符 ·{' '}
                {new Date(source.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* 缩放控制 */}
            <div className="flex items-center space-x-1 bg-bronze-100 rounded-lg px-2 py-1">
              <button
                onClick={handleZoomOut}
                className="p-1 hover:bg-bronze-200 rounded text-bronze-500"
                title="缩小"
              >
                <i className="fas fa-minus text-xs" />
              </button>
              <span className="text-xs text-bronze-600 min-w-[40px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 hover:bg-bronze-200 rounded text-bronze-500"
                title="放大"
              >
                <i className="fas fa-plus text-xs" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1 hover:bg-bronze-200 rounded text-bronze-500 ml-1"
                title="重置"
              >
                <i className="fas fa-undo text-xs" />
              </button>
            </div>
            {/* 复制按钮 */}
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-bronze-100 rounded-lg text-bronze-500 transition-colors"
              title="复制全部内容"
            >
              <i className="fas fa-copy" />
            </button>
            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-50 rounded-lg text-bronze-400 hover:text-red-500 transition-colors"
            >
              <i className="fas fa-times" />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div
          ref={contentRef}
          className="flex-1 overflow-auto p-6"
          style={{
            fontSize: `${14 * scale}px`,
            lineHeight: 1.7,
          }}
        >
          <pre className="whitespace-pre-wrap font-sans text-bronze-700 m-0">
            {source.content.slice(0, 2000)}
            {source.content.length > 2000 && (
              <span className="text-bronze-400 italic">
                {'\n\n'}... 内容过长，已截断（共 {source.content.length.toLocaleString()} 字符）
              </span>
            )}
          </pre>
        </div>
      </div>
    </div>
  );
};

/**
 * 粘贴文本弹窗组件
 */
const PasteTextModal: React.FC<{
  onSubmit: (name: string, content: string) => void;
  onClose: () => void;
}> = ({ onSubmit, onClose }) => {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (content.trim()) {
      const finalName = name.trim() || `文本资料 ${new Date().toLocaleTimeString()}`;
      onSubmit(finalName, content.trim());
      onClose();
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setContent((prev) => prev + text);
    } catch (err) {
      console.error('粘贴失败:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-cream-50 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bronze-200 bg-gradient-to-r from-orange-50 to-amber-50 rounded-t-xl">
          <h3 className="font-bold text-bronze-800 text-base flex items-center space-x-2">
            <i className="fas fa-paste text-bronze-500" />
            <span>粘贴纯文本</span>
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-50 rounded-lg text-bronze-400 hover:text-red-500 transition-colors"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* 表单内容 */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-bronze-600 mb-1.5">
              资料名称（可选）
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="留空将自动生成名称"
              className="w-full px-3 py-2 border border-bronze-200 rounded-lg focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none text-sm bg-white"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-bronze-600">文本内容</label>
              <button
                onClick={handlePaste}
                className="text-xs text-bronze-500 hover:text-bronze-700 flex items-center space-x-1"
              >
                <i className="fas fa-clipboard text-[10px]" />
                <span>从剪贴板粘贴</span>
              </button>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="在此输入或粘贴文本内容..."
              rows={10}
              className="w-full px-3 py-2 border border-bronze-200 rounded-lg focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none text-sm resize-none bg-white"
            />
            <p className="text-xs text-bronze-400 mt-1">
              已输入 {content.length.toLocaleString()} 字符
            </p>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end space-x-3 px-5 py-4 border-t border-bronze-100 bg-sand-50 rounded-b-xl">
          <Button variant="secondary" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!content.trim()}>
            添加到资料库
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * 获取文件类型标签
 */
const getFileTypeLabel = (type: string, name: string): string => {
  const lowerType = type.toLowerCase();
  const lowerName = name.toLowerCase();

  if (lowerType.includes('pdf') || lowerName.endsWith('.pdf')) return 'PDF';
  if (
    lowerType.includes('word') ||
    lowerType.includes('docx') ||
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.doc')
  )
    return 'DOCX';
  if (lowerType.includes('markdown') || lowerName.endsWith('.md')) return 'MD';
  return 'TEXT';
};

/**
 * 获取 3D 文件夹样式
 */
const getFolderStyle = (type: string, name: string) => {
  const lowerType = type.toLowerCase();
  const lowerName = name.toLowerCase();

  if (lowerType.includes('pdf') || lowerName.endsWith('.pdf')) {
    return { main: '#C4956A', shadow: '#9A7B5B', accent: '#E8D4B8' };
  }
  if (
    lowerType.includes('word') ||
    lowerType.includes('docx') ||
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.doc')
  ) {
    return { main: '#B8A07A', shadow: '#8B7355', accent: '#E5D9C3' };
  }
  if (lowerType.includes('markdown') || lowerName.endsWith('.md')) {
    return { main: '#A8B896', shadow: '#7A8B6A', accent: '#D4E0C8' };
  }
  return { main: '#C9B896', shadow: '#9A8B6A', accent: '#EAE0C8' };
};

/**
 * 知识库管理组件
 */
const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({
  sources,
  onAddSource,
  onAddTextSource,
  onRemoveSource,
  onToggleSource,
  width,
  isOpen,
  setIsOpen,
}) => {
  const [previewSource, setPreviewSource] = useState<KnowledgeSource | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 切换展开状态
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 处理拖拽事件
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const validExtensions = ['.txt', '.md', '.html', '.docx', '.doc', '.pdf'];

      files.forEach((file) => {
        const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
        if (validExtensions.includes(ext)) {
          onAddSource(file);
        }
      });
    },
    [onAddSource]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        onAddSource(file);
      });
      e.target.value = '';
    }
  };

  const handleAddTextSource = (name: string, content: string) => {
    if (onAddTextSource) {
      onAddTextSource(name, content);
    }
  };

  // 收起状态 - 显示悬浮按钮
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 top-20 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-3 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 z-40"
      >
        <i className="fas fa-book" />
        <span className="text-sm font-medium">知识库</span>
        {sources.length > 0 && (
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{sources.length}</span>
        )}
      </button>
    );
  }

  return (
    <>
      <div
        className={`fixed right-0 top-0 h-full bg-cream-50 border-l border-bronze-200 shadow-xl flex flex-col z-40 transition-all ${
          isDragging ? 'ring-2 ring-orange-500 ring-inset bg-orange-50/30' : ''
        }`}
        style={{ width }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-bronze-200">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="font-bold text-bronze-800">资料库</span>
            {sources.length > 0 && (
              <span className="text-xs bg-bronze-100 text-bronze-600 px-1.5 py-0.5 rounded-full">
                {sources.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-bronze-400 hover:text-bronze-600 transition-colors"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* 拖拽提示覆盖层 */}
        {isDragging && (
          <div className="absolute inset-0 bg-orange-500/10 flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <i className="fas fa-cloud-upload-alt text-4xl text-orange-500 mb-3" />
              <p className="text-bronze-700 font-medium">释放文件以上传</p>
              <p className="text-xs text-bronze-400 mt-1">支持 Word, PDF, Markdown, 纯文本</p>
            </div>
          </div>
        )}

        {/* 内容区域 - 卡片式布局 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sources.length === 0 ? (
            /* 空状态优化 */
            <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-bronze-200 rounded-xl p-6 text-center bg-gradient-to-b from-transparent to-sand-50/50">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                <i className="fas fa-folder-open text-2xl text-amber-600" />
              </div>
              <p className="text-sm font-medium text-bronze-600 mb-1">拖拽文件到此处</p>
              <p className="text-xs text-bronze-400 leading-relaxed">
                或点击下方按钮导入
                <br />
                支持 Word, PDF, Markdown, 纯文本
              </p>
            </div>
          ) : (
            /* 资料网格 */
            <div className="grid grid-cols-2 gap-3">
              {sources.map((source) => {
                const folderStyle = getFolderStyle(source.type, source.name);
                const typeLabel = getFileTypeLabel(source.type, source.name);
                const isExpanded = expandedIds.has(source.id);
                const needsExpand = source.content.length > PREVIEW_THRESHOLD;

                return (
                  <div
                    key={source.id}
                    className={`group relative flex flex-col items-center p-3 rounded-xl cursor-pointer transition-all hover:bg-sand-100 ${
                      source.enabled
                        ? 'border border-transparent hover:border-orange-200'
                        : 'opacity-60'
                    }`}
                    onClick={() => setPreviewSource(source)}
                  >
                    {/* 3D 文件夹图标 */}
                    <div className="relative w-16 h-14 mb-2 transition-transform group-hover:scale-105">
                      {/* 文件夹后面 */}
                      <div
                        className="absolute inset-0 rounded-lg"
                        style={{
                          background: `linear-gradient(145deg, ${folderStyle.accent} 0%, ${folderStyle.main} 100%)`,
                          transform: 'perspective(100px) rotateX(5deg)',
                          boxShadow: `0 4px 8px rgba(0,0,0,0.15), inset 0 -2px 4px ${folderStyle.shadow}`,
                        }}
                      />
                      {/* 文件夹标签 */}
                      <div
                        className="absolute top-0 left-2 w-6 h-3 rounded-t-md"
                        style={{
                          background: folderStyle.main,
                          boxShadow: `inset 0 1px 2px ${folderStyle.accent}`,
                        }}
                      />
                      {/* 文件夹前盖 */}
                      <div
                        className="absolute bottom-0 left-0 right-0 h-10 rounded-lg"
                        style={{
                          background: `linear-gradient(180deg, ${folderStyle.main} 0%, ${folderStyle.shadow} 100%)`,
                          boxShadow: `inset 0 2px 4px ${folderStyle.accent}, 0 2px 4px rgba(0,0,0,0.1)`,
                        }}
                      />
                      {/* 文件类型标识 */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                        <span className="text-[8px] font-bold text-white/80 uppercase tracking-wider">
                          {typeLabel}
                        </span>
                      </div>
                    </div>

                    {/* 文件名 */}
                    <p
                      className={`text-xs font-medium text-center leading-tight line-clamp-2 ${
                        source.enabled ? 'text-bronze-700' : 'text-bronze-400'
                      }`}
                    >
                      {source.name.replace(/\.[^/.]+$/, '').substring(0, 20)}
                      {source.name.replace(/\.[^/.]+$/, '').length > 20 && '...'}
                    </p>

                    {/* 内容预览（展开/折叠） */}
                    {needsExpand && (
                      <div className="mt-1 w-full">
                        <p className="text-[10px] text-bronze-400 text-center line-clamp-2">
                          {isExpanded
                            ? source.content.slice(0, 300)
                            : source.content.slice(0, PREVIEW_THRESHOLD)}
                          {!isExpanded && '...'}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(source.id);
                          }}
                          className="text-[10px] text-orange-500 hover:text-orange-600 mt-0.5 block mx-auto"
                        >
                          {isExpanded ? '收起' : '展开全部'}
                        </button>
                      </div>
                    )}

                    {/* 悬停操作按钮 */}
                    <div className="absolute top-1 right-1 flex space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSource(source.id);
                        }}
                        className={`p-1 rounded-md text-[10px] ${
                          source.enabled
                            ? 'text-green-600 bg-green-100'
                            : 'text-gray-400 bg-gray-100'
                        }`}
                        title={source.enabled ? '已启用' : '已禁用'}
                      >
                        <i className={`fas ${source.enabled ? 'fa-check' : 'fa-ban'}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveSource(source.id);
                        }}
                        className="p-1 rounded-md text-[10px] text-red-400 bg-red-50 hover:text-red-600"
                        title="删除"
                      >
                        <i className="fas fa-times" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部操作区 */}
        <div className="p-3 border-t border-bronze-200 bg-cream-50 space-y-2">
          {/* 粘贴文本按钮 */}
          <button
            onClick={() => setShowPasteModal(true)}
            className="w-full flex items-center justify-center space-x-2 bg-bronze-100 hover:bg-bronze-200 text-bronze-600 py-2 rounded-lg cursor-pointer transition-all text-sm font-medium"
          >
            <i className="fas fa-paste text-xs" />
            <span>粘贴纯文本</span>
          </button>

          {/* 导入文件按钮 */}
          <label className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-2.5 rounded-lg cursor-pointer transition-all text-sm font-bold shadow-sm">
            <i className="fas fa-plus-circle" />
            <span>导入文件</span>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".txt,.md,.html,.docx,.doc,.pdf"
              multiple
            />
          </label>
        </div>
      </div>

      {/* 预览弹窗 */}
      {previewSource && (
        <PreviewModal source={previewSource} onClose={() => setPreviewSource(null)} />
      )}

      {/* 粘贴文本弹窗 */}
      {showPasteModal && (
        <PasteTextModal
          onSubmit={handleAddTextSource}
          onClose={() => setShowPasteModal(false)}
        />
      )}
    </>
  );
};

export default KnowledgeBase;
