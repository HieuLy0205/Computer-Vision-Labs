import React, { useMemo, useState } from 'react';
import { HistogramData } from '../../lib/cvEngine';

interface HistogramComparePanelProps {
  before: HistogramData | null;
  after: HistogramData | null;
  beforeLabel?: string;
  afterLabel?: string;
  mode?: 'rgb' | 'gray';
  observations: string[];
}

export interface HistStats {
  total: number;
  mean: number;
  std: number;
  darkPct: number;
  brightPct: number;
  peakBin: number;
}

export function analyzeHistogramStats(h: HistogramData | null): HistStats | null {
  if (!h) return null;
  let total = 0;
  let sum = 0;
  let peakBin = 0;
  let peakVal = -1;
  let darkCount = 0;
  let brightCount = 0;

  for (let i = 0; i < 256; i++) {
    const c = h.gray[i];
    total += c;
    sum += i * c;
    if (c > peakVal) {
      peakVal = c;
      peakBin = i;
    }
    if (i <= 5) darkCount += c;
    if (i >= 250) brightCount += c;
  }
  if (total === 0) return null;
  const mean = sum / total;
  let varSum = 0;
  for (let i = 0; i < 256; i++) {
    varSum += (i - mean) * (i - mean) * h.gray[i];
  }
  const std = Math.sqrt(varSum / total);
  return {
    total,
    mean,
    std,
    darkPct: (darkCount / total) * 100,
    brightPct: (brightCount / total) * 100,
    peakBin,
  };
}

export const HistogramComparePanel: React.FC<HistogramComparePanelProps> = ({
  before,
  after,
  beforeLabel = 'Trước (Ảnh đầu vào)',
  afterLabel = 'Sau (Kết quả xử lý)',
  mode = 'rgb',
  observations,
}) => {
  const [viewMode, setViewMode] = useState<'side_by_side' | 'overlay'>('side_by_side');
  const [showR, setShowR] = useState(true);
  const [showG, setShowG] = useState(true);
  const [showB, setShowB] = useState(true);
  const [showL, setShowL] = useState(true);
  const [hoverBin, setHoverBin] = useState<number | null>(null);

  const beforeStats = useMemo(() => analyzeHistogramStats(before), [before]);
  const afterStats = useMemo(() => analyzeHistogramStats(after), [after]);

  if (!before || !after) {
    return (
      <div className="flex h-44 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs text-slate-500">
        Đang tính toán biểu đồ Histogram Trước &amp; Sau...
      </div>
    );
  }

  const sharedMax = Math.max(before.maxCount, after.maxCount, 1);
  const W = 512;
  const H = 152;
  const padL = 6;
  const padR = 6;
  const padT = 8;
  const padB = 20;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const buildPath = (arr: number[]) => {
    let d = `M ${padL} ${padT + plotH}`;
    for (let i = 0; i < 256; i++) {
      const x = padL + (i / 255) * plotW;
      const y = padT + plotH - (arr[i] / sharedMax) * plotH;
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    d += ` L ${padL + plotW} ${padT + plotH} Z`;
    return d;
  };

  const buildStroke = (arr: number[]) => {
    let d = '';
    for (let i = 0; i < 256; i++) {
      const x = padL + (i / 255) * plotW;
      const y = padT + plotH - (arr[i] / sharedMax) * plotH;
      d += `${i === 0 ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const bin = Math.round(((relX - padL) / plotW) * 255);
    setHoverBin(bin >= 0 && bin <= 255 ? bin : null);
  };

  const renderSvg = (hist: HistogramData, overlayBaseline?: HistogramData) => (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full cursor-crosshair select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverBin(null)}
    >
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
              y={H - 4}
              textAnchor={tick === 0 ? 'start' : tick === 255 ? 'end' : 'middle'}
              className="fill-slate-400 font-mono text-[10px]"
            >
              {tick}
            </text>
          </g>
        );
      })}

      {overlayBaseline && (
        <path
          d={buildStroke(overlayBaseline.gray)}
          fill="none"
          stroke="#94A3B8"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
      )}

      {mode === 'rgb' && showR && (
        <>
          <path d={buildPath(hist.r)} fill="rgba(225, 29, 72, 0.12)" />
          <path d={buildStroke(hist.r)} fill="none" stroke="#E11D48" strokeWidth="1.3" />
        </>
      )}
      {mode === 'rgb' && showG && (
        <>
          <path d={buildPath(hist.g)} fill="rgba(5, 150, 105, 0.12)" />
          <path d={buildStroke(hist.g)} fill="none" stroke="#059669" strokeWidth="1.3" />
        </>
      )}
      {mode === 'rgb' && showB && (
        <>
          <path d={buildPath(hist.b)} fill="rgba(37, 99, 235, 0.12)" />
          <path d={buildStroke(hist.b)} fill="none" stroke="#2563EB" strokeWidth="1.3" />
        </>
      )}
      {(mode === 'gray' || showL) && (
        <>
          <path d={buildPath(hist.gray)} fill="rgba(15, 23, 42, 0.08)" />
          <path d={buildStroke(hist.gray)} fill="none" stroke="#0F172A" strokeWidth="1.5" />
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
  );

  const deltaMean = beforeStats && afterStats ? afterStats.mean - beforeStats.mean : 0;
  const deltaStd = beforeStats && afterStats ? afterStats.std - beforeStats.std : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-900">
            So sánh Biểu đồ Histogram Trước &amp; Sau (0–255)
          </span>
          <div className="flex rounded-md bg-slate-100 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode('side_by_side')}
              className={`rounded px-2 py-0.5 font-medium ${
                viewMode === 'side_by_side' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Song song (Trước | Sau)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('overlay')}
              className={`rounded px-2 py-0.5 font-medium ${
                viewMode === 'overlay' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Chồng lên nhau
            </button>
          </div>
        </div>

        {mode === 'rgb' && (
          <div className="flex items-center gap-1">
            {[
              { key: 'R', active: showR, toggle: () => setShowR((v) => !v), cls: 'text-rose-600 border-rose-200 bg-rose-50' },
              { key: 'G', active: showG, toggle: () => setShowG((v) => !v), cls: 'text-emerald-600 border-emerald-200 bg-emerald-50' },
              { key: 'B', active: showB, toggle: () => setShowB((v) => !v), cls: 'text-blue-600 border-blue-200 bg-blue-50' },
              { key: 'L', active: showL, toggle: () => setShowL((v) => !v), cls: 'text-slate-700 border-slate-300 bg-slate-100' },
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

      {/* Charts */}
      {viewMode === 'side_by_side' ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700">{beforeLabel}</span>
              {beforeStats && (
                <span className="font-mono text-slate-500 tabular-nums">
                  μ={beforeStats.mean.toFixed(1)} · σ={beforeStats.std.toFixed(1)} · Peak={beforeStats.peakBin}
                </span>
              )}
            </div>
            {renderSvg(before)}
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50/20 p-2.5">
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-blue-800">{afterLabel}</span>
              {afterStats && (
                <span className="font-mono text-blue-700 tabular-nums">
                  μ={afterStats.mean.toFixed(1)} · σ={afterStats.std.toFixed(1)} · Peak={afterStats.peakBin}
                </span>
              )}
            </div>
            {renderSvg(after)}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-2.5">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="text-slate-600">
              Nét liền: <strong className="text-slate-900">{afterLabel}</strong> · Nét đứt:{' '}
              <strong className="text-slate-600">{beforeLabel}</strong>
            </span>
            {beforeStats && afterStats && (
              <span className="font-mono text-slate-600 tabular-nums">
                Δμ: {deltaMean >= 0 ? '+' : ''}
                {deltaMean.toFixed(1)} · Δσ: {deltaStd >= 0 ? '+' : ''}
                {deltaStd.toFixed(1)}
              </span>
            )}
          </div>
          {renderSvg(after, before)}
        </div>
      )}

      {/* Hover bin inspector */}
      {hoverBin !== null && (
        <div className="flex flex-wrap items-center gap-4 rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5 font-mono text-[11px] text-slate-700 tabular-nums">
          <span className="font-semibold text-slate-900">Mức sáng Bin {hoverBin}</span>
          <span>
            Trước (L): <strong>{before.gray[hoverBin]}</strong> px
          </span>
          <span className="text-blue-700">
            Sau (L): <strong>{after.gray[hoverBin]}</strong> px
          </span>
        </div>
      )}

      {/* Quantitative Metrics + Domain Observations */}
      <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-blue-950">Nhận xét thay đổi Biểu đồ Histogram</span>
          {beforeStats && afterStats && (
            <div className="flex flex-wrap gap-2 font-mono text-[11px] tabular-nums">
              <span className="rounded bg-white px-2 py-0.5 text-slate-700 border border-slate-200">
                Độ sáng TB (μ): {beforeStats.mean.toFixed(1)} → {afterStats.mean.toFixed(1)} (
                {deltaMean >= 0 ? '+' : ''}
                {deltaMean.toFixed(1)})
              </span>
              <span className="rounded bg-white px-2 py-0.5 text-slate-700 border border-slate-200">
                Độ trải (σ): {beforeStats.std.toFixed(1)} → {afterStats.std.toFixed(1)} (
                {deltaStd >= 0 ? '+' : ''}
                {deltaStd.toFixed(1)})
              </span>
              <span className="rounded bg-white px-2 py-0.5 text-slate-700 border border-slate-200">
                Bão hòa 0/255: {afterStats.darkPct.toFixed(1)}% / {afterStats.brightPct.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        <ul className="space-y-1 text-xs leading-relaxed text-slate-700">
          {observations.map((obs, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
              <span>{obs}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
