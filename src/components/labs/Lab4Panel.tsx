import React, { useEffect, useMemo, useState } from 'react';
import { Upload } from 'lucide-react';
import {
  computeWaveletHash,
  hammingDistance,
  WaveletFamily,
  WaveletSubbands,
} from '../../lib/cvEngine';
import { imageToImageData, loadImageElement } from '../../lib/samples';

interface ApiGalleryItem {
  id: string;
  filename: string;
  label: string;
  category: 'similar' | 'unrelated';
  group: string;
  variant: string;
  url: string;
}

interface DatasetRecord {
  id: string;
  group: string;
  category: 'similar' | 'unrelated';
  label: string;
  variant: string;
  imgData: ImageData;
  previewUrl: string;
}

function matrixToCanvasUrl(mat: number[][]): string {
  const h = mat.length;
  const w = mat[0].length;
  let maxV = 1e-6;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const av = Math.abs(mat[y][x]);
      if (av > maxV) maxV = av;
    }
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const norm = Math.min(255, Math.round((Math.abs(mat[y][x]) / maxV) * 255));
      const idx = (y * w + x) * 4;
      img.data[idx] = norm;
      img.data[idx + 1] = norm;
      img.data[idx + 2] = Math.min(255, Math.round(norm * 1.15));
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

export const Lab4Panel: React.FC = () => {
  const [family, setFamily] = useState<WaveletFamily>('db4');
  const [level, setLevel] = useState<1 | 2 | 3>(3);
  const [thresholdBits, setThresholdBits] = useState(14);
  const [dataset, setDataset] = useState<DatasetRecord[]>([]);
  const [queryId, setQueryId] = useState<string>('');
  const [customQuery, setCustomQuery] = useState<{ label: string; imgData: ImageData; previewUrl: string } | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'similar' | 'unrelated'>('all');

  useEffect(() => {
    let active = true;
    fetch('/api/lab4/gallery')
      .then((res) => (res.ok ? res.json() : null))
      .then(async (payload: { items?: ApiGalleryItem[] } | null) => {
        if (!active || !payload?.items?.length) return;
        const loaded = await Promise.all(
          payload.items.map(async (item) => {
            const img = await loadImageElement(item.url);
            const imgData = imageToImageData(img, 160, 120);
            return {
              id: item.id,
              group: item.group,
              category: item.category,
              label: item.label,
              variant: item.variant,
              imgData,
              previewUrl: item.url,
            } satisfies DatasetRecord;
          })
        );
        if (!active) return;
        setDataset(loaded);
        if (loaded.length > 0) {
          setQueryId(loaded[0].id);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const evaluated = useMemo(() => {
    if (dataset.length === 0) return null;
    const computed = dataset.map((rec) => ({
      rec,
      wavelet: computeWaveletHash(rec.imgData, family, level),
    }));

    const pairs: Array<{ a: string; b: string; sameGroup: boolean; dist: number }> = [];
    for (let i = 0; i < computed.length; i++) {
      for (let j = i + 1; j < computed.length; j++) {
        pairs.push({
          a: computed[i].rec.label,
          b: computed[j].rec.label,
          sameGroup: computed[i].rec.group === computed[j].rec.group,
          dist: hammingDistance(computed[i].wavelet.hashBits, computed[j].wavelet.hashBits),
        });
      }
    }

    const totalPos = pairs.filter((p) => p.sameGroup).length;
    const totalNeg = pairs.filter((p) => !p.sameGroup).length;
    const rocPoints: Array<{ thr: number; fpr: number; tpr: number }> = [];
    for (let t = 0; t <= 64; t += 2) {
      const tp = pairs.filter((p) => p.sameGroup && p.dist <= t).length;
      const fp = pairs.filter((p) => !p.sameGroup && p.dist <= t).length;
      rocPoints.push({
        thr: t,
        fpr: totalNeg ? fp / totalNeg : 0,
        tpr: totalPos ? tp / totalPos : 0,
      });
    }
    let auc = 0;
    for (let i = 1; i < rocPoints.length; i++) {
      const dx = rocPoints[i].fpr - rocPoints[i - 1].fpr;
      const avgY = (rocPoints[i].tpr + rocPoints[i - 1].tpr) / 2;
      auc += dx * avgY;
    }

    let tp = 0, fp = 0, tn = 0, fn = 0;
    for (const p of pairs) {
      const predSim = p.dist <= thresholdBits;
      if (p.sameGroup && predSim) tp++;
      else if (!p.sameGroup && predSim) fp++;
      else if (!p.sameGroup && !predSim) tn++;
      else fn++;
    }
    const accuracy = (tp + tn) / Math.max(1, pairs.length);
    const sensitivity = tp / Math.max(1, tp + fn);
    const specificity = tn / Math.max(1, tn + fp);

    let qWavelet: WaveletSubbands;
    let qLabel: string;
    let qPreview: string;
    if (customQuery) {
      qWavelet = computeWaveletHash(customQuery.imgData, family, level);
      qLabel = `Ảnh tải lên: ${customQuery.label}`;
      qPreview = customQuery.previewUrl;
    } else {
      const found = computed.find((c) => c.rec.id === queryId) || computed[0];
      qWavelet = found.wavelet;
      qLabel = found.rec.label;
      qPreview = found.rec.previewUrl;
    }

    const searchRanked = computed
      .map((c) => ({
        rec: c.rec,
        dist: hammingDistance(qWavelet.hashBits, c.wavelet.hashBits),
      }))
      .sort((x, y) => x.dist - y.dist);

    const subbandUrls = {
      ll: matrixToCanvasUrl(qWavelet.ll),
      lh: matrixToCanvasUrl(qWavelet.lh),
      hl: matrixToCanvasUrl(qWavelet.hl),
      hh: matrixToCanvasUrl(qWavelet.hh),
    };

    const similarCount = dataset.filter((d) => d.category === 'similar').length;
    const unrelatedCount = dataset.filter((d) => d.category === 'unrelated').length;

    return {
      pairs,
      similarCount,
      unrelatedCount,
      rocPoints,
      auc: Math.min(1, Math.max(0, auc)),
      tp,
      fp,
      tn,
      fn,
      accuracy,
      sensitivity,
      specificity,
      qWavelet,
      qLabel,
      qPreview,
      searchRanked,
      subbandUrls,
    };
  }, [dataset, family, level, thresholdBits, queryId, customQuery]);

  if (!evaluated) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        Đang đọc toàn bộ kho ảnh Lab4/data/ &amp; tính toán mã băm Wavelet 64-bit...
      </div>
    );
  }

  const filteredSearch = evaluated.searchRanked.filter((item) =>
    filterMode === 'all' ? true : item.rec.category === filterMode
  );

  const W = 280, H = 220, pad = 28;
  const pw = W - pad * 1.5;
  const ph = H - pad * 1.6;
  const rocPath = evaluated.rocPoints
    .map((pt, idx) => {
      const x = pad + pt.fpr * pw;
      const y = pad / 2 + ph - pt.tpr * ph;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  const currFpr = evaluated.fp / Math.max(1, evaluated.fp + evaluated.tn);
  const currTpr = evaluated.tp / Math.max(1, evaluated.tp + evaluated.fn);
  const dotX = pad + currFpr * pw;
  const dotY = pad / 2 + ph - currTpr * ph;

  return (
    <div className="space-y-6">
      {/* Dataset Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-slate-700">
          <span className="font-semibold text-slate-900">Kho dữ liệu thực tế: <code className="font-mono text-blue-700">Lab4/data/</code></span>
          <span className="font-mono text-slate-500">
            Tổng {dataset.length} ảnh ({evaluated.similarCount} ảnh giống nhau theo nhóm · {evaluated.unrelatedCount} ảnh khác hoàn toàn)
          </span>
        </div>
        <span className="font-mono text-slate-500 tabular-nums">
          Đánh giá {evaluated.pairs.length} cặp kết hợp
        </span>
      </div>

      {/* Top Controls & Wavelet Hash Decomposition */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-4 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">Tham số Wavelet Hash (PyWavelets)</h3>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <label className="block text-xs font-semibold text-slate-700">1. Họ Wavelet (Wavelet Family)</label>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1">
              {(['haar', 'db4', 'bior1.3'] as const).map((fam) => (
                <button
                  key={fam}
                  type="button"
                  onClick={() => setFamily(fam)}
                  className={`rounded-md py-1.5 font-mono text-xs font-medium transition-colors ${
                    family === fam ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {fam}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <label className="block text-xs font-semibold text-slate-700">2. Cấp độ phân rã (Level)</label>
            <div className="grid grid-cols-3 gap-1.5">
              {([1, 2, 3] as const).map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setLevel(lv)}
                  className={`rounded-lg border py-1.5 font-mono text-xs font-medium ${
                    level === lv ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700'
                  }`}
                >
                  Level {lv}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-700">3. Ngưỡng khoảng cách Hamming (τ)</span>
              <span className="font-mono font-bold text-blue-600 tabular-nums">≤ {thresholdBits} bits</span>
            </div>
            <input
              type="range"
              min={2}
              max={32}
              value={thresholdBits}
              onChange={(e) => setThresholdBits(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-[11px] text-slate-500">
              Cặp ảnh có D_H ≤ {thresholdBits} được phân loại là <strong>Tương tự</strong>; ngược lại là{' '}
              <strong>Khác biệt</strong>.
            </p>
          </div>

          {/* 64-bit Wavelet Hash Grid */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Mã băm 64-bit của ảnh truy vấn</span>
              <span className="font-mono text-[11px] text-slate-500">8×8 bits</span>
            </div>
            <div className="mx-auto grid w-fit grid-cols-8 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-2">
              {evaluated.qWavelet.hashBits.map((bit, i) => (
                <div
                  key={i}
                  className={`flex h-5 w-5 items-center justify-center rounded-sm font-mono text-[10px] font-semibold ${
                    bit === 1 ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200'
                  }`}
                >
                  {bit}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Subbands + ROC + Metrics */}
        <div className="lg:col-span-8 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* 4 Subbands */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold text-slate-900">Phân rã 4 Subband Wavelet 2D ({family}, L{level})</h4>
                <span className="font-mono text-[11px] text-slate-500 truncate max-w-[140px]">
                  {evaluated.qLabel}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'LL (Xấp xỉ)', url: evaluated.subbandUrls.ll },
                  { key: 'LH (Biên ngang)', url: evaluated.subbandUrls.lh },
                  { key: 'HL (Biên dọc)', url: evaluated.subbandUrls.hl },
                  { key: 'HH (Biên chéo)', url: evaluated.subbandUrls.hh },
                ].map((sb) => (
                  <div key={sb.key} className="space-y-1">
                    <div className="overflow-hidden rounded border border-slate-200 bg-slate-950 aspect-[4/3]">
                      <img src={sb.url} alt={sb.key} className="h-full w-full object-cover [image-rendering:pixelated]" />
                    </div>
                    <div className="text-center font-mono text-[11px] text-slate-600">{sb.key}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live ROC Curve */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-900">Đường cong ROC (Receiver Operating Characteristic)</h4>
                <span className="font-mono text-xs font-bold text-blue-600 tabular-nums">
                  AUC = {evaluated.auc.toFixed(3)}
                </span>
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
                <line x1={pad} y1={pad / 2} x2={pad} y2={pad / 2 + ph} stroke="#CBD5E1" strokeWidth="1" />
                <line x1={pad} y1={pad / 2 + ph} x2={pad + pw} y2={pad / 2 + ph} stroke="#CBD5E1" strokeWidth="1" />
                <line
                  x1={pad}
                  y1={pad / 2 + ph}
                  x2={pad + pw}
                  y2={pad / 2}
                  stroke="#94A3B8"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <path d={rocPath} fill="none" stroke="#2563EB" strokeWidth="2.2" />
                <circle cx={dotX} cy={dotY} r="5" fill="#DC2626" stroke="#FFFFFF" strokeWidth="1.5" />
                <text x={pad + pw / 2} y={H - 4} textAnchor="middle" className="fill-slate-500 font-mono text-[10px]">
                  False Positive Rate (1 - Specificity)
                </text>
                <text
                  x={10}
                  y={pad / 2 + ph / 2}
                  textAnchor="middle"
                  transform={`rotate(-90 10 ${pad / 2 + ph / 2})`}
                  className="fill-slate-500 font-mono text-[10px]"
                >
                  TPR (Sensitivity)
                </text>
              </svg>
              <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                Điểm đỏ: Ngưỡng τ={thresholdBits} (FPR={currFpr.toFixed(2)}, TPR={currTpr.toFixed(2)})
              </div>
            </div>
          </div>

          {/* Evaluation KPIs & Confusion Matrix */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-xs text-slate-500">Độ chính xác (Accuracy)</div>
              <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {(evaluated.accuracy * 100).toFixed(1)}%
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-xs text-slate-500">Độ nhạy (Sensitivity)</div>
              <div className="mt-1 font-mono text-2xl font-bold text-emerald-600 tabular-nums">
                {(evaluated.sensitivity * 100).toFixed(1)}%
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-xs text-slate-500">Độ đặc biệt (Specificity)</div>
              <div className="mt-1 font-mono text-2xl font-bold text-blue-600 tabular-nums">
                {(evaluated.specificity * 100).toFixed(1)}%
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-xs text-slate-500">Confusion (TP/FP/TN/FN)</div>
              <div className="mt-1 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {evaluated.tp} / {evaluated.fp} / {evaluated.tn} / {evaluated.fn}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Warehouse Browse + Image Search */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              Kho ảnh Lab4/data/ &amp; Xếp hạng Tìm kiếm theo Khoảng cách Hamming
            </h4>
            <p className="text-xs text-slate-500">
              Bấm vào bất kỳ ảnh nào trong kho (hoặc tải ảnh riêng) để đối chiếu với toàn bộ {dataset.length} ảnh giống nhau &amp; không giống nhau.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs">
              {[
                { id: 'all', label: `Tất cả (${dataset.length})` },
                { id: 'similar', label: `Giống nhau (${evaluated.similarCount})` },
                { id: 'unrelated', label: `Không giống (${evaluated.unrelatedCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id as typeof filterMode)}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    filterMode === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
              <Upload className="h-3.5 w-3.5" />
              Tải ảnh Truy vấn
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const url = URL.createObjectURL(f);
                  try {
                    const img = await loadImageElement(url);
                    setCustomQuery({
                      label: f.name,
                      imgData: imageToImageData(img, 160, 120),
                      previewUrl: url,
                    });
                  } catch {
                    // ignore
                  }
                }}
              />
            </label>

            {customQuery && (
              <button
                type="button"
                onClick={() => setCustomQuery(null)}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                Dùng lại ảnh kho
              </button>
            )}
          </div>
        </div>

        {/* Active Query Strip */}
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/60 p-3">
          <img
            src={evaluated.qPreview}
            alt={evaluated.qLabel}
            className="h-12 w-16 rounded border border-blue-200 object-cover shrink-0"
          />
          <div className="text-xs">
            <div className="font-semibold text-slate-900">Ảnh truy vấn hiện tại: {evaluated.qLabel}</div>
            <div className="font-mono text-[11px] text-slate-600">
              Hiển thị {filteredSearch.length} ảnh trong kho xếp hạng từ D_H nhỏ nhất (gần nhất) → lớn nhất (khác biệt)
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {filteredSearch.map((item, rank) => {
            const isMatch = item.dist <= thresholdBits;
            const isActive = !customQuery && item.rec.id === queryId;
            return (
              <button
                key={item.rec.id}
                type="button"
                onClick={() => {
                  setCustomQuery(null);
                  setQueryId(item.rec.id);
                }}
                className={`group rounded-lg border p-2 text-left transition-colors ${
                  isActive ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="aspect-[4/3] overflow-hidden rounded bg-slate-100">
                  <img src={item.rec.previewUrl} alt={item.rec.label} loading="lazy" className="h-full w-full object-cover" />
                </div>
                <div className="mt-2 truncate text-xs font-semibold text-slate-900" title={item.rec.label}>
                  #{rank + 1} · {item.rec.label}
                </div>
                <div className="mt-0.5 flex items-center justify-between font-mono text-[11px] tabular-nums">
                  <span className="text-slate-500">D_H = {item.dist}</span>
                  <span className={isMatch ? 'font-semibold text-emerald-600' : 'text-rose-600'}>
                    {isMatch ? 'Tương tự' : 'Khác'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
