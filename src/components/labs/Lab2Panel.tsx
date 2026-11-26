import React, { useEffect, useMemo, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import {
  addSyntheticNoise,
  applyPointOperations,
  bilateralFilter2D,
  computeHistogram,
  computeImageQuality,
  convolve2D,
  edgeDetectOperator,
  LINEAR_KERNELS,
  medianFilter2D,
} from '../../lib/cvEngine';
import { imageToImageData, loadImageElement, SAMPLE_IMAGES } from '../../lib/samples';
import { SplitCompareCanvas } from '../SplitCompareCanvas';
import { HistogramComparePanel } from '../charts/HistogramComparePanel';

type Ch2Section = 'point_linear' | 'advanced';
type AdvMode = 'sobel' | 'prewitt' | 'custom' | 'median' | 'bilateral';

const CUSTOM_PRESETS: Record<string, { label: string; kernel: number[] }> = {
  emboss: { label: 'Emboss (Nổi 3D)', kernel: [-2, -1, 0, -1, 1, 1, 0, 1, 2] },
  laplacian: { label: 'Laplacian', kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0] },
  outline: { label: 'Outline', kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] },
};

export const Lab2Panel: React.FC = () => {
  const [selectedSample, setSelectedSample] = useState(SAMPLE_IMAGES[0].src);
  const [rawImage, setRawImage] = useState<ImageData | null>(null);
  const [section, setSection] = useState<Ch2Section>('point_linear');

  // Part I: Point Operations (PDF Chương 2 Phần 1: Brightness, Contrast, Gamma, Hist Equalize, Negative, Threshold)
  const [brightness, setBrightness] = useState(20);
  const [contrast, setContrast] = useState(1.15);
  const [gamma, setGamma] = useState(1.0);
  const [histEqualize, setHistEqualize] = useState(false);
  const [negative, setNegative] = useState(false);
  const [thresholdEnabled, setThresholdEnabled] = useState(false);
  const [threshold, setThreshold] = useState(128);

  // Part II: Linear Filtering
  const [kernelKey, setKernelKey] = useState<string>('sharpen');
  const [animatingWindow, setAnimatingWindow] = useState(false);
  const [winPos, setWinPos] = useState({ row: 1, col: 1 });

  // Part III: Advanced (Sobel/Prewitt, Custom Kernel, Filter Comparison, Median/Bilateral)
  const [noiseType, setNoiseType] = useState<'none' | 'salt_pepper' | 'gaussian'>('salt_pepper');
  const [noisePct, setNoisePct] = useState(6);
  const [advMode, setAdvMode] = useState<AdvMode>('median');
  const [customKernel, setCustomKernel] = useState<number[]>(CUSTOM_PRESETS.emboss.kernel);
  const [medianSize, setMedianSize] = useState<3 | 5>(5);
  const [sigmaSpace, setSigmaSpace] = useState(4);
  const [sigmaColor, setSigmaColor] = useState(45);

  useEffect(() => {
    let active = true;
    loadImageElement(selectedSample)
      .then((img) => {
        if (active) setRawImage(imageToImageData(img, 380, 285));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedSample]);

  useEffect(() => {
    if (!animatingWindow) return;
    const timer = setInterval(() => {
      setWinPos((prev) => {
        const nextCol = prev.col + 1;
        if (nextCol <= 5) return { row: prev.row, col: nextCol };
        const nextRow = prev.row + 1;
        if (nextRow <= 5) return { row: nextRow, col: 1 };
        return { row: 1, col: 1 };
      });
    }, 450);
    return () => clearInterval(timer);
  }, [animatingWindow]);

  const pointLinearProcessed = useMemo(() => {
    if (!rawImage) return null;
    const afterPoint = applyPointOperations(rawImage, {
      brightness,
      contrast,
      gamma,
      histEqualize,
      negative,
      thresholdEnabled,
      threshold,
    });
    const kSpec = LINEAR_KERNELS[kernelKey];
    if (!kSpec || kernelKey === 'none') return afterPoint;
    return convolve2D(afterPoint, kSpec.kernel, kSpec.size);
  }, [rawImage, brightness, contrast, gamma, histEqualize, negative, thresholdEnabled, threshold, kernelKey]);

  const noisyImage = useMemo(() => {
    if (!rawImage) return null;
    return addSyntheticNoise(rawImage, noiseType, noisePct);
  }, [rawImage, noiseType, noisePct]);

  const advProcessed = useMemo(() => {
    if (!noisyImage) return null;
    if (advMode === 'sobel' || advMode === 'prewitt') return edgeDetectOperator(noisyImage, advMode);
    if (advMode === 'custom') return convolve2D(noisyImage, customKernel, 3);
    if (advMode === 'median') return medianFilter2D(noisyImage, medianSize);
    return bilateralFilter2D(noisyImage, 3, sigmaSpace, sigmaColor);
  }, [noisyImage, advMode, customKernel, medianSize, sigmaSpace, sigmaColor]);

  const benchmark = useMemo(() => {
    if (!rawImage || !noisyImage || section !== 'advanced') return [];
    const meanOut = convolve2D(noisyImage, LINEAR_KERNELS.mean5.kernel, 5);
    const gaussOut = convolve2D(noisyImage, LINEAR_KERNELS.gaussian5.kernel, 5);
    const medianOut = medianFilter2D(noisyImage, medianSize);
    const bilatOut = bilateralFilter2D(noisyImage, 3, sigmaSpace, sigmaColor);
    return [
      { name: 'Ảnh nhiễu đầu vào', data: computeImageQuality(rawImage, noisyImage), color: 'bg-slate-400' },
      { name: 'Mean 5×5 (Tuyến tính)', data: computeImageQuality(rawImage, meanOut), color: 'bg-blue-500' },
      { name: 'Gaussian 5×5 (Tuyến tính)', data: computeImageQuality(rawImage, gaussOut), color: 'bg-cyan-500' },
      { name: `Median ${medianSize}×${medianSize} (Phi tuyến)`, data: computeImageQuality(rawImage, medianOut), color: 'bg-emerald-600' },
      { name: 'Bilateral (Phi tuyến)', data: computeImageQuality(rawImage, bilatOut), color: 'bg-amber-500' },
    ];
  }, [rawImage, noisyImage, section, medianSize, sigmaSpace, sigmaColor]);

  const activeProcessed = section === 'point_linear' ? pointLinearProcessed : advProcessed;
  const activeOriginal = section === 'point_linear' ? rawImage : noisyImage;
  const origHist = useMemo(() => (activeOriginal ? computeHistogram(activeOriginal) : null), [activeOriginal]);
  const procHist = useMemo(() => (activeProcessed ? computeHistogram(activeProcessed) : null), [activeProcessed]);

  const activeKernel = LINEAR_KERNELS[kernelKey] || LINEAR_KERNELS.none;

  const histObservations = useMemo(() => {
    const notes: string[] = [];
    if (section === 'point_linear') {
      if (brightness !== 0) {
        notes.push(
          `Brightness ${brightness > 0 ? '+' : ''}${brightness}: dịch chuyển toàn bộ biểu đồ sang ${
            brightness > 0 ? 'phải (tăng mức sáng, dễ bão hòa tại bin 255)' : 'trái (giảm sáng, dễ bết đen tại bin 0)'
          }.`
        );
      }
      if (contrast !== 1) {
        notes.push(
          `Contrast ×${contrast.toFixed(2)}: ${
            contrast > 1
              ? 'kéo giãn khoảng trải Histogram (σ tăng), các chi tiết sáng-tối tách bạch hơn nhưng phần rìa dễ chạm ngưỡng 0/255.'
              : 'co hẹp Histogram về gần trung tâm, ảnh trông xám phẳng và giảm độ tương phản.'
          }`
        );
      }
      if (Math.abs(gamma - 1) > 0.03) {
        notes.push(
          `Gamma γ = ${gamma.toFixed(2)}: ${
            gamma < 1
              ? 'giãn phi tuyến vùng tối sang phải để nhìn rõ chi tiết trong bóng tối mà không làm cháy điểm 255.'
              : 'nén vùng tối-trung bình về bên trái, tăng độ đậm và chiều sâu ảnh.'
          }`
        );
      }
      if (histEqualize) {
        notes.push(
          'Histogram Equalization (CDF trên kênh Y): dàn phẳng phân bố cường độ sáng trên toàn dải [0..255], kéo dãn vùng có mật độ điểm ảnh cao.'
        );
      }
      if (negative) {
        notes.push('Biến đổi Âm bản (255 − I): lật đối xứng toàn bộ đồ thị Histogram qua trục trung tâm 127.5.');
      }
      if (thresholdEnabled) {
        notes.push(`Cắt ngưỡng Nhị phân (T = ${threshold}): toàn bộ dải liên tục sụp đổ thành đúng 2 cột gai tại bin 0 và bin 255.`);
      }
      if (kernelKey !== 'none') {
        notes.push(
          kernelKey === 'sharpen'
            ? `Tích chập ${activeKernel.label}: đẩy mạnh độ tương phản cục bộ ở vùng biên nên phần đuôi sáng/tối trên Histogram mở rộng nhẹ.`
            : `Tích chập ${activeKernel.label}: lấy trung bình lân cận làm giá trị điểm ảnh co cụm lại (giảm σ), các đỉnh Histogram nhọn và hẹp hơn.`
        );
      }
      if (notes.length === 0) {
        notes.push('Hiện chưa áp dụng biến đổi nào — biểu đồ Trước và Sau trùng khớp nhau hoàn toàn.');
      }
    } else {
      if (noiseType === 'salt_pepper') {
        notes.push(
          `Đầu vào nhiễu Muối–Tiêu (${noisePct}%): trên Histogram "Trước" xuất hiện 2 gai nhọn bất thường ở bin 0 (tiêu) và bin 255 (muối).`
        );
      } else if (noiseType === 'gaussian') {
        notes.push(`Đầu vào nhiễu Gaussian (${noisePct}%): làm đường Histogram "Trước" bị bè rộng và xù xì hơn ảnh gốc.`);
      }
      if (advMode === 'median') {
        notes.push(
          `Sau Median Filter (${medianSize}×${medianSize}): các gai cực trị 0/255 biến mất gần như hoàn toàn trên Histogram "Sau", đồng thời vẫn bảo toàn độ dốc cạnh sắc nét.`
        );
      } else if (advMode === 'bilateral') {
        notes.push(
          `Sau Bilateral Filter (σ_s=${sigmaSpace}, σ_r=${sigmaColor}): vùng đồng màu mịn lại khiến các đỉnh Histogram sắc gọn hơn nhưng vẫn giữ nguyên khoảng cách qua cạnh.`
        );
      } else if (advMode === 'sobel' || advMode === 'prewitt') {
        notes.push(
          `Sau phát hiện cạnh ${advMode.toUpperCase()}: đa số nền phẳng có gradient ≈ 0 nên Histogram dồn cực mạnh về bên trái (bin 0..25), phần đuôi kéo dài sang phải chính là các đường biên.`
        );
      } else {
        notes.push('Custom Kernel 3×3: phân bố Histogram thay đổi trực tiếp theo tổng trọng số (Sum) và tính chất vi phân/làm nổi của ma trận bạn nhập.');
      }
    }
    return notes;
  }, [
    section,
    brightness,
    contrast,
    gamma,
    histEqualize,
    negative,
    thresholdEnabled,
    threshold,
    kernelKey,
    activeKernel.label,
    noiseType,
    noisePct,
    advMode,
    medianSize,
    sigmaSpace,
    sigmaColor,
  ]);
  const maxPsnr = Math.max(...benchmark.map((b) => b.data.psnr), 40);

  const resetAll = () => {
    setBrightness(0);
    setContrast(1.0);
    setGamma(1.0);
    setHistEqualize(false);
    setNegative(false);
    setThresholdEnabled(false);
    setThreshold(128);
    setKernelKey('none');
  };

  return (
    <div className="space-y-4">
      {/* Sub-navigation between Chương 2 I+II vs III */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setSection('point_linear')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              section === 'point_linear' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Phần I &amp; II · Toán tử Điểm ảnh &amp; Lọc Tuyến tính
          </button>
          <button
            type="button"
            onClick={() => setSection('advanced')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              section === 'advanced' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Phần III · Sobel/Prewitt, Custom Kernel &amp; Lọc Phi tuyến
          </button>
        </div>

        <div className="flex items-center gap-2">
          {SAMPLE_IMAGES.slice(0, 3).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedSample(s.src)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium truncate max-w-[140px] ${
                selectedSample === s.src
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Controls Column */}
        {section === 'point_linear' ? (
          <div className="lg:col-span-4 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">I &amp; II. Điểm ảnh &amp; Lọc Tuyến tính</h3>
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Đặt lại
              </button>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-3">
              <div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>1. Độ sáng (Brightness β)</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {brightness >= 0 ? `+${brightness}` : brightness}
                  </span>
                </div>
                <input type="range" min={-100} max={100} value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full" />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>2. Độ tương phản (Contrast α)</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">×{contrast.toFixed(2)}</span>
                </div>
                <input type="range" min={0.3} max={2.2} step={0.05} value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full" />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>3. Biến đổi Gamma (s = c·r^γ)</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">γ = {gamma.toFixed(2)}</span>
                </div>
                <input type="range" min={0.25} max={2.8} step={0.05} value={gamma} onChange={(e) => setGamma(Number(e.target.value))} className="w-full" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-700">4. Cân bằng Histogram (CDF)</span>
                <button
                  type="button"
                  onClick={() => setHistEqualize((v) => !v)}
                  className={`rounded-md px-3 py-1 text-xs font-medium ${histEqualize ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  {histEqualize ? 'Đang bật' : 'Tắt'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-700">5. Biến đổi Âm bản (255 − I)</span>
                <button
                  type="button"
                  onClick={() => setNegative((v) => !v)}
                  className={`rounded-md px-3 py-1 text-xs font-medium ${negative ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  {negative ? 'Đang bật' : 'Tắt'}
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700">6. Cắt ngưỡng Nhị phân</span>
                  <button
                    type="button"
                    onClick={() => setThresholdEnabled((v) => !v)}
                    className={`rounded-md px-3 py-1 text-xs font-medium ${thresholdEnabled ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                  >
                    {thresholdEnabled ? `T = ${threshold}` : 'Tắt'}
                  </button>
                </div>
                {thresholdEnabled && (
                  <input type="range" min={0} max={255} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-full" />
                )}
              </div>
            </div>

            <div className="space-y-2.5 border-t border-slate-100 pt-3">
              <div className="text-xs font-semibold text-slate-900">II. Lọc Tuyến tính (Spatial Convolution)</div>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(LINEAR_KERNELS).map(([k, spec]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKernelKey(k)}
                    className={`rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium truncate ${
                      kernelKey === k ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {spec.label}
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-700">Kernel ({activeKernel.size}×{activeKernel.size})</span>
                  <span className="font-mono text-slate-500 truncate max-w-[160px]">{activeKernel.formula}</span>
                </div>
                <div
                  className="mx-auto grid gap-1"
                  style={{
                    gridTemplateColumns: `repeat(${activeKernel.size}, minmax(0, 1fr))`,
                    maxWidth: activeKernel.size === 5 ? '230px' : '170px',
                  }}
                >
                  {activeKernel.kernel.map((val, idx) => (
                    <div
                      key={idx}
                      className={`flex h-8 items-center justify-center rounded font-mono text-[11px] font-medium tabular-nums ${
                        val > 0 ? 'bg-blue-600 text-white' : val < 0 ? 'bg-rose-600 text-white' : 'border border-slate-200 bg-white text-slate-500'
                      }`}
                    >
                      {Number.isInteger(val) ? val : val.toFixed(2)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-4 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">III. Bài tập Nâng cao Chương 2</h3>

            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="block text-xs font-semibold text-slate-900">Bơm nhiễu kiểm chứng bộ lọc</label>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                {([
                  { id: 'none', label: 'Không nhiễu' },
                  { id: 'salt_pepper', label: 'Muối–Tiêu' },
                  { id: 'gaussian', label: 'Gaussian' },
                ] as const).map((nt) => (
                  <button
                    key={nt.id}
                    type="button"
                    onClick={() => setNoiseType(nt.id)}
                    className={`rounded-md py-1.5 text-[11px] font-medium ${noiseType === nt.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                  >
                    {nt.label}
                  </button>
                ))}
              </div>
              {noiseType !== 'none' && (
                <div>
                  <div className="flex justify-between text-xs text-slate-600 font-mono tabular-nums">
                    <span>Mức độ nhiễu</span>
                    <span className="font-semibold text-slate-900">{noisePct}%</span>
                  </div>
                  <input type="range" min={1} max={20} value={noisePct} onChange={(e) => setNoisePct(Number(e.target.value))} className="w-full" />
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="block text-xs font-semibold text-slate-900">Chọn kỹ thuật nâng cao</label>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { id: 'sobel', label: '1. Cạnh Sobel' },
                  { id: 'prewitt', label: '1. Cạnh Prewitt' },
                  { id: 'custom', label: '2. Tự thiết kế Kernel' },
                  { id: 'median', label: '4. Median Filter' },
                  { id: 'bilateral', label: '4. Bilateral Filter' },
                ] as const).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setAdvMode(m.id)}
                    className={`rounded-lg border px-2.5 py-2 text-left text-xs font-medium truncate ${
                      advMode === m.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {advMode === 'custom' && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap gap-1">
                  {Object.entries(CUSTOM_PRESETS).map(([k, p]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setCustomKernel(p.kernel)}
                      className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1.5 max-w-[200px]">
                  {customKernel.map((val, idx) => (
                    <input
                      key={idx}
                      type="number"
                      step={0.5}
                      value={val}
                      onChange={(e) => {
                        const next = [...customKernel];
                        next[idx] = Number(e.target.value) || 0;
                        setCustomKernel(next);
                      }}
                      className="rounded border border-slate-300 bg-white py-1.5 text-center font-mono text-xs text-slate-900 tabular-nums"
                    />
                  ))}
                </div>
              </div>
            )}

            {advMode === 'median' && (
              <div className="flex gap-2 border-t border-slate-100 pt-3">
                {([3, 5] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setMedianSize(sz)}
                    className={`flex-1 rounded-lg border py-1.5 text-xs font-medium ${
                      medianSize === sz ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    Median {sz}×{sz}
                  </button>
                ))}
              </div>
            )}

            {advMode === 'bilateral' && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div>
                  <div className="flex justify-between text-xs text-slate-600 font-mono">
                    <span>σ_s (Space)</span>
                    <span>{sigmaSpace}</span>
                  </div>
                  <input type="range" min={1} max={12} value={sigmaSpace} onChange={(e) => setSigmaSpace(Number(e.target.value))} className="w-full" />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-600 font-mono">
                    <span>σ_r (Color)</span>
                    <span>{sigmaColor}</span>
                  </div>
                  <input type="range" min={10} max={120} step={5} value={sigmaColor} onChange={(e) => setSigmaColor(Number(e.target.value))} className="w-full" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right Stage */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-900">
                {section === 'point_linear'
                  ? 'So sánh Trước / Sau (Toán tử Điểm ảnh & Lọc Tuyến tính)'
                  : `So sánh Đầu vào vs ${advMode.toUpperCase()}`}
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                {section === 'point_linear' ? activeKernel.label : `Nhiễu: ${noiseType} (${noisePct}%)`}
              </span>
            </div>
            <SplitCompareCanvas
              original={activeOriginal}
              processed={activeProcessed}
              originalLabel={section === 'point_linear' ? 'Ảnh gốc' : noiseType === 'none' ? 'Ảnh gốc' : `Nhiễu ${noisePct}%`}
              processedLabel={section === 'point_linear' ? 'Sau biến đổi' : advMode.toUpperCase()}
            />
          </div>

          {section === 'point_linear' ? (
            <>
              <HistogramComparePanel
                before={origHist}
                after={procHist}
                beforeLabel="Trước (Ảnh gốc)"
                afterLabel="Sau (Đã biến đổi)"
                mode={thresholdEnabled ? 'gray' : 'rgb'}
                observations={histObservations}
              />

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">Minh họa Cửa sổ Trượt Tích chập 2D (3×3)</h4>
                    <p className="text-xs text-slate-500">Tâm cửa sổ tại ({winPos.row}, {winPos.col}).</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAnimatingWindow((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    {animatingWindow ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {animatingWindow ? 'Tạm dừng' : 'Chạy mô phỏng'}
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 mx-auto w-fit">
                  {Array.from({ length: 49 }).map((_, idx) => {
                    const r = Math.floor(idx / 7);
                    const c = idx % 7;
                    const inWin = Math.abs(r - winPos.row) <= 1 && Math.abs(c - winPos.col) <= 1;
                    const isCenter = r === winPos.row && c === winPos.col;
                    return (
                      <div
                        key={idx}
                        className={`flex h-7 w-7 items-center justify-center rounded font-mono text-[10px] tabular-nums ${
                          isCenter
                            ? 'bg-blue-600 font-bold text-white'
                            : inWin
                            ? 'border border-blue-400 bg-blue-50 text-blue-900'
                            : 'border border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                      >
                        {40 + ((r * 23 + c * 37) % 180)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <HistogramComparePanel
                before={origHist}
                after={procHist}
                beforeLabel={noiseType === 'none' ? 'Trước (Ảnh gốc)' : `Trước (Nhiễu ${noisePct}%)`}
                afterLabel={`Sau (${advMode.toUpperCase()})`}
                mode={advMode === 'sobel' || advMode === 'prewitt' ? 'gray' : 'rgb'}
                observations={histObservations}
              />

              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">
                  3. So sánh Hiệu quả các Loại lọc (PSNR &amp; MSE trên cùng ảnh)
                </h4>
                <div className="space-y-2.5">
                  {benchmark.map((row) => {
                    const pct = Math.min(100, Math.max(4, (row.data.psnr / maxPsnr) * 100));
                    return (
                      <div key={row.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-800">{row.name}</span>
                          <span className="font-mono text-[11px] text-slate-600 tabular-nums">
                            PSNR: <strong className="text-slate-900">{row.data.psnr.toFixed(2)} dB</strong> · MSE: {row.data.mse.toFixed(1)}
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full transition-all duration-300 ${row.color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
