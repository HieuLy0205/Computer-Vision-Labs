# Báo cáo Phân tích Lab 3: Thuật toán Phát hiện Cạnh Canny (Chương 2 - Phần 2)

## I. Lý thuyết Thuật toán Canny
### 1. Giải thích chi tiết 5 bước của Canny
1. **Giảm nhiễu (Gaussian Smoothing)**: Tích chập ảnh xám với nhân Gaussian $G_{\sigma}$ để triệt tiêu nhiễu cao tần trước khi lấy đạo hàm.
2. **Tính toán Gradient**: Dùng toán tử Sobel tính $G_x, G_y$, từ đó suy ra độ lớn biên $|G| = \sqrt{G_x^2 + G_y^2}$ và góc hướng cạnh $\theta = \arctan2(G_y, G_x)$.
3. **Non-Maximum Suppression (NMS)**: Làm mảnh cạnh xuống đúng **1 pixel** bằng cách giữ lại điểm cực đại cục bộ dọc theo phương gradient $\theta$ (lượng tử hóa về 4 hướng $0^\circ, 45^\circ, 90^\circ, 135^\circ$).
4. **Ngưỡng kép (Double Thresholding)**: Phân loại điểm cạnh thành 3 nhóm theo $(T_{\text{low}}, T_{\text{high}})$:
   - $|G| \ge T_{\text{high}}$ $\rightarrow$ **Cạnh mạnh (Strong edge)**
   - $T_{\text{low}} \le |G| < T_{\text{high}}$ $\rightarrow$ **Cạnh yếu (Weak edge)**
   - $|G| < T_{\text{low}}$ $\rightarrow$ **Loại bỏ**
5. **Theo dõi cạnh (Hysteresis Edge Tracking)**: Chỉ giữ lại cạnh yếu nếu nó kết nối liên thông (8-lân cận) tới ít nhất một cạnh mạnh; các cạnh yếu cô lập (thường do nhiễu) bị xóa bỏ.

### 2. So sánh Canny vs Sobel vs Laplacian
| Tiêu chí | Sobel (Đạo hàm bậc 1) | Laplacian (Đạo hàm bậc 2) | Canny (Đa giai đoạn tối ưu) |
| :--- | :--- | :--- | :--- |
| **Độ dày cạnh** | Dày (2–4 px), bị nhòe quanh biên | Mảnh ở zero-crossing nhưng nhiễu kép | **Chính xác 1 px (nhờ NMS)** |
| **Chống nhiễu** | Trung bình | Rất nhạy với nhiễu | **Cao (Gaussian + Hysteresis)** |
| **Tốc độ** | Rất nhanh | Rất nhanh | Trung bình (nhiều bước hơn) |

### 3. Ảnh hưởng tham số & Ứng dụng thực tế
- **$\sigma$ (Gaussian)**: $\sigma$ lớn lọc nhiễu mạnh nhưng làm mờ chi tiết mảnh và dịch nhẹ vị trí cạnh; $\sigma$ nhỏ giữ chi tiết tốt nhưng dễ xuất hiện cạnh giả nếu ảnh nhiễu.
- **$T_{\text{low}}, T_{\text{high}}$**: Tăng ngưỡng giữ lại các khung cấu trúc chính; giảm ngưỡng bắt được nhiều chi tiết mảnh nhưng dễ dính nhiễu nền. Tỷ lệ khuyến nghị $T_{\text{high}} : T_{\text{low}} \approx 2:1$ hoặc $3:1$.
- **Ứng dụng phổ biến**: Xe tự hành (phát hiện vạch kẻ đường Lane Detection), OCR/Quét tài liệu, Kiểm tra lỗi công nghiệp PCB, Tiền xử lý phân đoạn ảnh y tế.

## II. Kết quả Thử nghiệm trên 3 Điều kiện Ảnh & Kết hợp Kỹ thuật
- **Ảnh nhiều nhiễu**: Cần tăng $\sigma \ge 1.8$ hoặc dùng **Bilateral Filter** trước Canny để tránh các cạnh nhiễu vụn.
- **Ảnh độ tương phản thấp**: Ngưỡng mặc định bỏ sót nhiều biên $\rightarrow$ Áp dụng cân bằng cục bộ **CLAHE** kết hợp **Auto-Canny** theo trung vị giúp khôi phục rõ biên vật thể.
- **Ảnh nhiều chi tiết**: Tăng $T_{\text{low}}/T_{\text{high}}$ để tránh rối biên texture.
- **Kết hợp phân đoạn & nhận dạng hình dạng**: Dùng `cv2.morphologyEx(MORPH_CLOSE)` nối liền khe hở biên Canny, sau đó `cv2.findContours` + `cv2.approxPolyDP` để tách vùng và phân loại Tam giác / Hình chữ nhật / Hình tròn.

## III. Giải đáp 4 Câu hỏi Mở rộng
1. **Đánh giá chất lượng cạnh Canny**: Sử dụng chỉ số **Pratt's Figure of Merit (PFOM)** đo độ lệch vị trí biên thực so với ground-truth, **F1-score / Precision-Recall** trên tập ảnh có nhãn biên (như BSDS500), và độ liên tục đường biên (Edge Continuity).
2. **Cải thiện hiệu suất Canny**:
   - **Auto-Canny**: Tự tính $T_{\text{low}} = 0.67\,\text{median}(I)$, $T_{\text{high}} = 1.33\,\text{median}(I)$ (hoặc dùng ngưỡng Otsu).
   - **Bilateral Filter** thay cho Gaussian Blur để làm mịn nhiễu mà vẫn giữ sắc biên trước bước Sobel.
   - **CLAHE** cân bằng tương phản cục bộ trước khi chạy Canny cho ảnh thiếu sáng.
3. **Canny cho ảnh màu**: Có thể tách 3 kênh `R, G, B` (hoặc `L*, a*, b*`), chạy Canny trên từng kênh rồi hợp nhất bằng phép toán `OR` (`cv2.bitwise_or`), hoặc dùng **Color Tensor / Di Zenzo Gradient** để bắt được cả những biên thay đổi màu sắc dù độ sáng xám bằng nhau.
4. **Áp dụng Canny cho Video**: Đọc từng frame qua `cv2.VideoCapture`, thu nhỏ hoặc giới hạn vùng ROI (như nửa dưới khung hình khi dò làn đường), làm mượt theo thời gian (temporal EMA) hoặc kết hợp **Background Subtraction (MOG2)** để chỉ phát hiện biên của vật thể đang chuyển động.
