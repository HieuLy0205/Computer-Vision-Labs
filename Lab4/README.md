# Lab 4: So sánh Tương đồng Hình ảnh sử dụng Wavelet & Python (Chương 4)

## Nội dung thực hành (Theo 3 slide Bài thực hành 4)
1. **Chuẩn bị dữ liệu**: Các cặp ảnh tương tự (cùng đối tượng với góc xoay, độ sáng, mức nhiễu khác nhau) và cặp không tương tự.
2. **Trích xuất đặc trưng Wavelet 2D**: Dùng `pywt.wavedec2(img, wavelet='db4', level=3)` phân rã thành các subband tần số (`LL`, `LH`, `HL`, `HH`).
3. **Lượng tử hóa & Tạo mã băm (Wavelet Hash)**: Lượng tử hóa hệ số Wavelet thành chuỗi bit nhị phân gọn nhẹ.
4. **So sánh khoảng cách Hamming**: $D_H(h_1, h_2) = \sum_i |h_{1,i} - h_{2,i}|$.
5. **Đánh giá hiệu năng phân loại**:
   - **Độ chính xác (Accuracy)**, **Độ nhạy (Sensitivity / Recall)**, **Độ đặc biệt (Specificity)**
   - **Đường cong ROC (Receiver Operating Characteristic)** & chỉ số **AUC**.
6. **Bài tập nâng cao**: Khảo sát hiệu suất nhiều họ Wavelet (`haar`, `db4`, `bior1.3`, `coif1`) & xây dựng công cụ tìm kiếm ảnh tương đồng.

## Cách chạy
```bash
python Lab4/src/lab4_wavelet_similarity.py
```
