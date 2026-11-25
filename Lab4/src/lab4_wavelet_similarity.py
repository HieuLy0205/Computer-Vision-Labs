"""
Lab 4 - Chương 4: So sánh sự tương đồng của các hình ảnh sử dụng Wavelet, Python
Thực hiện đầy đủ 3 slide bài thực hành 4:
1. Chuẩn bị tập dữ liệu cặp ảnh tương tự (xoay góc nhẹ, nhiễu Gaussian, thay đổi sáng) & không tương tự
2. Biến đổi Wavelet 2D bằng PyWavelets (pywt.wavedec2) & lượng tử hóa tạo mã băm (wavelet_hash)
3. Tính khoảng cách Hamming giữa các cặp mã băm
4. Đánh giá Accuracy, Sensitivity (Recall), Specificity & vẽ đường cong ROC (AUC)
5. Bài tập nâng cao: Khảo sát nhiều họ wavelet (haar, db4, bior1.3, coif1) & Tìm kiếm ảnh theo wavelet hash
"""

import argparse
from pathlib import Path
import cv2
import numpy as np
import pywt
import matplotlib.pyplot as plt
from sklearn.metrics import roc_curve, auc, confusion_matrix


def build_synthetic_dataset(data_dir: Path) -> list[dict]:
    """Fallback: Tạo bộ ảnh tổng hợp nếu thư mục dữ liệu trống."""
    data_dir.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(7)

    base_a = np.zeros((128, 128), dtype=np.uint8)
    cv2.rectangle(base_a, (18, 18), (64, 110), 220, -1)
    cv2.circle(base_a, (95, 48), 22, 165, -1)

    base_b = np.full((128, 128), 35, dtype=np.uint8)
    for r in range(12, 60, 12):
        cv2.circle(base_b, (64, 64), r, 235 if (r // 12) % 2 else 90, 3)

    base_c = np.zeros((128, 128), dtype=np.uint8)
    for i in range(0, 128, 16):
        cv2.line(base_c, (0, i), (128, 127 - i), 210, 4)

    bases = [("rect_circle", base_a), ("concentric", base_b), ("diagonal_grid", base_c)]
    records = []
    for group_name, img in bases:
        variants = [
            ("orig", img),
            ("noisy", np.clip(img.astype(np.float32) + rng.normal(0, 14, img.shape), 0, 255).astype(np.uint8)),
            (
                "rot4",
                np.clip(
                    cv2.warpAffine(
                        img, cv2.getRotationMatrix2D((64, 64), 4.0, 1.0), (128, 128), borderMode=cv2.BORDER_REFLECT
                    ).astype(np.float32)
                    + 18,
                    0,
                    255,
                ).astype(np.uint8),
            ),
            ("contrast", np.clip(img.astype(np.float32) * 1.15, 0, 255).astype(np.uint8)),
        ]
        for variant, v_img in variants:
            p = data_dir / f"{group_name}_{variant}.png"
            cv2.imwrite(str(p), v_img)
            records.append({"group": group_name, "category": "similar", "variant": variant, "path": p, "img": v_img})
    return records


def load_or_build_dataset(data_dir: Path) -> list[dict]:
    """
    Đọc toàn bộ kho ảnh từ Lab4/data/:
    - Lab4/data/similar/<nhóm>/* : các ảnh cùng nhóm (tương đồng, khác sáng/nhiễu/mờ/nén)
    - Lab4/data/unrelated/*      : các ảnh khác biệt hoàn toàn (không giống nhau)
    """
    exts = {".jpg", ".jpeg", ".png", ".webp"}
    records: list[dict] = []

    sim_dir = data_dir / "similar"
    if sim_dir.exists():
        for group_dir in sorted(p for p in sim_dir.iterdir() if p.is_dir()):
            group_name = group_dir.name
            for img_path in sorted(p for p in group_dir.iterdir() if p.is_file() and p.suffix.lower() in exts):
                gray = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
                if gray is None:
                    continue
                records.append({
                    "group": group_name,
                    "category": "similar",
                    "variant": img_path.stem,
                    "path": img_path,
                    "img": gray,
                })

    unr_dir = data_dir / "unrelated"
    if unr_dir.exists():
        for img_path in sorted(p for p in unr_dir.iterdir() if p.is_file() and p.suffix.lower() in exts):
            gray = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
            if gray is None:
                continue
            records.append({
                "group": f"unrelated_{img_path.stem}",
                "category": "unrelated",
                "variant": img_path.stem,
                "path": img_path,
                "img": gray,
            })

    # Nếu người dùng đặt ảnh trực tiếp vào Lab4/data/
    if data_dir.exists():
        for img_path in sorted(p for p in data_dir.iterdir() if p.is_file() and p.suffix.lower() in exts):
            gray = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
            if gray is None:
                continue
            records.append({
                "group": f"custom_{img_path.stem}",
                "category": "unrelated",
                "variant": img_path.stem,
                "path": img_path,
                "img": gray,
            })

    if not records:
        return build_synthetic_dataset(data_dir / "synthetic")
    return records


def wavelet_hash(img_gray: np.ndarray, wavelet: str = "db4", level: int = 3, hash_size: int = 64) -> np.ndarray:
    """
    Tính mã băm Wavelet của ảnh:
    1. Resize về kích thước chuẩn 64x64 để bất biến kích thước đầu vào
    2. Phân rã Wavelet 2D (pywt.wavedec2) lấy thành phần xấp xỉ LL cấp cuối (cA)
    3. Lượng tử hóa theo giá trị trung vị (median quantization) thành vector bit nhị phân
    """
    resized = cv2.resize(img_gray, (64, 64), interpolation=cv2.INTER_AREA).astype(np.float32)
    coeffs = pywt.wavedec2(resized, wavelet=wavelet, level=level)
    cA = coeffs[0]  # Ma trận hệ số xấp xỉ tần số thấp (LL)
    ll_small = cv2.resize(cA, (8, 8), interpolation=cv2.INTER_AREA).flatten()[:hash_size]
    median_val = np.median(ll_small)
    return (ll_small >= median_val).astype(np.uint8)


def hamming_distance(hash1: np.ndarray, hash2: np.ndarray) -> int:
    """Tính khoảng cách Hamming giữa 2 chuỗi bit."""
    return int(np.sum(np.abs(hash1.astype(np.int32) - hash2.astype(np.int32))))


def evaluate_wavelet_family(records: list[dict], wavelet: str = "db4", level: int = 3) -> dict:
    hashes = [wavelet_hash(r["img"], wavelet=wavelet, level=level) for r in records]
    y_true, distances = [], []

    for i in range(len(records)):
        for j in range(i + 1, len(records)):
            is_similar = 1 if records[i]["group"] == records[j]["group"] else 0
            dist = hamming_distance(hashes[i], hashes[j])
            y_true.append(is_similar)
            distances.append(dist)

    y_true_arr = np.array(y_true)
    dist_arr = np.array(distances, dtype=np.float32)
    scores = 1.0 - (dist_arr / len(hashes[0]))
    fpr, tpr, thresholds = roc_curve(y_true_arr, scores)
    roc_auc = float(auc(fpr, tpr))

    best_idx = int(np.argmax(tpr - fpr))
    best_score_thresh = thresholds[best_idx]
    y_pred = (scores >= best_score_thresh).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true_arr, y_pred).ravel()

    accuracy = (tp + tn) / (tp + tn + fp + fn)
    sensitivity = tp / (tp + fn) if (tp + fn) else 0.0
    specificity = tn / (tn + fp) if (tn + fp) else 0.0

    return {
        "wavelet": wavelet,
        "level": level,
        "total_images": len(records),
        "total_pairs": len(y_true),
        "auc": round(roc_auc, 4),
        "accuracy": round(float(accuracy), 4),
        "sensitivity": round(float(sensitivity), 4),
        "specificity": round(float(specificity), 4),
        "fpr": fpr,
        "tpr": tpr,
        "y_true": y_true_arr,
        "distances": dist_arr,
        "hashes": hashes,
    }


def search_similar_images(query_idx: int, records: list[dict], hashes: list[np.ndarray], top_k: int = 5) -> list[dict]:
    """Bài tập nâng cao 2: Tìm kiếm hình ảnh tương đồng dựa trên khoảng cách Hamming."""
    q_hash = hashes[query_idx]
    ranked = []
    for idx, rec in enumerate(records):
        dist = hamming_distance(q_hash, hashes[idx])
        ranked.append({
            "name": rec["variant"],
            "category": rec["category"],
            "hamming": dist,
            "similarity": round(1.0 - dist / len(q_hash), 4),
        })
    ranked.sort(key=lambda x: x["hamming"])
    return ranked[:top_k]


def run_lab4(data_dir: Path, output_dir: Path) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    records = load_or_build_dataset(data_dir)

    families = ["haar", "db4", "bior1.3", "coif1"]
    benchmark = {fam: evaluate_wavelet_family(records, wavelet=fam, level=3) for fam in families}
    db4_res = benchmark["db4"]

    sample_img = records[0]["img"]
    cA, (cH, cV, cD) = pywt.dwt2(sample_img.astype(np.float32), "db4")
    fig_sub, axes_sub = plt.subplots(2, 2, figsize=(9, 8))
    fig_sub.suptitle("Lab 4 — Phân rã Wavelet 2D (db4, Level 1)", fontsize=13, fontweight="bold")
    for ax, (mat, name) in zip(
        axes_sub.ravel(),
        [(cA, "LL (Xấp xỉ tần số thấp)"), (cH, "LH (Biên ngang)"), (cV, "HL (Biên dọc)"), (cD, "HH (Biên chéo)")],
    ):
        ax.imshow(np.abs(mat), cmap="viridis")
        ax.set_title(name)
        ax.axis("off")
    plt.tight_layout()
    plt.savefig(output_dir / "lab4_wavelet_subbands.png", dpi=150)
    plt.close(fig_sub)

    fig, (ax_roc, ax_hist) = plt.subplots(1, 2, figsize=(14, 5.5))
    palette = {"haar": "#2563EB", "db4": "#059669", "bior1.3": "#D97706", "coif1": "#7C3AED"}
    for fam, res in benchmark.items():
        ax_roc.plot(res["fpr"], res["tpr"], color=palette[fam], lw=2.0, label=f"{fam} (AUC = {res['auc']:.3f})")
    ax_roc.plot([0, 1], [0, 1], "k--", alpha=0.4)
    ax_roc.set_title("Đường cong ROC — So sánh các họ Wavelet Hash")
    ax_roc.set_xlabel("False Positive Rate (1 - Specificity)")
    ax_roc.set_ylabel("True Positive Rate (Sensitivity)")
    ax_roc.legend(loc="lower right")
    ax_roc.grid(alpha=0.25)

    sim_dists = db4_res["distances"][db4_res["y_true"] == 1]
    diff_dists = db4_res["distances"][db4_res["y_true"] == 0]
    ax_hist.hist(sim_dists, bins=12, alpha=0.65, color="#059669", label="Cặp tương tự (Same Group)")
    ax_hist.hist(diff_dists, bins=12, alpha=0.65, color="#DC2626", label="Cặp không tương tự (Different)")
    ax_hist.set_title("Phân phối khoảng cách Hamming (db4)")
    ax_hist.set_xlabel("Khoảng cách Hamming (bits)")
    ax_hist.set_ylabel("Số cặp ảnh")
    ax_hist.legend()
    ax_hist.grid(alpha=0.25)

    plt.tight_layout()
    plt.savefig(output_dir / "lab4_roc_and_hamming.png", dpi=150)
    plt.close(fig)

    top_search = search_similar_images(0, records, db4_res["hashes"], top_k=6)
    summary = {
        "total_images": len(records),
        "total_pairs": db4_res["total_pairs"],
        "benchmark": {
            fam: {k: v for k, v in res.items() if k in ("auc", "accuracy", "sensitivity", "specificity")}
            for fam, res in benchmark.items()
        },
        "top_search": top_search,
    }
    print(f"[Lab 4] Kho dữ liệu: {len(records)} ảnh ({db4_res['total_pairs']} cặp) tại {data_dir}")
    print("[Lab 4] Độ chính xác (db4):", db4_res["accuracy"])
    print("[Lab 4] Độ nhạy (db4):", db4_res["sensitivity"])
    print("[Lab 4] Độ đặc biệt (db4):", db4_res["specificity"])
    print("[Lab 4] Top Image Search:", top_search)
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Lab 4 - Wavelet Image Similarity & ROC")
    parser.add_argument("--data", type=Path, default=Path("Lab4/data"))
    parser.add_argument("--output", type=Path, default=Path("Lab4/results"))
    args = parser.parse_args()
    run_lab4(args.data, args.output)
