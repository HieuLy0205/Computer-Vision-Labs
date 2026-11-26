import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function normalizeLatex(tex: string): string {
  return tex
    .replace(/\\arctan2\b/g, '\\operatorname{atan2}')
    .trim();
}

function renderKatexHtml(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(normalizeLatex(tex), {
      displayMode,
      throwOnError: false,
      strict: false,
    });
  } catch {
    return tex;
  }
}

function renderInline(text: string, keyPrefix = 'in'): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const tokenRegex = /(`[^`\n]+`|\$(?!\s)[^$\n]*?(?<!\s)\$|\*\*(?!\s)(?:`[^`\n]+`|\$[^$\n]*?\$|[^*\n]|\*(?!\*))+?\*\*|\*(?!\s)[^*\n]*?(?<!\s)\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let count = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(text.slice(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={`${keyPrefix}-c-${count++}`}
          className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-900"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('$') && token.endsWith('$')) {
      const html = renderKatexHtml(token.slice(1, -1), false);
      nodes.push(
        <span
          key={`${keyPrefix}-m-${count++}`}
          className="inline-block align-baseline px-0.5 text-slate-900"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${count++}`} className="font-semibold text-slate-900">
          {renderInline(token.slice(2, -2), `${keyPrefix}-bi-${count}`)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={`${keyPrefix}-i-${count++}`} className="italic text-slate-800">
          {renderInline(token.slice(1, -1), `${keyPrefix}-ii-${count}`)}
        </em>
      );
    } else if (token.startsWith('[')) {
      const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (m) {
        nodes.push(
          <a
            key={`${keyPrefix}-a-${count++}`}
            href={m[2]}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700"
          >
            {m[1]}
          </a>
        );
      } else {
        nodes.push(token);
      }
    }
    lastIdx = match.index + token.length;
  }

  if (lastIdx < text.length) {
    nodes.push(text.slice(lastIdx));
  }
  return nodes;
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((c) => c.trim());
}

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  const cells = splitTableRow(trimmed);
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const lines = (content || '').replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line
    if (!trimmed) {
      i++;
      continue;
    }

    // Fenced code block ```
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push(
        <div key={`code-${i}`} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
          {lang && (
            <div className="border-b border-slate-800 bg-slate-900 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-400">
              {lang}
            </div>
          )}
          <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-slate-100">
            {codeLines.join('\n')}
          </pre>
        </div>
      );
      continue;
    }

    // Display Math Block $$...$$ (single line or multi-line)
    if (trimmed.startsWith('$$')) {
      let mathBody = '';
      if (trimmed.length > 4 && trimmed.endsWith('$$')) {
        mathBody = trimmed.slice(2, -2);
        i++;
      } else {
        const buf: string[] = [];
        const restFirst = trimmed.slice(2).trim();
        if (restFirst) buf.push(restFirst);
        i++;
        while (i < lines.length && !lines[i].trim().endsWith('$$')) {
          buf.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          const last = lines[i].trim().slice(0, -2).trim();
          if (last) buf.push(last);
          i++;
        }
        mathBody = buf.join('\n');
      }
      const html = renderKatexHtml(mathBody, true);
      blocks.push(
        <div
          key={`math-${i}`}
          className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-center text-slate-900"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(<hr key={`hr-${i}`} className="my-4 border-slate-200" />);
      i++;
      continue;
    }

    // Headings # .. ####
    const headingMatch = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      if (level === 1) {
        blocks.push(
          <h2 key={`h-${i}`} className="pt-2 font-display text-xl font-bold text-slate-900">
            {renderInline(text, `h-${i}`)}
          </h2>
        );
      } else if (level === 2) {
        blocks.push(
          <h3
            key={`h-${i}`}
            className="border-t border-slate-100 pt-4 font-display text-base font-bold text-blue-700 first:border-t-0 first:pt-0"
          >
            {renderInline(text, `h-${i}`)}
          </h3>
        );
      } else if (level === 3) {
        blocks.push(
          <h4 key={`h-${i}`} className="pt-2 font-display text-sm font-bold text-slate-900">
            {renderInline(text, `h-${i}`)}
          </h4>
        );
      } else {
        blocks.push(
          <h5 key={`h-${i}`} className="pt-1 text-xs font-bold uppercase tracking-wide text-slate-700">
            {renderInline(text, `h-${i}`)}
          </h5>
        );
      }
      i++;
      continue;
    }

    // Markdown Table (header + separator + rows)
    if (trimmed.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = splitTableRow(lines[i]);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes('|') && lines[i].trim() !== '') {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={`tbl-${i}`} className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-blue-50/80 text-blue-950">
              <tr>
                {headers.map((h, hi) => (
                  <th key={hi} className="border-b border-slate-200 px-3.5 py-2.5 font-semibold">
                    {renderInline(h, `th-${i}-${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-slate-50/80">
                  {headers.map((_, ci) => (
                    <td key={ci} className="px-3.5 py-2.5 align-top leading-relaxed">
                      {renderInline(row[ci] ?? '', `td-${i}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Blockquote >
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        <blockquote
          key={`bq-${i}`}
          className="rounded-r-lg border border-slate-200 border-l-2 border-l-blue-600 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700"
        >
          {renderInline(quoteLines.join(' '), `bq-${i}`)}
        </blockquote>
      );
      continue;
    }

    // Ordered & Unordered Lists (preserving nested indentation)
    const listMatch = /^(\s*)(?:(\d+)\.\s+|([-*+])\s+)(.*)$/.exec(line);
    if (listMatch) {
      const items: Array<{ ordered: boolean; num?: string; indent: number; text: string }> = [];
      while (i < lines.length) {
        const cur = lines[i];
        const m = /^(\s*)(?:(\d+)\.\s+|([-*+])\s+)(.*)$/.exec(cur);
        if (m) {
          items.push({
            ordered: Boolean(m[2]),
            num: m[2],
            indent: m[1].length,
            text: m[4],
          });
          i++;
          // Allow single blank line between list items if next line continues a list
          if (i < lines.length && lines[i].trim() === '' && i + 1 < lines.length) {
            const nextM = /^(\s*)(?:(\d+)\.\s+|([-*+])\s+)(.*)$/.exec(lines[i + 1]);
            if (nextM) {
              i++;
            }
          }
        } else if (cur.trim() !== '' && /^\s{2,}\S/.test(cur) && items.length > 0 && !cur.trim().startsWith('$$')) {
          // Continuation line of previous item
          items[items.length - 1].text += ' ' + cur.trim();
          i++;
        } else {
          break;
        }
      }

      blocks.push(
        <div key={`list-${i}`} className="space-y-2">
          {items.map((item, idx) => {
            const nested = item.indent >= 2;
            return (
              <div
                key={idx}
                className={`flex items-start gap-2.5 text-sm leading-relaxed text-slate-700 ${
                  nested ? 'pl-6' : 'pl-1'
                }`}
              >
                {item.ordered ? (
                  <span className="mt-0.5 min-w-[1.25rem] shrink-0 font-mono text-xs font-bold text-blue-600 tabular-nums">
                    {item.num}.
                  </span>
                ) : (
                  <span
                    className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                      nested ? 'bg-slate-400' : 'bg-blue-600'
                    }`}
                  />
                )}
                <div className="min-w-0 flex-1">{renderInline(item.text, `li-${i}-${idx}`)}</div>
              </div>
            );
          })}
        </div>
      );
      continue;
    }

    // Normal paragraph (merge contiguous plain text lines until blank line or next block)
    const paraLines: string[] = [trimmed];
    i++;
    while (i < lines.length) {
      const next = lines[i];
      const nextTrim = next.trim();
      if (
        !nextTrim ||
        nextTrim.startsWith('```') ||
        nextTrim.startsWith('$$') ||
        nextTrim.startsWith('#') ||
        nextTrim.startsWith('>') ||
        /^(\s*)(?:(\d+)\.\s+|([-*+])\s+)/.test(next) ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(nextTrim) ||
        (nextTrim.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1]))
      ) {
        break;
      }
      paraLines.push(nextTrim);
      i++;
    }

    blocks.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed text-slate-700">
        {renderInline(paraLines.join(' '), `p-${i}`)}
      </p>
    );
  }

  return <div className={`space-y-3.5 ${className}`}>{blocks}</div>;
};
