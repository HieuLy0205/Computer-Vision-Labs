# Lab 4 — Hỏi-Đáp Chuyên sâu (Wavelet 2D, ROC/AUC & Feature Matching SIFT/ORB/RANSAC)

## 1. So sánh Wavelet 2D Hash với SIFT / SURF / ORB (Chương 3 Phần 1)
| Tiêu chí | Wavelet 2D Hash (Global) | SIFT / ORB + RANSAC (Local) |
|---|---|---|
| Kích thước đại diện | Cố định 64 bit (8 bytes) | Hàng trăm vector 128-D (float) hoặc 256-bit (binary) |
| Tốc độ đối sánh | Cực nhanh $O(1)$ bằng XOR + POPCNT | Chậm hơn (KD-Tree / FLANN + RANSAC) |
| Bất biến tỷ lệ / sáng / nén | Tốt | Rất tốt |
| Bất biến xoay góc lớn / che khuất | Kém (chỉ chịu xoay nhỏ $\le 10^\circ$) | Xuất sắc (xoay $360^\circ$, cắt xén, thay đổi phối cảnh 3D) |

## 2. Những Câu hỏi Trọng tâm Khi Báo cáo Lab 4
- **Vì sao dùng Median thay Mean khi lượng tử hóa Hash?** Tránh bị lệch toàn bộ 64 bit về 0 hoặc 1 khi ảnh có vùng sáng gắt cực trị.
- **Nếu ảnh có AUC = 0.50 nghĩa là gì?** Đường ROC trùng đường chéo ngẫu nhiên, hàm hash không có khả năng phân biệt ảnh giống với ảnh khác.
- **Tăng `level` phân rã quá cao (vd level=5 trên ảnh 64x64) bị gì?** Kích thước subband `cA` nhỏ hơn `2x2`, làm mất toàn bộ cấu trúc hình học không gian -> mọi ảnh có mã băm giống nhau -> tăng báo nhầm `FP`.
