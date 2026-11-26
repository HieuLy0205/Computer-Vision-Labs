import type { FaceDetector } from '@mediapipe/tasks-vision';

export interface HistogramData {
  r: number[];
  g: number[];
  b: number[];
  gray: number[];
  maxCount: number;
}

export interface PixelInfo {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  gray: number;
  h: number;
  s: number;
  v: number;
  lStar: number;
  aStar: number;
  bStar: number;
}

export function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

export function rgbToGrayVal(r: number, g: number, b: number): number {
  return clampByte(0.299 * r + 0.587 * g + 0.114 * b);
}

export function rgbToHsvPixel(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (d / max) * 255;
  const v = max * 255;
  // Scale Hue to OpenCV [0, 179]
  return [Math.round(h / 2), Math.round(s), Math.round(v)];
}

export function rgbToLabPixel(r: number, g: number, b: number): [number, number, number] {
  const lin = (c: number) => {
    const v = c / 255;
    return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
  };
  const rl = lin(r);
  const gl = lin(g);
  const bl = lin(b);
  const x = (rl * 0.4124 + gl * 0.3576 + bl * 0.1805) / 0.95047;
  const y = (rl * 0.2126 + gl * 0.7152 + bl * 0.0722) / 1.0;
  const z = (rl * 0.0193 + gl * 0.1192 + bl * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);
  // OpenCV 8-bit scaling: L*255/100, a+128, b+128
  return [clampByte((l * 255) / 100), clampByte(a + 128), clampByte(bVal + 128)];
}

export function inspectPixel(img: ImageData, x: number, y: number): PixelInfo | null {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return null;
  const idx = (y * img.width + x) * 4;
  const r = img.data[idx];
  const g = img.data[idx + 1];
  const b = img.data[idx + 2];
  const [h, s, v] = rgbToHsvPixel(r, g, b);
  const [lStar, aStar, bStar] = rgbToLabPixel(r, g, b);
  return {
    x,
    y,
    r,
    g,
    b,
    gray: rgbToGrayVal(r, g, b),
    h,
    s,
    v,
    lStar,
    aStar,
    bStar,
  };
}

export function computeHistogram(img: ImageData): HistogramData {
  const r = new Array<number>(256).fill(0);
  const g = new Array<number>(256).fill(0);
  const b = new Array<number>(256).fill(0);
  const gray = new Array<number>(256).fill(0);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const rv = d[i];
    const gv = d[i + 1];
    const bv = d[i + 2];
    r[rv]++;
    g[gv]++;
    b[bv]++;
    gray[rgbToGrayVal(rv, gv, bv)]++;
  }
  let maxCount = 1;
  for (let i = 0; i < 256; i++) {
    if (r[i] > maxCount) maxCount = r[i];
    if (g[i] > maxCount) maxCount = g[i];
    if (b[i] > maxCount) maxCount = b[i];
    if (gray[i] > maxCount) maxCount = gray[i];
  }
  return { r, g, b, gray, maxCount };
}

export function convertColorSpace(
  src: ImageData,
  space: 'rgb' | 'gray' | 'hsv' | 'lab'
): ImageData {
  if (space === 'rgb') {
    return new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  }
  const out = new Uint8ClampedArray(src.data.length);
  for (let i = 0; i < src.data.length; i += 4) {
    const r = src.data[i];
    const g = src.data[i + 1];
    const b = src.data[i + 2];
    if (space === 'gray') {
      const y = rgbToGrayVal(r, g, b);
      out[i] = y;
      out[i + 1] = y;
      out[i + 2] = y;
    } else if (space === 'hsv') {
      const [h, s, v] = rgbToHsvPixel(r, g, b);
      out[i] = clampByte((h / 179) * 255);
      out[i + 1] = s;
      out[i + 2] = v;
    } else {
      const [l, a, bv] = rgbToLabPixel(r, g, b);
      out[i] = l;
      out[i + 1] = a;
      out[i + 2] = bv;
    }
    out[i + 3] = 255;
  }
  return new ImageData(out, src.width, src.height);
}

export function cropAndResizeImageData(
  src: ImageData,
  cropPct: { x: number; y: number; w: number; h: number },
  scale: number,
  interpolation: 'bilinear' | 'nearest'
): ImageData {
  const sx = Math.max(0, Math.floor((cropPct.x / 100) * src.width));
  const sy = Math.max(0, Math.floor((cropPct.y / 100) * src.height));
  const sw = Math.max(16, Math.min(src.width - sx, Math.floor((cropPct.w / 100) * src.width)));
  const sh = Math.max(16, Math.min(src.height - sy, Math.floor((cropPct.h / 100) * src.height)));

  const c1 = document.createElement('canvas');
  c1.width = src.width;
  c1.height = src.height;
  const ctx1 = c1.getContext('2d')!;
  ctx1.putImageData(src, 0, 0);

  const dw = Math.max(16, Math.round(sw * scale));
  const dh = Math.max(16, Math.round(sh * scale));
  const c2 = document.createElement('canvas');
  c2.width = dw;
  c2.height = dh;
  const ctx2 = c2.getContext('2d')!;
  ctx2.imageSmoothingEnabled = interpolation === 'bilinear';
  ctx2.drawImage(c1, sx, sy, sw, sh, 0, 0, dw, dh);
  return ctx2.getImageData(0, 0, dw, dh);
}

// ---------- LAB 2: Point Ops & Linear Filters ----------

export function applyPointOperations(
  src: ImageData,
  opts: {
    brightness: number;
    contrast: number;
    gamma?: number;
    histEqualize?: boolean;
    negative: boolean;
    thresholdEnabled: boolean;
    threshold: number;
  }
): ImageData {
  const out = new Uint8ClampedArray(src.data.length);
  const { brightness, contrast, gamma = 1.0, histEqualize = false, negative, thresholdEnabled, threshold } = opts;

  // Precompute Gamma LUT (V_out = 255 * (V_in / 255)^gamma)
  const gammaLut = new Uint8Array(256);
  for (let v = 0; v < 256; v++) {
    gammaLut[v] = clampByte(Math.pow(v / 255, gamma) * 255);
  }

  // Optional Histogram Equalization on luminance (Y) to preserve natural color ratios
  let yLut: Uint8Array | null = null;
  if (histEqualize) {
    const hist = new Uint32Array(256);
    const total = src.width * src.height;
    for (let i = 0; i < src.data.length; i += 4) {
      const y = rgbToGrayVal(src.data[i], src.data[i + 1], src.data[i + 2]);
      hist[y]++;
    }
    const cdf = new Uint32Array(256);
    let acc = 0;
    let cdfMin = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      cdf[v] = acc;
      if (cdfMin === 0 && acc > 0) cdfMin = acc;
    }
    yLut = new Uint8Array(256);
    const denom = Math.max(1, total - cdfMin);
    for (let v = 0; v < 256; v++) {
      yLut[v] = cdf[v] <= cdfMin ? 0 : clampByte(((cdf[v] - cdfMin) / denom) * 255);
    }
  }

  for (let i = 0; i < src.data.length; i += 4) {
    let r = src.data[i];
    let g = src.data[i + 1];
    let b = src.data[i + 2];

    if (yLut) {
      const yOld = rgbToGrayVal(r, g, b);
      const yNew = yLut[yOld];
      const ratio = yOld > 0 ? yNew / yOld : 1;
      r = clampByte(r * ratio);
      g = clampByte(g * ratio);
      b = clampByte(b * ratio);
    }

    r = gammaLut[clampByte(r * contrast + brightness)];
    g = gammaLut[clampByte(g * contrast + brightness)];
    b = gammaLut[clampByte(b * contrast + brightness)];

    if (negative) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }

    if (thresholdEnabled) {
      const gray = rgbToGrayVal(r, g, b);
      const bin = gray >= threshold ? 255 : 0;
      r = bin;
      g = bin;
      b = bin;
    }

    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = 255;
  }
  return new ImageData(out, src.width, src.height);
}

export function convolve2D(src: ImageData, kernel: number[], size: number, bias = 0): ImageData {
  const w = src.width;
  const h = src.height;
  const half = Math.floor(size / 2);
  const out = new Uint8ClampedArray(src.data.length);
  const d = src.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sr = 0;
      let sg = 0;
      let sb = 0;
      for (let ky = -half; ky <= half; ky++) {
        const py = Math.min(h - 1, Math.max(0, y + ky));
        for (let kx = -half; kx <= half; kx++) {
          const px = Math.min(w - 1, Math.max(0, x + kx));
          const weight = kernel[(ky + half) * size + (kx + half)];
          const idx = (py * w + px) * 4;
          sr += d[idx] * weight;
          sg += d[idx + 1] * weight;
          sb += d[idx + 2] * weight;
        }
      }
      const oIdx = (y * w + x) * 4;
      out[oIdx] = clampByte(sr + bias);
      out[oIdx + 1] = clampByte(sg + bias);
      out[oIdx + 2] = clampByte(sb + bias);
      out[oIdx + 3] = 255;
    }
  }
  return new ImageData(out, w, h);
}

export const LINEAR_KERNELS: Record<string, { label: string; size: number; kernel: number[]; formula: string }> = {
  none: {
    label: 'Không lọc (Identity)',
    size: 3,
    kernel: [0, 0, 0, 0, 1, 0, 0, 0, 0],
    formula: 'g(x,y) = f(x,y)',
  },
  mean3: {
    label: 'Lọc Trung bình 3×3',
    size: 3,
    kernel: Array(9).fill(1 / 9),
    formula: 'K = (1/9) · ones(3,3)',
  },
  mean5: {
    label: 'Lọc Trung bình 5×5',
    size: 5,
    kernel: Array(25).fill(1 / 25),
    formula: 'K = (1/25) · ones(5,5)',
  },
  gaussian3: {
    label: 'Lọc Gaussian 3×3',
    size: 3,
    kernel: [1 / 16, 2 / 16, 1 / 16, 2 / 16, 4 / 16, 2 / 16, 1 / 16, 2 / 16, 1 / 16],
    formula: 'G(x,y) = (1/16) · [1,2,1; 2,4,2; 1,2,1]',
  },
  gaussian5: {
    label: 'Lọc Gaussian 5×5 (σ=1.2)',
    size: 5,
    kernel: [
      1 / 273, 4 / 273, 7 / 273, 4 / 273, 1 / 273,
      4 / 273, 16 / 273, 26 / 273, 16 / 273, 4 / 273,
      7 / 273, 26 / 273, 41 / 273, 26 / 273, 7 / 273,
      4 / 273, 16 / 273, 26 / 273, 16 / 273, 4 / 273,
      1 / 273, 4 / 273, 7 / 273, 4 / 273, 1 / 273,
    ],
    formula: 'G(x,y) ~ exp(-(x²+y²)/(2σ²))',
  },
  sharpen: {
    label: 'Làm sắc nét (Sharpen 3×3)',
    size: 3,
    kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0],
    formula: 'I + (I - Mean_4) = [0,-1,0; -1,5,-1; 0,-1,0]',
  },
  strongSharpen: {
    label: 'Sắc nét Mạnh (8-Neighbor)',
    size: 3,
    kernel: [-1, -1, -1, -1, 9, -1, -1, -1, -1],
    formula: '[-1,-1,-1; -1,9,-1; -1,-1,-1]',
  },
};

// ---------- LAB 3: Noise, Sobel/Prewitt, Custom Kernel, Median, Bilateral & Metrics ----------

export function addSyntheticNoise(
  src: ImageData,
  noiseType: 'none' | 'salt_pepper' | 'gaussian',
  intensityPct: number
): ImageData {
  if (noiseType === 'none' || intensityPct <= 0) {
    return new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  }
  const out = new Uint8ClampedArray(src.data);
  // Deterministic pseudo-random PRNG for reproducible comparisons
  let seed = 1337;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const prob = intensityPct / 100;

  if (noiseType === 'salt_pepper') {
    for (let i = 0; i < out.length; i += 4) {
      const r = rand();
      if (r < prob / 2) {
        out[i] = 0;
        out[i + 1] = 0;
        out[i + 2] = 0;
      } else if (r > 1 - prob / 2) {
        out[i] = 255;
        out[i + 1] = 255;
        out[i + 2] = 255;
      }
    }
  } else {
    const sigma = intensityPct * 2.2;
    for (let i = 0; i < out.length; i += 4) {
      const u1 = Math.max(1e-6, rand());
      const u2 = rand();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sigma;
      out[i] = clampByte(out[i] + z);
      out[i + 1] = clampByte(out[i + 1] + z);
      out[i + 2] = clampByte(out[i + 2] + z);
    }
  }
  return new ImageData(out, src.width, src.height);
}

export function edgeDetectOperator(src: ImageData, operator: 'sobel' | 'prewitt'): ImageData {
  const w = src.width;
  const h = src.height;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * src.data[idx] + 0.587 * src.data[idx + 1] + 0.114 * src.data[idx + 2];
  }
  const kx = operator === 'sobel' ? [-1, 0, 1, -2, 0, 2, -1, 0, 1] : [-1, 0, 1, -1, 0, 1, -1, 0, 1];
  const ky = operator === 'sobel' ? [-1, -2, -1, 0, 0, 0, 1, 2, 1] : [-1, -1, -1, 0, 0, 0, 1, 1, 1];

  const out = new Uint8ClampedArray(src.data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let gx = 0;
      let gy = 0;
      for (let j = -1; j <= 1; j++) {
        const py = Math.min(h - 1, Math.max(0, y + j));
        for (let i = -1; i <= 1; i++) {
          const px = Math.min(w - 1, Math.max(0, x + i));
          const val = gray[py * w + px];
          const ki = (j + 1) * 3 + (i + 1);
          gx += val * kx[ki];
          gy += val * ky[ki];
        }
      }
      const mag = clampByte(Math.hypot(gx, gy));
      const oIdx = (y * w + x) * 4;
      out[oIdx] = mag;
      out[oIdx + 1] = mag;
      out[oIdx + 2] = mag;
      out[oIdx + 3] = 255;
    }
  }
  return new ImageData(out, w, h);
}

export function medianFilter2D(src: ImageData, size = 3): ImageData {
  const w = src.width;
  const h = src.height;
  const half = Math.floor(size / 2);
  const out = new Uint8ClampedArray(src.data.length);
  const d = src.data;
  const len = size * size;
  const arrR = new Uint8Array(len);
  const arrG = new Uint8Array(len);
  const arrB = new Uint8Array(len);
  const mid = Math.floor(len / 2);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let k = 0;
      for (let ky = -half; ky <= half; ky++) {
        const py = Math.min(h - 1, Math.max(0, y + ky));
        for (let kx = -half; kx <= half; kx++) {
          const px = Math.min(w - 1, Math.max(0, x + kx));
          const idx = (py * w + px) * 4;
          arrR[k] = d[idx];
          arrG[k] = d[idx + 1];
          arrB[k] = d[idx + 2];
          k++;
        }
      }
      arrR.sort();
      arrG.sort();
      arrB.sort();
      const oIdx = (y * w + x) * 4;
      out[oIdx] = arrR[mid];
      out[oIdx + 1] = arrG[mid];
      out[oIdx + 2] = arrB[mid];
      out[oIdx + 3] = 255;
    }
  }
  return new ImageData(out, w, h);
}

export function bilateralFilter2D(src: ImageData, radius = 3, sigmaSpace = 4, sigmaColor = 45): ImageData {
  const w = src.width;
  const h = src.height;
  const out = new Uint8ClampedArray(src.data.length);
  const d = src.data;
  const twoSigS2 = 2 * sigmaSpace * sigmaSpace;
  const twoSigC2 = 2 * sigmaColor * sigmaColor;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cIdx = (y * w + x) * 4;
      const cr = d[cIdx];
      const cg = d[cIdx + 1];
      const cb = d[cIdx + 2];

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let wSum = 0;

      for (let ky = -radius; ky <= radius; ky++) {
        const py = Math.min(h - 1, Math.max(0, y + ky));
        for (let kx = -radius; kx <= radius; kx++) {
          const px = Math.min(w - 1, Math.max(0, x + kx));
          const idx = (py * w + px) * 4;
          const nr = d[idx];
          const ng = d[idx + 1];
          const nb = d[idx + 2];

          const dist2 = kx * kx + ky * ky;
          const color2 = (nr - cr) ** 2 + (ng - cg) ** 2 + (nb - cb) ** 2;
          const weight = Math.exp(-dist2 / twoSigS2 - color2 / twoSigC2);

          sumR += nr * weight;
          sumG += ng * weight;
          sumB += nb * weight;
          wSum += weight;
        }
      }
      out[cIdx] = clampByte(sumR / wSum);
      out[cIdx + 1] = clampByte(sumG / wSum);
      out[cIdx + 2] = clampByte(sumB / wSum);
      out[cIdx + 3] = 255;
    }
  }
  return new ImageData(out, w, h);
}

export function computeImageQuality(clean: ImageData, processed: ImageData): { mse: number; psnr: number } {
  let sumSq = 0;
  const n = clean.width * clean.height * 3;
  for (let i = 0; i < clean.data.length; i += 4) {
    const dr = clean.data[i] - processed.data[i];
    const dg = clean.data[i + 1] - processed.data[i + 1];
    const db = clean.data[i + 2] - processed.data[i + 2];
    sumSq += dr * dr + dg * dg + db * db;
  }
  const mse = sumSq / n;
  const psnr = mse <= 1e-9 ? 99.9 : 10 * Math.log10((255 * 255) / mse);
  return { mse: Number(mse.toFixed(2)), psnr: Number(psnr.toFixed(2)) };
}

// ---------- LAB 4: 2D Wavelet Transform, Wavelet Hash, Hamming & ROC ----------

export type WaveletFamily = 'haar' | 'db4' | 'bior1.3';

export interface WaveletSubbands {
  ll: number[][];
  lh: number[][];
  hl: number[][];
  hh: number[][];
  hashBits: number[];
}

function getWaveletFilters(family: WaveletFamily): { lo: number[]; hi: number[] } {
  if (family === 'db4') {
    const lo = [
      -0.0105974018, 0.0328830117, 0.0308413818, -0.1870348117,
      -0.0279837694, 0.6308807679, 0.7148465706, 0.2303778133,
    ];
    const hi = lo.map((v, idx) => ((idx % 2 === 0 ? 1 : -1) * lo[lo.length - 1 - idx]));
    return { lo, hi };
  }
  if (family === 'bior1.3') {
    const lo = [-0.0883883476, 0.0883883476, 0.7071067812, 0.7071067812, 0.0883883476, -0.0883883476];
    const hi = [0, 0, -0.7071067812, 0.7071067812, 0, 0];
    return { lo, hi };
  }
  const s = 1 / Math.SQRT2;
  return { lo: [s, s], hi: [-s, s] };
}

function dwt1D(signal: number[], lo: number[], hi: number[]): { a: number[]; d: number[] } {
  const n = signal.length;
  const fLen = lo.length;
  const half = Math.floor(n / 2);
  const a = new Array<number>(half).fill(0);
  const d = new Array<number>(half).fill(0);
  for (let i = 0; i < half; i++) {
    let sa = 0;
    let sd = 0;
    for (let k = 0; k < fLen; k++) {
      // Symmetric boundary reflection
      let idx = 2 * i + k - Math.floor(fLen / 2) + 1;
      if (idx < 0) idx = -idx;
      if (idx >= n) idx = 2 * n - 1 - idx;
      idx = Math.max(0, Math.min(n - 1, idx));
      sa += signal[idx] * lo[k];
      sd += signal[idx] * hi[k];
    }
    a[i] = sa;
    d[i] = sd;
  }
  return { a, d };
}

function dwt2DLevel(mat: number[][], family: WaveletFamily): { ll: number[][]; lh: number[][]; hl: number[][]; hh: number[][] } {
  const rows = mat.length;
  const cols = mat[0].length;
  const { lo, hi } = getWaveletFilters(family);

  const halfC = Math.floor(cols / 2);
  const rowA: number[][] = [];
  const rowD: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const { a, d } = dwt1D(mat[r], lo, hi);
    rowA.push(a);
    rowD.push(d);
  }

  const halfR = Math.floor(rows / 2);
  const ll: number[][] = Array.from({ length: halfR }, () => new Array(halfC).fill(0));
  const lh: number[][] = Array.from({ length: halfR }, () => new Array(halfC).fill(0));
  const hl: number[][] = Array.from({ length: halfR }, () => new Array(halfC).fill(0));
  const hh: number[][] = Array.from({ length: halfR }, () => new Array(halfC).fill(0));

  for (let c = 0; c < halfC; c++) {
    const colA = rowA.map((r) => r[c]);
    const colD = rowD.map((r) => r[c]);
    const resA = dwt1D(colA, lo, hi);
    const resD = dwt1D(colD, lo, hi);
    for (let r = 0; r < halfR; r++) {
      ll[r][c] = resA.a[r];
      lh[r][c] = resA.d[r];
      hl[r][c] = resD.a[r];
      hh[r][c] = resD.d[r];
    }
  }
  return { ll, lh, hl, hh };
}

export function imageDataToGrayMatrix64(src: ImageData): number[][] {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const tmp = document.createElement('canvas');
  tmp.width = src.width;
  tmp.height = src.height;
  tmp.getContext('2d')!.putImageData(src, 0, 0);
  ctx.drawImage(tmp, 0, 0, 64, 64);
  const d = ctx.getImageData(0, 0, 64, 64).data;
  const mat: number[][] = [];
  for (let y = 0; y < 64; y++) {
    const row = new Array<number>(64);
    for (let x = 0; x < 64; x++) {
      const idx = (y * 64 + x) * 4;
      row[x] = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
    }
    mat.push(row);
  }
  return mat;
}

export function computeWaveletHash(src: ImageData, family: WaveletFamily = 'db4', level = 3): WaveletSubbands {
  let curr = imageDataToGrayMatrix64(src);
  let last = dwt2DLevel(curr, family);
  curr = last.ll;
  for (let l = 2; l <= level; l++) {
    if (curr.length < 8) break;
    last = dwt2DLevel(curr, family);
    curr = last.ll;
  }

  // Downsample LL to 8x8 -> 64 coefficients
  const rows = curr.length;
  const cols = curr[0].length;
  const vals: number[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const sy = Math.min(rows - 1, Math.floor((y / 8) * rows));
      const sx = Math.min(cols - 1, Math.floor((x / 8) * cols));
      vals.push(curr[sy][sx]);
    }
  }
  const sorted = [...vals].sort((a, b) => a - b);
  const median = (sorted[31] + sorted[32]) / 2;
  const hashBits = vals.map((v) => (v >= median ? 1 : 0));
  return { ...last, hashBits };
}

export function hammingDistance(a: number[], b: number[]): number {
  let dist = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) dist++;
  }
  return dist;
}

// ---------- LAB 5: Face Detection & 128-D Facial Feature Embedding ----------

export interface FaceDetectionResult {
  box: { x: number; y: number; w: number; h: number };
  confidence: number;
  landmarks: {
    leftEye: [number, number];
    rightEye: [number, number];
    nose: [number, number];
    leftMouth: [number, number];
    rightMouth: [number, number];
  };
  embedding: number[];
  alignedDataUrl?: string;
}

function buildIntegralImage(arr: Float32Array, w: number, h: number): Float32Array {
  const sat = new Float32Array((w + 1) * (h + 1));
  const stride = w + 1;
  for (let y = 1; y <= h; y++) {
    let rowSum = 0;
    const srcRow = (y - 1) * w;
    const dstRow = y * stride;
    const prevRow = (y - 1) * stride;
    for (let x = 1; x <= w; x++) {
      rowSum += arr[srcRow + (x - 1)];
      sat[dstRow + x] = sat[prevRow + x] + rowSum;
    }
  }
  return sat;
}

function querySAT(sat: Float32Array, stride: number, x1: number, y1: number, x2: number, y2: number): number {
  const ax = Math.max(0, x1);
  const ay = Math.max(0, y1);
  const bx = Math.max(ax, x2);
  const by = Math.max(ay, y2);
  return sat[by * stride + bx] - sat[ay * stride + bx] - sat[by * stride + ax] + sat[ay * stride + ax];
}

function localizeFaceSmart(
  canvas: HTMLCanvasElement
): { box: { x: number; y: number; w: number; h: number }; confidence: number } | null {
  const w = canvas.width;
  const h = canvas.height;
  // Aspect-preserving analysis grid
  const aw = Math.min(168, w);
  const ah = Math.max(28, Math.round((aw * h) / w));
  const aCanvas = document.createElement('canvas');
  aCanvas.width = aw;
  aCanvas.height = ah;
  const aCtx = aCanvas.getContext('2d')!;
  aCtx.drawImage(canvas, 0, 0, aw, ah);
  const d = aCtx.getImageData(0, 0, aw, ah).data;

  const skin = new Float32Array(aw * ah);
  const lum = new Float32Array(aw * ah);
  const grad = new Float32Array(aw * ah);
  const dark = new Float32Array(aw * ah);

  let totalSkin = 0;
  for (let i = 0; i < aw * ah; i++) {
    const idx = i * 4;
    const r = d[idx];
    const g = d[idx + 1];
    const b = d[idx + 2];
    const alpha = d[idx + 3];
    if (alpha < 128) continue;

    const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
    lum[i] = yVal;

    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

    // Strict chroma separation: rejects neutral gray walls/shirts where R ≈ G ≈ B (Cr ≈ 128, Cb ≈ 128)
    if (cr >= 130 && cr <= 184 && cb >= 73 && cb <= 127 && yVal > 36 && r - b >= 8 && r >= g - 3) {
      const cbDist = Math.abs(cb - 103) / 29;
      const crDist = Math.abs(cr - 154) / 27;
      const prob = Math.max(0, 1 - 0.34 * (cbDist * cbDist + crDist * crDist));
      if (prob > 0.14) {
        skin[i] = Math.min(1, prob);
        totalSkin++;
      }
    }
    if (yVal < 115) {
      dark[i] = (115 - yVal) / 115;
    }
  }

  if (totalSkin < 18) return null;

  for (let y = 1; y < ah - 1; y++) {
    for (let x = 1; x < aw - 1; x++) {
      const p = y * aw + x;
      const gx = lum[p + 1] - lum[p - 1];
      const gy = lum[p + aw] - lum[p - aw];
      grad[p] = Math.min(1, Math.hypot(gx, gy) / 65);
    }
  }

  const stride = aw + 1;
  const skinSAT = buildIntegralImage(skin, aw, ah);
  const lumSAT = buildIntegralImage(lum, aw, ah);
  const gradSAT = buildIntegralImage(grad, aw, ah);
  const darkSAT = buildIntegralImage(dark, aw, ah);

  const minDim = Math.min(aw, ah);
  const minS = Math.max(14, Math.round(minDim * 0.12));
  const maxS = Math.max(minS + 4, Math.round(minDim * 0.84));
  const totalPixels = aw * ah;

  interface Candidate {
    x: number;
    y: number;
    s: number;
    bh: number;
    score: number;
  }
  const candidates: Candidate[] = [];

  for (let s = minS; s <= maxS; s = Math.max(s + 1, Math.round(s * 1.09))) {
    const bh = Math.min(ah - 2, Math.round(s * 1.24));
    const step = Math.max(1, Math.round(s * 0.06));

    for (let y = 0; y <= ah - bh; y += step) {
      for (let x = 0; x <= aw - s; x += step) {
        const cx1 = x + Math.round(s * 0.16);
        const cx2 = x + Math.round(s * 0.84);
        const cy1 = y + Math.round(bh * 0.10);
        const cy2 = y + Math.round(bh * 0.88);
        const wCore = Math.max(1, cx2 - cx1);
        const coreArea = Math.max(1, wCore * (cy2 - cy1));
        const coreSkinSum = querySAT(skinSAT, stride, cx1, cy1, cx2, cy2);
        const coreSkin = coreSkinSum / coreArea;
        if (coreSkin < 0.42) continue;

        // Brow/Forehead band [0.13..0.27] must contain skin (tolerant of bangs covering upper forehead)
        const fy1 = y + Math.round(bh * 0.13);
        const fy2 = y + Math.round(bh * 0.27);
        const fx1 = x + Math.round(s * 0.24);
        const fx2 = x + Math.round(s * 0.76);
        const fArea = Math.max(1, (fx2 - fx1) * (fy2 - fy1));
        const foreheadSkin = querySAT(skinSAT, stride, fx1, fy1, fx2, fy2) / fArea;
        if (foreheadSkin < 0.28) continue;

        // Lower cheek/jaw band [0.55..0.85] MUST also be skin
        const ly1 = y + Math.round(bh * 0.55);
        const ly2 = y + Math.round(bh * 0.85);
        const lowerSkin = querySAT(skinSAT, stride, fx1, ly1, fx2, ly2) / Math.max(1, (fx2 - fx1) * (ly2 - ly1));
        if (lowerSkin < 0.42) continue;

        // Horizontal & Top Enclosure Check (rejects tiny sub-patches inside a face)
        const cheekY1 = y + Math.round(bh * 0.22);
        const cheekY2 = y + Math.round(bh * 0.70);
        const cheekH = Math.max(1, cheekY2 - cheekY1);

        const leftX1 = Math.max(0, x - Math.round(s * 0.16));
        const leftX2 = Math.min(aw, x + Math.round(s * 0.02));
        const leftOuterSkin =
          leftX2 > leftX1 ? querySAT(skinSAT, stride, leftX1, cheekY1, leftX2, cheekY2) / ((leftX2 - leftX1) * cheekH) : 0;

        const rightX1 = Math.max(0, x + s - Math.round(s * 0.02));
        const rightX2 = Math.min(aw, x + s + Math.round(s * 0.16));
        const rightOuterSkin =
          rightX2 > rightX1 ? querySAT(skinSAT, stride, rightX1, cheekY1, rightX2, cheekY2) / ((rightX2 - rightX1) * cheekH) : 0;

        if (coreSkin - Math.max(leftOuterSkin, rightOuterSkin) < 0.16) continue;

        const topY1 = Math.max(0, y - Math.round(bh * 0.15));
        const topY2 = Math.max(topY1 + 1, y + Math.round(bh * 0.03));
        const topOuterSkin = querySAT(skinSAT, stride, fx1, topY1, fx2, topY2) / Math.max(1, (fx2 - fx1) * (topY2 - topY1));

        // Eye band [0.26..0.44] & Nose Bridge Check
        const ey1 = y + Math.round(bh * 0.26);
        const ey2 = y + Math.round(bh * 0.44);
        const bx1 = x + Math.round(s * 0.42);
        const bx2 = x + Math.round(s * 0.58);
        const bridgeArea = Math.max(1, (bx2 - bx1) * (ey2 - ey1));
        const bridgeSkin = querySAT(skinSAT, stride, bx1, ey1, bx2, ey2) / bridgeArea;
        if (bridgeSkin < 0.35) continue;

        // Forehead AND Cheeks must both be strictly brighter than the dark Eye/Brow band
        const foreheadLum = querySAT(lumSAT, stride, fx1, fy1, fx2, fy2) / fArea;
        const eyeLum = querySAT(lumSAT, stride, fx1, ey1, fx2, ey2) / Math.max(1, (fx2 - fx1) * (ey2 - ey1));
        const chy1 = y + Math.round(bh * 0.46);
        const chy2 = y + Math.round(bh * 0.65);
        const cheekLum = querySAT(lumSAT, stride, fx1, chy1, fx2, chy2) / Math.max(1, (fx2 - fx1) * (chy2 - chy1));
        if (foreheadLum <= eyeLum || cheekLum <= eyeLum) continue;

        const lex1 = x + Math.round(s * 0.18);
        const lex2 = x + Math.round(s * 0.41);
        const rex1 = x + Math.round(s * 0.59);
        const rex2 = x + Math.round(s * 0.82);
        const lEyeArea = Math.max(1, (lex2 - lex1) * (ey2 - ey1));
        const rEyeArea = Math.max(1, (rex2 - rex1) * (ey2 - ey1));

        const lEyeLum = querySAT(lumSAT, stride, lex1, ey1, lex2, ey2) / lEyeArea;
        const rEyeLum = querySAT(lumSAT, stride, rex1, ey1, rex2, ey2) / rEyeArea;
        const bridgeLum = querySAT(lumSAT, stride, bx1, ey1, bx2, ey2) / bridgeArea;
        const bridgeContrast = Math.max(0, Math.min(1, (bridgeLum - (lEyeLum + rEyeLum) * 0.5) / 26));

        const lEyeFeat =
          (querySAT(gradSAT, stride, lex1, ey1, lex2, ey2) + querySAT(darkSAT, stride, lex1, ey1, lex2, ey2)) / lEyeArea;
        const rEyeFeat =
          (querySAT(gradSAT, stride, rex1, ey1, rex2, ey2) + querySAT(darkSAT, stride, rex1, ey1, rex2, ey2)) / rEyeArea;
        const dualEyeBalance = Math.min(lEyeFeat, rEyeFeat) / (Math.max(lEyeFeat, rEyeFeat) + 0.08);

        const haarF = Math.min(1, (foreheadLum - eyeLum) / 30);
        const haarC = Math.min(1, (cheekLum - eyeLum) / 30);

        const my1 = y + Math.round(bh * 0.66);
        const my2 = y + Math.round(bh * 0.84);
        const mx1 = x + Math.round(s * 0.28);
        const mx2 = x + Math.round(s * 0.72);
        const mouthGrad = querySAT(gradSAT, stride, mx1, my1, mx2, my2) / Math.max(1, (mx2 - mx1) * (my2 - my1));

        const botY1 = Math.min(ah - 1, y + Math.round(bh * 0.92));
        const botY2 = Math.min(ah, y + Math.round(bh * 1.05));
        const botMidSkin =
          botY2 > botY1 ? querySAT(skinSAT, stride, cx1, botY1, cx2, botY2) / Math.max(1, wCore * (botY2 - botY1)) : 0;

        const enclosureScore = Math.max(
          0.05,
          coreSkin - 0.45 * leftOuterSkin - 0.45 * rightOuterSkin - 0.35 * topOuterSkin - 0.25 * botMidSkin
        );
        const massFactor = Math.pow(Math.max(0.005, coreSkinSum / totalPixels), 0.24);
        const anatomy = 0.35 + 0.9 * haarF + 0.9 * haarC + 0.95 * bridgeContrast + 0.7 * mouthGrad + 0.4 * (lEyeFeat + rEyeFeat);
        const score = enclosureScore * massFactor * anatomy * (0.45 + 0.55 * dualEyeBalance);

        if (score > 0.05) {
          candidates.push({ x, y, s, bh, score });
        }
      }
    }
  }

  if (candidates.length === 0) return null;

  // NMS: pick top diverse candidates and re-rank by Bilateral Horizontal Symmetry
  candidates.sort((a, b) => b.score - a.score);
  const selected: Candidate[] = [];
  for (const c of candidates) {
    const overlaps = selected.some((k) => {
      const ix = Math.max(0, Math.min(k.x + k.s, c.x + c.s) - Math.max(k.x, c.x));
      const iy = Math.max(0, Math.min(k.y + k.bh, c.y + c.bh) - Math.max(k.y, c.y));
      const inter = ix * iy;
      const union = k.s * k.bh + c.s * c.bh - inter;
      return union > 0 && inter / union > 0.45;
    });
    if (!overlaps) {
      selected.push(c);
      if (selected.length >= 12) break;
    }
  }

  let bestFinalScore = -1;
  let bestBox = selected[0];
  for (const cand of selected) {
    let diffSum = 0;
    let count = 0;
    const xStart = cand.x + Math.round(cand.s * 0.18);
    const xEnd = cand.x + Math.round(cand.s * 0.82);
    const yStart = cand.y + Math.round(cand.bh * 0.18);
    const yEnd = cand.y + Math.round(cand.bh * 0.82);
    const mid = (xStart + xEnd) / 2;
    for (let yy = yStart; yy < yEnd; yy += 2) {
      for (let xx = xStart; xx < Math.floor(mid); xx += 2) {
        const mx = Math.min(aw - 1, Math.max(0, Math.round(2 * mid - xx)));
        diffSum += Math.abs(lum[yy * aw + xx] - lum[yy * aw + mx]);
        count++;
      }
    }
    const sym = count > 0 ? Math.max(0, 1 - diffSum / (count * 55)) : 0.5;
    const finalScore = cand.score * (0.65 + 0.55 * sym);
    if (finalScore > bestFinalScore) {
      bestFinalScore = finalScore;
      bestBox = cand;
    }
  }

  const scaleX = w / aw;
  const scaleY = h / ah;
  const bw = Math.round(bestBox.s * scaleX);
  const bh = Math.round(bw * 1.24);
  return {
    box: {
      x: Math.max(0, Math.round(bestBox.x * scaleX)),
      y: Math.max(0, Math.round(bestBox.y * scaleY)),
      w: Math.min(w, bw),
      h: Math.min(h, bh),
    },
    confidence: Math.min(0.99, Math.max(0.80, 0.72 + bestFinalScore * 0.35)),
  };
}

function refineEyeCenters(
  imgData: ImageData,
  box: { x: number; y: number; w: number; h: number }
): { leftEye: [number, number]; rightEye: [number, number] } {
  const w = imgData.width;
  const h = imgData.height;
  const d = imgData.data;
  const patchR = Math.max(1, Math.round(box.w * 0.025));
  const step = Math.max(1, Math.round(box.w / 100));

  const findEyeInBand = (rx1: number, rx2: number, ry1: number, ry2: number, fallback: [number, number]): [number, number] => {
    const x1 = Math.max(patchR + 1, Math.round(box.x + box.w * rx1));
    const x2 = Math.min(w - patchR - 2, Math.round(box.x + box.w * rx2));
    const y1 = Math.max(patchR + 1, Math.round(box.y + box.h * ry1));
    const y2 = Math.min(h - patchR - 2, Math.round(box.y + box.h * ry2));
    if (x2 <= x1 || y2 <= y1) return fallback;

    const cxTarget = (x1 + x2) / 2;
    const cyTarget = (y1 + y2) / 2;
    const maxDist = Math.hypot(x2 - x1, y2 - y1) / 2 + 1;

    let bestScore = -1;
    let bx = fallback[0];
    let by = fallback[1];

    const ringR = Math.max(2, Math.round(box.w * 0.055));
    for (let y = Math.max(ringR + 1, y1); y <= Math.min(h - ringR - 2, y2); y += step) {
      for (let x = Math.max(ringR + 1, x1); x <= Math.min(w - ringR - 2, x2); x += step) {
        let darkSum = 0;
        let samples = 0;
        for (let dy = -patchR; dy <= patchR; dy += Math.max(1, patchR)) {
          for (let dx = -patchR; dx <= patchR; dx += Math.max(1, patchR)) {
            const idx = ((y + dy) * w + (x + dx)) * 4;
            const lum = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
            darkSum += 255 - lum;
            samples++;
          }
        }
        const centerDark = darkSum / Math.max(1, samples);
        const centerLum = 255 - centerDark;

        // 2D Center-Surround Iris response: pupil is darker than sclera/skin on left, right, top & bottom
        const lIdx = (y * w + (x - ringR)) * 4;
        const rIdx = (y * w + (x + ringR)) * 4;
        const tIdx = ((y - ringR) * w + x) * 4;
        const bIdx = ((y + ringR) * w + x) * 4;
        const lumL = 0.299 * d[lIdx] + 0.587 * d[lIdx + 1] + 0.114 * d[lIdx + 2];
        const lumR = 0.299 * d[rIdx] + 0.587 * d[rIdx + 1] + 0.114 * d[rIdx + 2];
        const lumT = 0.299 * d[tIdx] + 0.587 * d[tIdx + 1] + 0.114 * d[tIdx + 2];
        const lumB = 0.299 * d[bIdx] + 0.587 * d[bIdx + 1] + 0.114 * d[bIdx + 2];
        const horizBlob = Math.max(0, (lumL + lumR) * 0.5 - centerLum);
        const vertBlob = Math.max(0, (lumT + lumB) * 0.5 - centerLum);

        const distPenalty = 1 - 0.45 * (Math.hypot(x - cxTarget, y - cyTarget) / maxDist);
        const score = (centerDark * 0.50 + horizBlob * 0.35 + vertBlob * 0.15) * distPenalty;
        if (score > bestScore) {
          bestScore = score;
          bx = x;
          by = y;
        }
      }
    }
    return [bx, by];
  };

  // Search inner iris zones (avoids glasses hinges at outer corners or eyebrows high up)
  const fallbackLeft: [number, number] = [Math.round(box.x + box.w * 0.32), Math.round(box.y + box.h * 0.37)];
  const fallbackRight: [number, number] = [Math.round(box.x + box.w * 0.68), Math.round(box.y + box.h * 0.37)];
  const leftEye = findEyeInBand(0.24, 0.43, 0.31, 0.45, fallbackLeft);
  const rightEye = findEyeInBand(0.57, 0.76, 0.31, 0.45, fallbackRight);
  return { leftEye, rightEye };
}

let mpDetectorPromise: Promise<FaceDetector | null> | null = null;
let mpDetectQueue: Promise<void> = Promise.resolve();

async function getMediaPipeFaceDetector(): Promise<FaceDetector | null> {
  if (!mpDetectorPromise) {
    mpDetectorPromise = (async () => {
      try {
        const { FaceDetector: MpFaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
        return await MpFaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/mediapipe/blaze_face_short_range.tflite',
            delegate: 'CPU',
          },
          runningMode: 'IMAGE',
          minDetectionConfidence: 0.35,
          minSuppressionThreshold: 0.3,
        });
      } catch {
        return null;
      }
    })();
  }
  return mpDetectorPromise;
}

async function detectWithMediaPipe(
  canvas: HTMLCanvasElement
): Promise<{
  box: { x: number; y: number; w: number; h: number };
  confidence: number;
  leftEye: [number, number];
  rightEye: [number, number];
  nose?: [number, number];
  mouthCenter?: [number, number];
} | null> {
  const detector = await getMediaPipeFaceDetector();
  if (!detector) return null;

  let resultOut: ReturnType<FaceDetector['detect']> | null = null;
  const task = mpDetectQueue.then(() => {
    try {
      resultOut = detector.detect(canvas);
    } catch {
      resultOut = null;
    }
  });
  mpDetectQueue = task.catch(() => {});
  await task;

  const detections = (resultOut as { detections?: Array<{ boundingBox?: { originX: number; originY: number; width: number; height: number }; categories?: Array<{ score?: number }>; keypoints?: Array<{ x: number; y: number }> }> } | null)?.detections;
  if (!detections || detections.length === 0) return null;

  // Pick largest / highest-confidence face detection
  const sorted = [...detections].sort((a, b) => {
    const sA = (a.categories?.[0]?.score ?? 0.5) * Math.max(1, (a.boundingBox?.width ?? 1));
    const sB = (b.categories?.[0]?.score ?? 0.5) * Math.max(1, (b.boundingBox?.width ?? 1));
    return sB - sA;
  });
  const best = sorted[0];
  if (!best.boundingBox || !best.keypoints || best.keypoints.length < 2) return null;

  const w = canvas.width;
  const h = canvas.height;
  const bb = best.boundingBox;
  const kps = best.keypoints;

  // MediaPipe BlazeFace keypoints: [0]=rightEye, [1]=leftEye, [2]=noseTip, [3]=mouthCenter
  const eyeA: [number, number] = [Math.round(kps[0].x * w), Math.round(kps[0].y * h)];
  const eyeB: [number, number] = [Math.round(kps[1].x * w), Math.round(kps[1].y * h)];
  const [leftEye, rightEye] = eyeA[0] <= eyeB[0] ? [eyeA, eyeB] : [eyeB, eyeA];

  const box = {
    x: Math.max(0, Math.round(bb.originX)),
    y: Math.max(0, Math.round(bb.originY)),
    w: Math.max(20, Math.min(w - Math.max(0, Math.round(bb.originX)), Math.round(bb.width))),
    h: Math.max(20, Math.min(h - Math.max(0, Math.round(bb.originY)), Math.round(bb.height))),
  };
  const confidence = Math.min(0.99, Math.max(0.75, best.categories?.[0]?.score ?? 0.92));

  const nose: [number, number] | undefined =
    kps.length >= 3 ? [Math.round(kps[2].x * w), Math.round(kps[2].y * h)] : undefined;
  const mouthCenter: [number, number] | undefined =
    kps.length >= 4 ? [Math.round(kps[3].x * w), Math.round(kps[3].y * h)] : undefined;

  return { box, confidence, leftEye, rightEye, nose, mouthCenter };
}

export async function detectAndEmbedFace(
  canvas: HTMLCanvasElement
): Promise<FaceDetectionResult | null> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);

  let box: { x: number; y: number; w: number; h: number } | null = null;
  let confidence = 0.94;
  let neuralEyes: { leftEye: [number, number]; rightEye: [number, number]; nose?: [number, number]; mouthCenter?: [number, number] } | null = null;

  // 1. Primary: Real Neural MediaPipe BlazeFace Detector (supports bangs, glasses, far/near, tilt, webcam)
  const mpRes = await detectWithMediaPipe(canvas);
  if (mpRes) {
    box = mpRes.box;
    confidence = mpRes.confidence;
    neuralEyes = {
      leftEye: mpRes.leftEye,
      rightEye: mpRes.rightEye,
      nose: mpRes.nose,
      mouthCenter: mpRes.mouthCenter,
    };
  }

  // 2. Native browser FaceDetector if available and MediaPipe didn't return
  if (!box) {
    const Win = window as unknown as {
      FaceDetector?: new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
        detect: (img: HTMLCanvasElement) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
      };
    };
    if (typeof Win.FaceDetector === 'function') {
      try {
        const detector = new Win.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const faces = await detector.detect(canvas);
        if (faces.length > 0) {
          const bb = faces[0].boundingBox;
          box = {
            x: Math.max(0, Math.round(bb.x)),
            y: Math.max(0, Math.round(bb.y)),
            w: Math.max(24, Math.round(bb.width)),
            h: Math.max(24, Math.round(bb.height)),
          };
          confidence = 0.96;
        }
      } catch {
        // Fallback to multi-scale enclosure tracker
      }
    }
  }

  // 3. Fallback: Smart Multi-Scale & Enclosure-Aware Tracker (supports distant small faces offline)
  if (!box) {
    const tracked = localizeFaceSmart(canvas);
    if (tracked) {
      box = tracked.box;
      confidence = tracked.confidence;
    } else {
      const bw = Math.round(Math.min(w, h) * 0.40);
      const bh = Math.round(bw * 1.24);
      box = {
        x: Math.round((w - bw) / 2),
        y: Math.round((h - bh) / 2.3),
        w: bw,
        h: bh,
      };
      confidence = 0.65;
    }
  }

  // 4. Eye Centers: use neural landmarks when available, else refine irises inside the face box
  const { leftEye, rightEye } = neuralEyes
    ? { leftEye: neuralEyes.leftEye, rightEye: neuralEyes.rightEye }
    : refineEyeCenters(imgData, box);
  const dxEye = rightEye[0] - leftEye[0];
  const dyEye = rightEye[1] - leftEye[1];
  const dEye = Math.max(8, Math.hypot(dxEye, dyEye));
  const ux = dxEye / dEye;
  const uy = dyEye / dEye;
  const vx = -uy;
  const vy = ux;
  const midEyeX = (leftEye[0] + rightEye[0]) / 2;
  const midEyeY = (leftEye[1] + rightEye[1]) / 2;

  if (!neuralEyes && dEye >= 12) {
    const rawCanonW = Math.round(dEye / 0.42);
    const canonW = Math.max(Math.round(box.w * 0.84), Math.min(Math.round(box.w * 1.18), rawCanonW));
    const canonH = Math.round(canonW * 1.24);
    if (canonW >= 24 && canonW <= w * 0.98) {
      box = {
        x: Math.max(0, Math.min(w - canonW, Math.round(midEyeX - canonW * 0.5))),
        y: Math.max(0, Math.min(h - canonH, Math.round(midEyeY - canonH * 0.36))),
        w: canonW,
        h: Math.min(h, canonH),
      };
    }
  }

  const mouthAnchor = neuralEyes?.mouthCenter ?? [
    Math.round(midEyeX + vx * dEye * 0.96),
    Math.round(midEyeY + vy * dEye * 0.96),
  ];

  const landmarks = {
    leftEye,
    rightEye,
    nose:
      neuralEyes?.nose ??
      ([Math.round(midEyeX + vx * dEye * 0.52), Math.round(midEyeY + vy * dEye * 0.52)] as [number, number]),
    leftMouth: [
      Math.round(mouthAnchor[0] - ux * dEye * 0.34),
      Math.round(mouthAnchor[1] - uy * dEye * 0.34),
    ] as [number, number],
    rightMouth: [
      Math.round(mouthAnchor[0] + ux * dEye * 0.34),
      Math.round(mouthAnchor[1] + uy * dEye * 0.34),
    ] as [number, number],
  };

  // 4. Eye-Aligned Affine Face Normalization onto canonical 48x48 patch
  // Maps leftEye -> (14.4, 17.5) and rightEye -> (33.6, 17.5) with 1:1 uniform scale (zero distortion)
  const S = 48;
  const targetLeftX = 0.30 * S;
  const targetRightX = 0.70 * S;
  const targetEyeY = 0.36 * S;
  const targetDEye = targetRightX - targetLeftX;
  const scaleFactor = targetDEye / dEye;
  const rollAngle = Math.atan2(dyEye, dxEye);

  const alignedCanvas = document.createElement('canvas');
  alignedCanvas.width = S;
  alignedCanvas.height = S;
  const aCtx = alignedCanvas.getContext('2d')!;
  aCtx.fillStyle = '#808080';
  aCtx.fillRect(0, 0, S, S);
  aCtx.save();
  aCtx.translate((targetLeftX + targetRightX) / 2, targetEyeY);
  aCtx.rotate(-rollAngle);
  aCtx.scale(scaleFactor, scaleFactor);
  aCtx.translate(-midEyeX, -midEyeY);
  aCtx.drawImage(canvas, 0, 0);
  aCtx.restore();

  const cd = aCtx.getImageData(0, 0, S, S).data;
  const gray = new Float32Array(S * S);
  const mask = new Float32Array(S * S);

  // Elliptical inner-face mask (ignores outer hair/background corners)
  let sumM = 0;
  let weightSum = 0;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const p = y * S + x;
      const idx = p * 4;
      const g = 0.299 * cd[idx] + 0.587 * cd[idx + 1] + 0.114 * cd[idx + 2];
      gray[p] = g;
      const nx = (x - S / 2) / (S * 0.42);
      const ny = (y - S * 0.52) / (S * 0.45);
      const m = nx * nx + ny * ny <= 1.0 ? 1.0 : 0.15;
      mask[p] = m;
      sumM += g * m;
      weightSum += m;
    }
  }
  const mean = sumM / Math.max(1, weightSum);
  let varSum = 0;
  for (let i = 0; i < S * S; i++) {
    varSum += ((gray[i] - mean) ** 2) * mask[i];
  }
  const std = Math.sqrt(varSum / Math.max(1, weightSum)) + 1e-5;
  for (let i = 0; i < S * S; i++) {
    gray[i] = ((gray[i] - mean) / std) * mask[i];
  }

  // 5. Extract 128-D L2-Normalized Descriptor:
  //    - 96 dims: 4x3 spatial cells (12x16 px each) x 8-bin HOG orientation histograms
  //    - 32 dims: 4x4 inner-face mean luminance & local variance features
  const emb = new Array<number>(128).fill(0);
  const cellW = 12; // 4 * 12 = 48
  const cellH = 16; // 3 * 16 = 48
  for (let cy = 0; cy < 3; cy++) {
    for (let cx = 0; cx < 4; cx++) {
      const cellOffset = (cy * 4 + cx) * 8;
      for (let py = 0; py < cellH; py++) {
        for (let px = 0; px < cellW; px++) {
          const y = cy * cellH + py;
          const x = cx * cellW + px;
          const xm = Math.max(0, x - 1);
          const xp = Math.min(S - 1, x + 1);
          const ym = Math.max(0, y - 1);
          const yp = Math.min(S - 1, y + 1);
          const gx = gray[y * S + xp] - gray[y * S + xm];
          const gy = gray[yp * S + x] - gray[ym * S + x];
          const mag = Math.hypot(gx, gy) * mask[y * S + x];
          let ang = Math.atan2(gy, gx);
          if (ang < 0) ang += Math.PI * 2;
          const bin = Math.min(7, Math.floor((ang / (Math.PI * 2)) * 8));
          emb[cellOffset + bin] += mag;
        }
      }
      // Zero-mean per cell so generic frontal-face positive edge baselines cancel out
      let cellMean = 0;
      for (let b = 0; b < 8; b++) cellMean += emb[cellOffset + b];
      cellMean /= 8;
      for (let b = 0; b < 8; b++) emb[cellOffset + b] -= cellMean;
    }
  }

  // Normalize centered HOG portion first so intensity/structure blocks balance cleanly
  let hogNorm = 0;
  for (let i = 0; i < 96; i++) hogNorm += emb[i] * emb[i];
  hogNorm = Math.sqrt(hogNorm) + 1e-8;
  for (let i = 0; i < 96; i++) emb[i] = (emb[i] / hogNorm) * 0.72;

  // 16 inner-face patches (mean luminance & centered contrast = 32 dims)
  const patchVals = new Float32Array(32);
  for (let by = 0; by < 4; by++) {
    for (let bx = 0; bx < 4; bx++) {
      let sVal = 0;
      let sAbs = 0;
      const startX = 8 + bx * 8;
      const startY = 8 + by * 8;
      for (let py = 0; py < 8; py++) {
        for (let px = 0; px < 8; px++) {
          const val = gray[(startY + py) * S + (startX + px)];
          sVal += val;
          sAbs += Math.abs(val);
        }
      }
      const pIdx = (by * 4 + bx) * 2;
      patchVals[pIdx] = sVal / 64;
      patchVals[pIdx + 1] = sAbs / 64 - 0.75;
    }
  }
  let patchNorm = 0;
  for (let i = 0; i < 32; i++) patchNorm += patchVals[i] * patchVals[i];
  patchNorm = Math.sqrt(patchNorm) + 1e-8;
  for (let i = 0; i < 32; i++) emb[96 + i] = (patchVals[i] / patchNorm) * 0.28;

  // Final L2 normalize
  let norm = 0;
  for (let i = 0; i < 128; i++) norm += emb[i] * emb[i];
  norm = Math.sqrt(norm) + 1e-8;
  for (let i = 0; i < 128; i++) emb[i] /= norm;

  return {
    box,
    confidence,
    landmarks,
    embedding: emb,
    alignedDataUrl: alignedCanvas.toDataURL(),
  };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ---------- LAB 3 (Chương 2 Phần 2): Canny Edge Detector 5-Stage Pipeline ----------

export type CannyCondition = 'normal' | 'noisy' | 'low_contrast' | 'high_detail';

export interface CannyPipelineResult {
  inputConditioned: ImageData;
  gaussian: ImageData;
  gradientMag: ImageData;
  nms: ImageData;
  doubleThreshold: ImageData;
  finalEdges: ImageData;
  laplacian: ImageData;
  sobel: ImageData;
  segmentedRegions: ImageData;
  edgeDensityPct: number;
  strongCount: number;
  weakCount: number;
  autoLow: number;
  autoHigh: number;
}

function grayFloatToImageData(buf: Float32Array, w: number, h: number): ImageData {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const v = clampByte(buf[i]);
    const idx = i * 4;
    out[idx] = v;
    out[idx + 1] = v;
    out[idx + 2] = v;
    out[idx + 3] = 255;
  }
  return new ImageData(out, w, h);
}

function gaussianKernel1D(sigma: number): number[] {
  const radius = Math.max(1, Math.min(4, Math.ceil(2.5 * sigma)));
  const k: number[] = [];
  let sum = 0;
  const denom = 2 * sigma * sigma;
  for (let i = -radius; i <= radius; i++) {
    const w = Math.exp(-(i * i) / denom);
    k.push(w);
    sum += w;
  }
  return k.map((v) => v / sum);
}

function blurGrayFloat(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const k = gaussianKernel1D(sigma);
  const r = Math.floor(k.length / 2);
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let i = -r; i <= r; i++) {
        const px = Math.min(w - 1, Math.max(0, x + i));
        s += src[y * w + px] * k[i + r];
      }
      tmp[y * w + x] = s;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let i = -r; i <= r; i++) {
        const py = Math.min(h - 1, Math.max(0, y + i));
        s += tmp[py * w + x] * k[i + r];
      }
      out[y * w + x] = s;
    }
  }
  return out;
}

export function prepareCannyCondition(src: ImageData, condition: CannyCondition): ImageData {
  if (condition === 'normal') {
    return new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  }
  if (condition === 'noisy') {
    return addSyntheticNoise(src, 'gaussian', 10);
  }
  if (condition === 'low_contrast') {
    const out = new Uint8ClampedArray(src.data.length);
    for (let i = 0; i < src.data.length; i += 4) {
      out[i] = clampByte((src.data[i] - 128) * 0.35 + 128);
      out[i + 1] = clampByte((src.data[i + 1] - 128) * 0.35 + 128);
      out[i + 2] = clampByte((src.data[i + 2] - 128) * 0.35 + 128);
      out[i + 3] = 255;
    }
    return new ImageData(out, src.width, src.height);
  }
  // high_detail: sharpen strongly before edge detection
  return convolve2D(src, LINEAR_KERNELS.sharpen.kernel, 3);
}

export function runCannyPipeline(
  raw: ImageData,
  opts: {
    sigma: number;
    lowThresh: number;
    highThresh: number;
    condition: CannyCondition;
    autoCanny: boolean;
    colorCanny: boolean;
  }
): CannyPipelineResult {
  const conditioned = prepareCannyCondition(raw, opts.condition);
  const w = conditioned.width;
  const h = conditioned.height;
  const n = w * h;

  const extractChannel = (chOffset: number | 'gray'): Float32Array => {
    const arr = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const idx = i * 4;
      if (chOffset === 'gray') {
        arr[i] = 0.299 * conditioned.data[idx] + 0.587 * conditioned.data[idx + 1] + 0.114 * conditioned.data[idx + 2];
      } else {
        arr[i] = conditioned.data[idx + chOffset];
      }
    }
    return arr;
  };

  const gray = extractChannel('gray');
  const smoothed = blurGrayFloat(gray, w, h, Math.max(0.5, opts.sigma));

  // Auto-Canny thresholds from median
  const sorted = Float32Array.from(smoothed).sort();
  const med = sorted[Math.floor(n / 2)];
  const autoLow = Math.max(10, Math.round(0.35 * med));
  const autoHigh = Math.min(240, Math.max(autoLow + 20, Math.round(0.95 * med)));
  const lowT = opts.autoCanny ? autoLow : Math.min(opts.lowThresh, opts.highThresh - 5);
  const highT = opts.autoCanny ? autoHigh : Math.max(opts.highThresh, lowT + 5);

  // Sobel Gradient & Angle (optionally multi-channel Color Max Gradient)
  const mag = new Float32Array(n);
  const angle = new Float32Array(n);
  const lapBuf = new Float32Array(n);

  const channels = opts.colorCanny
    ? [blurGrayFloat(extractChannel(0), w, h, opts.sigma), blurGrayFloat(extractChannel(1), w, h, opts.sigma), blurGrayFloat(extractChannel(2), w, h, opts.sigma)]
    : [smoothed];

  let maxMag = 1e-6;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      let bestM = -1;
      let bestAng = 0;
      for (const ch of channels) {
        const gx =
          -ch[(y - 1) * w + (x - 1)] + ch[(y - 1) * w + (x + 1)] -
          2 * ch[y * w + (x - 1)] + 2 * ch[y * w + (x + 1)] -
          ch[(y + 1) * w + (x - 1)] + ch[(y + 1) * w + (x + 1)];
        const gy =
          -ch[(y - 1) * w + (x - 1)] - 2 * ch[(y - 1) * w + x] - ch[(y - 1) * w + (x + 1)] +
          ch[(y + 1) * w + (x - 1)] + 2 * ch[(y + 1) * w + x] + ch[(y + 1) * w + (x + 1)];
        const m = Math.hypot(gx, gy);
        if (m > bestM) {
          bestM = m;
          bestAng = ((Math.atan2(gy, gx) * 180) / Math.PI + 180) % 180;
        }
      }
      mag[p] = bestM;
      angle[p] = bestAng;
      if (bestM > maxMag) maxMag = bestM;

      // Laplacian comparison
      const lap =
        smoothed[(y - 1) * w + x] +
        smoothed[(y + 1) * w + x] +
        smoothed[y * w + (x - 1)] +
        smoothed[y * w + (x + 1)] -
        4 * smoothed[p];
      lapBuf[p] = Math.min(255, Math.abs(lap) * 2.2);
    }
  }

  // Normalize magnitude to [0, 255]
  const magNorm = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    magNorm[i] = (mag[i] / maxMag) * 255;
  }

  // Step 3: Non-Maximum Suppression
  const nms = new Float32Array(n);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const ang = angle[p];
      let q = 0;
      let r = 0;
      if (ang < 22.5 || ang >= 157.5) {
        q = magNorm[y * w + (x + 1)];
        r = magNorm[y * w + (x - 1)];
      } else if (ang < 67.5) {
        q = magNorm[(y + 1) * w + (x - 1)];
        r = magNorm[(y - 1) * w + (x + 1)];
      } else if (ang < 112.5) {
        q = magNorm[(y + 1) * w + x];
        r = magNorm[(y - 1) * w + x];
      } else {
        q = magNorm[(y - 1) * w + (x - 1)];
        r = magNorm[(y + 1) * w + (x + 1)];
      }
      if (magNorm[p] >= q && magNorm[p] >= r) {
        nms[p] = magNorm[p];
      }
    }
  }

  // Step 4: Double Threshold (Strong = 2, Weak = 1, Suppressed = 0)
  const dtMask = new Uint8Array(n);
  const dtPixels = new Uint8ClampedArray(n * 4);
  let strongCount = 0;
  let weakCount = 0;
  for (let i = 0; i < n; i++) {
    const idx = i * 4;
    if (nms[i] >= highT) {
      dtMask[i] = 2;
      strongCount++;
      dtPixels[idx] = 16;
      dtPixels[idx + 1] = 185;
      dtPixels[idx + 2] = 129; // Emerald strong edge
    } else if (nms[i] >= lowT) {
      dtMask[i] = 1;
      weakCount++;
      dtPixels[idx] = 245;
      dtPixels[idx + 1] = 158;
      dtPixels[idx + 2] = 11; // Amber weak edge
    }
    dtPixels[idx + 3] = 255;
  }

  // Step 5: Hysteresis Edge Tracking
  const finalMask = new Uint8Array(dtMask);
  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (finalMask[i] === 2) queue.push(i);
  }
  while (queue.length > 0) {
    const cur = queue.pop()!;
    const cy = Math.floor(cur / w);
    const cx = cur % w;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = cy + dy;
      if (ny < 0 || ny >= h) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx;
        if (nx < 0 || nx >= w) continue;
        const np = ny * w + nx;
        if (finalMask[np] === 1) {
          finalMask[np] = 2;
          queue.push(np);
        }
      }
    }
  }

  const finalBuf = new Float32Array(n);
  let edgePixels = 0;
  for (let i = 0; i < n; i++) {
    if (finalMask[i] === 2) {
      finalBuf[i] = 255;
      edgePixels++;
    }
  }

  // Step II.4 Integration: Overlay closed contours & detected edge segments on original image
  const segData = new Uint8ClampedArray(conditioned.data);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      // Simple 3x3 dilation of Canny edges to visualize region boundary segmentation
      let hasEdge = false;
      for (let dy = -1; dy <= 1 && !hasEdge; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (finalMask[(y + dy) * w + (x + dx)] === 2) {
            hasEdge = true;
            break;
          }
        }
      }
      const idx = p * 4;
      if (finalMask[p] === 2) {
        segData[idx] = 34;
        segData[idx + 1] = 211;
        segData[idx + 2] = 238; // Cyan crisp boundary
      } else if (hasEdge) {
        segData[idx] = clampByte(segData[idx] * 0.55 + 16);
        segData[idx + 1] = clampByte(segData[idx + 1] * 0.55 + 100);
        segData[idx + 2] = clampByte(segData[idx + 2] * 0.55 + 160);
      }
    }
  }

  return {
    inputConditioned: conditioned,
    gaussian: grayFloatToImageData(smoothed, w, h),
    gradientMag: grayFloatToImageData(magNorm, w, h),
    nms: grayFloatToImageData(nms, w, h),
    doubleThreshold: new ImageData(dtPixels, w, h),
    finalEdges: grayFloatToImageData(finalBuf, w, h),
    laplacian: grayFloatToImageData(lapBuf, w, h),
    sobel: grayFloatToImageData(magNorm, w, h),
    segmentedRegions: new ImageData(segData, w, h),
    edgeDensityPct: Number(((edgePixels / n) * 100).toFixed(2)),
    strongCount,
    weakCount,
    autoLow,
    autoHigh,
  };
}

