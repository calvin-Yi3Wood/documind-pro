/**
 * ImageHandler - 图片处理组件
 *
 * 提供图片上传、插入、调整等功能
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';

interface ImageHandlerProps {
  /** 插入图片回调 */
  onInsert: (imageUrl: string, alt?: string) => void;
  /** 关闭回调 */
  onClose: () => void;
}

type TabType = 'upload' | 'url' | 'unsplash';

/**
 * 图片处理对话框组件
 */
export const ImageHandler: React.FC<ImageHandlerProps> = ({
  onInsert,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件上传
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    // 验证文件大小 (最大 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB');
      return;
    }

    setError(null);
    setIsLoading(true);

    // 读取文件为 Base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPreviewUrl(result);
      setImageUrl(result);
      setIsLoading(false);
    };
    reader.onerror = () => {
      setError('读取文件失败');
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  }, []);

  // 处理URL输入
  const handleUrlChange = useCallback((url: string) => {
    setImageUrl(url);
    setError(null);

    if (url) {
      // 验证URL格式
      try {
        new URL(url);
        setPreviewUrl(url);
      } catch {
        setPreviewUrl(null);
      }
    } else {
      setPreviewUrl(null);
    }
  }, []);

  // 处理图片加载错误
  const handleImageError = useCallback(() => {
    setError('图片加载失败，请检查URL是否正确');
    setPreviewUrl(null);
  }, []);

  // 插入图片
  const handleInsert = useCallback(() => {
    if (!imageUrl) {
      setError('请先选择或输入图片');
      return;
    }
    onInsert(imageUrl, altText || undefined);
    onClose();
  }, [imageUrl, altText, onInsert, onClose]);

  // Tab配置
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'upload', label: '本地上传', icon: 'fa-upload' },
    { id: 'url', label: '网络图片', icon: 'fa-link' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-cream-50 rounded-xl shadow-2xl w-[500px] max-h-[80vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-bronze-200 bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center gap-2">
            <i className="fas fa-image text-orange-500" />
            <span className="font-bold text-bronze-800">插入图片</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bronze-100 rounded-lg text-bronze-500 hover:text-bronze-700 transition-colors"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Tab切换 */}
        <div className="flex border-b border-bronze-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setError(null);
                setPreviewUrl(null);
                setImageUrl('');
              }}
              className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/50'
                  : 'text-bronze-500 hover:text-bronze-700 hover:bg-bronze-50'
              }`}
            >
              <i className={`fas ${tab.icon}`} />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          {/* 本地上传 */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-bronze-300 rounded-xl p-8 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-colors"
              >
                {isLoading ? (
                  <div className="text-bronze-500">
                    <i className="fas fa-spinner fa-spin text-3xl mb-2" />
                    <p>正在处理...</p>
                  </div>
                ) : (
                  <>
                    <i className="fas fa-cloud-upload-alt text-4xl text-bronze-400 mb-3" />
                    <p className="text-bronze-600 font-medium">点击选择图片</p>
                    <p className="text-bronze-400 text-sm mt-1">
                      支持 JPG、PNG、GIF、WebP，最大 5MB
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* URL输入 */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-bronze-700 mb-2">
                  图片URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2 border border-bronze-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400"
                />
              </div>
            </div>
          )}

          {/* 图片预览 */}
          {previewUrl && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-bronze-700 mb-2">
                图片预览
              </label>
              <div className="border border-bronze-200 rounded-lg p-2 bg-white">
                <img
                  src={previewUrl}
                  alt="预览"
                  onError={handleImageError}
                  className="max-h-48 mx-auto object-contain"
                />
              </div>
            </div>
          )}

          {/* Alt文本 */}
          {previewUrl && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-bronze-700 mb-2">
                图片描述 (可选)
              </label>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="简要描述图片内容"
                className="w-full px-4 py-2 border border-bronze-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400"
              />
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              <i className="fas fa-exclamation-circle mr-2" />
              {error}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-bronze-200 bg-bronze-50/50">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={handleInsert}
            disabled={!imageUrl || isLoading}
            className="bg-gradient-to-r from-orange-500 to-amber-500 text-white"
          >
            <i className="fas fa-check mr-2" />
            插入图片
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImageHandler;
