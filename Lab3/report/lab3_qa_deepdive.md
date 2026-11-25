# Lab 3 — Hỏi-Đáp Chuyên sâu & Giải đáp 4 Câu hỏi Mở rộng

## 1. Tại sao NMS là "linh hồn" giúp Canny sắc hơn Sobel?
Sobel giữ lại toàn bộ dải gradient cao dọc theo vùng chuyển tiếp nên cạnh dày 3–6 px. **Non-Maximum Suppression (NMS)** chỉ giữ điểm có độ lớn gradient lớn hơn 2 lân cận dọc theo phương vuông góc với cạnh (hướng gradient $\theta$), biến cạnh thành nét đơn rộng đúng **1 pixel**.

## 2. Giải đáp 4 Câu hỏi Mở rộng trong Đề bài Thực hành 3
- **Câu 1 (Đo lường chất lượng cạnh)**: Khi không có Ground Truth dùng Edge Density, số thành phần liên thông (Connected Components) và tỷ lệ điểm nhiễu cô lập (1–3 px). Khi có Ground Truth (BSDS500) dùng Precision, Recall, F1-Score hoặc Pratt's Figure of Merit (PFOM).
- **Câu 2 (Cải thiện tốc độ & độ chính xác)**: Dùng Bilateral Filter thay Gaussian trước Canny để bảo toàn góc nhọn; dùng CLAHE + Auto-Canny khi ánh sáng biến thiên; dùng GPU OpenCV CUDA cho video HD.
- **Câu 3 (Color Canny)**: Hai mảng màu khác sắc độ nhưng cùng độ sáng (luminance bằng nhau) sẽ mất cạnh khi chuyển sang Grayscale. Color Canny chạy Canny trên 3 kênh màu rồi hợp bằng `bitwise_or` (hoặc tính Jacobian Di Zenzo).
- **Câu 4 (Video Canny)**: Khi chạy từng frame từ `cv2.VideoCapture`, nhiễu cảm biến làm biên nhấp nháy giữa các khung hình -> cần áp dụng làm mịn thời gian (Temporal EMA $I_t = \alpha F_t + (1-\alpha) I_{t-1}$) trước bước Canny.
