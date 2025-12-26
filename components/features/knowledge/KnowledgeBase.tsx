/**
 * KnowledgeBase - 知识库管理组件
 *
 * TODO: Stage 10 完善实现
 * 当前为占位组件
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';

// 本地类型定义
interface KnowledgeSource {
  id: string;
  name: string;
  type: 'file' | 'text' | 'url';
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

/**
 * 知识库管理组件
 *
 * 提供知识库资料管理、预览、启用/禁用等功能
 * 当前为占位实现，完整功能在 Stage 10 实现
 */
const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({
  sources,
  onAddSource,
  onAddTextSource: _onAddTextSource,
  onRemoveSource,
  onToggleSource,
  width,
  isOpen,
  setIsOpen,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    const firstFile = files[0];
    if (files.length > 0 && firstFile) {
      onAddSource(firstFile);
    }
  }, [onAddSource]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const firstFile = files?.[0];
    if (files && files.length > 0 && firstFile) {
      onAddSource(firstFile);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 top-20 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-3 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
      >
        <i className="fas fa-book" />
        <span className="text-sm font-medium">知识库</span>
        {sources.length > 0 && (
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
            {sources.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className="fixed right-0 top-0 h-full bg-cream-50 border-l border-bronze-200 shadow-xl flex flex-col z-40"
      style={{ width }}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-bronze-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">📚</span>
          <span className="font-bold text-bronze-800">知识库</span>
          <span className="text-xs text-bronze-500 bg-bronze-100 px-2 py-0.5 rounded">
            {sources.length} 个资料
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-bronze-400 hover:text-bronze-600 transition-colors"
        >
          <i className="fas fa-times" />
        </button>
      </div>

      {/* 上传区域 */}
      <div
        className={`m-4 p-6 border-2 border-dashed rounded-xl text-center transition-all ${
          dragOver
            ? 'border-orange-400 bg-orange-50'
            : 'border-bronze-300 hover:border-bronze-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <i className="fas fa-cloud-upload-alt text-3xl text-bronze-400 mb-2" />
        <p className="text-sm text-bronze-600 mb-2">拖放文件到此处上传</p>
        <p className="text-xs text-bronze-400 mb-3">支持 PDF、Word、TXT、Markdown</p>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.md"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <i className="fas fa-folder-open mr-2" />
          选择文件
        </Button>
      </div>

      {/* 资料列表 */}
      <div className="flex-1 overflow-y-auto px-4">
        {sources.length === 0 ? (
          <div className="text-center text-bronze-500 py-8">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-sm">知识库为空</p>
            <p className="text-xs text-bronze-400 mt-1">上传文件开始构建知识库</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map((source) => (
              <div
                key={source.id}
                className={`p-3 rounded-lg border transition-all ${
                  source.enabled
                    ? 'bg-white border-bronze-200'
                    : 'bg-sand-50 border-bronze-100 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                    <i className={`fas fa-${source.type === 'file' ? 'file-alt' : 'align-left'} text-amber-600 text-sm`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-bronze-700 truncate">
                      {source.name}
                    </p>
                    <p className="text-xs text-bronze-400">
                      {source.size ? `${(source.size / 1024).toFixed(1)} KB` : '文本内容'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onToggleSource(source.id)}
                      className={`p-1.5 rounded transition-colors ${
                        source.enabled
                          ? 'text-green-500 hover:bg-green-50'
                          : 'text-bronze-400 hover:bg-bronze-50'
                      }`}
                      title={source.enabled ? '已启用' : '已禁用'}
                    >
                      <i className={`fas fa-${source.enabled ? 'toggle-on' : 'toggle-off'}`} />
                    </button>
                    <button
                      onClick={() => onRemoveSource(source.id)}
                      className="p-1.5 rounded text-red-400 hover:bg-red-50 transition-colors"
                      title="删除"
                    >
                      <i className="fas fa-trash-alt text-xs" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部状态 */}
      <div className="px-4 py-3 border-t border-bronze-200 bg-sand-50 text-xs text-bronze-500 flex items-center justify-between">
        <span>🚧 知识库功能开发中</span>
        <span>Stage 10 完善</span>
      </div>
    </div>
  );
};

export default KnowledgeBase;
