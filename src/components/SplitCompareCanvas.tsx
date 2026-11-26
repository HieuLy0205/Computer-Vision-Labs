import React, { useEffect, useRef, useState } from 'react';
import { inspectPixel, PixelInfo } from '../lib/cvEngine';

interface SplitCompareCanvasProps {
  original: ImageData | null;
  processed: ImageData | null;
  originalLabel?: string;
  processedLabel?: string;
  enableSplit?: boolean;
  onInspectPixel?: (info: PixelInfo | null) => void;
}

export const SplitCompareCanvas: React.FC<SplitCompareCanvasProps> = ({
  original,
  processed,
  originalLabel = 'Ảnh gốc',
  processedLabel = 'Kết quả xử lý',
  enableSplit = true,
  onInspectPixel,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const origCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const procCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [splitPct, setSplitPct] = useState(50);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (original && origCanvasRef.current) {
      origCanvasRef.current.width = original.width;
      origCanvasRef.current.height = original.height;
      origCanvasRef.current.getContext('2d')?.putImageData(original, 0, 0);
    }
  }, [original]);

  useEffect(() => {
    if (processed && procCanvasRef.current) {
      procCanvasRef.current.width = processed.width;
      procCanvasRef.current.height = processed.height;
      procCanvasRef.current.getContext('2d')?.putImageData(processed, 0, 0);
    }
  }, [processed]);

  const updateSplit = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplitPct(Math.max(0, Math.min(100, pct)));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging && enableSplit) {
      updateSplit(e.clientX);
    }
    if (onInspectPixel && processed && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * processed.width);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * processed.height);
      onInspectPixel(inspectPixel(processed, x, y));
    }
  };

  if (!processed) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-500">
        Đang tải bộ đệm ảnh...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        onPointerDown={(e) => {
          if (enableSplit) {
            setDragging(true);
            updateSplit(e.clientX);
          }
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => {
          setDragging(false);
          onInspectPixel?.(null);
        }}
        className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-900 select-none cursor-crosshair"
        style={{ aspectRatio: `${processed.width} / ${processed.height}`, maxHeight: '440px' }}
      >
        {/* Base processed layer */}
        <canvas
          ref={procCanvasRef}
          className="h-full w-full object-contain block"
        />

        {/* Clipped original layer on the left */}
        {enableSplit && original && (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - splitPct}% 0 0)` }}
          >
            <canvas
              ref={origCanvasRef}
              className="h-full w-full object-contain block"
            />
          </div>
        )}

        {/* Split divider */}
        {enableSplit && original && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.35)]"
            style={{ left: `${splitPct}%` }}
          >
            <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md border border-slate-300 bg-white px-1.5 py-1 font-mono text-[10px] font-semibold text-slate-800 shadow-sm">
              ↔
            </div>
          </div>
        )}

        {/* Labels */}
        {enableSplit && original && (
          <div className="pointer-events-none absolute top-2.5 left-2.5 rounded bg-slate-900/75 px-2 py-0.5 font-mono text-[11px] text-white">
            {originalLabel}
          </div>
        )}
        <div className="pointer-events-none absolute top-2.5 right-2.5 rounded bg-blue-600/90 px-2 py-0.5 font-mono text-[11px] text-white">
          {processedLabel}
        </div>
      </div>

      {enableSplit && original && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Kéo thanh trượt trên ảnh để so sánh trực tiếp Trước / Sau</span>
          <span className="font-mono tabular-nums">{Math.round(splitPct)}% gốc</span>
        </div>
      )}
    </div>
  );
};
