# Báo cáo Phân tích Lab 4: So sánh Tương đồng Ảnh bằng Wavelet Hash

## 1. Nguyên lý Biến đổi Wavelet 2D (`pywt.wavedec2`)
Khác với biến đổi Fourier chỉ phân tích tần số toàn cục, **Biến đổi Wavelet Rời rạc 2D (DWT)** phân tích ảnh đồng thời theo **không gian** và **tần số** qua hai bộ lọc thông thấp ($L$) và thông cao ($H$):
- **LL (`cA`)**: Thành phần xấp xỉ tần số thấp — lưu giữ cấu trúc tổng thể của ảnh và bền vững trước nhiễu cao tần.
- **LH (`cH`)**: Chi tiết biên nằm ngang.
- **HL (`cV`)**: Chi tiết biên thẳng đứng.
- **HH (`cD`)**: Chi tiết biên chéo và nhiễu hạt.

Khi nâng cấp phân rã lên `level = 3`, vùng `LL3` nén thông tin cấu trúc cốt lõi vào kích thước nhỏ gọn, giúp mã băm ổn định trước nhiễu Gaussian, thay đổi độ sáng nhẹ hay xoay góc nhỏ.

## 2. Lượng tử hóa & Khoảng cách Hamming
Hệ số `cA` được chuẩn hóa về lưới $8 \times 8$ (64 giá trị) và lượng tử hóa nhị phân theo ngưỡng trung vị $m$:
$$h_i = \begin{cases} 1 & \text{nếu } c_i \ge m \\ 0 & \text{nếu } c_i < m \end{cases}$$
Khoảng cách Hamming $D_H(h_1, h_2) = \sum_{i=0}^{63} |h_{1,i} - h_{2,i}|$ đếm số bit khác biệt. Hai ảnh tương tự có $D_H$ nhỏ (thường $\le 10/64$ bit).

## 3. Chỉ số Đánh giá & Đường cong ROC
- **Accuracy** = $\frac{TP + TN}{TP + TN + FP + FN}$
- **Sensitivity (Độ nhạy / Recall)** = $\frac{TP}{TP + FN}$ — khả năng phát hiện đúng các cặp ảnh thực sự tương tự.
- **Specificity (Độ đặc biệt)** = $\frac{TN}{TN + FP}$ — khả năng loại trừ đúng các cặp ảnh khác biệt.
- **ROC & AUC**: Khảo sát toàn bộ dải ngưỡng từ $0 \to 64$ bit; AUC càng gần `1.0` chứng tỏ khả năng phân tách giữa cặp tương tự và cặp khác biệt càng sắc bén.
