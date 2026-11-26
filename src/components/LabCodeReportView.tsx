import React, { useState } from 'react';
import { Check, Copy, Download, FileCode2, FileText } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

export interface ReportMdItem {
  name: string;
  label: string;
  path: string;
  content: string;
}

interface LabCodeReportViewProps {
  scriptName: string;
  scriptPath: string;
  scriptContent: string;
  reportContent: string;
  readmeContent?: string;
  reports?: ReportMdItem[];
}

export const LabCodeReportView: React.FC<LabCodeReportViewProps> = ({
  scriptName,
  scriptPath,
  scriptContent,
  reportContent,
  readmeContent,
  reports = [],
}) => {
  const [subTab, setSubTab] = useState<string>('script');
  const [copied, setCopied] = useState(false);

  const mdTabs: ReportMdItem[] =
    reports.length > 0
      ? reports
      : [{ name: `${scriptName.replace('.py', '')}_report.md`, label: 'Báo cáo & Giải thích', path: 'report/', content: reportContent }];

  const allMdTabs: ReportMdItem[] = readmeContent
    ? [...mdTabs, { name: 'README.md', label: 'README.md', path: 'README.md', content: readmeContent }]
    : mdTabs;

  const activeMd = allMdTabs.find((m) => m.name === subTab);
  const activeText = subTab === 'script' ? scriptContent : activeMd?.content || reportContent;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleDownload = () => {
    const blob = new Blob([activeText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = subTab === 'script' ? scriptName || 'lab_script.py' : activeMd?.name || 'report.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1">
          <button
            type="button"
            onClick={() => setSubTab('script')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'script' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode2 className="h-3.5 w-3.5" />
            {scriptName}
          </button>

          {allMdTabs.map((md) => (
            <button
              key={md.name}
              type="button"
              onClick={() => setSubTab(md.name)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                subTab === md.name ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              {md.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Đã sao chép' : 'Sao chép'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Tải xuống
          </button>
        </div>
      </div>

      <div className="border-b border-slate-100 bg-white px-5 py-2 font-mono text-[11px] text-slate-500">
        {subTab === 'script' ? scriptPath : activeMd?.path || ''}
      </div>

      {subTab === 'script' ? (
        <div className="max-h-[600px] overflow-auto bg-slate-950 p-5 text-[13px] leading-relaxed text-slate-100">
          <pre className="font-mono whitespace-pre-wrap break-words">{scriptContent || 'Đang tải mã nguồn...'}</pre>
        </div>
      ) : (
        <div className="max-h-[620px] overflow-auto px-6 py-6 sm:px-8">
          <MarkdownRenderer content={activeText} />
        </div>
      )}
    </div>
  );
};
