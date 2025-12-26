/**
 * ImageEditor - 图片编辑器组件
 *
 * 完整功能实现：
 * - 图片裁剪（框选裁剪区域，应用裁剪）
 * - 透明度调节
 * - AI 抠图（白色背景移除）
 * - 裁剪后尺寸自适应
 */

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { globalToast } from '@/components/ui/Toast';

interface ImageEditorProps {
  imageSrc: string;
  onSave: (editedImageDataUrl: string) => void;
  onClose: () => void;
}

/**
 * 图片编辑器组件
 */
const ImageEditor: React.FC<ImageEditorProps> = ({ imageSrc, onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [opacity, setOpacity] = useState(100);
  const [isCropping, setIsCropping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 裁剪相关状态
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [cropRect, setCropRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // ============================================
  // 画布绘制
  // ============================================

  const drawCanvas = useCallback(
    (img: HTMLImageElement, alpha: number, skipResize: boolean = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 跳过缩放限制（用于裁剪后的图片）
      if (skipResize) {
        const maxDimension = 2000;
        let width = img.width;
        let height = img.height;

        // 如果图片太大，按比例缩小
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // 清空画布
        ctx.clearRect(0, 0, width, height);

        // 绘制图片（带透明度）
        ctx.globalAlpha = alpha / 100;
        ctx.drawImage(img, 0, 0, width, height);
        ctx.globalAlpha = 1;

        return;
      }

      // 设置 canvas 尺寸（标准逻辑）
      const maxWidth = 800;
      const maxHeight = 600;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (maxHeight / height) * width;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // 清空画布
      ctx.clearRect(0, 0, width, height);

      // 绘制图片（带透明度）
      ctx.globalAlpha = alpha / 100;
      ctx.drawImage(img, 0, 0, width, height);
      ctx.globalAlpha = 1;

      // 如果正在裁剪，绘制裁剪框
      if (isCropping && cropRect) {
        // 半透明遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, width, height);

        // 清除裁剪区域的遮罩
        ctx.clearRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
        ctx.globalAlpha = alpha / 100;
        ctx.drawImage(
          img,
          (cropRect.x / width) * img.width,
          (cropRect.y / height) * img.height,
          (cropRect.width / width) * img.width,
          (cropRect.height / height) * img.height,
          cropRect.x,
          cropRect.y,
          cropRect.width,
          cropRect.height
        );
        ctx.globalAlpha = 1;

        // 绘制裁剪框边框
        ctx.strokeStyle = '#F97316'; // orange-500
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
        ctx.setLineDash([]);

        // 绘制角点标记
        const cornerSize = 8;
        ctx.fillStyle = '#F97316';
        // 左上
        ctx.fillRect(cropRect.x - cornerSize / 2, cropRect.y - cornerSize / 2, cornerSize, cornerSize);
        // 右上
        ctx.fillRect(
          cropRect.x + cropRect.width - cornerSize / 2,
          cropRect.y - cornerSize / 2,
          cornerSize,
          cornerSize
        );
        // 左下
        ctx.fillRect(
          cropRect.x - cornerSize / 2,
          cropRect.y + cropRect.height - cornerSize / 2,
          cornerSize,
          cornerSize
        );
        // 右下
        ctx.fillRect(
          cropRect.x + cropRect.width - cornerSize / 2,
          cropRect.y + cropRect.height - cornerSize / 2,
          cornerSize,
          cornerSize
        );
      }
    },
    [isCropping, cropRect]
  );

  // ============================================
  // 图片加载
  // ============================================

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      drawCanvas(img, opacity);
    };
    img.onerror = () => {
      console.error('图片加载失败');
      globalToast.error('图片加载失败');
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (image) {
      drawCanvas(image, opacity);
    }
  }, [opacity, image, drawCanvas]);

  // ============================================
  // 裁剪交互
  // ============================================

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setCropStart({ x, y });
    setCropEnd({ x, y });
    setCropRect(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping || !cropStart) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.max(0, Math.min((e.clientX - rect.left) * scaleX, canvas.width));
    const y = Math.max(0, Math.min((e.clientY - rect.top) * scaleY, canvas.height));

    setCropEnd({ x, y });

    // 计算裁剪矩形
    const minX = Math.min(cropStart.x, x);
    const minY = Math.min(cropStart.y, y);
    const width = Math.abs(x - cropStart.x);
    const height = Math.abs(y - cropStart.y);

    if (width > 5 && height > 5) {
      setCropRect({ x: minX, y: minY, width, height });
    }

    if (image) {
      drawCanvas(image, opacity);
    }
  };

  const handleMouseUp = () => {
    if (isCropping && cropStart && cropEnd) {
      setCropStart(null);
      setCropEnd(null);
    }
  };

  // ============================================
  // 应用裁剪
  // ============================================

  const applyCrop = useCallback(() => {
    if (!cropRect || !image) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // 创建临时 canvas 进行裁剪
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // 计算原图坐标
    const scaleX = image.width / canvas.width;
    const scaleY = image.height / canvas.height;

    tempCanvas.width = cropRect.width * scaleX;
    tempCanvas.height = cropRect.height * scaleY;

    tempCtx.drawImage(
      image,
      cropRect.x * scaleX,
      cropRect.y * scaleY,
      cropRect.width * scaleX,
      cropRect.height * scaleY,
      0,
      0,
      tempCanvas.width,
      tempCanvas.height
    );

    // 更新图片
    const newImage = new Image();
    newImage.onload = () => {
      setImage(newImage);
      setCropRect(null);
      setIsCropping(false);
      // 使用 skipResize=true，让画布大小跟随裁剪后的图片
      drawCanvas(newImage, opacity, true);
      globalToast.success('裁剪成功');
    };
    newImage.src = tempCanvas.toDataURL('image/png');
  }, [cropRect, image, opacity, drawCanvas]);

  // ============================================
  // AI 抠图
  // ============================================

  const handleRemoveBackground = async () => {
    if (!image) return;

    setIsProcessing(true);

    try {
      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error('Canvas not found');
      }

      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        throw new Error('Cannot get canvas context');
      }

      tempCanvas.width = image.width;
      tempCanvas.height = image.height;

      tempCtx.drawImage(image, 0, 0);

      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;

      // 简单的白色背景移除（色度键抠图）
      // 可以集成 remove.bg API 或本地抠图模型进行增强
      let removedPixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;

        // 如果是接近白色的像素，设为透明
        if (r > 200 && g > 200 && b > 200) {
          data[i + 3] = 0;
          removedPixels++;
        }
      }

      tempCtx.putImageData(imageData, 0, 0);

      const newImage = new Image();
      newImage.onload = () => {
        setImage(newImage);
        drawCanvas(newImage, opacity);
        setIsProcessing(false);
        const percentage = ((removedPixels / (data.length / 4)) * 100).toFixed(1);
        globalToast.success(`AI 抠图完成，移除了 ${percentage}% 的白色背景`);
      };
      newImage.onerror = () => {
        setIsProcessing(false);
        globalToast.error('抠图失败，请重试');
      };
      newImage.src = tempCanvas.toDataURL('image/png');
    } catch (error) {
      console.error('❌ 抠图失败:', error);
      globalToast.error('抠图失败，请重试');
      setIsProcessing(false);
    }
  };

  // ============================================
  // 保存
  // ============================================

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const editedImageDataUrl = canvas.toDataURL('image/png');
    onSave(editedImageDataUrl);
    globalToast.success('图片已保存');
  };

  // ============================================
  // 切换裁剪模式
  // ============================================

  const toggleCropping = () => {
    setIsCropping(!isCropping);
    setCropRect(null);
    setCropStart(null);
    setCropEnd(null);
    if (image) {
      drawCanvas(image, opacity);
    }
  };

  // ============================================
  // 渲染
  // ============================================

  return (
    <div className="fixed inset-0 z-[200] bg-bronze-900/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-cream-50 w-full max-w-5xl rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* 标题栏 */}
        <div className="px-6 py-4 border-b border-bronze-200 flex justify-between items-center bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md">
              <i className="fas fa-edit"></i>
            </div>
            <div>
              <h3 className="font-bold text-bronze-800">图片编辑器</h3>
              <p className="text-xs text-bronze-600">裁剪 • 透明度 • AI抠图</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-full hover:bg-bronze-100 text-bronze-400 hover:text-bronze-600 flex items-center justify-center transition-all"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* 编辑区域 */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-bronze-100/50 min-h-[400px]">
          <div className="relative">
            {/* 棋盘格背景（显示透明区域） */}
            <div
              className="absolute inset-0 rounded-lg"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
              }}
            />
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="relative max-w-full max-h-[60vh] shadow-lg rounded-lg"
              style={{ cursor: isCropping ? 'crosshair' : 'default' }}
            />
            {/* 处理中遮罩 */}
            {isProcessing && (
              <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center rounded-lg">
                <i className="fas fa-spinner fa-spin text-3xl text-orange-500 mb-3"></i>
                <span className="text-bronze-600 font-medium">AI 处理中...</span>
              </div>
            )}
          </div>
        </div>

        {/* 工具栏 */}
        <div className="px-6 py-4 border-t border-bronze-200 bg-cream-50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* 左侧工具 */}
            <div className="flex items-center gap-6 flex-wrap">
              {/* 裁剪工具组 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-bronze-500 font-medium mr-1">裁剪</span>
                <button
                  onClick={toggleCropping}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    isCropping
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-bronze-100 text-bronze-600 hover:bg-bronze-200'
                  }`}
                >
                  <i className="fas fa-crop-alt"></i>
                  {isCropping ? '取消' : '裁剪'}
                </button>
                {isCropping && cropRect && (
                  <button
                    onClick={applyCrop}
                    className="px-4 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 transition-all shadow-md flex items-center gap-2"
                  >
                    <i className="fas fa-check"></i>
                    应用
                  </button>
                )}
              </div>

              {/* 分隔线 */}
              <div className="h-8 w-px bg-bronze-200" />

              {/* 透明度滑块 */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-bronze-500 font-medium flex items-center gap-1">
                  <i className="fas fa-adjust"></i>
                  透明度
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-28 accent-orange-500"
                />
                <span className="text-sm text-bronze-600 w-10 text-right">{opacity}%</span>
              </div>

              {/* 分隔线 */}
              <div className="h-8 w-px bg-bronze-200" />

              {/* AI 抠图 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-bronze-500 font-medium mr-1">AI</span>
                <button
                  onClick={handleRemoveBackground}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-lg font-medium bg-purple-500 text-white hover:bg-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center gap-2"
                >
                  <i className={`fas ${isProcessing ? 'fa-spinner fa-spin' : 'fa-magic'}`}></i>
                  {isProcessing ? '处理中...' : '抠图'}
                </button>
              </div>
            </div>

            {/* 右侧按钮 */}
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={onClose}>
                取消
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={isProcessing}>
                <i className="fas fa-save mr-2"></i>
                保存
              </Button>
            </div>
          </div>

          {/* 裁剪提示 */}
          {isCropping && (
            <div className="mt-3 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 flex items-center gap-2">
              <i className="fas fa-info-circle"></i>
              <span>在图片上拖拽鼠标选择裁剪区域，然后点击"应用"按钮完成裁剪</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
