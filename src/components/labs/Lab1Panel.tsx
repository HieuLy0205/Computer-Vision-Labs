import React, { useEffect, useMemo, useState } from 'react';
import { Download, RotateCcw, Upload } from 'lucide-react';
import {
  computeHistogram,
  convertColorSpace,
  cropAndResizeImageData,
  HistogramData,
  PixelInfo,
} from '../../lib/cvEngine';
import { imageToImageData, loadImageElement, SAMPLE_IMAGES } from '../../lib/samples';
import { SplitCompareCanvas } from '../SplitCompareCanvas';
import { HistogramComparePanel } from '../charts/HistogramComparePanel';

export const Lab1Panel: React.FC = () => {
  const [selectedSample, setSelectedSample] = useState(SAMPLE_IMAGES[1].src);
  const [customUrl, setCustomUrl] = useState<string | null>(null);
  const [rawImage, setRawImage] = useState<ImageData | null>(null);

  const [colorSpace, setColorSpace] = useState<'rgb' | 'gray' | 'hsv' | 'lab'>('rgb');
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropW, setCropW] = useState(100);
  const [cropH, setCropH] = useState(100);
  const [resizeScale, setResizeScale] = useState(1.0);
  const [interpolation, setInterpolation] = useState<'bilinear' | 'nearest'>('bilinear');

  const [drawPrimitives, setDrawPrimitives] = useState(true);
  const [overlayText, setOverlayText] = useState('OpenCV Lab 1 · ROI');
  const [pixelInfo, setPixelInfo] = useState<PixelInfo | null>(null);
  const [exportSizes, setExportSizes] = useState<{ png: number; jpg: number; webp: number } | null>(null);

  useEffect(() => {
    let active = true;
    const src = customUrl || selectedSample;
    loadImageElement(src)
      .then((img) => {
        if (active) setRawImage(imageToImageData(img, 520, 380));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedSample, customUrl]);

  const processedImage = useMemo(() => {
    if (!rawImage) return null;
    const cropped = cropAndResizeImageData(
      rawImage,
      { x: cropX, y: cropY, w: cropW, h: cropH },
      resizeScale,
      interpolation
    );
    const converted = convertColorSpace(cropped, colorSpace);

    if (!drawPrimitives) return converted;

    const canvas = document.createElement('canvas');
    canvas.width = converted.width;
    canvas.height = converted.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(converted, 0, 0);

    const w = canvas.width;
    const h = canvas.height;
    // Line
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(16, 20);
    ctx.lineTo(w - 16, 20);
    ctx.stroke();

    // Rectangle
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(Math.round(w * 0.14), Math.round(h * 0.16), Math.round(w * 0.72), Math.round(h * 0.68));

    // Circle
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(Math.round(w / 2), Math.round(h / 2), Math.round(Math.min(w, h) * 0.18), 0, Math.PI * 2);
    ctx.stroke();

    // Text label
    if (overlayText.trim()) {
      ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
      const tw = ctx.measureText(overlayText).width;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(16, h - 38, tw + 16, 26);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(overlayText, 24, h - 20);
    }

    return ctx.getImageData(0, 0, w, h);
  }, [rawImage, cropX, cropY, cropW, cropH, resizeScale, interpolation, colorSpace, drawPrimitives, overlayText]);

  const origHistogram: HistogramData | null = useMemo(() => {
    if (!rawImage) return null;
    return computeHistogram(rawImage);
  }, [rawImage]);

  const histogram: HistogramData | null = useMemo(() => {
    if (!processedImage) return null;
    return computeHistogram(processedImage);
  }, [processedImage]);

  const histObservations = useMemo(() => {
    const notes: string[] = [];
    if (colorSpace === 'gray') {
      notes.push('Chuyển sang Grayscale (0.299R + 0.587G + 0.114B): 3 kênh R, G, B chập lại làm một đường cường độ L duy nhất.');
    } else if (colorSpace === 'hsv') {
      notes.push('Chuyển sang HSV (trực quan hóa trên 3 kênh): phân bố kênh thay đổi mạnh vì H biểu diễn góc sắc màu [0..179], S độ bão hòa và V độ chói.');
    } else if (colorSpace === 'lab') {
      notes.push('Chuyển sang CIE LAB: kênh R/G/B hiển thị lúc này đại diện cho L* (độ sáng), a* (lục–đỏ) và b* (lam–vàng), tập trung nhiều quanh vùng trung tính 128.');
    } else {
      notes.push('Giữ nguyên không gian màu RGB: các đỉnh R, G, B thể hiện rõ độ cân bằng màu sắc của ảnh gốc.');
    }
    if (cropW < 100 || cropH < 100 || resizeScale !== 1) {
      notes.push(
        `Crop ROI (${cropW}%×${cropH}%) và Resize (${Math.round(resizeScale * 100)}%, ${interpolation}): tổng số điểm ảnh thay đổi nên chiều cao cột đếm pixel biến thiên tỷ lệ theo diện tích.`
      );
    }
    if (drawPrimitives) {
      notes.push('Đang bật vẽ hình & chữ chú thích: xuất hiện thêm các gai nhỏ ở biên tối (nền nhãn chữ) và vùng sáng (viền xanh/cam).');
    }
    return notes;
  }, [colorSpace, cropW, cropH, resizeScale, interpolation, drawPrimitives]);

  useEffect(() => {
    if (!processedImage) return;
    let cancelled = false;
    const c = document.createElement('canvas');
    c.width = processedImage.width;
    c.height = processedImage.height;
    c.getContext('2d')!.putImageData(processedImage, 0, 0);

    Promise.all([
      new Promise<number>((res) => c.toBlob((b) => res(b?.size ?? 0), 'image/png')),
      new Promise<number>((res) => c.toBlob((b) => res(b?.size ?? 0), 'image/jpeg', 0.9)),
      new Promise<number>((res) => c.toBlob((b) => res(b?.size ?? 0), 'image/webp', 0.85)),
    ]).then(([png, jpg, webp]) => {
      if (!cancelled) setExportSizes({ png, jpg, webp });
    });
    return () => {
      cancelled = true;
    };
  }, [processedImage]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomUrl(url);
  };

  const handleDownloadFormat = (mime: 'image/png' | 'image/jpeg' | 'image/webp', ext: string) => {
    if (!processedImage) return;
    const c = document.createElement('canvas');
    c.width = processedImage.width;
    c.height = processedImage.height;
    c.getContext('2d')!.putImageData(processedImage, 0, 0);
    c.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lab1_output.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      },
      mime,
      0.9
    );
  };

  const resetControls = () => {
    setColorSpace('rgb');
    setCropX(0);
    setCropY(0);
    setCropW(100);
    setCropH(100);
    setResizeScale(1.0);
    setInterpolation('bilinear');
    setDrawPrimitives(true);
    setOverlayText('OpenCV Lab 1 · ROI');
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
      {/* Left Control Deck */}
      <div className="lg:col-span-4 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Bảng điều khiển Lab 1</h3>
          <button
            type="button"
            onClick={resetControls}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Đặt lại
          </button>
        </div>

        {/* Input Source */}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <label className="block text-xs font-semibold text-slate-700">1. Ảnh đầu vào (OpenCV / Pillow I/O)</label>
          <div className="grid grid-cols-2 gap-1.5">
            {SAMPLE_IMAGES.slice(0, 2).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setCustomUrl(null);
                  setSelectedSample(s.src);
                }}
                className={`rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors truncate ${
                  !customUrl && selectedSample === s.src
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
            <Upload className="h-3.5 w-3.5" />
            Tải ảnh bất kỳ từ máy tính
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </label>
        </div>

        {/* Color Space */}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <label className="block text-xs font-semibold text-slate-700">2. Chuyển đổi Không gian màu</label>
          <div className="grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1">
            {([
              { id: 'rgb', label: 'RGB' },
              { id: 'gray', label: 'Gray' },
              { id: 'hsv', label: 'HSV' },
              { id: 'lab', label: 'LAB' },
            ] as const).map((sp) => (
              <button
                key={sp.id}
                type="button"
                onClick={() => setColorSpace(sp.id)}
                className={`rounded-md py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  colorSpace === sp.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Crop & Resize */}
        <div className="space-y-2.5 border-t border-slate-100 pt-3">
          <label className="block text-xs font-semibold text-slate-700">3. Cắt xén (Crop ROI) & Thay đổi kích thước</label>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="flex justify-between text-[11px] text-slate-600 font-mono tabular-nums">
                <span>X bắt đầu</span>
                <span>{cropX}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={60}
                value={cropX}
                onChange={(e) => setCropX(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-slate-600 font-mono tabular-nums">
                <span>Y bắt đầu</span>
                <span>{cropY}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={60}
                value={cropY}
                onChange={(e) => setCropY(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-slate-600 font-mono tabular-nums">
                <span>Rộng ROI</span>
                <span>{cropW}%</span>
              </div>
              <input
                type="range"
                min={25}
                max={100 - cropX}
                value={Math.min(cropW, 100 - cropX)}
                onChange={(e) => setCropW(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-slate-600 font-mono tabular-nums">
                <span>Cao ROI</span>
                <span>{cropH}%</span>
              </div>
              <input
                type="range"
                min={25}
                max={100 - cropY}
                value={Math.min(cropH, 100 - cropY)}
                onChange={(e) => setCropH(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex-1">
              <div className="flex justify-between text-[11px] text-slate-600 font-mono tabular-nums">
                <span>Tỷ lệ Resize</span>
                <span>{Math.round(resizeScale * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.35}
                max={1.3}
                step={0.05}
                value={resizeScale}
                onChange={(e) => setResizeScale(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex rounded-md bg-slate-100 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setInterpolation('bilinear')}
                className={`rounded px-2 py-1 font-medium ${
                  interpolation === 'bilinear' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Bilinear
              </button>
              <button
                type="button"
                onClick={() => setInterpolation('nearest')}
                className={`rounded px-2 py-1 font-medium ${
                  interpolation === 'nearest' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Nearest
              </button>
            </div>
          </div>
        </div>

        {/* Drawing primitives */}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">4. Vẽ hình cơ bản & Văn bản</label>
            <button
              type="button"
              onClick={() => setDrawPrimitives((v) => !v)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                drawPrimitives ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {drawPrimitives ? 'Đang bật' : 'Đã tắt'}
            </button>
          </div>
          {drawPrimitives && (
            <input
              type="text"
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
              placeholder="Nhập văn bản chèn lên ảnh..."
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          )}
        </div>

        {/* Format export comparison */}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <label className="block text-xs font-semibold text-slate-700">5. Lưu định dạng khác & So sánh dung lượng</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { ext: 'png', mime: 'image/png', label: 'PNG', bytes: exportSizes?.png },
              { ext: 'jpg', mime: 'image/jpeg', label: 'JPEG', bytes: exportSizes?.jpg },
              { ext: 'webp', mime: 'image/webp', label: 'WEBP', bytes: exportSizes?.webp },
            ] as const).map((fmt) => (
              <button
                key={fmt.ext}
                type="button"
                onClick={() => handleDownloadFormat(fmt.mime, fmt.ext)}
                className="flex flex-col items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-center hover:border-blue-500 hover:bg-blue-50/60 transition-colors"
              >
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900">
                  <Download className="h-3 w-3 text-blue-600" />
                  {fmt.label}
                </span>
                <span className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                  {fmt.bytes ? `${(fmt.bytes / 1024).toFixed(1)} KB` : '—'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Stage: Visual Output + Pixel Inspector + Histogram */}
      <div className="lg:col-span-8 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">
              Khung hiển thị Tương tác ({processedImage ? `${processedImage.width} × ${processedImage.height} px` : '...'})
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              Không gian màu: {colorSpace.toUpperCase()} · Di chuột để soi giá trị điểm ảnh
            </span>
          </div>

          <SplitCompareCanvas
            original={cropX === 0 && cropY === 0 && cropW === 100 && cropH === 100 && resizeScale === 1 ? rawImage : null}
            processed={processedImage}
            originalLabel="Gốc RGB"
            processedLabel={`Xuất (${colorSpace.toUpperCase()})`}
            enableSplit={cropX === 0 && cropY === 0 && cropW === 100 && cropH === 100 && resizeScale === 1}
            onInspectPixel={setPixelInfo}
          />

          {/* Live Pixel Inspector Strip */}
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] tabular-nums sm:grid-cols-5">
            <div>
              <span className="text-slate-400">Tọa độ: </span>
              <span className="font-semibold text-slate-900">
                {pixelInfo ? `(${pixelInfo.x}, ${pixelInfo.y})` : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">RGB: </span>
              <span className="font-semibold text-slate-900">
                {pixelInfo ? `${pixelInfo.r}, ${pixelInfo.g}, ${pixelInfo.b}` : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Gray: </span>
              <span className="font-semibold text-slate-900">{pixelInfo ? pixelInfo.gray : '—'}</span>
            </div>
            <div>
              <span className="text-slate-400">HSV: </span>
              <span className="font-semibold text-slate-900">
                {pixelInfo ? `${pixelInfo.h}, ${pixelInfo.s}, ${pixelInfo.v}` : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">LAB: </span>
              <span className="font-semibold text-slate-900">
                {pixelInfo ? `${pixelInfo.lStar}, ${pixelInfo.aStar}, ${pixelInfo.bStar}` : '—'}
              </span>
            </div>
          </div>
        </div>

        <HistogramComparePanel
          before={origHistogram}
          after={histogram}
          beforeLabel="Trước (Ảnh gốc RGB)"
          afterLabel={`Sau (${colorSpace.toUpperCase()})`}
          mode={colorSpace === 'gray' ? 'gray' : 'rgb'}
          observations={histObservations}
        />
      </div>
    </div>
  );
};
