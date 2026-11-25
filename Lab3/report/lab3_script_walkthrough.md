# Lab 3 — Script Walkthrough (`lab3_canny_edge_detector.py`)

## 1. Kiến trúc Module & Các Hàm Cốt lõi
| Hàm | Vai trò trong Bài thực hành Chương 2 (Phần 2) | Điểm nổi bật |
|---|---|---|
| `canny_from_scratch(gray, sigma, low, high)` | Tự cài đặt đầy đủ **5 bước Canny**: Gaussian -> Gradient -> NMS -> Double Threshold -> Hysteresis (BFS) | Giúp sinh viên kiểm chứng từng ma trận trung gian chứ không chỉ gọi hàm đen. |
| `auto_canny(blurred, sigma=0.33)` | Tự động tính $T_{\text{low}}, T_{\text{high}}$ từ trung vị mức xám $M$ | $(1-\sigma)M \le T \le (1+\sigma)M$, giải quyết ảnh thiếu sáng/tương phản thấp. |
| `color_canny(rgb, sigma, low, high)` | Chạy Canny trên từng kênh R, G, B rồi hợp bằng `bitwise_or` | Phát hiện được ranh giới khác màu cùng độ xám (nơi Grayscale Canny thất bại). |
| `segment_and_classify_shapes(gray)` | Canny -> Morphology Closing -> `findContours` -> `approxPolyDP` | Đếm số đỉnh phân loại Tam giác / Tứ giác / Hình tròn. |
| `compute_edge_metrics(edges)` | Tính Edge Density, Connected Components & Noise Ratio (dùng cho Câu mở rộng 1) | Đánh giá định lượng khi không có Ground Truth. |

## 2. Biểu đồ & Ảnh Kết quả Sinh ra tại `Lab3/results/`
1. `lab3_canny_5_steps.png`: Minh họa 5 bước trực quan (Original -> Gaussian -> Gradient Magnitude -> NMS 1px -> Hysteresis Final).
2. `lab3_canny_vs_skimage_sobel_laplacian.png`: Đối chiếu `cv2.Canny`, `skimage.feature.canny`, Sobel và Laplacian.
3. `lab3_param_grid_3_conditions.png`: Khảo sát lưới $(\sigma, T_{\text{low}}, T_{\text{high}})$ trên 3 điều kiện (Nhiều nhiễu, Tương phản thấp + CLAHE/Auto-Canny, Nhiều chi tiết).
4. `lab3_segmentation_and_color_canny.png`: Minh họa Phân đoạn hình học (`approxPolyDP`) và Color Canny đa kênh.
