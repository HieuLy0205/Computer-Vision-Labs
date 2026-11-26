import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  CannyCondition,
  computeHistogram,
  runCannyPipeline,
} from '../../lib/cvEngine';
import { imageToImageData, loadImageElement, SAMPLE_IMAGES } from '../../lib/samples';
import { SplitCompareCanvas } from '../SplitCompareCanvas';
import { HistogramComparePanel } from '../charts/HistogramComparePanel';

type CannyViewStage =
  | 'final'
  | 'gaussian'
  | 'gradient'
  | 'nms'
  | 'double_thresh'
  | 'sobel'
  | 'laplacian'
  | 'segmented';

const STAGE_LABELS: Record<CannyViewStage, { step: string; title: string; desc: string }> = {
  gaussian: {
    step: 'Bước 1/5',
    title: 'Giảm nhiễu Gaussian Blur (σ)',
    desc: 'Làm mượt ảnh xám bằng nhân Gaussian nhằm triệt tiêu nhiễu cao tần trước khi lấy đạo hàm.',
  },
  gradient: {
    step: 'Bước 2/5',
    title: 'Tính toán Gradient (Sobel |G|)',
    desc: 'Tính đạo hàm theo trục X, Y để thu được cường độ biến thiên biên |G| và góc hướng cạnh θ.',
  },
  nms: {
    step: 'Bước 3/5',
    title: 'Non-Maximum Suppression (NMS)',
    desc: 'Làm mảnh đường biên xuống còn đúng 1 pixel bằng cách giữ lại cực đại cục bộ dọc theo hướng gradient.',
  },
  double_thresh: {
    step: 'Bước 4/5',
    title: 'Ngưỡng kép (Xanh: Strong · Vàng: Weak)',
    desc: 'Điểm ≥ T_high là Cạnh mạnh (xanh lá); điểm trong [T_low, T_high) là Cạnh yếu (vàng cam).',
  },
  final: {
    step: 'Bước 5/5',
    title: 'Hysteresis Tracking (Canny Cuối cùng)',
    desc: 'Chỉ giữ cạnh yếu nếu nó nối liền với ít nhất một cạnh mạnh; loại bỏ toàn bộ đốm nhiễu cô lập.',
  },
  sobel: {
    step: 'So sánh',
    title: 'Toán tử Sobel (Biên dày, không NMS)',
    desc: 'Trả về bản đồ gradient liên tục nhưng đường biên dày nhiều pixel và dễ lẫn nhiễu nền.',
  },
  laplacian: {
    step: 'So sánh',
    title: 'Toán tử Laplacian (Đạo hàm bậc 2)',
    desc: 'Nhạy cảm rất cao với nhiễu hạt, thường tạo đường viền kép xung quanh cạnh sắc nét.',
  },
  segmented: {
    step: 'Mục II.4',
    title: 'Kết hợp Phân đoạn Vùng & Nhận dạng Biên',
    desc: 'Phủ đường biên Canny khép kín lên ảnh gốc để khoanh vùng đối tượng và hỗ trợ tìm Contour/Hình dạng.',
  },
};

export const Lab3Panel: React.FC = () => {
  const [selectedSample, setSelectedSample] = useState(SAMPLE_IMAGES[0].src);
  const [rawImage, setRawImage] = useState<ImageData | null>(null);

  const [sigma, setSigma] = useState(1.4);
  const [lowThresh, setLowThresh] = useState(45);
  const [highThresh, setHighThresh] = useState(125);
  const [condition, setCondition] = useState<CannyCondition>('normal');
  const [autoCanny, setAutoCanny] = useState(false);
  const [colorCanny, setColorCanny] = useState(false);
  const [activeStage, setActiveStage] = useState<CannyViewStage>('final');

  useEffect(() => {
    let active = true;
    loadImageElement(selectedSample)
      .then((img) => {
        if (active) setRawImage(imageToImageData(img, 420, 315));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedSample]);

  const result = useMemo(() => {
    if (!rawImage) return null;
    return runCannyPipeline(rawImage, {
      sigma,
      lowThresh,
      highThresh,
      condition,
      autoCanny,
      colorCanny,
    });
  }, [rawImage, sigma, lowThresh, highThresh, condition, autoCanny, colorCanny]);

  const activeImageData = useMemo(() => {
    if (!result) return null;
    switch (activeStage) {
      case 'gaussian':
        return result.gaussian;
      case 'gradient':
        return result.gradientMag;
      case 'nms':
        return result.nms;
      case 'double_thresh':
        return result.doubleThreshold;
      case 'sobel':
        return result.sobel;
      case 'laplacian':
        return result.laplacian;
      case 'segmented':
        return result.segmentedRegions;
      default:
        return result.finalEdges;
    }
  }, [result, activeStage]);

  const origHist = useMemo(
    () => (result?.inputConditioned ? computeHistogram(result.inputConditioned) : null),
    [result]
  );
  const stageHist = useMemo(
    () => (activeImageData ? computeHistogram(activeImageData) : null),
    [activeImageData]
  );

  const histObservations = useMemo(() => {
    const notes: string[] = [];
    if (activeStage === 'gaussian') {
      notes.push(
        `Bước 1 (Gaussian σ=${sigma.toFixed(1)}): làm mịn ảnh nên độ trải Histogram (σ) thu hẹp nhẹ so với đầu vào, loại bỏ các gai nhiễu cao tần cục bộ.`
      );
    } else if (activeStage === 'gradient' || activeStage === 'sobel' || activeStage === 'laplacian') {
      notes.push(
        `Bản đồ biên (${activeStage.toUpperCase()}): các vùng nền trơn có đạo hàm ≈ 0 tạo đỉnh cao vút ở bin 0..20, phần đuôi kéo dài về phải tương ứng các cạnh dốc.`
      );
    } else if (activeStage === 'nms') {
      notes.push(
        'Bước 3 (NMS): triệt tiêu mọi pixel không phải cực đại dọc hướng gradient -> phần lớn pixel bị ép về bin 0, chỉ còn ít điểm mảnh nằm rải rác trên dải cao.'
      );
    } else if (activeStage === 'double_thresh') {
      notes.push(
        `Bước 4 (Ngưỡng kép T_low=${autoCanny && result ? result.autoLow : lowThresh}, T_high=${autoCanny && result ? result.autoHigh : highThresh}): tách rõ nền (0), cạnh yếu (cam) và cạnh mạnh (xanh).`
      );
    } else if (activeStage === 'final') {
      notes.push(
        `Bước 5 (Canny Cuối): Histogram chuyển hẳn sang nhị phân thuần túy (0 và 255) với mật độ điểm biên ${result?.edgeDensityPct ?? 0}% toàn khung hình.`
      );
    } else {
      notes.push('Phủ biên phân đoạn lên ảnh gốc: phân bố tổng thể bám sát ảnh gốc nhưng xuất hiện thêm các xung màu Cyan dọc đường biên vật thể.');
    }
    if (condition === 'low_contrast') {
      notes.push('Chế độ Độ tương phản thấp: quan sát Histogram "Trước" bị co cụm chặt ở giữa quanh bin 128 — nên bật Auto-Canny để tự thích nghi.');
    } else if (condition === 'noisy') {
      notes.push('Chế độ Ảnh nhiều nhiễu: Histogram "Trước" bị xù xì rộng hơn, cần tăng σ Gaussian để tránh biên giả.');
    }
    return notes;
  }, [activeStage, sigma, lowThresh, highThresh, autoCanny, result, condition]);

  const resetDefaults = () => {
    setSigma(1.4);
    setLowThresh(45);
    setHighThresh(125);
    setCondition('normal');
    setAutoCanny(false);
    setColorCanny(false);
    setActiveStage('final');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Control Column */}
        <div className="lg:col-span-4 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Tham số Thuật toán Canny</h3>
            <button
              type="button"
              onClick={resetDefaults}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Mặc định
            </button>
          </div>

          {/* Sample Selector */}
          <div className="grid grid-cols-3 gap-1.5 border-t border-slate-100 pt-3">
            {SAMPLE_IMAGES.slice(0, 3).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSample(s.src)}
                className={`rounded-lg border px-2 py-1.5 text-left text-[11px] font-medium truncate ${
                  selectedSample === s.src
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Image Conditions (Mục II.3) */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <label className="block text-xs font-semibold text-slate-900">1. Loại ảnh thử nghiệm (Mục II.3)</label>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                { id: 'normal', label: 'Ảnh chuẩn' },
                { id: 'noisy', label: 'Ảnh nhiều nhiễu' },
                { id: 'low_contrast', label: 'Độ tương phản thấp' },
                { id: 'high_detail', label: 'Ảnh nhiều chi tiết' },
              ] as const).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCondition(c.id)}
                  className={`rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium truncate ${
                    condition === c.id
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sigma, Low & High Thresholds (Mục I.2 & II.2) */}
          <div className="space-y-3 border-t border-slate-100 pt-3">
            <div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>2a. Sigma Gaussian (σ)</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">{sigma.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={3.0}
                step={0.1}
                value={sigma}
                onChange={(e) => setSigma(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-medium text-slate-700">Auto-Canny (theo Median)</span>
              <button
                type="button"
                onClick={() => setAutoCanny((v) => !v)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  autoCanny ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {autoCanny && result ? `${result.autoLow}/${result.autoHigh}` : 'Tắt'}
              </button>
            </div>

            <div className={autoCanny ? 'opacity-50 pointer-events-none space-y-2.5' : 'space-y-2.5'}>
              <div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>2b. Ngưỡng thấp (T_low)</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">{lowThresh}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={140}
                  value={lowThresh}
                  onChange={(e) => setLowThresh(Math.min(Number(e.target.value), highThresh - 10))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>2b. Ngưỡng cao (T_high)</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">{highThresh}</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={230}
                  value={highThresh}
                  onChange={(e) => setHighThresh(Math.max(Number(e.target.value), lowThresh + 10))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
              <span className="text-xs font-medium text-slate-700">Mở rộng III.3: Canny Ảnh màu (RGB Max)</span>
              <button
                type="button"
                onClick={() => setColorCanny((v) => !v)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  colorCanny ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {colorCanny ? 'Đang bật' : 'Xám'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Stage: 5-Step Pipeline Switcher + Split Canvas */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            {/* Step buttons */}
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
              {([
                { id: 'gaussian', label: '1. Gaussian' },
                { id: 'gradient', label: '2. Gradient' },
                { id: 'nms', label: '3. NMS' },
                { id: 'double_thresh', label: '4. Ngưỡng kép' },
                { id: 'final', label: '5. Canny Cuối' },
                { id: 'sobel', label: 'So sánh Sobel' },
                { id: 'laplacian', label: 'So sánh Laplacian' },
                { id: 'segmented', label: 'Phân đoạn & Vùng' },
              ] as const).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setActiveStage(st.id)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    activeStage === st.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <div>
                <div className="text-xs font-semibold text-slate-900">
                  {STAGE_LABELS[activeStage].step} · {STAGE_LABELS[activeStage].title}
                </div>
                <p className="text-xs text-slate-600">{STAGE_LABELS[activeStage].desc}</p>
              </div>
              {result && (
                <div className="font-mono text-[11px] text-slate-700 tabular-nums shrink-0">
                  Mật độ biên: <strong className="text-blue-600">{result.edgeDensityPct}%</strong>
                </div>
              )}
            </div>

            <SplitCompareCanvas
              original={result?.inputConditioned || rawImage}
              processed={activeImageData}
              originalLabel="Ảnh đầu vào"
              processedLabel={STAGE_LABELS[activeStage].title}
            />

            {/* Metrics Strip */}
            {result && (
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-[11px] text-slate-500">Cạnh mạnh (Strong ≥ T_high)</div>
                  <div className="font-mono text-sm font-bold text-emerald-700 tabular-nums">
                    {result.strongCount.toLocaleString()} px
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-[11px] text-slate-500">Cạnh yếu (Weak ∈ [T_low, T_high))</div>
                  <div className="font-mono text-sm font-bold text-amber-600 tabular-nums">
                    {result.weakCount.toLocaleString()} px
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-[11px] text-slate-500">Tỷ lệ T_high / T_low</div>
                  <div className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                    {(
                      (autoCanny ? result.autoHigh : highThresh) /
                      Math.max(1, autoCanny ? result.autoLow : lowThresh)
                    ).toFixed(2)}
                    :1
                  </div>
                </div>
              </div>
            )}
          </div>

          <HistogramComparePanel
            before={origHist}
            after={stageHist}
            beforeLabel="Trước (Ảnh đầu vào)"
            afterLabel={`Sau (${STAGE_LABELS[activeStage].title})`}
            mode={activeStage === 'double_thresh' || activeStage === 'segmented' ? 'rgb' : 'gray'}
            observations={histObservations}
          />
        </div>
      </div>

      {/* Mục I & III: Lý thuyết & 4 Câu hỏi Mở rộng */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2.5">
          <h4 className="text-sm font-semibold text-slate-900">So sánh Canny vs Sobel vs Laplacian &amp; Ứng dụng</h4>
          <p className="text-xs leading-relaxed text-slate-600">
            <strong>Sobel</strong> (đạo hàm bậc 1) cho đường biên dày và nhạy ngưỡng đơn; <strong>Laplacian</strong> (đạo hàm bậc 2) bắt biên nhanh nhưng cực nhạy với nhiễu hạt. <strong>Canny</strong> vượt trội nhờ kết hợp làm mượt Gaussian, làm mảnh biên 1 px (NMS) và theo dõi liên thông ngưỡng kép (Hysteresis).
          </p>
          <p className="text-xs leading-relaxed text-slate-600">
            <strong>Ứng dụng phổ biến:</strong> Xe tự hành (dò vạch kẻ đường Lane Detection), quét tài liệu/OCR, kiểm tra vi mạch PCB công nghiệp và phân đoạn mô ảnh y tế.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
          <h4 className="text-sm font-semibold text-slate-900">Giải đáp 4 Câu hỏi Mở rộng (Mục III)</h4>
          <ul className="space-y-1.5 text-xs leading-relaxed text-slate-600">
            <li><strong>1. Đánh giá chất lượng cạnh:</strong> Dùng chỉ số Pratt&apos;s Figure of Merit (PFOM), F1-score so với ground-truth và độ liên tục đường biên.</li>
            <li><strong>2. Cải thiện hiệu suất:</strong> Dùng Auto-Canny theo trung vị, CLAHE cho ảnh tối và Bilateral Filter thay Gaussian để giữ cạnh sắc.</li>
            <li><strong>3. Canny cho ảnh màu:</strong> Bật nút <em>Canny Ảnh màu</em> ở cột trái — tính gradient Sobel trên từng kênh R, G, B rồi lấy cực đại/OR biên.</li>
            <li><strong>4. Canny cho Video:</strong> Chạy theo từng frame qua <code>cv2.VideoCapture</code>, giới hạn vùng ROI và kết hợp làm mượt thời gian hoặc MOG2.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
