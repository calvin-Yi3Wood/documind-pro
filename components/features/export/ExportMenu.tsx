/**
 * ExportMenu 组件
 *
 * 文档导出下拉菜单
 * - 支持多种导出格式
 * - 显示格式图标和说明
 * - 点击空白处关闭
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { exportFile, EXPORT_FORMATS, type ExportFormat } from '@/services/file';

/**
 * Props
 */
interface ExportMenuProps {
  /** 文档标题 */
  title: string;
  /** 文档内容 (HTML) */
  content: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 导出开始回调 */
  onExportStart?: (format: ExportFormat) => void;
  /** 导出完成回调 */
  onExportComplete?: (format: ExportFormat) => void;
  /** 导出错误回调 */
  onExportError?: (format: ExportFormat, error: Error) => void;
}

/**
 * 导出格式选项
 */
const EXPORT_OPTIONS: {
  format: ExportFormat;
  label: string;
  description: string;
}[] = [
  { format: 'docx', label: 'Word 文档', description: '适合编辑和打印' },
  { format: 'xlsx', label: 'Excel 表格', description: '导出表格数据' },
  { format: 'pdf', label: 'PDF 文档', description: '通过浏览器打印导出' },
  { format: 'html', label: 'HTML 网页', description: '可在浏览器中查看' },
  { format: 'markdown', label: 'Markdown', description: '纯文本格式' },
  { format: 'txt', label: '纯文本', description: '最简单的格式' },
];

export function ExportMenu({
  title,
  content,
  disabled = false,
  className = '',
  onExportStart,
  onExportComplete,
  onExportError,
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // ESC 关闭菜单
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // 处理导出
  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (exporting) return;

      setExporting(format);
      onExportStart?.(format);

      try {
        // 稍微延迟以显示加载状态
        await new Promise((resolve) => setTimeout(resolve, 100));

        exportFile(format, title || '未命名文档', content);

        onExportComplete?.(format);
      } catch (error) {
        console.error('导出错误:', error);
        onExportError?.(format, error instanceof Error ? error : new Error('导出失败'));
      } finally {
        setExporting(null);
        setIsOpen(false);
      }
    },
    [title, content, exporting, onExportStart, onExportComplete, onExportError]
  );

  const isDisabled = disabled || !content;

  return (
    <div className={`relative ${className}`}>
      {/* 触发按钮 */}
      <Button
        ref={buttonRef}
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled}
        title={isDisabled ? '暂无内容可导出' : '导出文档'}
      >
        <i className="fas fa-download mr-2" />
        导出
        <i className={`fas fa-chevron-down ml-2 text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-bronze-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* 菜单头部 */}
          <div className="px-4 py-2 border-b border-bronze-100">
            <h4 className="text-sm font-medium text-bronze-700">选择导出格式</h4>
          </div>

          {/* 导出选项 */}
          <div className="py-1">
            {EXPORT_OPTIONS.map(({ format, label, description }) => {
              const config = EXPORT_FORMATS[format];
              const isExporting = exporting === format;

              return (
                <button
                  key={format}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-cream-100 transition-colors ${
                    isExporting ? 'bg-cream-100' : ''
                  }`}
                  onClick={() => handleExport(format)}
                  disabled={!!exporting}
                >
                  {/* 图标 */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    format === 'docx' ? 'bg-blue-50' :
                    format === 'xlsx' ? 'bg-green-50' :
                    format === 'pdf' ? 'bg-red-50' :
                    format === 'html' ? 'bg-orange-50' :
                    format === 'markdown' ? 'bg-purple-50' :
                    'bg-gray-50'
                  }`}>
                    {isExporting ? (
                      <i className="fas fa-spinner fa-spin text-bronze-500" />
                    ) : (
                      <i className={`fas ${config.icon} ${config.iconColor}`} />
                    )}
                  </div>

                  {/* 文本 */}
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-bronze-700">
                      {label}
                    </div>
                    <div className="text-xs text-bronze-400">
                      {description}
                    </div>
                  </div>

                  {/* 扩展名 */}
                  <span className="text-xs text-bronze-400 font-mono">
                    {config.extension}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 菜单底部提示 */}
          <div className="px-4 py-2 border-t border-bronze-100">
            <p className="text-xs text-bronze-400">
              <i className="fas fa-info-circle mr-1" />
              PDF 导出将打开打印对话框
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExportMenu;
