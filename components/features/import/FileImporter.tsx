/**
 * FileImporter 组件
 *
 * 文件导入组件
 * - 支持点击上传
 * - 支持拖拽上传
 * - 文件类型过滤
 * - 加载状态显示
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import {
  parseFile,
  getSupportedExtensions,
  isFileSupported,
  formatFileSize,
  SUPPORTED_FILE_TYPES,
  type ParseResult,
} from '@/services/file';

/**
 * Props
 */
interface FileImporterProps {
  /** 导入成功回调 */
  onImport: (result: ParseResult) => void;
  /** 导入错误回调 */
  onError?: (error: string) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 显示模式: button (仅按钮) | dropzone (拖放区) | both (两者) */
  mode?: 'button' | 'dropzone' | 'both';
  /** 按钮文本 */
  buttonText?: string;
  /** 是否显示支持格式提示 */
  showFormats?: boolean;
}

/**
 * 导入状态
 */
type ImportStatus = 'idle' | 'dragging' | 'loading' | 'success' | 'error';

export function FileImporter({
  onImport,
  onError,
  disabled = false,
  className = '',
  mode = 'both',
  buttonText = '导入文件',
  showFormats = true,
}: FileImporterProps) {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [progress, setProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // 处理文件选择
  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const file = files[0];
      if (!file) return;

      // 检查文件类型
      if (!isFileSupported(file)) {
        const error = `不支持的文件格式: ${file.name}`;
        setStatus('error');
        onError?.(error);
        setTimeout(() => setStatus('idle'), 3000);
        return;
      }

      // 开始解析
      setStatus('loading');
      setProgress(`正在解析 ${file.name} (${formatFileSize(file.size)})...`);

      try {
        const result = await parseFile(file);

        if (result.success) {
          setStatus('success');
          setProgress(`成功导入 ${file.name}`);
          onImport(result);

          // 短暂显示成功状态
          setTimeout(() => {
            setStatus('idle');
            setProgress('');
          }, 2000);
        } else {
          throw new Error(result.error || '解析失败');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '导入失败';
        setStatus('error');
        setProgress(errorMessage);
        onError?.(errorMessage);

        setTimeout(() => {
          setStatus('idle');
          setProgress('');
        }, 3000);
      }

      // 清空 input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onImport, onError]
  );

  // 点击上传
  const handleClick = useCallback(() => {
    if (disabled || status === 'loading') return;
    fileInputRef.current?.click();
  }, [disabled, status]);

  // 拖放事件处理
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current += 1;

      if (!disabled && status !== 'loading') {
        setStatus('dragging');
      }
    },
    [disabled, status]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current -= 1;

      if (dragCounterRef.current === 0) {
        setStatus('idle');
      }
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;

      if (disabled || status === 'loading') {
        setStatus('idle');
        return;
      }

      setStatus('idle');
      handleFileSelect(e.dataTransfer.files);
    },
    [disabled, status, handleFileSelect]
  );

  // 获取状态图标
  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <i className="fas fa-spinner fa-spin text-orange-500 text-xl" />;
      case 'success':
        return <i className="fas fa-check-circle text-green-500 text-xl" />;
      case 'error':
        return <i className="fas fa-exclamation-circle text-red-500 text-xl" />;
      case 'dragging':
        return <i className="fas fa-cloud-upload-alt text-orange-500 text-2xl animate-bounce" />;
      default:
        return <i className="fas fa-file-import text-bronze-400 text-xl" />;
    }
  };

  // 获取状态文本
  const getStatusText = () => {
    if (progress) return progress;

    switch (status) {
      case 'dragging':
        return '释放以导入文件';
      default:
        return '拖拽文件到此处或点击上传';
    }
  };

  // 支持格式列表
  const supportedFormats = Object.values(SUPPORTED_FILE_TYPES)
    .map((t) => t.extensions.join(', '))
    .join(', ');

  return (
    <div className={className}>
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={getSupportedExtensions()}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />

      {/* 按钮模式 */}
      {(mode === 'button' || mode === 'both') && (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleClick}
          disabled={disabled || status === 'loading'}
          className={mode === 'both' ? 'mb-3' : ''}
        >
          {status === 'loading' ? (
            <i className="fas fa-spinner fa-spin mr-2" />
          ) : (
            <i className="fas fa-file-import mr-2" />
          )}
          {buttonText}
        </Button>
      )}

      {/* 拖放区域 */}
      {(mode === 'dropzone' || mode === 'both') && (
        <div
          className={`
            relative border-2 border-dashed rounded-xl p-8
            flex flex-col items-center justify-center gap-3
            transition-all duration-200 cursor-pointer
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${
              status === 'dragging'
                ? 'border-orange-400 bg-orange-50'
                : status === 'loading'
                ? 'border-orange-300 bg-cream-50'
                : status === 'success'
                ? 'border-green-400 bg-green-50'
                : status === 'error'
                ? 'border-red-400 bg-red-50'
                : 'border-bronze-200 bg-cream-50 hover:border-bronze-300 hover:bg-cream-100'
            }
          `}
          onClick={handleClick}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* 状态图标 */}
          <div
            className={`
              w-16 h-16 rounded-full flex items-center justify-center
              ${
                status === 'dragging'
                  ? 'bg-orange-100'
                  : status === 'success'
                  ? 'bg-green-100'
                  : status === 'error'
                  ? 'bg-red-100'
                  : 'bg-bronze-100'
              }
            `}
          >
            {getStatusIcon()}
          </div>

          {/* 状态文本 */}
          <p
            className={`text-sm font-medium ${
              status === 'success'
                ? 'text-green-600'
                : status === 'error'
                ? 'text-red-600'
                : 'text-bronze-600'
            }`}
          >
            {getStatusText()}
          </p>

          {/* 支持格式提示 */}
          {showFormats && status === 'idle' && (
            <p className="text-xs text-bronze-400 text-center">
              支持格式: {supportedFormats}
            </p>
          )}

          {/* 加载进度条 */}
          {status === 'loading' && (
            <div className="w-full max-w-xs h-1 bg-bronze-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-amber-400 animate-pulse"
                style={{ width: '60%' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 紧凑版导入按钮
 */
interface ImportButtonProps {
  onImport: (result: ParseResult) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function ImportButton({
  onImport,
  onError,
  disabled = false,
  className = '',
  size = 'sm',
  variant = 'secondary',
}: ImportButtonProps) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const file = files[0];
      if (!file) return;

      if (!isFileSupported(file)) {
        onError?.(`不支持的文件格式: ${file.name}`);
        return;
      }

      setLoading(true);

      try {
        const result = await parseFile(file);

        if (result.success) {
          onImport(result);
        } else {
          throw new Error(result.error || '解析失败');
        }
      } catch (error) {
        onError?.(error instanceof Error ? error.message : '导入失败');
      } finally {
        setLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [onImport, onError]
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={getSupportedExtensions()}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />
      <Button
        variant={variant}
        size={size}
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || loading}
        className={className}
        title="导入文件"
      >
        {loading ? (
          <i className="fas fa-spinner fa-spin" />
        ) : (
          <i className="fas fa-file-import" />
        )}
      </Button>
    </>
  );
}

export default FileImporter;
