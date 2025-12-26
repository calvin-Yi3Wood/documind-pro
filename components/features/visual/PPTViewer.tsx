/**
 * PPTViewer - PPT查看器和编辑器组件
 *
 * TODO: Stage 10 完善实现
 * 当前为占位组件
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

// 本地类型定义
interface PPTSlide {
  id: string;
  elements: PPTElement[];
  background?: string;
}

interface PPTElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
}

interface PPTPresentation {
  id: string;
  title: string;
  slides: PPTSlide[];
  width: number;
  height: number;
}

interface PPTViewerProps {
  presentation: PPTPresentation | null;
  onSave?: (presentation: PPTPresentation) => void;
  onExport?: () => void;
  onClose?: () => void;
  isEditing?: boolean;
}

/**
 * PPT查看器和编辑器组件
 *
 * 提供幻灯片预览、编辑、AI生成等功能
 * 当前为占位实现，完整功能在 Stage 10 实现
 */
const PPTViewer: React.FC<PPTViewerProps> = ({
  presentation,
  onSave: _onSave,
  onExport: _onExport,
  onClose,
  isEditing = false,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scale, setScale] = useState(1);

  const slides = presentation?.slides || [];
  const slideCount = slides.length;

  const handlePrevSlide = () => {
    if (currentSlide > 0) setCurrentSlide(currentSlide - 1);
  };

  const handleNextSlide = () => {
    if (currentSlide < slideCount - 1) setCurrentSlide(currentSlide + 1);
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.3));
  const handleResetZoom = () => setScale(1);

  return (
    <div className="flex flex-col h-full bg-cream-50">
      {/* 头部工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-bronze-200">
        <div className="flex items-center gap-3">
          <span className="text-lg">📽️</span>
          <span className="font-bold text-bronze-800">
            {presentation?.title || 'PPT 查看器'}
          </span>
          <span className="text-xs text-bronze-500 bg-bronze-100 px-2 py-0.5 rounded">
            {isEditing ? '编辑模式' : '预览模式'}
          </span>
          <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
            占位组件
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleZoomOut}>
            <i className="fas fa-search-minus" />
          </Button>
          <span className="text-sm text-bronze-600 min-w-[4rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="sm" onClick={handleZoomIn}>
            <i className="fas fa-search-plus" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleResetZoom}>
            <i className="fas fa-expand" />
          </Button>
          <div className="w-px h-6 bg-bronze-200 mx-2" />
          <Button variant="secondary" size="sm">
            <i className="fas fa-download mr-2" />
            导出PPTX
          </Button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-bronze-400 hover:text-bronze-600 transition-colors ml-2"
            >
              <i className="fas fa-times text-lg" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 幻灯片缩略图侧边栏 */}
        <div className="w-48 bg-sand-50 border-r border-bronze-200 overflow-y-auto p-2">
          {slideCount === 0 ? (
            <div className="text-center text-bronze-500 py-8">
              <i className="fas fa-layer-group text-2xl mb-2" />
              <p className="text-xs">暂无幻灯片</p>
            </div>
          ) : (
            slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => setCurrentSlide(index)}
                className={`w-full mb-2 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentSlide
                    ? 'border-orange-400 shadow-md'
                    : 'border-bronze-200 hover:border-bronze-300'
                }`}
              >
                <div className="aspect-video bg-white flex items-center justify-center text-bronze-400">
                  <span className="text-xs">幻灯片 {index + 1}</span>
                </div>
              </button>
            ))
          )}
          {slideCount > 0 && (
            <Button variant="ghost" size="sm" className="w-full mt-2">
              <i className="fas fa-plus mr-2" />
              添加幻灯片
            </Button>
          )}
        </div>

        {/* 主幻灯片区域 */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-bronze-100/50">
          {slideCount === 0 ? (
            <div className="text-center text-bronze-500">
              <div className="text-6xl mb-4">📽️</div>
              <p className="text-lg font-medium text-bronze-700 mb-2">创建您的演示文稿</p>
              <p className="text-sm mb-4">点击下方按钮添加幻灯片</p>
              <Button variant="primary">
                <i className="fas fa-plus mr-2" />
                添加第一张幻灯片
              </Button>
            </div>
          ) : (
            <div
              className="bg-white rounded-lg shadow-xl overflow-hidden"
              style={{
                width: `${(presentation?.width || 960) * scale}px`,
                height: `${(presentation?.height || 540) * scale}px`,
              }}
            >
              <div className="w-full h-full flex items-center justify-center text-bronze-500">
                <div className="text-center">
                  <p className="text-lg font-medium text-bronze-700">
                    幻灯片 {currentSlide + 1} / {slideCount}
                  </p>
                  <p className="text-sm text-bronze-500 mt-2">
                    {slides[currentSlide]?.elements.length || 0} 个元素
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部导航栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-sand-50 border-t border-bronze-200">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevSlide}
            disabled={currentSlide === 0}
          >
            <i className="fas fa-chevron-left" />
          </Button>
          <span className="text-sm text-bronze-600 min-w-[6rem] text-center">
            {slideCount > 0 ? `${currentSlide + 1} / ${slideCount}` : '0 / 0'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextSlide}
            disabled={currentSlide >= slideCount - 1}
          >
            <i className="fas fa-chevron-right" />
          </Button>
        </div>
        <div className="text-xs text-bronze-500">
          🚧 PPT功能开发中 | Stage 10 完善
        </div>
      </div>
    </div>
  );
};

export default PPTViewer;
