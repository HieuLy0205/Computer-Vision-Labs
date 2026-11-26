# Lab 3: Thuật toán Phát hiện Cạnh Canny (Bài thực hành Chương 2 - Phần 2)

## Nội dung thực hành
### I> Lý thuyết
1. **5 bước thuật toán Canny**: Giảm nhiễu (Gaussian) $\to$ Tính Gradient (Sobel) $\to$ Non-Maximum Suppression $\to$ Ngưỡng kép (Double Threshold) $\to$ Theo dõi cạnh (Hysteresis). So sánh với Sobel & Laplacian.
2. **Tham số ảnh hưởng**: $\sigma$ trong Gaussian filter, ngưỡng thấp ($T_{\text{low}}$) và ngưỡng cao ($T_{\text{high}}$).
3. **Ưu/nhược điểm & Ứng dụng thực tế** của Canny Edge Detector.

### II> Bài tập thực hành
1. Cài đặt và so sánh **`cv2.Canny`** (OpenCV) vs **`skimage.feature.canny`** (Scikit-image).
2. Thay đổi $\sigma$, ngưỡng thấp, ngưỡng cao và so sánh với giá trị mặc định.
3. Áp dụng Canny trên các loại ảnh khác nhau: ảnh nhiều nhiễu, ảnh độ tương phản thấp, ảnh nhiều chi tiết.
4. Kết hợp Canny với phân đoạn vùng (Morphology + Contours) và nhận dạng hình dạng (`approxPolyDP`).

### III> Câu hỏi mở rộng
1. Đánh giá chất lượng cạnh Canny (Pratt's FoM, Continuity, F1-score).
2. Cải thiện hiệu suất (Auto-Canny theo median, CLAHE cho ảnh tối, Bilateral thay Gaussian).
3. Áp dụng Canny cho ảnh màu (tính gradient trên từng kênh R/G/B hoặc không gian LAB).
4. Áp dụng Canny trên luồng Video thời gian thực.

## Cách chạy
```bash
python Lab3/src/lab3_canny_edge_detector.py --input Lab3/data/input/sample.jpg
```
