# Lab 4 — Script Walkthrough (`lab4_wavelet_similarity.py`)

## 1. Quy trình Tính Wavelet Hash & Đánh giá ROC trong `lab4_wavelet_similarity.py`
| Hàm | Chức năng chi tiết | Đầu ra |
|---|---|---|
| `compute_wavelet_hash(img_bgr, wavelet='db4', level=3)` | Resize `64x64`, `pywt.wavedec2`, lấy `cA` resize `8x8`, lượng tử hóa theo `median` | Vector nhị phân 64 bit (`np.ndarray`) |
| `hamming_distance(h1, h2)` | Tính tổng số bit khác nhau `int(np.sum(h1 != h2))` | Số nguyên `0..64` |
| `build_synthetic_dataset(input_dir)` | Sinh cặp ảnh cùng nguồn (biến đổi sáng, nén JPEG, mờ nhẹ, crop/scale) và cặp khác nguồn | Danh sách `(hashA, hashB, label)` |
| `evaluate_wavelet_family(records, wavelet, level)` | Quét toàn bộ ngưỡng `T = 0..64`, tính `TP, FP, TN, FN`, `TPR`, `FPR`, `AUC` | Dict số liệu + đường cong ROC |
| `run_lab4(input_dir, output_dir)` | Vẽ 4 biểu đồ: Subbands LL/LH/HL/HH, ROC Curve đa họ wavelet, Ma trận nhầm lẫn, Tìm kiếm Top-K | 4 file PNG + log AUC |

## 2. Phân tích Tham số Nhạy cảm
- `level=3` trên ảnh `64x64` nén năng lượng về subband xấp xỉ khoảng `8x8` — kích thước khớp tự nhiên với hash `64-bit`.
- Ngưỡng tối ưu mặc định (`Hamming <= 12..16`) cân bằng tốt giữa phát hiện bản sao chỉnh sáng/nén JPEG và loại bỏ ảnh khác chủ đề.
