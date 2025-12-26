/**
 * ImageEditor - 图片编辑器组件
 *
 * TODO: Stage 10 完善实现
 * 当前为占位组件
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface ImageEditorProps {
  imageSrc: string;
  onSave: (editedImageDataUrl: string) => void;
  onClose: () => void;
}

/**
 * 图片编辑器组件
 *
 * 提供图片裁剪、调整透明度等功能
 * 当前为占位实现，完整功能在 Stage 10 实现
 */
const ImageEditor: React.FC<ImageEditorProps> = ({ imageSrc, onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [opacity, setOpacity] = useState(100);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      drawCanvas(img, opacity);
    };
    img.onerror = () => {
      console.error('图片加载失败');
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (image) {
      drawCanvas(image, opacity);
    }
  }, [opacity, image]);

  const drawCanvas = (img: HTMLImageElement, alpha: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布尺寸
    const maxWidth = 800;
    const maxHeight = 600;
    let width = img.width;
    let height = img.height;

    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }
    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    canvas.width = width;
    canvas.height = height;

    // 清除画布
    ctx.clearRect(0, 0, width, height);

    // 绘制图片
    ctx.globalAlpha = alpha / 100;
    ctx.drawImage(img, 0, 0, width, height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-cream-50 rounded-xl shadow-2xl max-w-4xl w-full mx-4 overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-bronze-200">
          <div className="flex items-center gap-3">
            <span className="text-lg">🎨</span>
            <span className="font-bold text-bronze-800">图片编辑器</span>
            <span className="text-xs text-bronze-500 bg-bronze-100 px-2 py-0.5 rounded">占位组件</span>
          </div>
          <button
            onClick={onClose}
            className="text-bronze-400 hover:text-bronze-600 transition-colors"
          >
            <i className="fas fa-times text-lg" />
          </button>
        </div>

        {/* 画布区域 */}
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="border border-bronze-200 rounded-lg overflow-hidden bg-white shadow-inner">
            <canvas ref={canvasRef} className="max-w-full" />
          </div>

          {/* 透明度控制 */}
          <div className="flex items-center gap-4 w-full max-w-md">
            <label className="text-sm text-bronze-600 whitespace-nowrap">透明度:</label>
            <input
              type="range"
              min="0"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm text-bronze-700 w-12 text-right">{opacity}%</span>
          </div>

          <div className="text-center text-bronze-500 py-4">
            <div className="text-3xl mb-2">🚧</div>
            <p className="text-sm">完整图片编辑功能开发中...</p>
            <p className="text-xs text-bronze-400 mt-1">将在 Stage 10 完善实现</p>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-sand-50 border-t border-bronze-200">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" onClick={handleSave}>
            保存
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
