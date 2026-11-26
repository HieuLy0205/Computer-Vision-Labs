"""
FastAPI Backend cho Computer Vision Labs 1–5
Cung cấp REST API thực thi các bài thực hành OpenCV, Pillow, PyWavelets & FaceNet/MTCNN.
Chạy local: uvicorn backend.main:app --reload --port 8000
"""

from pathlib import Path
import base64
import io
import cv2
import numpy as np
import pywt
from PIL import Image
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Computer Vision Labs 1-5 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT_DIR = Path(__file__).resolve().parent.parent


def decode_upload(raw_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(raw_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Không thể giải mã tệp ảnh tải lên.")
    return img


def encode_png_base64(img_bgr: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", img_bgr)
    if not ok:
        raise HTTPException(status_code=500, detail="Lỗi mã hóa PNG.")
    return "data:image/png;base64," + base64.b64encode(buf.tobytes()).decode("ascii")


def compute_rgb_histogram(img_bgr: np.ndarray) -> dict:
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    return {
        "r": cv2.calcHist([rgb], [0], None, [256], [0, 256]).ravel().astype(int).tolist(),
        "g": cv2.calcHist([rgb], [1], None, [256], [0, 256]).ravel().astype(int).tolist(),
        "b": cv2.calcHist([rgb], [2], None, [256], [0, 256]).ravel().astype(int).tolist(),
        "gray": cv2.calcHist([gray], [0], None, [256], [0, 256]).ravel().astype(int).tolist(),
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "engine": "fastapi-opencv-pywt"}


@app.get("/api/source/{lab_id}")
def get_lab_source(lab_id: str):
    valid = {"lab1", "lab2", "lab3", "lab4", "lab5"}
    if lab_id not in valid:
        raise HTTPException(status_code=404, detail="Lab không tồn tại")
    folder = ROOT_DIR / lab_id.capitalize()
    py_files = sorted((folder / "src").glob("*.py"))
    md_files = sorted((folder / "report").glob("*.md"))
    docx_files = sorted((folder / "docs").glob("*.docx")) if (folder / "docs").exists() else []
    return {
        "lab": lab_id,
        "readme": (folder / "README.md").read_text(encoding="utf-8") if (folder / "README.md").exists() else "",
        "script_name": py_files[0].name if py_files else "",
        "script": py_files[0].read_text(encoding="utf-8") if py_files else "",
        "report": md_files[0].read_text(encoding="utf-8") if md_files else "",
        "reports": [{"name": p.name, "content": p.read_text(encoding="utf-8")} for p in md_files],
        "docs": [p.name for p in docx_files],
    }


@app.post("/api/lab1/run")
async def run_lab1_endpoint(
    file: UploadFile = File(...),
    colorspace: str = Form("rgb"),
    scale: float = Form(1.0),
    draw_shapes: bool = Form(True),
):
    img = decode_upload(await file.read())
    h, w = img.shape[:2]
    out = cv2.resize(img, (max(32, int(w * scale)), max(32, int(h * scale))), interpolation=cv2.INTER_AREA)

    if colorspace == "gray":
        g = cv2.cvtColor(out, cv2.COLOR_BGR2GRAY)
        out = cv2.cvtColor(g, cv2.COLOR_GRAY2BGR)
    elif colorspace == "hsv":
        out = cv2.cvtColor(out, cv2.COLOR_BGR2HSV)
    elif colorspace == "lab":
        out = cv2.cvtColor(out, cv2.COLOR_BGR2LAB)

    if draw_shapes:
        oh, ow = out.shape[:2]
        cv2.rectangle(out, (ow // 6, oh // 6), (5 * ow // 6, 5 * oh // 6), (235, 99, 37), 3)
        cv2.circle(out, (ow // 2, oh // 2), min(oh, ow) // 5, (129, 185, 16), 3)
        cv2.putText(out, "OpenCV Lab 1", (20, oh - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

    return {"image": encode_png_base64(out), "histogram": compute_rgb_histogram(out)}


@app.post("/api/lab2/run")
async def run_lab2_endpoint(
    file: UploadFile = File(...),
    brightness: int = Form(0),
    contrast: float = Form(1.0),
    gamma: float = Form(1.0),
    equalize_hist: bool = Form(False),
    negative: bool = Form(False),
    threshold: int = Form(-1),
    filter_type: str = Form("none"),
):
    img = decode_upload(await file.read())
    out = img.copy()
    if equalize_hist:
        ycrcb = cv2.cvtColor(out, cv2.COLOR_BGR2YCrCb)
        ycrcb[:, :, 0] = cv2.equalizeHist(ycrcb[:, :, 0])
        out = cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)
    out = np.clip(out.astype(np.float32) * contrast + brightness, 0, 255).astype(np.uint8)
    if abs(gamma - 1.0) > 1e-3:
        lut = np.array([((i / 255.0) ** gamma) * 255.0 for i in range(256)], dtype=np.uint8)
        out = cv2.LUT(out, lut)
    if negative:
        out = 255 - out
    if threshold >= 0:
        g = cv2.cvtColor(out, cv2.COLOR_BGR2GRAY)
        _, b = cv2.threshold(g, threshold, 255, cv2.THRESH_BINARY)
        out = cv2.cvtColor(b, cv2.COLOR_GRAY2BGR)
    if filter_type == "mean":
        out = cv2.blur(out, (5, 5))
    elif filter_type == "gaussian":
        out = cv2.GaussianBlur(out, (5, 5), sigmaX=1.2)
    elif filter_type == "sharpen":
        k = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=np.float32)
        out = cv2.filter2D(out, -1, k)
    elif filter_type == "median":
        out = cv2.medianBlur(out, 5)
    elif filter_type == "bilateral":
        out = cv2.bilateralFilter(out, 9, 75, 75)
    elif filter_type in ("sobel", "prewitt"):
        g = cv2.cvtColor(out, cv2.COLOR_BGR2GRAY).astype(np.float32)
        kx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float32) if filter_type == "sobel" else np.array([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]], dtype=np.float32)
        ky = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=np.float32) if filter_type == "sobel" else np.array([[-1, -1, -1], [0, 0, 0], [1, 1, 1]], dtype=np.float32)
        mag = np.clip(np.hypot(cv2.filter2D(g, -1, kx), cv2.filter2D(g, -1, ky)), 0, 255).astype(np.uint8)
        out = cv2.cvtColor(mag, cv2.COLOR_GRAY2BGR)
    return {"image": encode_png_base64(out), "histogram": compute_rgb_histogram(out)}


@app.post("/api/lab3/run")
async def run_lab3_endpoint(
    file: UploadFile = File(...),
    sigma: float = Form(1.4),
    low_threshold: int = Form(50),
    high_threshold: int = Form(150),
    mode: str = Form("opencv_canny"),
    color_canny: bool = Form(False),
):
    from skimage import feature as sk_feature

    img = decode_upload(await file.read())
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    ksize = max(3, int(2 * round(3 * sigma) + 1))

    if mode == "skimage_canny":
        edges = (sk_feature.canny(gray, sigma=sigma, low_threshold=low_threshold / 4.0, high_threshold=high_threshold / 4.0) * 255).astype(np.uint8)
    elif mode == "auto_canny":
        blurred = cv2.GaussianBlur(gray, (ksize, ksize), sigmaX=sigma)
        med = float(np.median(blurred))
        edges = cv2.Canny(blurred, int(max(0, 0.67 * med)), int(min(255, 1.33 * med)))
    elif mode == "sobel":
        blurred = cv2.GaussianBlur(gray, (ksize, ksize), sigmaX=sigma).astype(np.float32)
        edges = np.clip(np.hypot(cv2.Sobel(blurred, cv2.CV_32F, 1, 0), cv2.Sobel(blurred, cv2.CV_32F, 0, 1)), 0, 255).astype(np.uint8)
    elif mode == "laplacian":
        blurred = cv2.GaussianBlur(gray, (ksize, ksize), sigmaX=sigma)
        edges = np.clip(np.abs(cv2.Laplacian(blurred, cv2.CV_32F)), 0, 255).astype(np.uint8)
    elif color_canny:
        b, g, r = cv2.split(cv2.GaussianBlur(img, (ksize, ksize), sigmaX=sigma))
        edges = cv2.bitwise_or(cv2.Canny(b, low_threshold, high_threshold), cv2.bitwise_or(cv2.Canny(g, low_threshold, high_threshold), cv2.Canny(r, low_threshold, high_threshold)))
    else:
        blurred = cv2.GaussianBlur(gray, (ksize, ksize), sigmaX=sigma)
        edges = cv2.Canny(blurred, low_threshold, high_threshold)

    out = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
    return {
        "image": encode_png_base64(out),
        "edge_density": round(float((edges > 0).mean()), 4),
    }


@app.post("/api/lab4/hash")
async def run_lab4_hash(
    file: UploadFile = File(...),
    wavelet: str = Form("db4"),
    level: int = Form(3),
):
    img = decode_upload(await file.read())
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    resized = cv2.resize(gray, (64, 64), interpolation=cv2.INTER_AREA).astype(np.float32)
    coeffs = pywt.wavedec2(resized, wavelet=wavelet, level=level)
    cA = cv2.resize(coeffs[0], (8, 8), interpolation=cv2.INTER_AREA).flatten()
    med = float(np.median(cA))
    bits = [1 if float(v) >= med else 0 for v in cA]
    return {"wavelet": wavelet, "level": level, "hash_bits": bits}


@app.post("/api/lab4/evaluate")
async def run_lab4_evaluate(wavelet: str = Form("db4"), level: int = Form(3)):
    from Lab4.src.lab4_wavelet_similarity import evaluate_wavelet_family, load_or_build_dataset

    records = load_or_build_dataset(ROOT_DIR / "Lab4" / "data")
    res = evaluate_wavelet_family(records, wavelet=wavelet, level=level)
    return {
        "wavelet": wavelet,
        "level": level,
        "total_images": res["total_images"],
        "total_pairs": res["total_pairs"],
        "auc": res["auc"],
        "accuracy": res["accuracy"],
        "sensitivity": res["sensitivity"],
        "specificity": res["specificity"],
        "roc": [{"fpr": float(f), "tpr": float(t)} for f, t in zip(res["fpr"], res["tpr"])],
    }


@app.post("/api/lab5/verify")
async def run_lab5_verify(
    enrolled: UploadFile = File(...),
    probe: UploadFile = File(...),
    threshold: float = Form(0.7),
):
    from Lab5.src.lab5_facenet_mtcnn import FaceRecognitionPipeline, cosine_similarity

    pipe = FaceRecognitionPipeline(threshold=threshold)
    img_ref = cv2.cvtColor(decode_upload(await enrolled.read()), cv2.COLOR_BGR2RGB)
    img_probe = cv2.cvtColor(decode_upload(await probe.read()), cv2.COLOR_BGR2RGB)

    _, _, _, ref_embs = pipe.extract_embeddings(img_ref)
    boxes, probs, landmarks, probe_embs = pipe.extract_embeddings(img_probe)
    if len(ref_embs) == 0 or len(probe_embs) == 0:
        return {"detected": False, "status": "Unknown", "similarity": 0.0}

    sim = cosine_similarity(ref_embs[0], probe_embs[0])
    status = pipe.classify_similarity(sim)
    return {
        "detected": True,
        "status": status,
        "similarity": round(sim, 4),
        "threshold": threshold,
        "box": [float(v) for v in boxes[0]],
        "confidence": float(probs[0]),
        "landmarks": [[float(x), float(y)] for x, y in landmarks[0]],
    }


@app.post("/api/lab5/identify")
async def run_lab5_identify(
    probe: UploadFile = File(...),
    threshold: float = Form(0.7),
):
    from Lab5.src.lab5_facenet_mtcnn import (
        FaceRecognitionPipeline,
        load_gallery_from_folders,
        match_against_gallery,
    )

    pipe = FaceRecognitionPipeline(threshold=threshold)
    gallery = load_gallery_from_folders(ROOT_DIR / "Lab5" / "data", pipe)
    img_probe = cv2.cvtColor(decode_upload(await probe.read()), cv2.COLOR_BGR2RGB)
    boxes, probs, landmarks, probe_embs = pipe.extract_embeddings(img_probe)
    if len(probe_embs) == 0 or len(gallery) == 0:
        return {"detected": False, "status": "Unknown", "similarity": 0.0, "ranking": []}

    status, best_sim, best_angle, per_person = match_against_gallery(probe_embs[0], gallery, threshold)
    ranking = [
        {"person": k, "max_similarity": round(v["max_sim"], 4), "best_angle": v["best_angle"]}
        for k, v in sorted(per_person.items(), key=lambda kv: -kv[1]["max_sim"])
    ]
    return {
        "detected": True,
        "status": status,
        "similarity": round(best_sim, 4),
        "best_angle": best_angle,
        "threshold": threshold,
        "gallery_count": len(gallery),
        "ranking": ranking,
        "box": [float(v) for v in boxes[0]],
        "confidence": float(probs[0]),
        "landmarks": [[float(x), float(y)] for x, y in landmarks[0]],
    }

