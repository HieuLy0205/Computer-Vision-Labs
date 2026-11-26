import React, { Suspense, lazy, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Code2, Play } from 'lucide-react';
import { LabTabId, OverviewSlideDeck } from './components/OverviewSlideDeck';
import type { ReportMdItem } from './components/LabCodeReportView';
import type { DocxDocumentItem } from './components/LabDocxView';

const Lab1Panel = lazy(() => import('./components/labs/Lab1Panel').then((m) => ({ default: m.Lab1Panel })));
const Lab2Panel = lazy(() => import('./components/labs/Lab2Panel').then((m) => ({ default: m.Lab2Panel })));
const Lab3Panel = lazy(() => import('./components/labs/Lab3Panel').then((m) => ({ default: m.Lab3Panel })));
const Lab4Panel = lazy(() => import('./components/labs/Lab4Panel').then((m) => ({ default: m.Lab4Panel })));
const Lab5Panel = lazy(() => import('./components/labs/Lab5Panel').then((m) => ({ default: m.Lab5Panel })));
const LabCodeReportView = lazy(() => import('./components/LabCodeReportView').then((m) => ({ default: m.LabCodeReportView })));
const LabDocxView = lazy(() => import('./components/LabDocxView').then((m) => ({ default: m.LabDocxView })));
const RepoModal = lazy(() => import('./components/RepoModal').then((m) => ({ default: m.RepoModal })));

interface RepoLabItem {
  id: string;
  folder: string;
  title: string;
  chapter: string;
  scriptPath: string;
  reportPath: string;
  readmePath: string;
  script: string;
  report: string;
  readme: string;
  reports?: ReportMdItem[];
  docs?: DocxDocumentItem[];
}

interface RepoOverviewResponse {
  fastapiCode: string;
  requirements: string;
  progressMd: string;
  teamMd: string;
  rootReadme: string;
}

const NAV_ITEMS: Array<{ id: LabTabId; label: string }> = [
  { id: 'overview', label: 'Trình chiếu' },
  { id: 'lab1', label: 'Lab 1' },
  { id: 'lab2', label: 'Lab 2' },
  { id: 'lab3', label: 'Lab 3' },
  { id: 'lab4', label: 'Lab 4' },
  { id: 'lab5', label: 'Lab 5' },
];

const LAB_DESCRIPTIONS: Record<Exclude<LabTabId, 'overview'>, { title: string; subtitle: string }> = {
  lab1: {
    title: 'Lab 1 · Cơ bản về Xử lý Ảnh với OpenCV & Pillow',
    subtitle: 'Chương 1 · Đọc/Lưu định dạng · Chuyển đổi RGB/Gray/HSV/LAB · Crop/Resize · Vẽ hình cơ bản & Histogram',
  },
  lab2: {
    title: 'Lab 2 · Toán tử Điểm ảnh, Lọc Tuyến tính & Nâng cao',
    subtitle: 'Chương 2 · Độ sáng/Tương phản/Gamma/EqualizeHist/Âm bản · Mean/Gaussian/Sharpen · Sobel/Prewitt & Median/Bilateral',
  },
  lab3: {
    title: 'Lab 3 · Thuật toán Phát hiện Cạnh Canny (Canny Edge Detector)',
    subtitle: 'Chương 2 (Phần 2) · 5 bước Canny · OpenCV & Scikit-image · Khảo sát σ, T_low, T_high · Color Canny & Phân đoạn vùng',
  },
  lab4: {
    title: 'Lab 4 · So sánh Tương đồng Ảnh với Wavelet & Python',
    subtitle: 'Chương 3 & 4 · Kho ảnh Lab4/data/ · Biến đổi Wavelet 2D · Mã băm 64-bit · Hamming · Đường cong ROC & Tìm kiếm ảnh',
  },
  lab5: {
    title: 'Lab 5 · Nhận diện Khuôn mặt Thời gian thực (MTCNN & FaceNet)',
    subtitle: 'Bài thực hành FaceNet · Kho ảnh đa góc Lab5/data/ · Webcam & Upload · Căn chỉnh 2 mắt 1:1 · Ngưỡng similarity > 0.7',
  },
};

const PanelFallback: React.FC = () => (
  <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
    Đang tải mô-đun thực hành...
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<LabTabId>('overview');
  const [labMode, setLabMode] = useState<'interactive' | 'docx' | 'code'>('interactive');
  const [labCache, setLabCache] = useState<Record<string, RepoLabItem>>({});
  const [loadingLabId, setLoadingLabId] = useState<string | null>(null);
  const [overviewData, setOverviewData] = useState<RepoOverviewResponse | null>(null);
  const [repoModalOpen, setRepoModalOpen] = useState(false);

  // Lazy fetch per-lab docs/code only when user switches to 'docx' or 'code' tab
  useEffect(() => {
    if (activeTab === 'overview' || labMode === 'interactive') return;
    if (labCache[activeTab]) return;
    let active = true;
    setLoadingLabId(activeTab);
    fetch(`/api/repo/labs/${activeTab}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: RepoLabItem | null) => {
        if (active && json) {
          setLabCache((prev) => ({ ...prev, [activeTab]: json }));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingLabId((curr) => (curr === activeTab ? null : curr));
      });
    return () => {
      active = false;
    };
  }, [activeTab, labMode, labCache]);

  // Lazy fetch repository overview only when modal is opened
  useEffect(() => {
    if (!repoModalOpen || overviewData) return;
    let active = true;
    fetch('/api/repo/overview')
      .then((res) => (res.ok ? res.json() : null))
      .then((json: RepoOverviewResponse | null) => {
        if (active && json) setOverviewData(json);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [repoModalOpen, overviewData]);

  const handleSelectLab = (id: LabTabId) => {
    setActiveTab(id);
    setLabMode('interactive');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeRepoLab = activeTab !== 'overview' ? labCache[activeTab] : undefined;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract: Exactly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-8 px-6 py-3.5">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => handleSelectLab('overview')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 text-left"
          >
            CV Labs 1–5
          </button>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectLab(item.id)}
                  className={`relative py-1 transition-colors whitespace-nowrap shrink-0 ${
                    active ? 'text-blue-600 font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute right-0 -bottom-[15px] left-0 h-0.5 bg-blue-600" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setRepoModalOpen(true)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              FastAPI &amp; Docs
            </button>
          </div>
        </div>

        {/* Mobile compact nav */}
        <div className="flex md:hidden items-center gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectLab(item.id)}
              className={`rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                activeTab === item.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-6 sm:px-6 lg:py-8">
        {activeTab === 'overview' ? (
          <OverviewSlideDeck onSelectLab={handleSelectLab} />
        ) : (
          <div className="space-y-6">
            {/* Lab Workspace Header & 3-Mode Switch */}
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <h1 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
                  {LAB_DESCRIPTIONS[activeTab].title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  {LAB_DESCRIPTIONS[activeTab].subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1">
                <button
                  type="button"
                  onClick={() => setLabMode('interactive')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    labMode === 'interactive'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Play className="h-3.5 w-3.5" />
                  Chạy Thuật toán
                </button>
                <button
                  type="button"
                  onClick={() => setLabMode('docx')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    labMode === 'docx'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Tài liệu DOCX &amp; Q&amp;A
                </button>
                <button
                  type="button"
                  onClick={() => setLabMode('code')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    labMode === 'code'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  Python &amp; Reports (.md)
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${labMode}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              >
                <Suspense fallback={<PanelFallback />}>
                  {labMode === 'docx' ? (
                    loadingLabId === activeTab && !activeRepoLab ? (
                      <PanelFallback />
                    ) : (
                      <LabDocxView labId={activeTab} docs={activeRepoLab?.docs || []} />
                    )
                  ) : labMode === 'code' ? (
                    loadingLabId === activeTab && !activeRepoLab ? (
                      <PanelFallback />
                    ) : (
                      <LabCodeReportView
                        scriptName={activeRepoLab?.scriptPath.split('/').pop() || `${activeTab}.py`}
                        scriptPath={activeRepoLab?.scriptPath || `${activeTab}/src/`}
                        scriptContent={activeRepoLab?.script || ''}
                        reportContent={activeRepoLab?.report || ''}
                        readmeContent={activeRepoLab?.readme || ''}
                        reports={activeRepoLab?.reports || []}
                      />
                    )
                  ) : activeTab === 'lab1' ? (
                    <Lab1Panel />
                  ) : activeTab === 'lab2' ? (
                    <Lab2Panel />
                  ) : activeTab === 'lab3' ? (
                    <Lab3Panel />
                  ) : activeTab === 'lab4' ? (
                    <Lab4Panel />
                  ) : (
                    <Lab5Panel />
                  )}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-4 px-6 py-4 text-xs text-slate-500">
          <span>Computer Vision Labs 1–5 · Thực hành Thị giác Máy tính</span>
          <span className="font-mono">React + FastAPI · OpenCV · PyWavelets · MTCNN &amp; FaceNet</span>
        </div>
      </footer>

      {repoModalOpen && (
        <Suspense fallback={null}>
          <RepoModal open={repoModalOpen} onClose={() => setRepoModalOpen(false)} repo={overviewData} />
        </Suspense>
      )}
    </div>
  );
}
