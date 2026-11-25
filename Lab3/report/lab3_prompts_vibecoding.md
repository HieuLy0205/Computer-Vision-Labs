# Lab 3 — Prompts & Lệnh Vibe-Coding (`Canny Edge Detector`)

## 1. Prompt Cài đặt Canny 5 Bước & So sánh Đa thư viện
```text
Viết `Lab3/src/lab3_canny_edge_detector.py` triển khai:
1. Cài đặt Canny 5 bước thủ công (Gaussian -> Sobel Magnitude & Direction -> Non-Maximum Suppression 4 hướng -> Double Threshold -> Hysteresis BFS 8-lân cận) để vẽ minh họa từng giai đoạn.
2. So sánh `cv2.Canny` vs `skimage.feature.canny` vs Sobel & Laplacian.
3. Khảo sát tham số sigma, T_low, T_high trên 3 điều kiện ảnh: nhiễu Gaussian/Muối-tiêu, tương phản thấp (kết hợp CLAHE + Auto-Canny), nhiều chi tiết.
4. Phân đoạn vật thể bằng Canny + Morphology Closing + findContours + approxPolyDP.
5. Hỗ trợ Color Canny đa kênh RGB và tính Edge Density + Connectivity Ratio.
```

## 2. Prompt Vibe-Coding Giao diện Web Presentation (`Lab3Panel.tsx`)
```text
Xây dựng tab Lab 3 cho phép:
- Nhấn chọn xem từng giai đoạn trong 5 bước Canny (Step 1 Gaussian -> Step 2 Gradient -> Step 3 NMS 1px -> Step 4 Double Threshold phân màu Strong xanh lá / Weak hổ phách -> Step 5 Hysteresis).
- Chỉnh thanh trượt Sigma (0.5..3.5), T_low, T_high hoặc bật Auto-Canny / CLAHE / Color Canny.
- Xem bảng so sánh OpenCV Canny vs Scikit-image vs Sobel vs Laplacian và kết quả phân đoạn hình học trực tiếp trên Canvas.
```

## 3. Lệnh Chạy & Kiểm tra
```bash
# Chạy full Lab 3 (5 bước + so sánh + 3 điều kiện + phân đoạn)
python3 Lab3/src/lab3_canny_edge_detector.py --input Lab3/data/input/sample.jpg --output Lab3/results

# Kiểm thử endpoint FastAPI /api/lab3/run với chế độ auto_canny và color_canny
curl -X POST http://127.0.0.1:8000/api/lab3/run \
  -F "file=@Lab3/data/input/sample.jpg" \
  -F "mode=auto_canny" -F "sigma=1.4"
```
