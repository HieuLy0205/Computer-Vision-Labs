import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, FolderTree, Play } from 'lucide-react';
import { SAMPLE_IMAGES } from '../lib/samples';

export type LabTabId = 'overview' | 'lab1' | 'lab2' | 'lab3' | 'lab4' | 'lab5';

interface OverviewSlideDeckProps {
  onSelectLab: (id: LabTabId) => void;
}

const SLIDES = [
  {
    id: 'lab1' as const,
    index: '01',
    chapter: 'Chương 1',
    title: 'Cơ bản OpenCV & Pillow · Không gian màu & Thao tác Ảnh',
    summary:
      'Đọc, hiển thị và xuất nhiều định dạng ảnh (.png, .jpg, .webp); chuyển đổi hệ màu RGB sang Grayscale (BT.601), HSV và CIE LAB; cắt vùng ROI, resize nội suy và vẽ hình học cơ bản.',
    highlights: [
      'Phân tích Histogram 256 mức trên cả 3 kênh màu RGB / HSV / LAB',
      'Soi trực tiếp giá trị điểm ảnh tại từng tọa độ (x, y)',
      'So sánh kích thước tệp nén PNG (lossless) vs JPEG vs WEBP',
    ],
    image: SAMPLE_IMAGES[1].src,
    metrics: [
      { label: 'Không gian màu', value: 'RGB · Gray · HSV · LAB' },
      { label: 'Thư viện', value: 'OpenCV + Pillow' },
      { label: 'Số bài tập', value: '5 Phần chuẩn' },
    ],
  },
  {
    id: 'lab2' as const,
    index: '02',
    chapter: 'Chương 2',
    title: 'Điểm ảnh, Lọc Tuyến tính, Sobel/Prewitt & Lọc Phi tuyến',
    summary:
      'Thực hành đầy đủ Chương 2: Toán tử điểm ảnh (Độ sáng, Tương phản, Âm bản, Ngưỡng), Lọc tuyến tính (Mean, Gaussian, Sharpen), phát hiện cạnh Sobel/Prewitt, Kernel tùy chỉnh và lọc phi tuyến Median/Bilateral.',
    highlights: [
      'Quan sát dịch chuyển & co giãn phổ mức xám trên biểu đồ Histogram kép',
      'Mô phỏng cửa sổ trượt tích chập 3×3 và chỉnh sửa trực tiếp trọng số Kernel',
      'Bảng đo định lượng MSE & PSNR (dB) so sánh 5 bộ lọc dưới nhiễu Muối–Tiêu',
    ],
    image: SAMPLE_IMAGES[0].src,
    metrics: [
      { label: 'Phần I & II', value: 'Điểm ảnh & Lọc Tuyến tính' },
      { label: 'Phần III', value: 'Sobel/Prewitt & Phi tuyến' },
      { label: 'Đo lường', value: 'Histogram · MSE · PSNR' },
    ],
  },
  {
    id: 'lab3' as const,
    index: '03',
    chapter: 'Chương 2 · Phần 2',
    title: 'Thuật toán Phát hiện Cạnh Canny (Canny Edge Detector)',
    summary:
      'Tìm hiểu và thực hành 5 bước thuật toán Canny (Gaussian → Gradient → NMS → Ngưỡng kép → Hysteresis), so sánh OpenCV vs Scikit-image, Sobel/Laplacian, thử nghiệm 3 điều kiện ảnh và phân đoạn vùng.',
    highlights: [
      'Trực quan hóa từng bước trong 5 giai đoạn của Canny Edge Detector',
      'Khảo sát σ, T_low, T_high, Auto-Canny và Canny trên ảnh màu RGB',
      'Thử nghiệm trên ảnh nhiều nhiễu, tương phản thấp và nhiều chi tiết',
    ],
    image: SAMPLE_IMAGES[0].src,
    metrics: [
      { label: '5 Bước Canny', value: 'Gaussian → NMS → Hysteresis' },
      { label: 'Thư viện', value: 'cv2.Canny & skimage' },
      { label: 'Mở rộng', value: 'Color Canny · Auto-Canny' },
    ],
  },
  {
    id: 'lab4' as const,
    index: '04',
    chapter: 'Chương 4',
    title: 'So sánh Tương đồng Ảnh với Biến đổi Wavelet & ROC',
    summary:
      'Phân rã đa phân giải 2D (LL, LH, HL, HH) bằng PyWavelets, lượng tử hóa thành mã băm 64-bit, tính khoảng cách Hamming và đánh giá hiệu năng qua đường cong ROC / AUC.',
    highlights: [
      'Trực quan hóa 4 subband tần số (LL, LH, HL, HH) & ma trận bit 8×8',
      'Thanh trượt ngưỡng Hamming cập nhật ma trận nhầm lẫn TP/FP/TN/FN và ROC',
      'Công cụ tìm kiếm ảnh tương đồng xếp hạng theo khoảng cách Hamming',
    ],
    image: SAMPLE_IMAGES[1].src,
    metrics: [
      { label: 'Họ Wavelet', value: 'haar · db4 · bior1.3' },
      { label: 'Đánh giá', value: 'Accuracy · Sens · Spec · ROC' },
      { label: 'Kích thước Hash', value: '64-bit nhị phân' },
    ],
  },
  {
    id: 'lab5' as const,
    index: '05',
    chapter: 'Thực hành Chuyên sâu',
    title: 'Nhận diện Khuôn mặt Thời gian thực với MTCNN & FaceNet',
    summary:
      'Thu nhận khung hình qua Webcam OpenCV, xác định hộp khuôn mặt cùng 5 điểm mốc bằng MTCNN, trích xuất vector nhúng FaceNet và quyết định Matched (> 0.7) / Unknown (< 0.7).',
    highlights: [
      'Hỗ trợ cả Webcam trực tiếp lẫn ảnh kiểm thử Cùng người / Người lạ',
      'Hiển thị bounding box, 5 landmarks và đồ thị vector đặc trưng chuẩn hóa L2',
      'Kiểm chứng ngưỡng Cosine Similarity > 0.70 theo đúng chuẩn bài thực hành',
    ],
    image: SAMPLE_IMAGES[2].src,
    metrics: [
      { label: 'Face Detector', value: 'MTCNN (5 Landmarks)' },
      { label: 'Embedding', value: 'FaceNet InceptionResnetV1' },
      { label: 'Ngưỡng so khớp', value: 'Similarity > 0.70' },
    ],
  },
];

export const OverviewSlideDeck: React.FC<OverviewSlideDeckProps> = ({ onSelectLab }) => {
  const [slideIdx, setSlideIdx] = useState(0);
  const current = SLIDES[slideIdx];

  return (
    <div className="space-y-8">
      {/* Interactive Presentation Hero Stage */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-mono font-semibold text-blue-600">SLIDE {current.index} / 05</span>
            <span aria-hidden="true">·</span>
            <span>{current.chapter}</span>
            <span aria-hidden="true">·</span>
            <span>Computer Vision Labs (React + FastAPI)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSlideIdx((i) => (i - 1 + SLIDES.length) % SLIDES.length)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              aria-label="Slide trước"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {SLIDES.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSlideIdx(idx)}
                  className={`rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    slideIdx === idx ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Lab {idx + 1}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSlideIdx((i) => (i + 1) % SLIDES.length)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              aria-label="Slide tiếp theo"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-stretch"
          >
            {/* Left Copy */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl [text-wrap:balance]">
                  {current.title}
                </h1>
                <p className="text-[15px] leading-relaxed text-slate-600 max-w-2xl">{current.summary}</p>
                <ul className="space-y-2 pt-1">
                  {current.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onSelectLab(current.id)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
                >
                  <Play className="h-4 w-4" />
                  Chạy trực tiếp Lab {current.index}
                </button>
              </div>
            </div>

            {/* Right Visual Anchor */}
            <div className="lg:col-span-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <img
                src={current.image}
                alt={current.title}
                referrerPolicy="no-referrer"
                className="h-full min-h-[260px] max-h-[340px] w-full object-cover"
              />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Full-width 3-column metrics strip below split */}
        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
          {current.metrics.map((m) => (
            <div key={m.label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs text-slate-500">{m.label}</div>
              <div className="mt-0.5 font-mono text-sm font-semibold text-slate-900">{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 5-Lab Curriculum Grid + Repository Structure */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SLIDES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectLab(s.id)}
              className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-blue-600 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono font-semibold text-blue-600">Lab {s.index}</span>
                  <span>{s.chapter}</span>
                </div>
                <h3 className="font-display text-base font-semibold text-slate-900 group-hover:text-blue-700">
                  {s.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 line-clamp-3">{s.summary}</p>
              </div>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
                Mở giao diện thực hành
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
        </div>

        {/* Repository Tree Summary */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-slate-950 p-5 text-slate-100">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-300">
            <FolderTree className="h-4 w-4 text-cyan-400" />
            Cấu trúc Kho mã nguồn Computer-Vision-Labs
          </div>
          <pre className="font-mono text-[11px] leading-relaxed text-slate-300 overflow-x-auto">
{`Computer-Vision-Labs/
├── README.md
├── requirements.txt
├── docs/
│   ├── progress.md
│   └── team_members.md
├── backend/
│   └── main.py          (FastAPI)
├── Lab1/ ... Lab3/     (data/input, docs, report, src)
├── Lab4/data/
│   ├── similar/         (arch, botanical, portrait)
│   └── unrelated/       (6 ảnh khác biệt hoàn toàn)
├── Lab5/data/
│   ├── Minh_Anh/        (5 góc/khoảng cách/sáng)
│   └── Elena_Fischer/   (5 góc/khoảng cách/sáng)
└── src/                 (React App - Lazy Code Split)`}
          </pre>
        </div>
      </div>
    </div>
  );
};
