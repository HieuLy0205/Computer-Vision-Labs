"""
Lab 1 - Chương 1: Cơ bản về Xử lý Ảnh với OpenCV và Pillow
Thực hiện đầy đủ 5 yêu cầu:
1. Kiểm tra & sử dụng OpenCV (cv2) và Pillow (PIL)
2. Đọc, hiển thị và lưu ảnh sang định dạng khác (.png, .jpg, .webp)
3. Chuyển đổi không gian màu: RGB -> Grayscale, HSV, CIE LAB
4. Cắt xén (Crop) và Thay đổi kích thước (Resize theo tỷ lệ & kích thước cố định)
5. Vẽ hình cơ bản (đường thẳng, hình tròn, hình chữ nhật) & thêm văn bản
Kèm vẽ biểu đồ Histogram RGB/HSV/LAB để phân tích phân bố mức xám & màu sắc.
"""

import argparse
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import matplotlib.pyplot as plt


def ensure_sample_image(input_path: Path) -> Path:
    """Tạo ảnh mẫu tổng hợp giàu màu sắc và hình khối nếu chưa có ảnh đầu vào."""
    if input_path.exists():
        return input_path
    input_path.parent.mkdir(parents=True, exist_ok=True)
    h, w = 480, 640
    canvas = np.zeros((h, w, 3), dtype=np.uint8)
    # Nền gradient mượt
    x = np.linspace(0, 255, w, dtype=np.uint8)
    y = np.linspace(0, 255, h, dtype=np.uint8)
    canvas[:, :, 0] = np.tile(x, (h, 1))
    canvas[:, :, 1] = np.tile(y[:, None], (1, w))
    canvas[:, :, 2] = 160
    # Thêm các khối hình học để kiểm tra biên và màu
    cv2.rectangle(canvas, (60, 70), (240, 240), (35, 95, 220), -1)
    cv2.circle(canvas, (430, 170), 95, (40, 190, 120), -1)
    pts = np.array([[280, 410], [380, 260], [510, 410]], np.int32)
    cv2.fillPoly(canvas, [pts], (220, 160, 30))
    cv2.imwrite(str(input_path), canvas)
    return input_path


def plot_color_histograms(img_rgb: np.ndarray, img_hsv: np.ndarray, img_lab: np.ndarray, out_path: Path) -> None:
    """Vẽ biểu đồ Histogram so sánh phân bố 3 kênh của RGB, HSV và CIE LAB."""
    fig, axes = plt.subplots(1, 3, figsize=(16, 4.5))
    fig.suptitle("Phân tích Histogram Không gian màu: RGB vs HSV vs CIE LAB", fontsize=13, fontweight="bold")

    # 1. RGB Histogram
    for idx, (col, name) in enumerate(zip(["r", "g", "b"], ["Red", "Green", "Blue"])):
        hist = cv2.calcHist([img_rgb], [idx], None, [256], [0, 256]).ravel()
        axes[0].plot(hist, color=col, label=name, linewidth=1.6)
    axes[0].set_title("RGB Channels (0–255)")
    axes[0].set_xlabel("Cường độ điểm ảnh")
    axes[0].set_ylabel("Số lượng pixel")
    axes[0].legend()
    axes[0].grid(alpha=0.25)

    # 2. HSV Histogram
    hsv_cfg = [("m", "Hue (0–179)", 180), ("c", "Saturation (0–255)", 256), ("k", "Value (0–255)", 256)]
    for idx, (col, name, bins) in enumerate(hsv_cfg):
        hist = cv2.calcHist([img_hsv], [idx], None, [bins], [0, bins]).ravel()
        axes[1].plot(hist, color=col, label=name, linewidth=1.5)
    axes[1].set_title("HSV Channels (Tách sắc độ & độ sáng)")
    axes[1].set_xlabel("Giá trị kênh")
    axes[1].legend()
    axes[1].grid(alpha=0.25)

    # 3. LAB Histogram
    lab_cfg = [("k", "L* Lightness", 256), ("g", "a* Green–Red", 256), ("b", "b* Blue–Yellow", 256)]
    for idx, (col, name, bins) in enumerate(lab_cfg):
        hist = cv2.calcHist([img_lab], [idx], None, [bins], [0, bins]).ravel()
        axes[2].plot(hist, color=col, label=name, linewidth=1.5)
    axes[2].set_title("CIE LAB Channels (Cảm nhận thị giác người)")
    axes[2].set_xlabel("Giá trị kênh")
    axes[2].legend()
    axes[2].grid(alpha=0.25)

    plt.tight_layout()
    plt.savefig(out_path, dpi=150)
    plt.close(fig)


def run_lab1(input_file: Path, output_dir: Path, show_window: bool = False) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    input_file = ensure_sample_image(input_file)

    # 1 & 2. Đọc ảnh bằng OpenCV (BGR) và Pillow (RGB), lưu sang định dạng khác
    img_bgr = cv2.imread(str(input_file))
    if img_bgr is None:
        raise FileNotFoundError(f"Không thể đọc ảnh từ {input_file}")
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    pil_img = Image.open(input_file).convert("RGB")

    # Lưu ảnh với nhiều định dạng khác nhau để so sánh dung lượng nén
    png_path = output_dir / "saved_format.png"
    webp_path = output_dir / "saved_format.webp"
    jpg_path = output_dir / "saved_format.jpg"
    cv2.imwrite(str(png_path), img_bgr)
    pil_img.save(webp_path, format="WEBP", quality=85)
    pil_img.save(jpg_path, format="JPEG", quality=90)

    # 3. Chuyển đổi không gian màu: RGB -> Grayscale, HSV, LAB
    img_gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    img_hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    img_lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)

    cv2.imwrite(str(output_dir / "gray.png"), img_gray)
    cv2.imwrite(str(output_dir / "hsv_visual.png"), img_hsv)
    cv2.imwrite(str(output_dir / "lab_visual.png"), img_lab)

    # 4. Cắt xén (Crop ROI trung tâm) và Thay đổi kích thước (Resize)
    h, w = img_bgr.shape[:2]
    y1, y2 = int(h * 0.15), int(h * 0.85)
    x1, x2 = int(w * 0.15), int(w * 0.85)
    cropped = img_bgr[y1:y2, x1:x2]
    resized_ratio = cv2.resize(img_bgr, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
    resized_fixed = cv2.resize(img_bgr, (320, 240), interpolation=cv2.INTER_CUBIC)

    cv2.imwrite(str(output_dir / "cropped_roi.png"), cropped)
    cv2.imwrite(str(output_dir / "resized_50pct.png"), resized_ratio)
    cv2.imwrite(str(output_dir / "resized_320x240.png"), resized_fixed)

    # 5. Vẽ hình cơ bản (đường thẳng, hình tròn, hình chữ nhật) & Thêm văn bản
    annotated = img_bgr.copy()
    cv2.line(annotated, (24, 24), (w - 24, 24), (255, 200, 0), 3)
    cv2.rectangle(annotated, (x1, y1), (x2, y2), (37, 99, 235), 3)
    cv2.circle(annotated, (w // 2, h // 2), min(h, w) // 6, (16, 185, 129), 3)
    cv2.putText(
        annotated,
        "Lab 1: OpenCV ROI & Primitives",
        (30, h - 28),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.75,
        (255, 255, 255),
        2,
        cv2.LINE_AA,
    )
    cv2.imwrite(str(output_dir / "annotated_primitives.png"), annotated)

    # Xuất biểu đồ tổng hợp kết quả & Histogram phân tích
    fig, axes = plt.subplots(2, 3, figsize=(15, 9))
    panels = [
        (img_rgb, "Ảnh gốc (RGB)"),
        (img_gray, "Grayscale (BT.601)"),
        (cv2.cvtColor(img_hsv, cv2.COLOR_BGR2RGB), "Kênh HSV (biểu diễn giả màu)"),
        (cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB), f"Crop ROI ({x2-x1}x{y2-y1})"),
        (cv2.cvtColor(resized_fixed, cv2.COLOR_BGR2RGB), "Resize cố định (320x240)"),
        (cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB), "Vẽ hình cơ bản & Text"),
    ]
    for ax, (im, title) in zip(axes.ravel(), panels):
        if im.ndim == 2:
            ax.imshow(im, cmap="gray")
        else:
            ax.imshow(im)
        ax.set_title(title, fontsize=11, fontweight="semibold")
        ax.axis("off")
    plt.tight_layout()
    plt.savefig(output_dir / "lab1_summary_grid.png", dpi=150)
    plt.close(fig)

    plot_color_histograms(img_rgb, img_hsv, img_lab, output_dir / "lab1_histograms.png")

    if show_window:
        cv2.imshow("Lab 1 - Original", img_bgr)
        cv2.imshow("Lab 1 - Annotated", annotated)
        cv2.waitKey(0)
        cv2.destroyAllWindows()

    stats = {
        "shape": [h, w, 3],
        "formats_bytes": {
            "png": png_path.stat().st_size,
            "jpg": jpg_path.stat().st_size,
            "webp": webp_path.stat().st_size,
        },
        "mean_rgb": [round(float(img_rgb[:, :, i].mean()), 2) for i in range(3)],
        "mean_gray": round(float(img_gray.mean()), 2),
    }
    print("[Lab 1] Hoàn thành! Thống kê:", stats)
    return stats


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Lab 1 - OpenCV & Pillow Basics")
    parser.add_argument("--input", type=Path, default=Path("Lab1/data/input/sample.png"))
    parser.add_argument("--output", type=Path, default=Path("Lab1/results"))
    parser.add_argument("--show", action="store_true", help="Hiển thị cửa sổ OpenCV (chỉ dùng khi có GUI)")
    args = parser.parse_args()
    run_lab1(args.input, args.output, show_window=args.show)
