/**
 * DrawingCanvas - 绘图画布组件
 *
 * TODO: Stage 10 完善实现
 * 当前为占位组件
 */

'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface DrawingCanvasProps {
  width?: number;
  height?: number;
  onSave?: (imageDataUrl: string) => void;
}

/**
 * 绘图画布组件
 *
 * 提供自由绘图、形状绘制、颜色选择等功能
 * 当前为占位实现，完整功能在 Stage 10 实现
 */
const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  width = 800,
  height = 400,
  onSave,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#F97316');
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

  const colors = ['#F97316', '#EF4444', '#22C55E', '#3B82F6', '#8B5CF6', '#352A1E', '#FFFFFF'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = isEraser ? '#FFFFFF' : currentColor;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !onSave) return;
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div className="bg-cream-50 rounded-xl border border-bronze-200 overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center gap-4 px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-bronze-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎨</span>
          <span className="font-bold text-bronze-800">绘图画布</span>
        </div>

        <div className="w-px h-6 bg-bronze-200" />

        {/* 颜色选择 */}
        <div className="flex items-center gap-1">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => {
                setCurrentColor(c);
                setIsEraser(false);
              }}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                currentColor === c && !isEraser
                  ? 'border-bronze-800 scale-110'
                  : 'border-bronze-200'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-bronze-200" />

        {/* 画笔大小 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-bronze-600">画笔:</span>
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-20"
          />
          <span className="text-xs text-bronze-700 w-8">{brushSize}px</span>
        </div>

        <div className="w-px h-6 bg-bronze-200" />

        {/* 工具按钮 */}
        <Button
          variant={isEraser ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setIsEraser(!isEraser)}
        >
          <i className="fas fa-eraser" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <i className="fas fa-trash mr-1" />
          清空
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave}>
          <i className="fas fa-save mr-1" />
          保存
        </Button>
      </div>

      {/* 画布区域 */}
      <div className="p-4 bg-sand-50 flex justify-center">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
          onMouseLeave={stopDrawing}
          className="border border-bronze-200 rounded-lg shadow-inner bg-white cursor-crosshair"
        />
      </div>

      {/* 占位提示 */}
      <div className="text-center py-2 bg-sand-50 border-t border-bronze-100">
        <p className="text-xs text-bronze-500">🚧 高级绘图功能开发中 | Stage 10 完善</p>
      </div>
    </div>
  );
};

export default DrawingCanvas;
