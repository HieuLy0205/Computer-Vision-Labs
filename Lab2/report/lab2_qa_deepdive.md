# Lab 2 — Hỏi-Đáp Chuyên sâu (Điểm ảnh, Tích chập, Lọc Phi tuyến, Fourier & Morphology)

## 1. Tại sao không cân bằng Histogram riêng từng kênh R, G, B?
Vì mỗi kênh có phân bố tích lũy CDF khác nhau -> hàm ánh xạ khác nhau -> phá vỡ tỷ lệ `(R : G : B)` gốc và gây biến dạng màu nghiêm trọng (ảnh bị ám tím/vàng). Luôn chuyển sang **YCrCb** hoặc **CIE LAB** và chỉ chạy `equalizeHist` trên kênh độ sáng (`Y` hoặc `L*`).

## 2. Khi nào chọn Gamma Correction thay cho Brightness + Contrast tuyến tính?
- Khi ảnh bị tối cục bộ (ngược sáng, bóng râm) nhưng vẫn có vùng trời sáng: cộng hằng số `+beta` sẽ làm cháy trắng vùng trời, trong khi $\gamma = 0.5$ khuếch đại dải tối $[0..80]$ mạnh hơn nhiều so với dải sáng $[180..255]$, giúp lộ chi tiết tối mà giữ nguyên vùng sáng.

## 3. So sánh Sobel, Prewitt, Median và Bilateral
- **Sobel vs Prewitt**: Sobel có trọng số 2 ở tâm -> làm mượt nhẹ dọc biên, giảm nhiễu tốt hơn Prewitt.
- **Median vs Mean/Gaussian trên nhiễu Muối-Tiêu**: Mean/Gaussian kéo giá trị cực trị 0/255 vào trung bình -> tạo vết xám loang và mờ cạnh; Median bỏ hai cực trị ra khỏi giá trị giữa -> PSNR thường cao hơn 6–10 dB.
- **Bilateral Filter**: Trọng số không gian $\sigma_s$ kết hợp trọng số sai khác màu $\sigma_r$ -> giữ biên vật thể sắc nét trong khi làm mịn da/nền.

## 4. Liên hệ Miền tần số Fourier & Hình thái học (Chương 2 Phần 2)
- **FFT / DFT**: Tâm phổ chứa tần số thấp (độ sáng, mảng màu lớn), rìa chứa tần số cao (cạnh, nhiễu). Low-pass tương đương làm mờ Gaussian; High-pass tương đương tách biên.
- **Morphology**: `Opening = Erode -> Dilate` (xóa nhiễu đốm trắng nhỏ); `Closing = Dilate -> Erode` (lấp lỗ thủng đen và hàn đứt gãy biên).
