"""
Lab 5: Nhận diện Khuôn mặt Thời gian thực với MTCNN & FaceNet trên Webcam
Các bước chính:
1. Truy cập và thu thập khung hình qua Webcam bằng OpenCV (cv2.VideoCapture)
2. Tích hợp MTCNN để phát hiện khuôn mặt (bounding box + 5 điểm landmarks)
3. Trích xuất vector đặc trưng 512 chiều bằng FaceNet (InceptionResnetV1)
4. So sánh độ tương đồng Cosine Similarity:
   - Nếu similarity > 0.7 -> Hiển thị "Matched"
   - Nếu similarity < 0.7 -> Hiển thị "Unknown"
Hỗ trợ cả chế độ chạy trên ảnh tĩnh (--probe) để kiểm thử khi không có Webcam.
"""

import argparse
from pathlib import Path
import time
import cv2
import numpy as np
import torch
import matplotlib.pyplot as plt
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1


def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    denom = float(np.linalg.norm(vec_a) * np.linalg.norm(vec_b))
    if denom == 0.0:
        return 0.0
    return float(np.dot(vec_a, vec_b) / denom)


class FaceRecognitionPipeline:
    def __init__(self, threshold: float = 0.7):
        self.threshold = threshold
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.mtcnn = MTCNN(
            image_size=160,
            margin=20,
            min_face_size=20,
            thresholds=[0.55, 0.65, 0.65],
            keep_all=True,
            device=self.device,
        )
        self.resnet = InceptionResnetV1(pretrained="vggface2").eval().to(self.device)

    @staticmethod
    def _crop_square_preserve_aspect(
        pil_img: Image.Image,
        box: np.ndarray,
        landmarks: np.ndarray | None = None,
        margin: int = 20,
        out_size: int = 160,
    ) -> torch.Tensor:
        """Cắt và căn chỉnh theo trục 2 mắt giữ nguyên tỷ lệ 1:1 (không bóp méo vector khuôn mặt) dù ảnh gần hay xa."""
        work_img = pil_img
        if landmarks is not None and len(landmarks) >= 2:
            left_eye, right_eye = landmarks[0], landmarks[1]
            dy = float(right_eye[1] - left_eye[1])
            dx = float(right_eye[0] - left_eye[0])
            angle_deg = float(np.degrees(np.arctan2(dy, dx)))
            if abs(angle_deg) > 1.0:
                cx_box = float((box[0] + box[2]) / 2.0)
                cy_box = float((box[1] + box[3]) / 2.0)
                work_img = pil_img.rotate(-angle_deg, resample=Image.Resampling.BILINEAR, center=(cx_box, cy_box), fillcolor=(128, 128, 128))

        w, h = work_img.size
        x1, y1, x2, y2 = box
        cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
        side = max(x2 - x1, y2 - y1) + 2 * margin
        sq_x1 = int(round(cx - side / 2.0))
        sq_y1 = int(round(cy - side / 2.0))
        sq_x2 = int(round(cx + side / 2.0))
        sq_y2 = int(round(cy + side / 2.0))

        # Pad biên nếu vượt khỏi ảnh gốc để giữ nguyên tỷ lệ 1:1
        square_canvas = Image.new("RGB", (max(1, sq_x2 - sq_x1), max(1, sq_y2 - sq_y1)), (128, 128, 128))
        crop_x1, crop_y1 = max(0, sq_x1), max(0, sq_y1)
        crop_x2, crop_y2 = min(w, sq_x2), min(h, sq_y2)
        if crop_x2 > crop_x1 and crop_y2 > crop_y1:
            region = work_img.crop((crop_x1, crop_y1, crop_x2, crop_y2))
            square_canvas.paste(region, (crop_x1 - sq_x1, crop_y1 - sq_y1))

        resized = square_canvas.resize((out_size, out_size), Image.Resampling.BILINEAR)
        arr = (np.asarray(resized, dtype=np.float32) - 127.5) / 128.0
        return torch.from_numpy(arr).permute(2, 0, 1)

    @torch.no_grad()
    def extract_embeddings(self, rgb_image: np.ndarray):
        pil_img = Image.fromarray(rgb_image)
        boxes, probs, landmarks = self.mtcnn.detect(pil_img, landmarks=True)
        if boxes is None or len(boxes) == 0:
            return [], [], [], []
        face_tensors = [
            self._crop_square_preserve_aspect(pil_img, b, lm, margin=20, out_size=160)
            for b, lm in zip(boxes, landmarks)
        ]
        aligned_faces = torch.stack(face_tensors).to(self.device)
        embeddings = self.resnet(aligned_faces).cpu().numpy()
        # Chuẩn hóa L2
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True) + 1e-10
        embeddings = embeddings / norms
        return boxes, probs, landmarks, embeddings

    def classify_similarity(self, sim: float) -> str:
        """Điều kiện so sánh theo bài thực hành: > 0.7 -> Matched, < 0.7 -> Unknown."""
        return "Matched" if sim > self.threshold else "Unknown"


def load_gallery_from_folders(gallery_dir: Path, pipeline: FaceRecognitionPipeline) -> list[dict]:
    """
    Quét toàn bộ các thư mục con trong Lab5/data/ (mỗi thư mục = 1 người, chứa nhiều góc ảnh).
    Bỏ qua thư mục 'input' và thư mục ẩn.
    """
    exts = {".jpg", ".jpeg", ".png", ".webp"}
    gallery: list[dict] = []
    if not gallery_dir.exists():
        return gallery

    for person_dir in sorted(p for p in gallery_dir.iterdir() if p.is_dir() and p.name != "input" and not p.name.startswith(".")):
        person_name = person_dir.name.replace("_", " ")
        for img_path in sorted(p for p in person_dir.iterdir() if p.is_file() and p.suffix.lower() in exts):
            bgr = cv2.imread(str(img_path))
            if bgr is None:
                continue
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            _, _, _, embs = pipeline.extract_embeddings(rgb)
            if len(embs) > 0:
                gallery.append({
                    "person": person_name,
                    "folder": person_dir.name,
                    "angle": img_path.name,
                    "embedding": embs[0],
                })
    return gallery


def match_against_gallery(probe_emb: np.ndarray, gallery: list[dict], threshold: float) -> tuple[str, float, str, dict]:
    """
    So sánh embedding của người cần kiểm tra với TẤT CẢ ảnh mọi góc của TẤT CẢ mọi người trong kho.
    Trả về: (status_label, best_similarity, best_angle_file, per_person_scores)
    """
    per_person: dict[str, dict] = {}
    for item in gallery:
        sim = cosine_similarity(item["embedding"], probe_emb)
        person = item["person"]
        if person not in per_person or sim > per_person[person]["max_sim"]:
            per_person[person] = {"max_sim": sim, "best_angle": item["angle"]}

    if not per_person:
        return "Unknown", 0.0, "", {}

    best_person, info = max(per_person.items(), key=lambda kv: kv[1]["max_sim"])
    best_sim = float(info["max_sim"])
    status = f"Matched: {best_person}" if best_sim > threshold else "Unknown"
    return status, best_sim, info["best_angle"], per_person


def save_similarity_chart(sim_history: list[float], threshold: float, out_path: Path) -> None:
    if not sim_history:
        return
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(sim_history, color="#2563EB", linewidth=1.8, label="Best Cosine Similarity")
    ax.axhline(threshold, color="#DC2626", linestyle="--", linewidth=1.5, label=f"Ngưỡng = {threshold:.2f}")
    ax.fill_between(
        range(len(sim_history)),
        threshold,
        sim_history,
        where=np.array(sim_history) > threshold,
        color="#10B981",
        alpha=0.2,
        label="Matched (> 0.7)",
    )
    ax.set_title("Biến thiên Cosine Similarity theo Thời gian thực (MTCNN + FaceNet)")
    ax.set_xlabel("Frame")
    ax.set_ylabel("Cosine Similarity")
    ax.set_ylim(-0.1, 1.05)
    ax.legend()
    ax.grid(alpha=0.25)
    plt.tight_layout()
    plt.savefig(out_path, dpi=150)
    plt.close(fig)


def run_webcam(pipeline: FaceRecognitionPipeline, gallery: list[dict], output_dir: Path) -> None:
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Không thể mở Webcam (VideoCapture(0)). Hãy kiểm tra camera hoặc dùng --probe.")

    sim_history = []
    print(f"[Lab 5] Đang chạy nhận diện trên Webcam với {len(gallery)} ảnh mẫu đa góc. Nhấn 'q' để thoát.")
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            t0 = time.perf_counter()
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            boxes, probs, landmarks, embeddings = pipeline.extract_embeddings(rgb)

            for box, lm, emb in zip(boxes, landmarks, embeddings):
                x1, y1, x2, y2 = [int(v) for v in box]
                label, sim, best_angle, _ = match_against_gallery(emb, gallery, pipeline.threshold)
                sim_history.append(sim)
                color = (16, 185, 129) if label.startswith("Matched") else (0, 0, 220)

                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                for lx, ly in lm:
                    cv2.circle(frame, (int(lx), int(ly)), 3, (255, 200, 0), -1)
                cv2.putText(
                    frame,
                    f"{label} ({sim:.3f})",
                    (x1, max(24, y1 - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.75,
                    color,
                    2,
                )

            fps = 1.0 / max(1e-4, time.perf_counter() - t0)
            cv2.putText(frame, f"FPS: {fps:.1f} | Threshold: {pipeline.threshold} | Gallery: {len(gallery)}", (14, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.60, (255, 255, 255), 2)
            cv2.imshow("Lab 5 - MTCNN + FaceNet Real-Time Recognition", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()
        save_similarity_chart(sim_history, pipeline.threshold, output_dir / "lab5_realtime_similarity.png")


def run_probe_image(pipeline: FaceRecognitionPipeline, gallery: list[dict], probe_path: Path, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    probe_bgr = cv2.imread(str(probe_path))
    probe_rgb = cv2.cvtColor(probe_bgr, cv2.COLOR_BGR2RGB)
    boxes, probs, landmarks, embeddings = pipeline.extract_embeddings(probe_rgb)

    for box, lm, emb in zip(boxes, landmarks, embeddings):
        x1, y1, x2, y2 = [int(v) for v in box]
        label, sim, best_angle, per_person = match_against_gallery(emb, gallery, pipeline.threshold)
        color = (16, 185, 129) if label.startswith("Matched") else (0, 0, 220)
        cv2.rectangle(probe_bgr, (x1, y1), (x2, y2), color, 3)
        for lx, ly in lm:
            cv2.circle(probe_bgr, (int(lx), int(ly)), 4, (255, 200, 0), -1)
        cv2.putText(probe_bgr, f"{label} ({sim:.3f})", (x1, max(28, y1 - 12)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.85, color, 2)
        print(f"[Lab 5] Kết quả kiểm tra: {label} | Max Cosine = {sim:.4f} (Góc gần nhất: {best_angle})")
        for pname, pinfo in sorted(per_person.items(), key=lambda kv: -kv[1]["max_sim"]):
            print(f"   - {pname}: {pinfo['max_sim']:.4f} ({pinfo['best_angle']})")

    cv2.imwrite(str(output_dir / "lab5_probe_result.png"), probe_bgr)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Lab 5 - Real-Time Face Recognition with MTCNN & FaceNet")
    parser.add_argument("--gallery", type=Path, default=Path("Lab5/data"), help="Thư mục kho khuôn mặt (mỗi người 1 folder nhiều góc)")
    parser.add_argument("--enrolled", type=Path, default=None, help="(Tùy chọn) Chỉ so sánh với 1 ảnh mẫu duy nhất")
    parser.add_argument("--probe", type=Path, default=None, help="Ảnh kiểm tra tĩnh (bỏ trống để mở Webcam)")
    parser.add_argument("--threshold", type=float, default=0.7, help="Ngưỡng nhận diện (mặc định 0.7)")
    parser.add_argument("--output", type=Path, default=Path("Lab5/results"))
    args = parser.parse_args()

    pipe = FaceRecognitionPipeline(threshold=args.threshold)
    if args.enrolled is not None:
        enrolled_rgb = cv2.cvtColor(cv2.imread(str(args.enrolled)), cv2.COLOR_BGR2RGB)
        _, _, _, enrolled_embs = pipe.extract_embeddings(enrolled_rgb)
        if len(enrolled_embs) == 0:
            raise ValueError("Không phát hiện được khuôn mặt trong ảnh mẫu --enrolled")
        gallery = [{"person": args.enrolled.stem, "folder": "enrolled", "angle": args.enrolled.name, "embedding": enrolled_embs[0]}]
    else:
        gallery = load_gallery_from_folders(args.gallery, pipe)
        if len(gallery) == 0:
            raise ValueError(f"Không tìm thấy khuôn mặt hợp lệ trong các thư mục con của {args.gallery}")

    if args.probe is not None:
        run_probe_image(pipe, gallery, args.probe, args.output)
    else:
        run_webcam(pipe, gallery, args.output)
