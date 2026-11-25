# Báo cáo Phân tích Lab 2: Chương 2 Đầy đủ (Điểm ảnh, Lọc Tuyến tính & Nâng cao)

## Phần I — Toán tử Điểm ảnh & Ảnh hưởng trên Histogram
1. **Độ sáng ($s = r + \beta$)**: Tịnh tiến toàn bộ phổ mức xám sang phải ($\beta > 0$) hoặc sang trái ($\beta < 0$). Luôn ép kiểu `float32` trước khi `np.clip(0, 255)` để tránh tràn số `uint8`.
2. **Tương phản ($s = \alpha \cdot r$)**: Kéo giãn hoặc nén độ rộng phân bố mức xám.
3. **Âm bản ($s = 255 - r$)**: Lật đối xứng gương Histogram qua trục $r = 127.5$.
4. **Cắt ngưỡng ($T$)**: Đưa ảnh về nhị phân 0 và 255 để tách tiền cảnh khỏi nền.

## Phần II — Lọc Tuyến tính (Spatial Convolution)
- **Mean Filter**: Làm mờ đồng đều nhưng làm nhòe cạnh mạnh.
- **Gaussian Filter**: Trọng số giảm theo khoảng cách chuẩn 2D, làm mượt tự nhiên hơn Mean Filter.
- **Sharpening**: Khuếch đại biên bằng nhân Laplacian ngược dấu cộng ảnh gốc $[0,-1,0; -1,5,-1; 0,-1,0]$.

## Phần III — Phát hiện Cạnh, Kernel Tùy chỉnh & Lọc Phi tuyến
1. **Sobel vs Prewitt**: Sobel dùng trọng số tâm $= 2$ nên vừa tính đạo hàm vừa làm mượt nhẹ theo trục vuông góc, kháng nhiễu tốt hơn Prewitt.
2. **Thiết kế Kernel tùy chỉnh**: Emboss (nổi 3D), Laplacian (viền đẳng hướng tổng hệ số $= 0$), Outline.
3. **So sánh Lọc Tuyến tính vs Phi tuyến (Median & Bilateral)**:
   - Trên nhiễu **Muối–Tiêu**, **Median Filter** đạt PSNR vượt trội nhất do thay điểm nhiễu cực trị bằng trung vị lân cận mà không làm lem màu.
   - Trên nhiễu **Gaussian nhẹ**, **Bilateral Filter** làm mịn vùng phẳng nhưng giữ biên sắc nét nhờ kết hợp khoảng cách không gian ($\sigma_s$) và chênh lệch cường độ ($\sigma_r$).
