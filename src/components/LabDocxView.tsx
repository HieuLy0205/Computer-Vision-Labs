import React, { useMemo, useState } from 'react';
import { BookOpen, Download, FileText, Search } from 'lucide-react';

export interface DocxBlock {
  type: 'title' | 'subtitle' | 'h1' | 'h2' | 'paragraph' | 'bullet' | 'code' | 'table';
  text?: string;
  boldPrefix?: string;
  lines?: string[];
  headers?: string[];
  rows?: string[][];
}

export interface DocxDocumentItem {
  name: string;
  label: string;
  path: string;
  sizeKb: number;
  blocks: DocxBlock[];
}

interface LabDocxViewProps {
  labId: string;
  docs: DocxDocumentItem[];
}

export const LabDocxView: React.FC<LabDocxViewProps> = ({ labId, docs }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const safeIdx = selectedIdx < docs.length ? selectedIdx : 0;
  const activeDoc = docs[safeIdx];

  const filteredBlocks = useMemo(() => {
    if (!activeDoc) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeDoc.blocks;

    // Group under nearest h1/h2 when searching Q&A or sections
    const result: DocxBlock[] = [];
    let currentHeading: DocxBlock | null = null;
    let headingPushed = false;

    for (const block of activeDoc.blocks) {
      if (block.type === 'title' || block.type === 'subtitle') continue;
      if (block.type === 'h1' || block.type === 'h2') {
        currentHeading = block;
        headingPushed = false;
        if ((block.text || '').toLowerCase().includes(q)) {
          result.push(block);
          headingPushed = true;
        }
        continue;
      }

      const hay = [
        block.boldPrefix || '',
        block.text || '',
        ...(block.lines || []),
        ...(block.headers || []),
        ...((block.rows || []).flat()),
      ]
        .join(' ')
        .toLowerCase();

      if (hay.includes(q)) {
        if (currentHeading && !headingPushed) {
          result.push(currentHeading);
          headingPushed = true;
        }
        result.push(block);
      }
    }
    return result;
  }, [activeDoc, searchQuery]);

  if (!docs || docs.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Đang tải danh sách tài liệu .docx trong thư mục docs/...
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1">
          {docs.map((doc, idx) => (
            <button
              key={doc.name}
              type="button"
              onClick={() => {
                setSelectedIdx(idx);
                setSearchQuery('');
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                safeIdx === idx ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {doc.name.includes('Hoi_Dap') || doc.name.includes('Giai_Thich') ? (
                <BookOpen className="h-3.5 w-3.5 text-blue-600" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-emerald-600" />
              )}
              {doc.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm câu hỏi / từ khóa..."
              className="w-48 rounded-lg border border-slate-300 bg-white py-1.5 pr-3 pl-8 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <a
            href={`/api/repo/docx/${labId}/${encodeURIComponent(activeDoc.name)}`}
            download={activeDoc.name}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Tải {activeDoc.name} ({activeDoc.sizeKb} KB)
          </a>
        </div>
      </div>

      {/* Document Meta Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-white px-6 py-2.5 text-xs text-slate-500">
        <span className="font-mono">{activeDoc.path}</span>
        <span className="tabular-nums">
          {filteredBlocks.length} khối nội dung · Định dạng Word OOXML (.docx)
        </span>
      </div>

      {/* Rendered Word Content */}
      <div className="max-h-[620px] overflow-auto px-6 py-6 sm:px-8 space-y-3.5">
        {filteredBlocks.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Không tìm thấy mục nào khớp với từ khóa &ldquo;{searchQuery}&rdquo;.
          </p>
        ) : (
          filteredBlocks.map((block, idx) => {
            if (block.type === 'title') {
              return (
                <h2 key={idx} className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
                  {block.text}
                </h2>
              );
            }
            if (block.type === 'subtitle') {
              return (
                <p key={idx} className="border-b border-slate-200 pb-4 text-sm italic text-slate-500">
                  {block.text}
                </p>
              );
            }
            if (block.type === 'h1') {
              return (
                <h3 key={idx} className="pt-4 font-display text-base font-bold text-blue-700 border-t border-slate-100 first:border-t-0 first:pt-0">
                  {block.text}
                </h3>
              );
            }
            if (block.type === 'h2') {
              return (
                <h4 key={idx} className="pt-3 font-display text-sm font-bold text-slate-900">
                  {block.text}
                </h4>
              );
            }
            if (block.type === 'bullet') {
              return (
                <div key={idx} className="flex items-start gap-2.5 pl-2 text-sm leading-relaxed text-slate-700">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                  <span>
                    {block.boldPrefix && <strong className="text-slate-900">{block.boldPrefix}</strong>}
                    {block.text}
                  </span>
                </div>
              );
            }
            if (block.type === 'code') {
              return (
                <pre
                  key={idx}
                  className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100"
                >
                  {(block.lines || []).join('\n')}
                </pre>
              );
            }
            if (block.type === 'table') {
              return (
                <div key={idx} className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-blue-50 text-blue-900">
                      <tr>
                        {(block.headers || []).map((h, hi) => (
                          <th key={hi} className="border-b border-slate-200 px-3 py-2.5 font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(block.rows || []).map((row, ri) => (
                        <tr key={ri} className="hover:bg-slate-50/70">
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-3 py-2.5 align-top leading-relaxed">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            return (
              <p key={idx} className="text-sm leading-relaxed text-slate-700">
                {block.boldPrefix && <strong className="text-slate-900">{block.boldPrefix}</strong>}
                {block.text}
              </p>
            );
          })
        )}
      </div>
    </div>
  );
};
