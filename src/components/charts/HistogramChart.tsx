import React, { useState } from 'react';
import { HistogramData } from '../../lib/cvEngine';

interface HistogramChartProps {
  primary: HistogramData | null;
  secondary?: HistogramData | null;
  primaryLabel?: string;
  secondaryLabel?: string;
  mode?: 'rgb' | 'gray';
  height?: number;
}

export const HistogramChart: React.FC<HistogramChartProps> = ({
  primary,
  secondary,
  primaryLabel = 'Đã xử lý',
  secondaryLabel = 'Ảnh gốc',
  mode = 'rgb',
  height = 175,
}) => {
  const [hoverBin, setHoverBin] = useState<number | null>(null);
  const [showR, setShowR] = useState(true);
  const [showG, setShowG] = useState(true);
  const [showB, setShowB] = useState(true);
  const [showGray, setShowGray] = useState(true);

  if (!primary) {
    return (
      <div className="flex h-44 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-500">
        Đang tính toán Histogram...
      </div>
    );
  }

  const W = 512;
  const H = height;
  const padL = 6;
  const padR = 6;
  const padT = 10;
  const padB = 22;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxVal = Math.max(primary.maxCount, secondary?.maxCount ?? 0, 1);

  const buildPath = (arr: number[]) => {
    let d = `M ${padL} ${padT + plotH}`;
    for (let i = 0; i < 256; i++) {
      const x = padL + (i / 255) * plotW;
      const y = padT + plotH - (arr[i] / maxVal) * plotH;
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    d += ` L ${padL + plotW} ${padT + plotH} Z`;
    return d;
  };

  const buildStroke = (arr: number[]) => {
    let d = '';
    for (let i = 0; i < 256; i++) {
      const x = padL + (i / 255) * plotW;
      const y = padT + plotH - (arr[i] / maxVal) * plotH;
      d += `${i === 0 ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const bin = Math.round(((relX - padL) / plotW) * 255);
    if (bin >= 0 && bin <= 255) setHoverBin(bin);
    else setHoverBin(null);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">Biểu đồ Histogram (0–255)</span>
          {secondary && (
            <span className="font-mono text-[11px] text-slate-500">
              Nét liền: {primaryLabel} · Nét đứt: {secondaryLabel}
            </span>
          )}
        </div>
        {mode === 'rgb' && (
          <div className="flex items-center gap-1">
            {[
              { key: 'R', active: showR, toggle: () => setShowR((v) => !v), cls: 'text-rose-600 border-rose-200 bg-rose-50' },
              { key: 'G', active: showG, toggle: () => setShowG((v) => !v), cls: 'text-emerald-600 border-emerald-200 bg-emerald-50' },
              { key: 'B', active: showB, toggle: () => setShowB((v) => !v), cls: 'text-blue-600 border-blue-200 bg-blue-50' },
              { key: 'L', active: showGray, toggle: () => setShowGray((v) => !v), cls: 'text-slate-700 border-slate-300 bg-slate-100' },
            ].map((ch) => (
              <button
                key={ch.key}
                type="button"
                onClick={ch.toggle}
                className={`rounded border px-2 py-0.5 font-mono text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                  ch.active ? ch.cls : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                {ch.key}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full cursor-crosshair select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverBin(null)}
        >
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((frac) => (
            <line
              key={frac}
              x1={padL}
              y1={padT + plotH * frac}
              x2={padL + plotW}
              y2={padT + plotH * frac}
              stroke="#E2E8F0"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          ))}
          {[0, 64, 128, 192, 255].map((tick) => {
            const x = padL + (tick / 255) * plotW;
            return (
              <g key={tick}>
                <line x1={x} y1={padT} x2={x} y2={padT + plotH} stroke="#F1F5F9" strokeWidth="1" />
                <text
                  x={x}
                  y={H - 5}
                  textAnchor={tick === 0 ? 'start' : tick === 255 ? 'end' : 'middle'}
                  className="fill-slate-400 font-mono text-[10px]"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Secondary baseline dashed gray */}
          {secondary && (
            <path
              d={buildStroke(secondary.gray)}
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1.4"
              strokeDasharray="4 3"
            />
          )}

          {mode === 'rgb' && showR && (
            <>
              <path d={buildPath(primary.r)} fill="rgba(225, 29, 72, 0.12)" />
              <path d={buildStroke(primary.r)} fill="none" stroke="#E11D48" strokeWidth="1.4" />
            </>
          )}
          {mode === 'rgb' && showG && (
            <>
              <path d={buildPath(primary.g)} fill="rgba(5, 150, 105, 0.12)" />
              <path d={buildStroke(primary.g)} fill="none" stroke="#059669" strokeWidth="1.4" />
            </>
          )}
          {mode === 'rgb' && showB && (
            <>
              <path d={buildPath(primary.b)} fill="rgba(37, 99, 235, 0.12)" />
              <path d={buildStroke(primary.b)} fill="none" stroke="#2563EB" strokeWidth="1.4" />
            </>
          )}
          {(mode === 'gray' || showGray) && (
            <>
              <path d={buildPath(primary.gray)} fill="rgba(15, 23, 42, 0.08)" />
              <path d={buildStroke(primary.gray)} fill="none" stroke="#0F172A" strokeWidth="1.5" />
            </>
          )}

          {hoverBin !== null && (
            <line
              x1={padL + (hoverBin / 255) * plotW}
              y1={padT}
              x2={padL + (hoverBin / 255) * plotW}
              y2={padT + plotH}
              stroke="#2563EB"
              strokeWidth="1"
            />
          )}
        </svg>

        {hoverBin !== null && (
          <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-600 tabular-nums">
            <span className="font-semibold text-slate-900">Bin {hoverBin}</span>
            {mode === 'rgb' && (
              <>
                <span className="text-rose-600">R: {primary.r[hoverBin]}</span>
                <span className="text-emerald-600">G: {primary.g[hoverBin]}</span>
                <span className="text-blue-600">B: {primary.b[hoverBin]}</span>
              </>
            )}
            <span className="text-slate-800">Gray: {primary.gray[hoverBin]}</span>
            {secondary && <span className="text-slate-400">Gốc: {secondary.gray[hoverBin]}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
