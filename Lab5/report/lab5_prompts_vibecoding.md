# Lab 5 — Prompts & Lệnh Vibe-Coding (`MTCNN, FaceNet & Deep Photo Matching`)

## 1. Prompt Code Python Pipeline Thời gian thực (Webcam + Static Probe)
```text
Viết `Lab5/src/lab5_facenet_mtcnn.py` dùng OpenCV, MTCNN và FaceNet (facenet-pytorch):
1. Hỗ trợ chạy Webcam (`cv2.VideoCapture(0)`) và ảnh kiểm thử tĩnh (`--probe`).
2. Cấu hình MTCNN với `min_face_size=20` để bắt được mặt khi đứng xa.
3. Tuyệt đối KHÔNG bóp méo tỷ lệ ảnh: xoay phẳng theo 2 mắt (left_eye, right_eye), cắt hình vuông lấy max(w,h) + pad biên trước khi resize 160x160.
4. Trích xuất vector FaceNet chuẩn hóa L2, tính Cosine Similarity với ảnh mẫu `--enrolled`:
   > 0.7 -> "Matched" (màu xanh), <= 0.7 -> "Unknown" (màu đỏ).
5. Vẽ bounding box, 5 landmarks, FPS và xuất biểu đồ biến thiên Cosine Similarity vào `Lab5/results/`.
```

## 2. Prompt Vibe-Coding Sửa lỗi Lệch Tỷ lệ & Bám Mặt Xa–Gần–Lệch Góc
```text
Cải tiến `detectAndEmbedFace` trong `cvEngine.ts` và `Lab5Panel.tsx`:
- Giữ nguyên aspect ratio 1:1 trên Canvas (không ép 240x240 hay 360x360).
- Dùng Integral Images đa tỷ lệ (11%..86% khung hình) kết hợp Viola-Jones Haar contrast (Trán/Má > Mắt) và Bilateral Symmetry để định vị đúng khuôn mặt ở bất kỳ góc nào hoặc khi đứng xa.
- Tái neo bounding box theo khoảng cách giữa 2 mắt (d_eye) và thực hiện biến đổi Affine xoay phẳng 2 mắt vào tọa độ chuẩn 48x48 trước khi trích xuất embedding L2.
- Thêm các nút test "Cùng người (Đứng xa 46% + lệch góc phải)" và "Cùng người (Gần 122% + lệch trái)" để kiểm chứng ngay trên UI.
```

## 3. Lệnh Thực thi & Kiểm thử
```bash
# Chạy kiểm thử trên ảnh tĩnh (không cần webcam)
python3 Lab5/src/lab5_facenet_mtcnn.py \
  --enrolled Lab5/data/input/portrait_enrolled.jpg \
  --probe Lab5/data/input/portrait_enrolled.jpg \
  --threshold 0.7

# Chạy nhận diện Webcam thời gian thực
python3 Lab5/src/lab5_facenet_mtcnn.py --enrolled Lab5/data/input/portrait_enrolled.jpg
```
