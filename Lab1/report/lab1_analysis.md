# Báo cáo Phân tích Lab 1: OpenCV, Pillow & Không gian màu

## 1. So sánh OpenCV (`cv2`) và Pillow (`PIL`)
- **OpenCV** đọc ảnh dưới dạng mảng NumPy `ndarray` theo thứ tự kênh **`BGR`** (Blue–Green–Red). Tối ưu cho xử lý ma trận tốc độ cao (viết bằng C++), lọc không gian, thị giác máy tính thời gian thực.
- **Pillow** sử dụng đối tượng `PIL.Image` theo chuẩn **`RGB`**, thuận tiện cho thao tác metadata, chuyển đổi định dạng (`PNG`, `JPEG`, `WEBP`), vẽ font chữ TrueType và tích hợp Web/FastAPI.
- Khi kết hợp cả hai: luôn chuyển `cv2.cvtColor(img, cv2.COLOR_BGR2RGB)` trước khi đưa vào `matplotlib` hoặc `PIL.Image.fromarray()`.

## 2. Phân tích Không gian màu (Color Space Conversions)
1. **Grayscale (Chuẩn ITU-R BT.601)**:
   $$Y = 0.299 R + 0.587 G + 0.114 B$$
   Trọng số kênh Lục (`0.587`) cao nhất vì tế bào nón mắt người nhạy cảm nhất với bước sóng xanh lá (~555 nm). Giảm dữ liệu từ 3 kênh xuống 1 kênh giúp tăng tốc các bước phát hiện biên và ngưỡng hóa.
2. **HSV (Hue, Saturation, Value)**:
   - `H` (0–179 trong OpenCV uint8): biểu diễn sắc độ màu, độc lập với cường độ sáng.
   - `S` (0–255): độ bão hòa màu.
   - `V` (0–255): độ sáng.
   - **Ứng dụng**: Phân đoạn đối tượng theo màu sắc (ví dụ lọc biển báo đỏ/xanh) bền vững hơn trước thay đổi ánh sáng so với RGB.
3. **CIE LAB (`L*`, `a*`, `b*`)**:
   - `L*`: độ sáng cảm nhận tuyến tính (perceptual lightness).
   - `a*`: trục Xanh lá $\leftrightarrow$ Đỏ; `b*`: trục Xanh dương $\leftrightarrow$ Vàng.
   - **Ứng dụng**: Đo khoảng cách màu $\Delta E$ sát với thị giác con người và cân bằng trắng.

## 3. Phân tích Cắt xén (Cropping), Thay đổi kích thước (Resizing) & Định dạng lưu
- **Crop** sử dụng slicing mảng NumPy `img[y1:y2, x1:x2]` có độ phức tạp $O(1)$ về mặt tham chiếu bộ nhớ.
- **Resize**:
  - Thu nhỏ ảnh nên dùng `cv2.INTER_AREA` để tránh hiện tượng răng cưa (aliasing).
  - Phóng to ảnh nên dùng `cv2.INTER_CUBIC` hoặc `cv2.INTER_LINEAR` để nội suy mượt.
- **So sánh định dạng lưu trữ**:
  - `PNG`: Nén không mất dữ liệu (lossless), giữ nguyên chi tiết biên và text vẽ thêm.
  - `JPEG` (quality 90): Nén có mất dữ liệu (lossy DCT), dung lượng nhỏ hơn đáng kể cho ảnh tự nhiên nhưng dễ xuất hiện nhiễu khối quanh chữ viết sắc nét.
  - `WEBP`: Tỷ lệ nén tốt hơn JPEG ở cùng chất lượng cảm nhận.
