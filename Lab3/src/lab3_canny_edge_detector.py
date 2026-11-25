"""
Lab 3 - Bài thực hành Chương 2 (Phần 2): CANNY EDGE DETECTOR
Thực hiện đầy đủ tất cả các phần trong slide:
1. Cài đặt 5 bước thuật toán Canny tường minh (Gaussian -> Gradient -> NMS -> Double Threshold -> Hysteresis)
2. Thực hiện bằng thư viện: OpenCV (cv2.Canny) và Scikit-image (skimage.feature.canny)
3. So sánh với Sobel và Laplacian
4. Khảo sát tham số (sigma, low_threshold, high_threshold) so với mặc định
5. Thử nghiệm trên 3 loại ảnh: Nhiều nhiễu, Độ tương phản thấp, Nhiều chi tiết
6. Kết hợp Canny với phân đoạn vùng & nhận dạng hình dạng (Contours + approxPolyDP)
7. Mở rộng: Canny cho ảnh màu (Color Canny) và Auto-Canny
"""

import argparse
from pathlib import Path
import cv2
import numpy as np
import matplotlib.pyplot as plt
from skimage import feature as sk_feature


def ensure_sample_image(path: Path) -> Path:
    if path.exists():
        return path
    path.parent.mkdir(parents=True, exist_ok=True)
    img = np.full((420, 560, 3), 235, dtype=np.uint8)
    cv2.rectangle(img, (60, 70), (220, 230), (40, 90, 200), -1)
    cv2.circle(img, (380, 155), 85, (20, 150, 110), -1)
    pts = np.array([[270, 380], [360, 250], [490, 380]], np.int32)
    cv2.fillPoly(img, [pts], (210, 130, 30))
    for i in range(60, 220, 18):
        cv2.line(img, (i, 270), (i + 12, 385), (50, 50, 50), 2)
    cv2.imwrite(str(path), img)
    return path


def canny_step_by_step(gray: np.ndarray, sigma: float = 1.4, low_t: int = 50, high_t: int = 150) -> dict:
    """Cài đặt tường minh 5 bước Canny để trực quan hóa quá trình xử lý."""
    # Bước 1: Giảm nhiễu bằng Gaussian filter
    ksize = max(3, int(2 * round(3 * sigma) + 1))
    blurred = cv2.GaussianBlur(gray.astype(np.float32), (ksize, ksize), sigmaX=sigma)

    # Bước 2: Tính toán Gradient (Sobel) -> Độ lớn |G| & Hướng góc theta
    gx = cv2.Sobel(blurred, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(blurred, cv2.CV_32F, 0, 1, ksize=3)
    mag = np.hypot(gx, gy)
    mag_norm = (mag / max(1e-6, mag.max())) * 255.0
    angle = np.rad2deg(np.arctan2(gy, gx)) % 180.0

    # Bước 3: Non-Maximum Suppression (làm mảnh biên còn 1 pixel)
    h, w = mag_norm.shape
    nms = np.zeros_like(mag_norm, dtype=np.float32)
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            ang = angle[y, x]
            if (0 <= ang < 22.5) or (157.5 <= ang <= 180):
                q, r = mag_norm[y, x + 1], mag_norm[y, x - 1]
            elif 22.5 <= ang < 67.5:
                q, r = mag_norm[y + 1, x - 1], mag_norm[y - 1, x + 1]
            elif 67.5 <= ang < 112.5:
                q, r = mag_norm[y + 1, x], mag_norm[y - 1, x]
            else:
                q, r = mag_norm[y - 1, x - 1], mag_norm[y + 1, x + 1]
            if mag_norm[y, x] >= q and mag_norm[y, x] >= r:
                nms[y, x] = mag_norm[y, x]

    # Bước 4: Ngưỡng kép (Double Thresholding: Strong=255, Weak=80)
    strong, weak = 255, 80
    dt = np.zeros_like(nms, dtype=np.uint8)
    dt[nms >= high_t] = strong
    dt[(nms >= low_t) & (nms < high_t)] = weak

    # Bước 5: Theo dõi cạnh (Hysteresis Edge Tracking)
    final_edges = dt.copy()
    stack = list(zip(*np.where(final_edges == strong)))
    while stack:
        cy, cx = stack.pop()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < h and 0 <= nx < w and final_edges[ny, nx] == weak:
                    final_edges[ny, nx] = strong
                    stack.append((ny, nx))
    final_edges[final_edges != strong] = 0

    return {
        "gaussian": blurred.astype(np.uint8),
        "gradient": np.clip(mag_norm, 0, 255).astype(np.uint8),
        "nms": np.clip(nms, 0, 255).astype(np.uint8),
        "double_thresh": dt,
        "final": final_edges,
    }


def auto_canny(gray: np.ndarray, sigma_ratio: float = 0.33) -> np.ndarray:
    """Cải tiến Canny tự động chọn ngưỡng kép dựa theo trung vị ảnh (median)."""
    v = float(np.median(gray))
    lower = int(max(0, (1.0 - sigma_ratio) * v))
    upper = int(min(255, (1.0 + sigma_ratio) * v))
    return cv2.Canny(gray, lower, upper)


def color_canny(img_bgr: np.ndarray, low_t: int = 60, high_t: int = 160) -> np.ndarray:
    """Mở rộng: Phát hiện cạnh Canny trên ảnh màu bằng cách hợp nhất biên 3 kênh B, G, R."""
    b, g, r = cv2.split(img_bgr)
    eb = cv2.Canny(b, low_t, high_t)
    eg = cv2.Canny(g, low_t, high_t)
    er = cv2.Canny(r, low_t, high_t)
    return cv2.bitwise_or(eb, cv2.bitwise_or(eg, er))


def segment_and_detect_shapes(img_bgr: np.ndarray, edges: np.ndarray) -> np.ndarray:
    """Mục II.4: Kết hợp Canny với Morphology & FindContours để phân đoạn vùng và nhận dạng hình dạng."""
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    annotated = img_bgr.copy()

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 450:
            continue
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.03 * peri, True)
        x, y, w, h = cv2.boundingRect(approx)
        v = len(approx)
        shape = "Triangle" if v == 3 else ("Rect/Square" if v == 4 else f"Circle/Poly({v})")
        cv2.drawContours(annotated, [approx], -1, (16, 185, 129), 2)
        cv2.rectangle(annotated, (x, y), (x + w, y + h), (37, 99, 235), 2)
        cv2.putText(annotated, shape, (x, max(18, y - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (37, 99, 235), 2)
    return annotated


def run_lab3(input_file: Path, output_dir: Path) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    input_file = ensure_sample_image(input_file)

    img_bgr = cv2.imread(str(input_file))
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # 1. Trực quan 5 bước Canny từ đầu
    stages = canny_step_by_step(gray, sigma=1.4, low_t=45, high_t=130)
    fig1, axes1 = plt.subplots(2, 3, figsize=(15, 9))
    fig1.suptitle("Lab 3 — 5 Bước Thuật toán Canny Edge Detector", fontsize=13, fontweight="bold")
    for ax, (im, title) in zip(axes1.ravel(), [
        (gray, "Ảnh xám gốc"),
        (stages["gaussian"], "Bước 1: Giảm nhiễu Gaussian (σ=1.4)"),
        (stages["gradient"], "Bước 2: Gradient Sobel |G|"),
        (stages["nms"], "Bước 3: Non-Maximum Suppression"),
        (stages["double_thresh"], "Bước 4: Ngưỡng kép (Strong/Weak)"),
        (stages["final"], "Bước 5: Hysteresis (Cạnh cuối)"),
    ]):
        ax.imshow(im, cmap="gray")
        ax.set_title(title)
        ax.axis("off")
    plt.tight_layout()
    plt.savefig(output_dir / "lab3_canny_5_steps.png", dpi=150)
    plt.close(fig1)

    # 2. So sánh OpenCV cv2.Canny vs Scikit-image canny vs Sobel vs Laplacian
    cv_canny = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 1.4), 50, 150)
    sk_canny = (sk_feature.canny(gray, sigma=1.4, low_threshold=20, high_threshold=60) * 255).astype(np.uint8)
    sobel = np.clip(
        np.hypot(cv2.Sobel(gray, cv2.CV_32F, 1, 0), cv2.Sobel(gray, cv2.CV_32F, 0, 1)), 0, 255
    ).astype(np.uint8)
    laplacian = np.clip(np.abs(cv2.Laplacian(gray, cv2.CV_32F)), 0, 255).astype(np.uint8)

    fig2, axes2 = plt.subplots(1, 4, figsize=(16, 4.2))
    fig2.suptitle("So sánh Thuật toán Phát hiện Cạnh: OpenCV Canny vs Skimage Canny vs Sobel vs Laplacian", fontsize=12, fontweight="bold")
    for ax, (im, title) in zip(axes2, [
        (cv_canny, "OpenCV cv2.Canny"),
        (sk_canny, "skimage.feature.canny"),
        (sobel, "Sobel Gradient |G|"),
        (laplacian, "Laplacian |∇²I|"),
    ]):
        ax.imshow(im, cmap="gray")
        ax.set_title(title)
        ax.axis("off")
    plt.tight_layout()
    plt.savefig(output_dir / "lab3_canny_vs_sobel_laplacian.png", dpi=150)
    plt.close(fig2)

    # 3. Thử nghiệm trên 3 loại ảnh: Nhiều nhiễu, Độ tương phản thấp, Nhiều chi tiết
    rng = np.random.default_rng(7)
    img_noisy = np.clip(gray.astype(np.float32) + rng.normal(0, 22, gray.shape), 0, 255).astype(np.uint8)
    img_low_contrast = np.clip((gray.astype(np.float32) - 128) * 0.35 + 128, 0, 255).astype(np.uint8)
    # Tăng cường CLAHE cho ảnh tương phản thấp
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8)).apply(img_low_contrast)
    img_high_detail = cv2.filter2D(gray, -1, np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=np.float32))

    fig3, axes3 = plt.subplots(2, 3, figsize=(15, 8.5))
    fig3.suptitle("Mục II.3 — Thử nghiệm Canny trên 3 Điều kiện Ảnh & Cải thiện CLAHE", fontsize=13, fontweight="bold")
    for ax, (im, title) in zip(axes3.ravel(), [
        (cv2.Canny(img_noisy, 50, 150), "Ảnh nhiều nhiễu (σ nhỏ -> cạnh giả)"),
        (cv2.Canny(cv2.GaussianBlur(img_noisy, (7, 7), 2.0), 60, 160), "Ảnh nhiều nhiễu (Gaussian σ=2.0)"),
        (cv2.Canny(img_low_contrast, 50, 150), "Tương phản thấp (mất cạnh)"),
        (auto_canny(clahe), "Tương phản thấp + CLAHE + Auto-Canny"),
        (cv2.Canny(img_high_detail, 50, 150), "Nhiều chi tiết (ngưỡng mặc định)"),
        (cv2.Canny(img_high_detail, 120, 240), "Nhiều chi tiết (tăng ngưỡng kép 120/240)"),
    ]):
        ax.imshow(im, cmap="gray")
        ax.set_title(title, fontsize=10)
        ax.axis("off")
    plt.tight_layout()
    plt.savefig(output_dir / "lab3_image_conditions.png", dpi=150)
    plt.close(fig3)

    # 4. Kết hợp phân đoạn & nhận dạng hình dạng + Color Canny
    shape_annotated = segment_and_detect_shapes(img_bgr, cv_canny)
    c_canny = color_canny(img_bgr)
    cv2.imwrite(str(output_dir / "lab3_shape_segmentation.png"), shape_annotated)
    cv2.imwrite(str(output_dir / "lab3_color_canny.png"), c_canny)

    metrics = {
        "opencv_canny_edge_density": round(float((cv_canny > 0).mean()), 4),
        "skimage_canny_edge_density": round(float((sk_canny > 0).mean()), 4),
        "color_canny_edge_density": round(float((c_canny > 0).mean()), 4),
        "low_contrast_raw_density": round(float((cv2.Canny(img_low_contrast, 50, 150) > 0).mean()), 4),
        "low_contrast_clahe_density": round(float((auto_canny(clahe) > 0).mean()), 4),
    }
    print("[Lab 3 - Canny] Hoàn thành! Thống kê mật độ biên:", metrics)
    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Lab 3 - Canny Edge Detector (Chapter 2 Part 2)")
    parser.add_argument("--input", type=Path, default=Path("Lab3/data/input/sample.jpg"))
    parser.add_argument("--output", type=Path, default=Path("Lab3/results"))
    args = parser.parse_args()
    run_lab3(args.input, args.output)
