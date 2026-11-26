export interface SampleImageItem {
  id: string;
  label: string;
  description: string;
  src: string;
  category: 'scene' | 'portrait';
}

export const SAMPLE_IMAGES: SampleImageItem[] = [
  {
    id: 'arch',
    label: 'Kiến trúc Bê tông & Kính',
    description: 'Nhiều cạnh thẳng đứng, đường chéo bóng nắng và dải tương phản rộng — lý tưởng cho Lab 1–3.',
    src: '/src/assets/images/cv_sample_architecture_1795498288360.jpg',
    category: 'scene',
  },
  {
    id: 'botanical',
    label: 'Lăng kính & Trái cây Màu sắc',
    description: 'Phổ màu RGB/HSV/LAB phong phú (lam, lục, đỏ, vàng) — lý tưởng phân tích Histogram & Wavelet.',
    src: '/src/assets/images/cv_sample_botanical_1795498288328.jpg',
    category: 'scene',
  },
  {
    id: 'enrolled',
    label: 'Chân dung Mẫu (Enrolled ID)',
    description: 'Ảnh chân dung chuẩn chính diện cho Lab 5 FaceNet & lọc mịn bảo toàn biên Bilateral.',
    src: '/src/assets/images/cv_sample_portrait_enrolled_1795498289095.jpg',
    category: 'portrait',
  },
  {
    id: 'other',
    label: 'Chân dung Đối chiếu Khác (Stranger)',
    description: 'Người khác danh tính dùng để kiểm chứng ngưỡng từ chối Unknown (< 0.7) trong Lab 5.',
    src: '/src/assets/images/cv_sample_portrait_other_1795498290017.jpg',
    category: 'portrait',
  },
];

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

export function imageToImageData(img: HTMLImageElement, maxWidth = 480, maxHeight = 360): ImageData {
  const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
  const w = Math.max(32, Math.round(img.width * ratio));
  const h = Math.max(32, Math.round(img.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}
