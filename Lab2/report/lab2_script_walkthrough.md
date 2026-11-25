# Lab 2 — Script Walkthrough (`lab2_point_and_linear.py`)

## 1. Bản đồ Hàm Trong Script Chương 2 (Phần I, II, III + PDF Gamma & Histogram Equalization)
| Hàm | Công thức / Thư viện | Mục tiêu thực hành |
|---|---|---|
| `adjust_brightness(img, beta)` | `np.clip(img.astype(float32) + beta, 0, 255)` | Tránh tràn số modulo 256 kiểu `uint8` |
| `adjust_contrast(img, alpha)` | `np.clip(img.astype(float32) * alpha, 0, 255)` | Giãn hoặc co phổ mức xám trên Histogram |
| `apply_gamma(img, gamma)` | LUT $255 \cdot (r/255)^\gamma$ (`cv2.LUT`) | Kéo sáng chi tiết tối ($\gamma < 1$) hoặc nén tối ($\gamma > 1$) |
| `equalize_histogram_color(rgb)` | Chuyển `YCrCb`, chạy `cv2.equalizeHist` trên kênh `Y` | Trải đều CDF mức sáng mà không làm lệch sắc độ R/G/B |
| `detect_edges_sobel_prewitt(gray)` | `cv2.filter2D` với $G_x, G_y$, chuẩn L2 $\sqrt{G_x^2+G_y^2}$ | So sánh độ sắc và khả năng kháng nhiễu giữa Sobel (trọng số 2) và Prewitt |
| `compute_mse_psnr(clean, restored)` | $10\log_{10}(255^2 / \text{MSE})$ | Đánh giá định lượng Mean, Gaussian, Median, Bilateral |

## 2. Phân tích Bốn Biểu đồ Đầu ra trong `Lab2/results/`
1. `lab2_point_ops_histograms.png`: Đối chiếu trực tiếp ảnh gốc, tăng sáng (+50), tăng tương phản (x1.5), âm bản (255-r) cùng 4 biểu đồ Histogram bên dưới.
2. `lab2_linear_and_edges.png`: Ma trận 2x3 cho Lọc Trung bình 5x5, Gaussian 5x5, Sharpen, Sobel, Prewitt và Custom Emboss.
3. `lab2_filter_comparison_psnr.png`: Biểu đồ cột PSNR (dB) chứng minh bộ lọc phi tuyến **Median 5x5** vượt trội hoàn toàn Mean/Gaussian trên nhiễu Muối-Tiêu 6%.
4. `lab2_gamma_hist_equalize.png`: Minh họa biến đổi Gamma ($\gamma=0.5, 2.0$) và Cân bằng Histogram CDF kèm phổ phân bố pixel.
