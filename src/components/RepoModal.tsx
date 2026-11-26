import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface RepoBundle {
  fastapiCode: string;
  requirements: string;
  progressMd: string;
  teamMd: string;
  rootReadme: string;
}

interface RepoModalProps {
  open: boolean;
  onClose: () => void;
  repo: RepoBundle | null;
}

export const RepoModal: React.FC<RepoModalProps> = ({ open, onClose, repo }) => {
  const [tab, setTab] = useState<'fastapi' | 'requirements' | 'docs' | 'readme'>('fastapi');
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const content =
    tab === 'fastapi'
      ? repo?.fastapiCode || ''
      : tab === 'requirements'
      ? repo?.requirements || ''
      : tab === 'docs'
      ? `${repo?.progressMd || ''}\n\n---\n\n${repo?.teamMd || ''}`
      : repo?.rootReadme || '';

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              FastAPI Backend & Tài liệu Dự án
            </h2>
            <p className="text-xs text-slate-500">
              Kiểm tra mã nguồn backend/main.py, requirements.txt và tiến độ trong docs/
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-2.5">
          <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
            {[
              { id: 'fastapi', label: 'backend/main.py (FastAPI)' },
              { id: 'requirements', label: 'requirements.txt' },
              { id: 'docs', label: 'docs/progress & team' },
              { id: 'readme', label: 'README.md' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as typeof tab)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={copyContent}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Đã sao chép' : 'Sao chép'}
          </button>
        </div>

        {tab === 'docs' || tab === 'readme' ? (
          <div className="flex-1 overflow-auto bg-white p-6">
            <MarkdownRenderer content={content || 'Đang tải...'} />
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-slate-950 p-5 text-[13px] leading-relaxed text-slate-100">
            <pre className="font-mono whitespace-pre-wrap break-words">{content || 'Đang tải...'}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
