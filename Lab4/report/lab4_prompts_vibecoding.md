# Lab 4 — Prompts & Lệnh Vibe-Coding (`Wavelet Hash, ROC & Image Matching`)

## 1. Prompt Sinh Script Đánh giá Wavelet Hash & ROC
```text
Viết `Lab4/src/lab4_wavelet_similarity.py` sử dụng PyWavelets (pywt), OpenCV và Matplotlib:
1. Phân rã 2D DWT (`pywt.wavedec2`) hiển thị trực quan 4 subband LL, LH, HL, HH.
2. Tạo mã băm Wavelet Hash 64-bit bằng cách lấy cA resize 8x8 và cắt ngưỡng theo Median.
3. Tính khoảng cách Hamming giữa các cặp ảnh biến đổi (sáng/tối, nén JPEG, blur, xoay) và ảnh khác nguồn.
4. Quét ngưỡng Hamming 0..64 để tính Accuracy, Sensitivity, Specificity, vẽ đường cong ROC & tính AUC bằng quy tắc hình thang.
5. So sánh 4 họ wavelet (`haar`, `db4`, `bior1.3`, `coif1`) và xây chức năng xếp hạng Image Search Top-K.
```

## 2. Prompt Vibe-Coding Giao diện Tương tác ROC & Subband (`Lab4Panel.tsx`)
```text
Tạo dashboard Lab 4 gồm 4 chế độ tương tác:
- Trực quan hóa 2D Wavelet (LL/LH/HL/HH) và lưới 64-bit Hash 8x8 của hai ảnh A/B, tô màu đỏ vị trí bit khác nhau (Hamming distance).
- Thanh trượt ngưỡng Hamming Threshold cập nhật trực tiếp TP, FP, TN, FN, Accuracy, Sensitivity, Specificity và chấm điểm hoạt động lên đường cong ROC SVG.
- Bảng benchmark AUC so sánh `haar`, `db4`, `bior1.3`, `coif1`.
- Giao diện tìm kiếm ảnh tương đồng (Query Image -> Top-K Ranked Results).
```

## 3. Lệnh Chạy & Kiểm thử
```bash
# Chạy đánh giá Wavelet Hash, benchmark 4 họ wavelet và xuất biểu đồ ROC
python3 Lab4/src/lab4_wavelet_similarity.py --input Lab4/data/input --output Lab4/results

# Kiểm thử FastAPI hash 64-bit và evaluate ROC
curl -X POST http://127.0.0.1:8000/api/lab4/evaluate -F "wavelet=db4" -F "level=3"
```
