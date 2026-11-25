"""
Lab 2 - Bài thực hành Chương 2 (Đầy đủ Phần I, II & III):
I> Toán tử điểm ảnh:
   1. Thay đổi độ sáng (+/- beta)
   2. Thay đổi độ tương phản (* alpha)
   3. Biến đổi âm bản (255 - I)
   4. Cắt ngưỡng nhị phân (Thresholding)
II> Lọc tuyến tính:
   1. Lọc trung bình (Mean Filter)
   2. Lọc Gaussian (Gaussian Blur)
   3. Làm sắc nét (Sharpening Kernel)
III> Bài tập nâng cao:
   1. Phát hiện cạnh: Kernel Sobel & Prewitt
   2. Tự thiết kế kernel tùy chỉnh (Emboss, Laplacian, Outline)
   3. So sánh hiệu quả các loại lọc (MSE, PSNR)
   4. Lọc phi tuyến tính: Median Filter & Bilateral Filter
"""

import argparse
from pathlib import Path
import cv2
import numpy as np
import matplotlib.pyplot as plt


def ensure_sample_image(path: Path) -> Path:
    if path.exists():
        return path
    path.parent.mkdir(parents=True, exist_ok=True)
    img = np.full((420, 560, 3), 225, dtype=np.uint8)
    for y in range(420):
        img[y, :, 0] = int(60 + (y / 420) * 140)
    cv2.rectangle(img, (65, 70), (255, 290), (45, 115, 210), -1)
    cv2.circle(img, (400, 195), 100, (35, 175, 125), -1)
    cv2.putText(img, "CHUONG 2 - LAB 2", (125, 380), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
    cv2.imwrite(str(path), img)
    return path


def adjust_brightness(img: np.ndarray, beta: int = 50) -> np.ndarray:
    return np.clip(img.astype(np.float32) + beta, 0, 255).astype(np.uint8)


def adjust_contrast(img: np.ndarray, alpha: float = 1.45) -> np.ndarray:
    return np.clip(img.astype(np.float32) * alpha, 0, 255).astype(np.uint8)


def apply_gamma(img: np.ndarray, gamma: float = 0.5) -> np.ndarray:
    """Biến đổi hàm mũ Gamma: s = 255 * (r / 255)^gamma (gamma < 1 làm sáng vùng tối)."""
    inv_table = np.array([((i / 255.0) ** gamma) * 255.0 for i in range(256)], dtype=np.uint8)
    return cv2.LUT(img, inv_table)


def equalize_histogram_color(img_rgb: np.ndarray) -> np.ndarray:
    """Cân bằng Histogram (CDF) trên kênh sáng Y (YCrCb) để giữ nguyên sắc độ màu."""
    ycrcb = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2YCrCb)
    ycrcb[:, :, 0] = cv2.equalizeHist(ycrcb[:, :, 0])
    return cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2RGB)


def add_salt_pepper_noise(img: np.ndarray, prob: float = 0.06, seed: int = 42) -> np.ndarray:
    rng = np.random.default_rng(seed)
    noisy = img.copy()
    mask = rng.random(img.shape[:2])
    noisy[mask < prob / 2] = 0
    noisy[mask > 1 - prob / 2] = 255
    return noisy


def compute_mse_psnr(clean: np.ndarray, restored: np.ndarray) -> tuple[float, float]:
    mse = float(np.mean((clean.astype(np.float64) - restored.astype(np.float64)) ** 2))
    psnr = 100.0 if mse == 0 else float(10.0 * np.log10((255.0 ** 2) / mse))
    return round(mse, 2), round(psnr, 2)


def detect_edges_sobel_prewitt(gray: np.ndarray) -> dict[str, np.ndarray]:
    gf = gray.astype(np.float32)
    sobel_x = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float32)
    sobel_y = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=np.float32)
    prewitt_x = np.array([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]], dtype=np.float32)
    prewitt_y = np.array([[-1, -1, -1], [0, 0, 0], [1, 1, 1]], dtype=np.float32)

    sobel_mag = np.clip(np.hypot(cv2.filter2D(gf, -1, sobel_x), cv2.filter2D(gf, -1, sobel_y)), 0, 255).astype(np.uint8)
    prewitt_mag = np.clip(np.hypot(cv2.filter2D(gf, -1, prewitt_x), cv2.filter2D(gf, -1, prewitt_y)), 0, 255).astype(np.uint8)
    return {"sobel": sobel_mag, "prewitt": prewitt_mag}


def run_lab2(input_file: Path, output_dir: Path) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    input_file = ensure_sample_image(input_file)

    img_bgr = cv2.imread(str(input_file))
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img_gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # I. Toán tử điểm ảnh
    bright_up = adjust_brightness(img_rgb, 50)
    contrast_high = adjust_contrast(img_rgb, 1.5)
    negative = 255 - img_rgb
    _, thresh_128 = cv2.threshold(img_gray, 128, 255, cv2.THRESH_BINARY)

    # II. Lọc tuyến tính
    mean_5x5 = cv2.blur(img_rgb, (5, 5))
    gaussian_5x5 = cv2.GaussianBlur(img_rgb, (5, 5), sigmaX=1.2)
    sharpen_kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=np.float32)
    sharpened = cv2.filter2D(img_rgb, -1, sharpen_kernel)

    # III. Bài tập nâng cao
    edges = detect_edges_sobel_prewitt(img_gray)
    emboss_k = np.array([[-2, -1, 0], [-1, 1, 1], [0, 1, 2]], dtype=np.float32)
    laplacian_k = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=np.float32)
    emboss_img = cv2.filter2D(img_rgb, -1, emboss_k)
    laplacian_img = cv2.filter2D(img_rgb, -1, laplacian_k)

    # So sánh lọc tuyến tính vs phi tuyến trên ảnh nhiễu Muối-Tiêu 6%
    noisy = add_salt_pepper_noise(img_rgb, prob=0.06)
    denoise_mean = cv2.blur(noisy, (5, 5))
    denoise_gauss = cv2.GaussianBlur(noisy, (5, 5), sigmaX=1.2)
    denoise_median = cv2.medianBlur(noisy, 5)
    denoise_bilateral = cv2.bilateralFilter(noisy, d=9, sigmaColor=75, sigmaSpace=75)

    # Biểu đồ 1: Toán tử điểm ảnh & Histogram
    fig1, axes1 = plt.subplots(2, 4, figsize=(16, 8))
    fig1.suptitle("Lab 2 (Phần I) — Toán tử Điểm ảnh & Histogram Tương ứng", fontsize=13, fontweight="bold")
    for idx, (im, title) in enumerate([
        (img_rgb, "Ảnh gốc"),
        (bright_up, "Độ sáng (+50)"),
        (contrast_high, "Tương phản (x1.5)"),
        (negative, "Âm bản (255 - r)"),
    ]):
        axes1[0, idx].imshow(im)
        axes1[0, idx].set_title(title)
        axes1[0, idx].axis("off")
        gv = cv2.cvtColor(im, cv2.COLOR_RGB2GRAY)
        hist = cv2.calcHist([gv], [0], None, [256], [0, 256]).ravel()
        axes1[1, idx].fill_between(range(256), hist, color="#2563EB", alpha=0.3)
        axes1[1, idx].plot(hist, color="#1E40AF", lw=1.2)
        axes1[1, idx].set_xlim(0, 255)
        axes1[1, idx].grid(alpha=0.25)
    plt.tight_layout()
    plt.savefig(output_dir / "lab2_point_ops_histograms.png", dpi=150)
    plt.close(fig1)

    # Biểu đồ 2: Lọc tuyến tính & Phát hiện cạnh (Phần II & III)
    fig2, axes2 = plt.subplots(2, 3, figsize=(15, 9))
    fig2.suptitle("Lab 2 (Phần II & III) — Lọc Tuyến tính, Sobel/Prewitt & Kernel Tùy chỉnh", fontsize=13, fontweight="bold")
    for ax, (im, title, cmap) in zip(axes2.ravel(), [
        (mean_5x5, "Lọc Trung bình 5x5", None),
        (gaussian_5x5, "Lọc Gaussian 5x5", None),
        (sharpened, "Làm sắc nét (Sharpen)", None),
        (edges["sobel"], "Phát hiện cạnh Sobel", "gray"),
        (edges["prewitt"], "Phát hiện cạnh Prewitt", "gray"),
        (emboss_img, "Custom Kernel: Emboss", None),
    ]):
        ax.imshow(im, cmap=cmap)
        ax.set_title(title)
        ax.axis("off")
    plt.tight_layout()
    plt.savefig(output_dir / "lab2_linear_and_edges.png", dpi=150)
    plt.close(fig2)

    # Biểu đồ 3: So sánh Tuyến tính vs Phi tuyến (PSNR/MSE)
    candidates = {
        "Noisy (6%)": noisy,
        "Mean 5x5": denoise_mean,
        "Gaussian 5x5": denoise_gauss,
        "Median 5x5": denoise_median,
        "Bilateral": denoise_bilateral,
    }
    quality = {}
    for name, im in candidates.items():
        mse, psnr = compute_mse_psnr(img_rgb, im)
        quality[name] = {"mse": mse, "psnr_db": psnr}

    fig3, (ax_bar, ax_img) = plt.subplots(1, 2, figsize=(15, 5), gridspec_kw={"width_ratios": [1.1, 1.4]})
    labels = list(quality.keys())
    psnrs = [quality[k]["psnr_db"] for k in labels]
    bars = ax_bar.bar(labels, psnrs, color=["#94A3B8", "#3B82F6", "#0EA5E9", "#059669", "#D97706"])
    ax_bar.set_title("So sánh PSNR (dB) khử nhiễu Muối–Tiêu 6%")
    ax_bar.set_ylabel("PSNR (dB)")
    ax_bar.tick_params(axis="x", rotation=15)
    ax_bar.grid(axis="y", alpha=0.25)
    for b, val in zip(bars, psnrs):
        ax_bar.text(b.get_x() + b.get_width() / 2, val + 0.3, f"{val:.1f}", ha="center", fontsize=9)
    ax_img.imshow(np.hstack([noisy, denoise_median, denoise_bilateral]))
    ax_img.set_title("Trái: Nhiễu 6% | Giữa: Median 5x5 | Phải: Bilateral")
    ax_img.axis("off")
    plt.tight_layout()
    plt.savefig(output_dir / "lab2_filter_comparison_psnr.png", dpi=150)
    plt.close(fig3)

    # Biểu đồ 4: Biến đổi Gamma & Cân bằng Histogram (theo Slide Chương 2 Phần 1)
    gamma_bright = apply_gamma(img_rgb, gamma=0.5)
    gamma_dark = apply_gamma(img_rgb, gamma=2.0)
    hist_eq_rgb = equalize_histogram_color(img_rgb)

    fig4, axes4 = plt.subplots(2, 4, figsize=(16, 8))
    fig4.suptitle("Lab 2 (Bổ sung Chương 2 PDF) — Gamma Correction & Histogram Equalization", fontsize=13, fontweight="bold")
    for idx, (im, title) in enumerate([
        (img_rgb, "Ảnh gốc"),
        (gamma_bright, "Gamma γ = 0.5 (Kéo sáng)"),
        (gamma_dark, "Gamma γ = 2.0 (Nén tối)"),
        (hist_eq_rgb, "Cân bằng Histogram (CDF)"),
    ]):
        axes4[0, idx].imshow(im)
        axes4[0, idx].set_title(title)
        axes4[0, idx].axis("off")
        gv = cv2.cvtColor(im, cv2.COLOR_RGB2GRAY)
        hist = cv2.calcHist([gv], [0], None, [256], [0, 256]).ravel()
        axes4[1, idx].fill_between(range(256), hist, color="#059669", alpha=0.3)
        axes4[1, idx].plot(hist, color="#047857", lw=1.2)
        axes4[1, idx].set_xlim(0, 255)
        axes4[1, idx].grid(alpha=0.25)
    plt.tight_layout()
    plt.savefig(output_dir / "lab2_gamma_hist_equalize.png", dpi=150)
    plt.close(fig4)

    cv2.imwrite(str(output_dir / "threshold_128.png"), thresh_128)
    cv2.imwrite(str(output_dir / "laplacian_custom.png"), cv2.cvtColor(laplacian_img, cv2.COLOR_RGB2BGR))

    print("[Lab 2] Hoàn thành Chương 2 (Phần I, II, III + Gamma & EqualizeHist). PSNR:", quality)
    return quality


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Lab 2 - Chapter 2 Full Exercises")
    parser.add_argument("--input", type=Path, default=Path("Lab2/data/input/sample.jpg"))
    parser.add_argument("--output", type=Path, default=Path("Lab2/results"))
    args = parser.parse_args()
    run_lab2(args.input, args.output)
