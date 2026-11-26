import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CameraOff, ChevronDown, ChevronRight, FolderOpen, Plus, Upload, UserCheck, UserX } from 'lucide-react';
import {
  cosineSimilarity,
  detectAndEmbedFace,
  FaceDetectionResult,
} from '../../lib/cvEngine';
import { loadImageElement } from '../../lib/samples';

interface ApiGalleryPerson {
  id: string;
  name: string;
  folder: string;
  images: Array<{ id: string; filename: string; angleLabel: string; url: string }>;
}

interface IndexedAngle {
  id: string;
  filename: string;
  angleLabel: string;
  url: string;
  detection: FaceDetectionResult | null;
}

interface GalleryPerson {
  id: string;
  name: string;
  folder: string;
  angles: IndexedAngle[];
}

interface PersonMatchRank {
  personId: string;
  personName: string;
  maxSim: number;
  meanSim: number;
  bestAngle: IndexedAngle | null;
  angleCount: number;
}

type ProbeMode = 'gallery_sample' | 'same_far_shifted' | 'upload' | 'webcam';

export const Lab5Panel: React.FC = () => {
  const [gallery, setGallery] = useState<GalleryPerson[]>([]);
  const [indexingProgress, setIndexingProgress] = useState<{ done: number; total: number } | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [selectedSampleUrl, setSelectedSampleUrl] = useState<string>('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const [probeMode, setProbeMode] = useState<ProbeMode>('gallery_sample');
  const [uploadedProbeUrl, setUploadedProbeUrl] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.7);

  const probeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [probeResult, setProbeResult] = useState<FaceDetectionResult | null>(null);
  const [ranking, setRanking] = useState<PersonMatchRank[]>([]);
  const [simHistory, setSimHistory] = useState<number[]>([]);
  const [fps, setFps] = useState<number>(0);

  const drawOverlay = useCallback(
    (
      canvas: HTMLCanvasElement,
      det: FaceDetectionResult | null,
      labelText?: string,
      isMatched?: boolean
    ) => {
      if (!det) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const color = isMatched === undefined ? '#2563EB' : isMatched ? '#059669' : '#DC2626';

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(det.box.x, det.box.y, det.box.w, det.box.h);

      const pts = [
        det.landmarks.leftEye,
        det.landmarks.rightEye,
        det.landmarks.nose,
        det.landmarks.leftMouth,
        det.landmarks.rightMouth,
      ];
      ctx.fillStyle = '#F59E0B';
      for (const [lx, ly] of pts) {
        ctx.beginPath();
        ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (labelText) {
        ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
        const tw = ctx.measureText(labelText).width;
        const ly = Math.max(26, det.box.y - 6);
        ctx.fillStyle = color;
        ctx.fillRect(det.box.x, ly - 20, tw + 14, 24);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(labelText, det.box.x + 7, ly - 3);
      }
    },
    []
  );

  // Compute embedding for a single image URL using an offscreen aspect-preserving canvas
  const extractFromUrl = useCallback(async (url: string): Promise<FaceDetectionResult | null> => {
    const img = await loadImageElement(url);
    const nw = img.naturalWidth || img.width;
    const nh = img.naturalHeight || img.height;
    const scale = Math.min(400 / nw, 400 / nh, 1);
    const c = document.createElement('canvas');
    c.width = Math.max(32, Math.round(nw * scale));
    c.height = Math.max(32, Math.round(nh * scale));
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return detectAndEmbedFace(c);
  }, []);

  // Load ALL person folders & multi-angle photos from Lab5/data/ on mount
  useEffect(() => {
    let cancelled = false;
    fetch('/api/lab5/gallery')
      .then((res) => (res.ok ? res.json() : null))
      .then(async (payload: { persons?: ApiGalleryPerson[] } | null) => {
        if (cancelled || !payload?.persons?.length) return;
        const initial: GalleryPerson[] = payload.persons.map((p) => ({
          id: p.id,
          name: p.name,
          folder: p.folder,
          angles: p.images.map((im) => ({
            id: im.id,
            filename: im.filename,
            angleLabel: im.angleLabel,
            url: im.url,
            detection: null,
          })),
        }));
        setGallery(initial);
        setSelectedPersonId(initial[0].id);
        setSelectedSampleUrl(initial[0].angles[1]?.url || initial[0].angles[0]?.url || '');

        const total = initial.reduce((acc, p) => acc + p.angles.length, 0);
        let done = 0;
        setIndexingProgress({ done, total });

        for (let pi = 0; pi < initial.length; pi++) {
          for (let ai = 0; ai < initial[pi].angles.length; ai++) {
            if (cancelled) return;
            const angle = initial[pi].angles[ai];
            try {
              const det = await extractFromUrl(angle.url);
              if (cancelled) return;
              setGallery((prev) =>
                prev.map((gp) =>
                  gp.id !== initial[pi].id
                    ? gp
                    : {
                        ...gp,
                        angles: gp.angles.map((a) => (a.id === angle.id ? { ...a, detection: det } : a)),
                      }
                )
              );
            } catch {
              // skip unreadable image
            }
            done++;
            if (!cancelled) setIndexingProgress(done < total ? { done, total } : null);
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [extractFromUrl]);

  // Compare a probe embedding against ALL angles of ALL persons in Lab5/data/
  const matchAgainstGallery = useCallback(
    (probeEmb: number[]): PersonMatchRank[] => {
      const ranks: PersonMatchRank[] = [];
      for (const person of gallery) {
        const valid = person.angles.filter((a) => a.detection !== null);
        if (valid.length === 0) continue;
        let maxSim = -1;
        let sumSim = 0;
        let bestAngle: IndexedAngle | null = null;
        for (const angle of valid) {
          const sim = cosineSimilarity(angle.detection!.embedding, probeEmb);
          sumSim += sim;
          if (sim > maxSim) {
            maxSim = sim;
            bestAngle = angle;
          }
        }
        ranks.push({
          personId: person.id,
          personName: person.name,
          maxSim,
          meanSim: sumSim / valid.length,
          bestAngle,
          angleCount: valid.length,
        });
      }
      return ranks.sort((a, b) => b.maxSim - a.maxSim);
    },
    [gallery]
  );

  // Stop webcam cleanly
  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setWebcamActive(false);
  }, []);

  useEffect(() => {
    return () => stopWebcam();
  }, [stopWebcam]);

  const galleryReadyCount = useMemo(
    () => gallery.reduce((acc, p) => acc + p.angles.filter((a) => a.detection !== null).length, 0),
    [gallery]
  );

  // Evaluate Static / Gallery Test / Uploaded Probe against the entire Lab5/data/ folder gallery
  useEffect(() => {
    if (probeMode === 'webcam' || galleryReadyCount === 0) return;
    stopWebcam();
    let active = true;

    const targetSrc =
      probeMode === 'upload' && uploadedProbeUrl
        ? uploadedProbeUrl
        : selectedSampleUrl || gallery[0]?.angles[0]?.url;

    if (!targetSrc) return;

    loadImageElement(targetSrc)
      .then(async (img) => {
        if (!active || !probeCanvasRef.current) return;
        const c = probeCanvasRef.current;
        const nw = img.naturalWidth || img.width;
        const nh = img.naturalHeight || img.height;
        const scale = Math.min(460 / nw, 460 / nh, 1);
        const cw = Math.max(32, Math.round(nw * scale));
        const ch = Math.max(32, Math.round(nh * scale));
        c.width = cw;
        c.height = ch;
        const ctx = c.getContext('2d')!;
        ctx.clearRect(0, 0, cw, ch);

        if (probeMode === 'same_far_shifted') {
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(0, 0, cw, ch);
          ctx.fillStyle = '#CBD5E1';
          ctx.fillRect(0, 0, Math.round(cw * 0.42), ch);
          const s = 0.46;
          const dw = Math.round(cw * s);
          const dh = Math.round(ch * s);
          ctx.drawImage(img, Math.round(cw - dw - cw * 0.08), Math.round(ch - dh - ch * 0.06), dw, dh);
        } else {
          ctx.drawImage(img, 0, 0, cw, ch);
        }

        const det = await detectAndEmbedFace(c);
        if (!active || !det) return;
        const ranks = matchAgainstGallery(det.embedding);
        const top = ranks[0];
        const bestSim = top ? top.maxSim : 0;
        const matched = Boolean(top && bestSim > threshold);
        const tag = matched ? `Matched: ${top.personName} (${bestSim.toFixed(3)})` : `Unknown (${bestSim.toFixed(3)})`;

        setProbeResult(det);
        setRanking(ranks);
        setSimHistory((prev) => [...prev.slice(-29), bestSim]);
        drawOverlay(c, det, tag, matched);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [probeMode, uploadedProbeUrl, selectedSampleUrl, gallery, galleryReadyCount, threshold, matchAgainstGallery, drawOverlay, stopWebcam]);

  // Start Webcam stream
  const startWebcam = async () => {
    setWebcamError(null);
    setProbeMode('webcam');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setWebcamActive(true);
    } catch {
      setWebcamError(
        'Không tìm thấy thiết bị Webcam hoặc quyền camera bị từ chối trong trình duyệt. Bạn vẫn có thể tải ảnh hoặc chọn ảnh mẫu đa góc trong kho Lab5/data/.'
      );
      setWebcamActive(false);
    }
  };

  // Real-time Webcam Detection & Full Gallery Comparison Loop
  useEffect(() => {
    if (!webcamActive || probeMode !== 'webcam' || galleryReadyCount === 0) return;
    let cancelled = false;
    let timerId: number | null = null;

    const tick = async () => {
      if (cancelled || !videoRef.current || !probeCanvasRef.current) return;
      const v = videoRef.current;
      if (v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0) {
        const t0 = performance.now();
        const c = probeCanvasRef.current;
        const scale = Math.min(460 / v.videoWidth, 460 / v.videoHeight, 1);
        c.width = Math.max(32, Math.round(v.videoWidth * scale));
        c.height = Math.max(32, Math.round(v.videoHeight * scale));
        c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
        const det = await detectAndEmbedFace(c);
        if (det && !cancelled) {
          const ranks = matchAgainstGallery(det.embedding);
          const top = ranks[0];
          const bestSim = top ? top.maxSim : 0;
          const matched = Boolean(top && bestSim > threshold);
          const tag = matched ? `Matched: ${top.personName} (${bestSim.toFixed(3)})` : `Unknown (${bestSim.toFixed(3)})`;
          setProbeResult(det);
          setRanking(ranks);
          setSimHistory((prev) => [...prev.slice(-39), bestSim]);
          drawOverlay(c, det, tag, matched);
        }
        const elapsed = Math.max(1, performance.now() - t0);
        if (!cancelled) setFps(Math.min(30, Math.round(1000 / elapsed)));
      }
      if (!cancelled) {
        timerId = window.setTimeout(tick, 140);
      }
    };

    tick();
    return () => {
      cancelled = true;
      if (timerId !== null) clearTimeout(timerId);
    };
  }, [webcamActive, probeMode, galleryReadyCount, threshold, matchAgainstGallery, drawOverlay]);

  // Add webcam snapshot or uploaded angle photo directly into selected or new person in session gallery
  const addAngleToGallery = async (personId: string, newPersonName: string | null, url: string, label: string) => {
    const det = await extractFromUrl(url);
    if (!det) return;
    const angleId = `${Date.now()}_${label}`;
    const newAngle: IndexedAngle = { id: angleId, filename: label, angleLabel: label, url, detection: det };
    if (newPersonName) {
      const id = newPersonName.replace(/\s+/g, '_');
      setGallery((prev) => [...prev, { id, name: newPersonName, folder: id, angles: [newAngle] }]);
      setSelectedPersonId(id);
    } else {
      setGallery((prev) =>
        prev.map((p) => (p.id === personId ? { ...p, angles: [...p.angles, newAngle] } : p))
      );
    }
  };

  const topMatch = ranking[0];
  const bestSim = topMatch?.maxSim ?? 0;
  const isMatched = Boolean(topMatch && bestSim > threshold);
  const selectedPerson = gallery.find((p) => p.id === selectedPersonId) || gallery[0];

  return (
    <div className="space-y-5">
      {/* Provenance & Folder Gallery Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-slate-700">
          <FolderOpen className="h-4 w-4 text-blue-600 shrink-0" />
          <span>
            <strong>Kho dữ liệu Lab5/data/</strong>: {gallery.length} thư mục danh tính · {galleryReadyCount} ảnh nhiều góc đã trích xuất 128-D L2 Vector
            <span className="text-slate-500"> (mặc định dùng ảnh chân dung tổng hợp cục bộ + bạn có thể thêm ảnh/Webcam trực tiếp)</span>
          </span>
        </div>
        {indexingProgress && (
          <span className="font-mono text-blue-600 tabular-nums">
            Đang lập chỉ mục {indexingProgress.done}/{indexingProgress.total}...
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left: Multi-Person Multi-Angle Folder Gallery + Probe Source */}
        <div className="lg:col-span-4 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">1. Kho Thư mục Khuôn mặt (Lab5/data/)</h3>

          <div className="space-y-2">
            {gallery.map((person) => {
              const active = person.id === selectedPerson?.id;
              const isExpanded = Boolean(expandedFolders[person.id]);
              return (
                <div
                  key={person.id}
                  className={`rounded-lg border p-2.5 transition-colors ${
                    active ? 'border-blue-600 bg-blue-50/40' : 'border-slate-200 bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPersonId(person.id);
                        setExpandedFolders((prev) => ({ ...prev, [person.id]: !prev[person.id] }));
                      }}
                      className="flex flex-1 items-center gap-1.5 text-left text-xs font-semibold text-slate-900 hover:text-blue-700"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      )}
                      <span className="truncate">📁 {person.folder}/</span>
                      <span className="font-normal text-slate-500 shrink-0">({person.angles.length} góc)</span>
                    </button>
                    <label className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline">
                      <Plus className="h-3 w-3" />
                      Thêm góc
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) addAngleToGallery(person.id, null, URL.createObjectURL(f), f.name);
                        }}
                      />
                    </label>
                  </div>
                  {isExpanded && (
                    <div className="mt-2.5 grid grid-cols-5 gap-1.5 border-t border-slate-200/70 pt-2">
                      {person.angles.map((ang) => (
                        <button
                          key={ang.id}
                          type="button"
                          title={`${person.name} · ${ang.filename}`}
                          onClick={() => {
                            setSelectedPersonId(person.id);
                            setSelectedSampleUrl(ang.url);
                            setProbeMode('gallery_sample');
                          }}
                          className={`overflow-hidden rounded border bg-white aspect-square transition-all ${
                            probeMode === 'gallery_sample' && selectedSampleUrl === ang.url
                              ? 'ring-2 ring-blue-600 border-blue-600'
                              : 'border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          <img src={ang.url} alt={ang.angleLabel} loading="lazy" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add new person from Webcam or Upload */}
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            {webcamActive && (
              <button
                type="button"
                onClick={() => {
                  const v = videoRef.current;
                  if (!v || v.videoWidth === 0) return;
                  const snap = document.createElement('canvas');
                  snap.width = v.videoWidth;
                  snap.height = v.videoHeight;
                  snap.getContext('2d')!.drawImage(v, 0, 0);
                  const url = snap.toDataURL('image/png');
                  const target = gallery.find((p) => p.id === 'Ban_Webcam');
                  addAngleToGallery(
                    'Ban_Webcam',
                    target ? null : 'Ban Webcam',
                    url,
                    `webcam_${new Date().toLocaleTimeString('vi-VN')}.png`
                  );
                }}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                + Lưu mặt Webcam vào Kho
              </button>
            )}
            <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">
              <Plus className="h-3.5 w-3.5" />
              Thêm Folder Người mới
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const idx = gallery.length + 1;
                    addAngleToGallery('', `Nguoi_${idx}`, URL.createObjectURL(f), f.name);
                  }
                }}
              />
            </label>
          </div>

          {/* Probe Mode Selection */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <label className="block text-xs font-semibold text-slate-700">2. Nguồn Kiểm tra Đối chiếu toàn Kho</label>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (!selectedSampleUrl && selectedPerson?.angles[0]) {
                    setSelectedSampleUrl(selectedPerson.angles[0].url);
                  }
                  setProbeMode('gallery_sample');
                }}
                className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                  probeMode === 'gallery_sample'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Ảnh góc đã chọn từ kho ({selectedPerson?.name || '—'})
              </button>
              <button
                type="button"
                onClick={() => setProbeMode('same_far_shifted')}
                className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                  probeMode === 'same_far_shifted'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Mô phỏng đứng xa 46% + lệch góc phải
              </button>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={webcamActive ? stopWebcam : startWebcam}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    webcamActive
                      ? 'bg-rose-600 text-white hover:bg-rose-700'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {webcamActive ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
                  {webcamActive ? 'Tắt Webcam' : 'Mở Webcam'}
                </button>

                <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <Upload className="h-3.5 w-3.5" />
                  Tải ảnh Probe
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setUploadedProbeUrl(URL.createObjectURL(f));
                        setProbeMode('upload');
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Threshold Slider */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-700">3. Ngưỡng Cosine Similarity</span>
              <span className="font-mono font-bold text-blue-600 tabular-nums">{threshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.4}
              max={0.95}
              step={0.01}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full"
            />
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-[11px] text-slate-600">
              if max_sim(gallery) &gt; {threshold.toFixed(2)}: &quot;Matched: Person&quot; else &quot;Unknown&quot;
            </div>
          </div>
        </div>

        {/* Right: Live Viewport + Identity Decision + Per-Folder Ranking */}
        <div className="lg:col-span-8 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            {/* Viewport */}
            <div className="md:col-span-7 rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-900">
                  {webcamActive ? 'Webcam Thời gian thực · Quét toàn bộ kho Lab5/data/' : 'Khung hình Kiểm tra MTCNN & 5 Landmarks'}
                </span>
                <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500 tabular-nums">
                  {probeResult && (
                    <span>
                      {probeResult.box.w}×{probeResult.box.h} · d_eye{' '}
                      {Math.round(
                        Math.hypot(
                          probeResult.landmarks.rightEye[0] - probeResult.landmarks.leftEye[0],
                          probeResult.landmarks.rightEye[1] - probeResult.landmarks.leftEye[1]
                        )
                      )}px
                    </span>
                  )}
                  {webcamActive && <span className="text-emerald-700 font-semibold">{fps} FPS</span>}
                </div>
              </div>

              {webcamError && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  {webcamError}
                </div>
              )}

              <video ref={videoRef} playsInline muted className="hidden" />
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
                <canvas ref={probeCanvasRef} className="mx-auto block max-h-[340px] w-full object-contain" />
              </div>
            </div>

            {/* Decision & Gallery Ranking */}
            <div className="md:col-span-5 flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-500">Kết quả Nhận diện từ Toàn bộ Kho</div>
                <div
                  className={`flex items-center gap-3 rounded-xl border p-4 ${
                    isMatched
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border-rose-200 bg-rose-50 text-rose-900'
                  }`}
                >
                  {isMatched ? (
                    <UserCheck className="h-8 w-8 shrink-0 text-emerald-600" />
                  ) : (
                    <UserX className="h-8 w-8 shrink-0 text-rose-600" />
                  )}
                  <div className="min-w-0">
                    <div className="font-display text-xl font-bold truncate">
                      {isMatched ? `Matched: ${topMatch.personName}` : 'Unknown'}
                    </div>
                    <div className="font-mono text-xs tabular-nums">
                      Max Cosine: {bestSim.toFixed(4)} {isMatched ? '>' : '<='} {threshold.toFixed(2)}
                    </div>
                    {topMatch?.bestAngle && (
                      <div className="truncate font-mono text-[11px] opacity-80">
                        Góc khớp nhất: {topMatch.bestAngle.filename}
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Ranking across all person folders */}
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-semibold text-slate-700">
                    So khớp từng thư mục người trong Lab5/data/
                  </div>
                  <div className="space-y-2">
                    {ranking.map((r) => {
                      const pct = Math.max(0, Math.min(100, r.maxSim * 100));
                      const pass = r.maxSim > threshold;
                      return (
                        <div key={r.personId} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-800 truncate">{r.personName}</span>
                            <span className={`font-mono font-semibold tabular-nums ${pass ? 'text-emerald-700' : 'text-slate-500'}`}>
                              {r.maxSim.toFixed(3)}
                            </span>
                          </div>
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full transition-all duration-200 ${pass ? 'bg-emerald-600' : 'bg-slate-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-slate-900"
                              style={{ left: `${threshold * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Eye-Aligned Normalized Patches */}
              {topMatch?.bestAngle?.detection?.alignedDataUrl && probeResult?.alignedDataUrl && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="text-[11px] font-semibold text-slate-700">
                    So sánh Patch căn chỉnh 2 mắt (1:1 Eye-Aligned 48×48)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1.5">
                      <img
                        src={topMatch.bestAngle.detection.alignedDataUrl}
                        alt="Best gallery angle aligned"
                        className="h-10 w-10 rounded border border-slate-200 object-contain"
                      />
                      <span className="truncate font-mono text-[10px] text-slate-600">{topMatch.personName}</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1.5">
                      <img
                        src={probeResult.alignedDataUrl}
                        alt="Probe aligned"
                        className="h-10 w-10 rounded border border-slate-200 object-contain"
                      />
                      <span className="font-mono text-[10px] text-slate-600">Probe</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 128-D Embedding Fingerprint Comparison */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-900">
                So sánh Vector Đặc trưng (64 chiều đầu của L2 Embedding)
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                Xanh dương: {topMatch?.personName || 'Best Match'} ({topMatch?.bestAngle?.filename || '—'}) · Cam: Probe hiện tại
              </span>
            </div>
            <div className="flex h-24 items-end gap-0.5 rounded-lg border border-slate-100 bg-slate-50 p-2">
              {(topMatch?.bestAngle?.detection?.embedding.slice(0, 64) || []).map((val, idx) => {
                const probeVal = probeResult?.embedding[idx] ?? 0;
                const h1 = Math.max(3, Math.min(100, Math.round(Math.abs(val) * 420)));
                const h2 = Math.max(3, Math.min(100, Math.round(Math.abs(probeVal) * 420)));
                return (
                  <div key={idx} className="relative flex-1 h-full flex items-end justify-center gap-px">
                    <div className="w-1/2 rounded-t-sm bg-blue-600/80" style={{ height: `${h1}%` }} />
                    <div className="w-1/2 rounded-t-sm bg-amber-500/80" style={{ height: `${h2}%` }} />
                  </div>
                );
              })}
            </div>
            {simHistory.length > 1 && (
              <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 tabular-nums">
                <span>Lịch sử {simHistory.length} lần đo gần nhất:</span>
                <span>
                  Min {Math.min(...simHistory).toFixed(3)} · Max {Math.max(...simHistory).toFixed(3)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
