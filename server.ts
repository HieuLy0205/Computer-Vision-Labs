import express from 'express';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const ROOT = process.cwd();

interface LabMeta {
  id: string;
  folder: string;
  title: string;
  chapter: string;
  scriptPath: string;
  reportPath: string;
  readmePath: string;
}

export interface DocxBlock {
  type: 'title' | 'subtitle' | 'h1' | 'h2' | 'paragraph' | 'bullet' | 'code' | 'table';
  text?: string;
  boldPrefix?: string;
  lines?: string[];
  headers?: string[];
  rows?: string[][];
}

export interface DocxDocumentPayload {
  name: string;
  label: string;
  path: string;
  sizeKb: number;
  blocks: DocxBlock[];
}

export interface ReportMdPayload {
  name: string;
  label: string;
  path: string;
  content: string;
}

const LABS: LabMeta[] = [
  {
    id: 'lab1',
    folder: 'Lab1',
    title: 'OpenCV & Pillow Basics',
    chapter: 'Chương 1',
    scriptPath: 'Lab1/src/lab1_basics.py',
    reportPath: 'Lab1/report/lab1_analysis.md',
    readmePath: 'Lab1/README.md',
  },
  {
    id: 'lab2',
    folder: 'Lab2',
    title: 'Chương 2: Điểm ảnh, Lọc Tuyến tính & Nâng cao',
    chapter: 'Chương 2',
    scriptPath: 'Lab2/src/lab2_point_and_linear.py',
    reportPath: 'Lab2/report/lab2_analysis.md',
    readmePath: 'Lab2/README.md',
  },
  {
    id: 'lab3',
    folder: 'Lab3',
    title: 'Canny Edge Detector (Chương 2 - Phần 2)',
    chapter: 'Chương 2 (Phần 2)',
    scriptPath: 'Lab3/src/lab3_canny_edge_detector.py',
    reportPath: 'Lab3/report/lab3_analysis.md',
    readmePath: 'Lab3/README.md',
  },
  {
    id: 'lab4',
    folder: 'Lab4',
    title: 'So sánh Ảnh với Wavelet Hash & ROC',
    chapter: 'Chương 3 & 4',
    scriptPath: 'Lab4/src/lab4_wavelet_similarity.py',
    reportPath: 'Lab4/report/lab4_analysis.md',
    readmePath: 'Lab4/README.md',
  },
  {
    id: 'lab5',
    folder: 'Lab5',
    title: 'Nhận diện Khuôn mặt MTCNN & FaceNet',
    chapter: 'Bài thực hành FaceNet',
    scriptPath: 'Lab5/src/lab5_facenet_mtcnn.py',
    reportPath: 'Lab5/report/lab5_analysis.md',
    readmePath: 'Lab5/README.md',
  },
];

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function extractZipEntryUtf8(zipBuf: Buffer, targetName: string): string | null {
  // Scan backwards for End of Central Directory signature 0x06054b50
  let eocdOffset = -1;
  const minOffset = Math.max(0, zipBuf.length - 65558);
  for (let i = zipBuf.length - 22; i >= minOffset; i--) {
    if (
      zipBuf[i] === 0x50 &&
      zipBuf[i + 1] === 0x4b &&
      zipBuf[i + 2] === 0x05 &&
      zipBuf[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) return null;

  const totalEntries = zipBuf.readUInt16LE(eocdOffset + 10);
  let cdOffset = zipBuf.readUInt32LE(eocdOffset + 16);

  for (let idx = 0; idx < totalEntries && cdOffset + 46 <= zipBuf.length; idx++) {
    if (zipBuf.readUInt32LE(cdOffset) !== 0x02014b50) break;
    const compression = zipBuf.readUInt16LE(cdOffset + 10);
    const compSize = zipBuf.readUInt32LE(cdOffset + 20);
    const nameLen = zipBuf.readUInt16LE(cdOffset + 28);
    const extraLen = zipBuf.readUInt16LE(cdOffset + 30);
    const commentLen = zipBuf.readUInt16LE(cdOffset + 32);
    const localHeaderOffset = zipBuf.readUInt32LE(cdOffset + 42);
    const entryName = zipBuf.subarray(cdOffset + 46, cdOffset + 46 + nameLen).toString('utf-8');

    if (entryName === targetName) {
      if (localHeaderOffset + 30 > zipBuf.length) return null;
      const lNameLen = zipBuf.readUInt16LE(localHeaderOffset + 26);
      const lExtraLen = zipBuf.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + lNameLen + lExtraLen;
      const compressed = zipBuf.subarray(dataStart, dataStart + compSize);
      if (compression === 0) return compressed.toString('utf-8');
      if (compression === 8) return zlib.inflateRawSync(compressed).toString('utf-8');
      return null;
    }
    cdOffset += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

function extractParagraphRuns(pXml: string): Array<{ text: string; bold: boolean; italic: boolean }> {
  const runs: Array<{ text: string; bold: boolean; italic: boolean }> = [];
  const runRegex = /<w:r(?:\s[^>]*)?>([\s\S]*?)<\/w:r>/g;
  let m: RegExpExecArray | null;
  while ((m = runRegex.exec(pXml)) !== null) {
    const rBody = m[1];
    const rPrMatch = rBody.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
    const rPr = rPrMatch ? rPrMatch[1] : '';
    const bold = /<w:b(?:\s|\/|>)/.test(rPr) && !/<w:b\s+w:val="(?:false|0)"/.test(rPr);
    const italic = /<w:i(?:\s|\/|>)/.test(rPr) && !/<w:i\s+w:val="(?:false|0)"/.test(rPr);

    let txt = '';
    const tRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let tm: RegExpExecArray | null;
    while ((tm = tRegex.exec(rBody)) !== null) {
      txt += decodeXmlEntities(tm[1]);
    }
    if (txt) {
      runs.push({ text: txt, bold, italic });
    }
  }
  return runs;
}

function parseDocxNative(docxPath: string): DocxBlock[] {
  const zipBuf = fs.readFileSync(docxPath);
  const docXml = extractZipEntryUtf8(zipBuf, 'word/document.xml');
  if (!docXml) return [];

  const bodyMatch = docXml.match(/<w:body(?:\s[^>]*)?>([\s\S]*?)<\/w:body>/);
  if (!bodyMatch) return [];
  const body = bodyMatch[1];

  const blocks: DocxBlock[] = [];
  let codeBuf: string[] = [];
  const flushCode = () => {
    if (codeBuf.length > 0) {
      blocks.push({ type: 'code', lines: codeBuf });
      codeBuf = [];
    }
  };

  // Scan top-level <w:p> and <w:tbl> inside <w:body> cleanly
  let cursor = 0;
  while (cursor < body.length) {
    const nextP = body.indexOf('<w:p', cursor);
    const nextTbl = body.indexOf('<w:tbl', cursor);
    if (nextP === -1 && nextTbl === -1) break;

    const isTbl = nextTbl !== -1 && (nextP === -1 || nextTbl < nextP);
    if (isTbl) {
      // Ensure exact tag boundary (<w:tbl> or <w:tbl ...)
      const ch = body[nextTbl + 6];
      if (ch !== '>' && ch !== ' ' && ch !== '/') {
        cursor = nextTbl + 6;
        continue;
      }
      const closeTbl = body.indexOf('</w:tbl>', nextTbl);
      if (closeTbl === -1) break;
      const tblXml = body.slice(nextTbl, closeTbl + 8);
      cursor = closeTbl + 8;

      flushCode();
      const parsedRows: string[][] = [];
      const trRegex = /<w:tr(?:\s[^>]*)?>([\s\S]*?)<\/w:tr>/g;
      let trm: RegExpExecArray | null;
      while ((trm = trRegex.exec(tblXml)) !== null) {
        const rowVals: string[] = [];
        const tcRegex = /<w:tc(?:\s[^>]*)?>([\s\S]*?)<\/w:tc>/g;
        let tcm: RegExpExecArray | null;
        while ((tcm = tcRegex.exec(trm[1])) !== null) {
          const pTexts: string[] = [];
          const cellPRegex = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
          let cpm: RegExpExecArray | null;
          while ((cpm = cellPRegex.exec(tcm[1])) !== null) {
            let pStr = '';
            const tRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
            let tm: RegExpExecArray | null;
            while ((tm = tRegex.exec(cpm[1])) !== null) {
              pStr += decodeXmlEntities(tm[1]);
            }
            if (pStr) pTexts.push(pStr);
          }
          rowVals.push(pTexts.join(' ').trim());
        }
        if (rowVals.length > 0) parsedRows.push(rowVals);
      }
      if (parsedRows.length > 0) {
        blocks.push({ type: 'table', headers: parsedRows[0], rows: parsedRows.slice(1) });
      }
      continue;
    }

    // Handle <w:p> (check tag boundary so <w:pPr> or <w:pStyle> isn't matched)
    const ch = body[nextP + 4];
    if (ch !== '>' && ch !== ' ' && ch !== '/') {
      cursor = nextP + 4;
      continue;
    }
    // Check self-closing <w:p/>
    const tagEnd = body.indexOf('>', nextP);
    if (tagEnd === -1) break;
    if (body[tagEnd - 1] === '/') {
      flushCode();
      cursor = tagEnd + 1;
      continue;
    }
    const closeP = body.indexOf('</w:p>', nextP);
    if (closeP === -1) break;
    const pXml = body.slice(nextP, closeP + 6);
    cursor = closeP + 6;

    const pPrMatch = pXml.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/);
    const pPr = pPrMatch ? pPrMatch[1] : '';
    const styleMatch = pPr.match(/<w:pStyle\s+w:val="([^"]+)"/);
    const pStyle = styleMatch ? styleMatch[1] : '';
    const isShaded = /<w:shd[^>]*w:fill="F1F5F9"/.test(pPr);

    const runs = extractParagraphRuns(pXml);
    const fullText = runs.map((r) => r.text).join('');
    if (!fullText.trim() && !isShaded) {
      flushCode();
      continue;
    }
    if (isShaded) {
      codeBuf.push(fullText);
      continue;
    }
    flushCode();

    if (pStyle === 'Title') {
      blocks.push({ type: 'title', text: fullText });
    } else if (pStyle === 'Heading1') {
      blocks.push({ type: 'h1', text: fullText });
    } else if (pStyle === 'Heading2') {
      blocks.push({ type: 'h2', text: fullText });
    } else if (runs.length === 1 && runs[0].italic) {
      blocks.push({ type: 'subtitle', text: fullText });
    } else if (fullText.startsWith('•')) {
      const restRuns = runs.slice(1);
      let boldPrefix = '';
      let bodyText = restRuns.map((r) => r.text).join('');
      if (restRuns.length > 0 && restRuns[0].bold) {
        boldPrefix = restRuns[0].text;
        bodyText = restRuns.slice(1).map((r) => r.text).join('');
      }
      blocks.push({ type: 'bullet', boldPrefix, text: bodyText });
    } else {
      let boldPrefix = '';
      let bodyText = fullText;
      if (runs.length >= 2 && runs[0].bold) {
        boldPrefix = runs[0].text;
        bodyText = runs.slice(1).map((r) => r.text).join('');
      }
      blocks.push({ type: 'paragraph', boldPrefix, text: bodyText });
    }
  }

  flushCode();
  return blocks;
}

const docxCache = new Map<string, { mtimeMs: number; docs: DocxDocumentPayload[] }>();

function safeRead(relPath: string): string {
  const full = path.resolve(ROOT, relPath);
  if (!full.startsWith(ROOT) || !fs.existsSync(full)) {
    return '';
  }
  return fs.readFileSync(full, 'utf-8');
}

function formatReportLabel(filename: string): string {
  if (filename.includes('analysis')) return 'Phân tích Tổng quan';
  if (filename.includes('script_walkthrough')) return 'Giải thích Script';
  if (filename.includes('prompts_vibecoding')) return 'Prompts & Vibe-Coding';
  if (filename.includes('qa_deepdive')) return 'Hỏi-Đáp Chuyên sâu';
  return filename.replace('.md', '');
}

function formatDocxLabel(filename: string): string {
  if (filename.includes('Kien_Thuc_Trong_Tam')) return 'Kiến thức Trọng tâm (.docx)';
  if (filename.includes('Hoi_Dap_QA')) return 'Tất tần tật Hỏi–Đáp Q&A (.docx)';
  if (filename.includes('Giai_Thich_Tham_So')) return 'Giải thích Tham số & Vướng mắc (.docx)';
  return filename;
}

function readLabReports(folder: string): ReportMdPayload[] {
  const reportDir = path.resolve(ROOT, folder, 'report');
  if (!reportDir.startsWith(ROOT) || !fs.existsSync(reportDir)) return [];
  const order = ['analysis', 'script_walkthrough', 'prompts_vibecoding', 'qa_deepdive'];
  const files = fs
    .readdirSync(reportDir)
    .filter((f) => f.endsWith('.md'))
    .sort((a, b) => {
      const ia = order.findIndex((k) => a.includes(k));
      const ib = order.findIndex((k) => b.includes(k));
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  return files.map((name) => {
    const rel = `${folder}/report/${name}`;
    return {
      name,
      label: formatReportLabel(name),
      path: rel,
      content: safeRead(rel),
    };
  });
}

function readLabDocx(folder: string): DocxDocumentPayload[] {
  const docsDir = path.resolve(ROOT, folder, 'docs');
  if (!docsDir.startsWith(ROOT) || !fs.existsSync(docsDir)) return [];
  const files = fs
    .readdirSync(docsDir)
    .filter((f) => f.endsWith('.docx'))
    .sort((a, b) => (a.includes('Kien_Thuc') ? -1 : b.includes('Kien_Thuc') ? 1 : a.localeCompare(b)));

  if (files.length === 0) return [];
  const latestMtime = Math.max(...files.map((f) => fs.statSync(path.join(docsDir, f)).mtimeMs));
  const cached = docxCache.get(folder);
  if (cached && cached.mtimeMs === latestMtime) {
    return cached.docs;
  }

  const docs: DocxDocumentPayload[] = files.map((name) => {
    const full = path.join(docsDir, name);
    const stat = fs.statSync(full);
    let blocks: DocxBlock[] = [];
    try {
      blocks = parseDocxNative(full);
    } catch {
      blocks = [];
    }
    if (blocks.length === 0) {
      blocks = [{ type: 'paragraph', text: 'Không thể phân tích nội dung XML của tệp .docx.' }];
    }
    return {
      name,
      label: formatDocxLabel(name),
      path: `${folder}/docs/${name}`,
      sizeKb: Math.max(1, Math.round(stat.size / 102.4) / 10),
      blocks,
    };
  });

  docxCache.set(folder, { mtimeMs: latestMtime, docs });
  return docs;
}

function buildLabPayload(lab: LabMeta) {
  return {
    ...lab,
    script: safeRead(lab.scriptPath),
    report: safeRead(lab.reportPath),
    readme: safeRead(lab.readmePath),
    reports: readLabReports(lab.folder),
    docs: readLabDocx(lab.folder),
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', runtime: 'node-express-vite', fastapiTarget: process.env.FASTAPI_URL || 'http://127.0.0.1:8000' });
  });

  app.get('/api/repo/overview', (_req, res) => {
    res.json({
      fastapiCode: safeRead('backend/main.py'),
      requirements: safeRead('requirements.txt'),
      progressMd: safeRead('docs/progress.md'),
      teamMd: safeRead('docs/team_members.md'),
      rootReadme: safeRead('README.md'),
    });
  });

  app.get('/api/repo/labs', (_req, res) => {
    const data = LABS.map((lab) => buildLabPayload(lab));
    res.json({
      labs: data,
      fastapiCode: safeRead('backend/main.py'),
      requirements: safeRead('requirements.txt'),
      progressMd: safeRead('docs/progress.md'),
      teamMd: safeRead('docs/team_members.md'),
      rootReadme: safeRead('README.md'),
    });
  });

  app.get('/api/repo/labs/:id', (req, res) => {
    const lab = LABS.find((l) => l.id === req.params.id);
    if (!lab) {
      res.status(404).json({ error: 'Lab not found' });
      return;
    }
    res.json(buildLabPayload(lab));
  });

  app.get('/api/lab4/gallery', (_req, res) => {
    const dataRoot = path.resolve(ROOT, 'Lab4', 'data');
    const isImg = (f: string) => /\.(jpe?g|png|webp)$/i.test(f);
    const items: Array<{
      id: string;
      filename: string;
      label: string;
      category: 'similar' | 'unrelated';
      group: string;
      variant: string;
      url: string;
    }> = [];

    const GROUP_NAMES: Record<string, string> = {
      arch: 'Kiến trúc',
      botanical: 'Lăng kính',
      portrait: 'Chân dung',
    };
    const VARIANT_NAMES: Record<string, string> = {
      orig: 'Gốc',
      bright: 'Sáng +',
      contrast: 'Tương phản',
      blur: 'Làm mờ',
      noisy: 'Nhiễu Gaussian',
      jpeg_low: 'Nén JPEG thấp',
    };

    const simDir = path.join(dataRoot, 'similar');
    if (fs.existsSync(simDir)) {
      for (const groupEntry of fs.readdirSync(simDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        if (!groupEntry.isDirectory()) continue;
        const gName = groupEntry.name;
        const gDir = path.join(simDir, gName);
        for (const file of fs.readdirSync(gDir).filter(isImg).sort()) {
          const stem = path.parse(file).name;
          const variantKey = stem.startsWith(`${gName}_`) ? stem.slice(gName.length + 1) : stem;
          const gLabel = GROUP_NAMES[gName] || gName.replace(/_/g, ' ');
          const vLabel = VARIANT_NAMES[variantKey] || variantKey.replace(/_/g, ' ');
          items.push({
            id: `sim_${gName}_${stem}`,
            filename: file,
            label: `${gLabel} (${vLabel})`,
            category: 'similar',
            group: gName,
            variant: vLabel,
            url: `/api/data-file/lab4/similar/${encodeURIComponent(gName)}/${encodeURIComponent(file)}`,
          });
        }
      }
    }

    const unrDir = path.join(dataRoot, 'unrelated');
    if (fs.existsSync(unrDir)) {
      for (const file of fs.readdirSync(unrDir).filter(isImg).sort()) {
        const stem = path.parse(file).name;
        items.push({
          id: `unr_${stem}`,
          filename: file,
          label: `Khác biệt · ${stem.replace(/_/g, ' ')}`,
          category: 'unrelated',
          group: `unrelated_${stem}`,
          variant: 'Ảnh khác hoàn toàn',
          url: `/api/data-file/lab4/unrelated/${encodeURIComponent(file)}`,
        });
      }
    }

    // Also include any custom image files dropped directly into Lab4/data/
    if (fs.existsSync(dataRoot)) {
      for (const entry of fs.readdirSync(dataRoot, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        if (entry.isFile() && isImg(entry.name)) {
          const stem = path.parse(entry.name).name;
          items.push({
            id: `custom_${stem}`,
            filename: entry.name,
            label: stem.replace(/_/g, ' '),
            category: 'unrelated',
            group: `custom_${stem}`,
            variant: 'Tự thêm',
            url: `/api/data-file/lab4/${encodeURIComponent(entry.name)}`,
          });
        }
      }
    }

    res.json({ root: 'Lab4/data', total: items.length, items });
  });

  app.get('/api/lab5/gallery', (_req, res) => {
    const dataRoot = path.resolve(ROOT, 'Lab5', 'data');
    const isImg = (f: string) => /\.(jpe?g|png|webp)$/i.test(f);
    const persons: Array<{
      id: string;
      name: string;
      folder: string;
      images: Array<{ id: string; filename: string; angleLabel: string; url: string }>;
    }> = [];

    if (fs.existsSync(dataRoot)) {
      const entries = fs
        .readdirSync(dataRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory() && d.name !== 'input' && !d.name.startsWith('.'))
        .sort((a, b) => a.name.localeCompare(b.name));

      for (const dir of entries) {
        const pDir = path.join(dataRoot, dir.name);
        const files = fs.readdirSync(pDir).filter(isImg).sort();
        if (files.length === 0) continue;
        persons.push({
          id: dir.name,
          name: dir.name.replace(/_/g, ' '),
          folder: dir.name,
          images: files.map((file) => {
            const stem = path.parse(file).name;
            const angleLabel = stem.replace(/^\d+_/, '').replace(/_/g, ' ');
            return {
              id: `${dir.name}/${file}`,
              filename: file,
              angleLabel,
              url: `/api/data-file/lab5/${encodeURIComponent(dir.name)}/${encodeURIComponent(file)}`,
            };
          }),
        });
      }
    }

    res.json({ root: 'Lab5/data', persons });
  });

  app.get('/api/data-file/:lab/*', (req, res) => {
    const lab = req.params.lab;
    const baseDir =
      lab === 'lab4'
        ? path.resolve(ROOT, 'Lab4', 'data')
        : lab === 'lab5'
        ? path.resolve(ROOT, 'Lab5', 'data')
        : null;
    if (!baseDir) {
      res.status(404).json({ error: 'Invalid lab data root' });
      return;
    }
    const relPath = decodeURIComponent((req.params as Record<string, string>)[0] || '');
    const full = path.resolve(baseDir, relPath);
    if (!full.startsWith(baseDir + path.sep) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
      res.status(404).json({ error: 'Data file not found' });
      return;
    }
    if (!/\.(jpe?g|png|webp)$/i.test(full)) {
      res.status(400).json({ error: 'Unsupported file type' });
      return;
    }
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(full);
  });

  app.get('/api/repo/docx/:labId/:filename', (req, res) => {
    const lab = LABS.find((l) => l.id === req.params.labId);
    if (!lab) {
      res.status(404).json({ error: 'Lab not found' });
      return;
    }
    const safeName = path.basename(req.params.filename);
    if (!safeName.endsWith('.docx')) {
      res.status(400).json({ error: 'Invalid file type' });
      return;
    }
    const full = path.resolve(ROOT, lab.folder, 'docs', safeName);
    const docsRoot = path.resolve(ROOT, lab.folder, 'docs');
    if (!full.startsWith(docsRoot) || !fs.existsSync(full)) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.sendFile(full);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(ROOT, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Computer Vision Labs server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
