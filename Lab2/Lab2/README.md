# Lab 2: Toán tử Điểm ảnh, Lọc Tuyến tính & Nâng cao (Bài thực hành Chương 2)

## Nội dung thực hành đầy đủ 3 phần
### I> Toán Tử Điểm Ảnh (Point Operations)
1. Thay đổi độ sáng ($g = f + \beta$)
2. Thay đổi độ tương phản ($g = \alpha \cdot f$)
3. Biến đổi âm bản ($g = 255 - f$)
4. Cắt ngưỡng nhị phân ($T \in [0, 255]$)

### II> Lọc Tuyến Tính (Linear Filtering)
1. Lọc trung bình (Mean Filter)
2. Lọc Gaussian
3. Làm sắc nét (Sharpening Kernel)

### III> Bài tập nâng cao
1. Phát hiện cạnh với kernel **Sobel** và **Prewitt**
2. Tự thiết kế kernel tùy chỉnh (Emboss, Laplacian, Outline)
3. So sánh hiệu quả các bộ lọc (MSE & PSNR)
4. Áp dụng lọc phi tuyến tính: **Median Filter** và **Bilateral Filter**

## Cách chạy
```bash
python Lab2/src/lab2_point_and_linear.py --input Lab2/data/input/sample.jpg
```
