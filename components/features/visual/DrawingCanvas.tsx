/**
 * DrawingCanvas - 绘图画布覆盖层组件
 *
 * 功能：
 * - Canvas 2D 绘画逻辑（lineCap: round, lineJoin: round）
 * - 绘画事件处理（mousedown → draw → mouseup）
 * - 画笔/橡皮擦切换
 * - 颜色选择器和粗细调节
 * - 透明背景覆盖层模式
 * - 保存绘画为图片
 */

'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';

interface DrawingCanvasProps {
  /** 画布宽度 */
  width?: number;
  /** 画布高度 */
  height?: number;
  /** 是否为覆盖层模式 (透明背景) */
  isOverlay?: boolean;
  /** 保存回调 */
  onSave?: (imageDataUrl: string) => void;
  /** 退出回调 */
  onClose?: () => void;
  /** 页面容器引用 (覆盖层模式时用于同步尺寸) */
  containerRef?: React.RefObject<HTMLElement>;
}

// 预设颜色
const PRESET_COLORS = [
  '#000000', // 黑色
  '#FF0000', // 红色
  '#00FF00', // 绿色
  '#0000FF', // 蓝色
  '#FFFF00', // 黄色
  '#FF00FF', // 品红
  '#00FFFF', // 青色
  '#FFA500', // 橙色
  '#800080', // 紫色
  '#F97316', // 暖橙 (品牌色)
];

/**
 * 绘图画布组件
 */
const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  width = 800,
  height = 600,
  isOverlay = false,
  onSave,
  onClose,
  containerRef,
}) => {
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // 绘画状态
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#FF0000');
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [drawingImageData, setDrawingImageData] = useState<string | null>(null);

  // 画布尺寸
  const [canvasSize, setCanvasSize] = useState({ width, height });

  /**
   * 初始化画布
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 更新画布尺寸
    let newWidth = width;
    let newHeight = height;

    if (isOverlay && containerRef?.current) {
      newWidth = containerRef.current.scrollWidth;
      newHeight = containerRef.current.scrollHeight;
    }

    canvas.width = newWidth;
    canvas.height = newHeight;
    setCanvasSize({ width: newWidth, height: newHeight });

    // 初始化 context
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctxRef.current = ctx;

      // 非覆盖层模式时填充白色背景
      if (!isOverlay) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, newWidth, newHeight);
      }

      // 恢复之前的绘画内容
      if (drawingImageData) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = drawingImageData;
      }
    }
  }, [width, height, isOverlay, containerRef, drawingImageData]);

  /**
   * 监听容器尺寸变化 (覆盖层模式)
   */
  useEffect(() => {
    if (!isOverlay || !containerRef?.current) return;

    const resizeObserver = new ResizeObserver(() => {
      const container = containerRef.current;
      if (container && canvasRef.current) {
        const newWidth = container.scrollWidth;
        const newHeight = container.scrollHeight;

        // 保存当前绘画内容
        if (ctxRef.current) {
          setDrawingImageData(canvasRef.current.toDataURL('image/png'));
        }

        setCanvasSize({ width: newWidth, height: newHeight });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isOverlay, containerRef]);

  /**
   * 开始绘画
   */
  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!ctxRef.current || !canvasRef.current) return;

      setIsDrawing(true);
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      ctxRef.current.beginPath();
      ctxRef.current.moveTo(x, y);
    },
    []
  );

  /**
   * 绘画中
   */
  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !ctxRef.current || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 设置画笔样式
      ctxRef.current.strokeStyle = isEraser ? '#FFFFFF' : drawingColor;
      ctxRef.current.lineWidth = brushSize;

      // 绘制线条
      ctxRef.current.lineTo(x, y);
      ctxRef.current.stroke();
    },
    [isDrawing, isEraser, drawingColor, brushSize]
  );

  /**
   * 停止绘画
   */
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);

    // 保存绘画状态
    if (canvasRef.current) {
      setDrawingImageData(canvasRef.current.toDataURL('image/png'));
    }
  }, []);

  /**
   * 清除画布
   */
  const clearDrawing = useCallback(() => {
    if (!canvasRef.current || !ctxRef.current) return;

    const canvas = canvasRef.current;
    ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);

    // 非覆盖层模式重新填充白色
    if (!isOverlay) {
      ctxRef.current.fillStyle = '#FFFFFF';
      ctxRef.current.fillRect(0, 0, canvas.width, canvas.height);
    }

    setDrawingImageData(null);
  }, [isOverlay]);

  /**
   * 检查画布是否有内容
   */
  const hasContent = useCallback((): boolean => {
    if (!canvasRef.current) return false;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    // 创建空白对比画布
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;

    if (!isOverlay) {
      const blankCtx = blank.getContext('2d');
      if (blankCtx) {
        blankCtx.fillStyle = '#FFFFFF';
        blankCtx.fillRect(0, 0, blank.width, blank.height);
      }
    }

    return canvas.toDataURL() !== blank.toDataURL();
  }, [isOverlay]);

  /**
   * 保存绘画
   */
  const saveDrawing = useCallback(() => {
    if (!canvasRef.current || !ctxRef.current) return;

    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    if (!hasContent()) {
      console.log('⚠️ 画布为空，无需保存');
      onClose?.();
      return;
    }

    // 获取绘画内容的边界框 (只保存有内容的区域)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width: imgWidth, height: imgHeight } = imageData;

    let minX = imgWidth,
      minY = imgHeight,
      maxX = 0,
      maxY = 0;

    for (let y = 0; y < imgHeight; y++) {
      for (let x = 0; x < imgWidth; x++) {
        const alpha = data[(y * imgWidth + x) * 4 + 3] ?? 0;
        if (alpha > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    // 添加边距
    const padding = 10;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(imgWidth, maxX + padding);
    maxY = Math.min(imgHeight, maxY + padding);

    const cropWidth = maxX - minX;
    const cropHeight = maxY - minY;

    // 创建裁剪后的画布
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropWidth;
    cropCanvas.height = cropHeight;
    const cropCtx = cropCanvas.getContext('2d');

    if (cropCtx) {
      // 绘制白色背景 (如果需要)
      if (!isOverlay) {
        cropCtx.fillStyle = '#FFFFFF';
        cropCtx.fillRect(0, 0, cropWidth, cropHeight);
      }

      // 复制裁剪区域
      cropCtx.drawImage(
        canvas,
        minX,
        minY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      const dataUrl = cropCanvas.toDataURL('image/png');
      onSave?.(dataUrl);
    }

    // 清除画布
    clearDrawing();
    onClose?.();
  }, [hasContent, isOverlay, onSave, onClose, clearDrawing]);

  /**
   * 退出绘画模式
   */
  const handleExit = useCallback(() => {
    if (hasContent()) {
      // 有内容时自动保存
      saveDrawing();
    } else {
      onClose?.();
    }
  }, [hasContent, saveDrawing, onClose]);

  // 画笔光标 SVG
  const penCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23${drawingColor.slice(1)}' stroke-width='2'%3E%3Cpath d='M12 19l7-7 3 3-7 7-3-3z'/%3E%3Cpath d='M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z'/%3E%3Cpath d='M2 2l7.586 7.586'/%3E%3Ccircle cx='11' cy='11' r='2'/%3E%3C/svg%3E") 0 16, crosshair`;

  // 橡皮擦光标
  const eraserCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='white' stroke='%23666' stroke-width='1.5'%3E%3Crect x='4' y='12' width='16' height='8' rx='2'/%3E%3C/svg%3E") 12 20, crosshair`;

  // 覆盖层模式
  if (isOverlay) {
    return (
      <>
        {/* 透明画布覆盖层 */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-40"
          style={{
            pointerEvents: 'auto',
            cursor: isEraser ? eraserCursor : penCursor,
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />

        {/* 悬浮工具栏 */}
        <div className="absolute top-4 right-4 bg-cream-50 rounded-xl shadow-xl border border-bronze-200 p-3 z-50 space-y-3 animate-in fade-in slide-in-from-right-4 duration-200 w-48">
          <div className="text-xs font-bold text-bronze-500 uppercase tracking-wider mb-2">
            🎨 绘画工具
          </div>

          {/* 画笔/橡皮擦切换 */}
          <div className="flex space-x-2">
            <button
              onClick={() => setIsEraser(false)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                !isEraser
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-bronze-100 text-bronze-600 hover:bg-bronze-200'
              }`}
            >
              <i className="fas fa-pen mr-1" />
              画笔
            </button>
            <button
              onClick={() => setIsEraser(true)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isEraser
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-bronze-100 text-bronze-600 hover:bg-bronze-200'
              }`}
            >
              <i className="fas fa-eraser mr-1" />
              橡皮
            </button>
          </div>

          {/* 颜色选择 (仅画笔模式) */}
          {!isEraser && (
            <div>
              <div className="text-[10px] text-bronze-500 mb-1.5">颜色</div>
              <div className="grid grid-cols-5 gap-1.5">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setDrawingColor(color)}
                    className={`h-6 w-6 rounded-md border-2 transition-all ${
                      drawingColor === color
                        ? 'border-bronze-700 scale-110 shadow-md'
                        : 'border-bronze-200 hover:border-bronze-400'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 画笔粗细 */}
          <div>
            <div className="text-[10px] text-bronze-500 mb-1.5">粗细 ({brushSize}px)</div>
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-full h-2 bg-bronze-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>

          <div className="h-px bg-bronze-200" />

          {/* 操作按钮 */}
          <div className="space-y-2">
            <button
              onClick={clearDrawing}
              className="w-full px-3 py-2 rounded-lg bg-bronze-100 hover:bg-bronze-200 text-bronze-700 text-xs font-medium transition-all flex items-center justify-center"
            >
              <i className="fas fa-redo mr-1.5" />
              清空画布
            </button>
            <button
              onClick={saveDrawing}
              className="w-full px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-medium transition-all flex items-center justify-center shadow-md"
            >
              <i className="fas fa-check mr-1.5" />
              保存为图片
            </button>
            <button
              onClick={() => {
                clearDrawing();
                onClose?.();
              }}
              className="w-full px-3 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium transition-all flex items-center justify-center"
            >
              <i className="fas fa-times mr-1.5" />
              取消绘画
            </button>
          </div>
        </div>
      </>
    );
  }

  // 独立画布模式
  return (
    <div className="bg-cream-50 rounded-xl border border-bronze-200 overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center gap-4 px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-bronze-200 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎨</span>
          <span className="font-bold text-bronze-800">绘图画布</span>
        </div>

        <div className="w-px h-6 bg-bronze-200" />

        {/* 画笔/橡皮擦 */}
        <div className="flex items-center gap-1">
          <Button
            variant={!isEraser ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setIsEraser(false)}
          >
            <i className="fas fa-pen" />
          </Button>
          <Button
            variant={isEraser ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setIsEraser(true)}
          >
            <i className="fas fa-eraser" />
          </Button>
        </div>

        <div className="w-px h-6 bg-bronze-200" />

        {/* 颜色选择 */}
        <div className="flex items-center gap-1">
          {PRESET_COLORS.slice(0, 7).map((c) => (
            <button
              key={c}
              onClick={() => {
                setDrawingColor(c);
                setIsEraser(false);
              }}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                drawingColor === c && !isEraser
                  ? 'border-bronze-800 scale-110'
                  : 'border-bronze-200'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          {/* 自定义颜色 */}
          <input
            type="color"
            value={drawingColor}
            onChange={(e) => {
              setDrawingColor(e.target.value);
              setIsEraser(false);
            }}
            className="w-6 h-6 rounded-full cursor-pointer border border-bronze-200"
            title="自定义颜色"
          />
        </div>

        <div className="w-px h-6 bg-bronze-200" />

        {/* 画笔大小 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-bronze-600">粗细:</span>
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-20 accent-orange-500"
          />
          <span className="text-xs text-bronze-700 w-8">{brushSize}px</span>
        </div>

        <div className="flex-1" />

        {/* 操作按钮 */}
        <Button variant="ghost" size="sm" onClick={clearDrawing}>
          <i className="fas fa-trash mr-1" />
          清空
        </Button>
        <Button variant="primary" size="sm" onClick={saveDrawing}>
          <i className="fas fa-save mr-1" />
          保存
        </Button>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={handleExit}>
            <i className="fas fa-times mr-1" />
            退出
          </Button>
        )}
      </div>

      {/* 画布区域 */}
      <div className="p-4 bg-sand-50 flex justify-center overflow-auto">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
          onMouseLeave={stopDrawing}
          className="border border-bronze-200 rounded-lg shadow-inner bg-white"
          style={{
            cursor: isEraser ? eraserCursor : penCursor,
          }}
        />
      </div>
    </div>
  );
};

export default DrawingCanvas;
