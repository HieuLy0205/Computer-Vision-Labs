# Lab 2 — Prompts & Lệnh Vibe-Coding (`Chương 2: Điểm ảnh, Lọc & Nâng cao`)

## 1. Prompt Code Đầy đủ Chương 2 (I, II, III + PDF Part 1 & 2)
```text
Mở rộng `Lab2/src/lab2_point_and_linear.py` bao gồm toàn bộ Chương 2:
- Phần I: Brightness (+/- beta), Contrast (* alpha), Gamma Correction (s = 255*(r/255)^gamma), Histogram Equalization (trên kênh Y của YCrCb), Negative (255 - I), Thresholding.
- Phần II: Mean Filter, Gaussian Blur, Sharpening Kernel với minh họa convolution & padding.
- Phần III: Sobel & Prewitt, Custom Kernel 3x3 (Emboss, Laplacian, Outline), bơm nhiễu Muối-Tiêu/Gaussian, tính MSE & PSNR so sánh Mean/Gaussian/Median/Bilateral.
Xuất 4 biểu đồ tổng hợp vào `Lab2/results/`.
```

## 2. Prompt Vibe-Coding Tương tác Web Presentation
```text
Trong `Lab2Panel.tsx`:
- Chia làm 2 tab rõ ràng: "Phần I & II (Điểm ảnh & Lọc Tuyến tính)" và "Phần III (Sobel/Prewitt, Custom Kernel & Lọc Phi tuyến)".
- Cho phép chỉnh trực tiếp từng ô trong ma trận Kernel 3x3 tùy chỉnh và xem kết quả ảnh + Histogram cập nhật tức thời.
- Xây thanh chạy mô phỏng cửa sổ trượt 2D Convolution 3x3 chạy từng bước trên lưới 7x7.
- Bổ sung thanh kéo Gamma (0.25..2.80) và nút bật/tắt Cân bằng Histogram CDF đồng bộ với biểu đồ Histogram kép.
```

## 3. Lệnh Thực thi & Kiểm thử
```bash
# Chạy thực nghiệm Chương 2 và xuất 4 biểu đồ PNG
python3 Lab2/src/lab2_point_and_linear.py --input Lab2/data/input/sample.jpg --output Lab2/results

# Kiểm tra endpoint FastAPI với tham số Gamma và Equalize Histogram
curl -X POST http://127.0.0.1:8000/api/lab2/run \
  -F "file=@Lab2/data/input/sample.jpg" \
  -F "gamma=0.6" -F "equalize_hist=true"
```
