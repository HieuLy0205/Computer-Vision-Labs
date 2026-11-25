# Lab 5 — Script Walkthrough (`lab5_facenet_mtcnn.py` & Engine Web)

## 1. Giải phẫu Pipeline Nhận diện (`FaceRecognitionPipeline`)
1. **Khởi tạo MTCNN (`min_face_size=20, thresholds=[0.55, 0.65, 0.65]`)**: Hạ `min_face_size` từ 40 xuống 20 giúp phát hiện được khuôn mặt kích thước nhỏ khi người dùng đứng xa camera hoặc ở góc khung hình.
2. **Căn chỉnh Trục 2 Mắt & Giữ nguyên Tỷ lệ 1:1 (`_crop_square_preserve_aspect`)**:
   - Đọc 2 điểm landmark mắt trái/phải từ MTCNN, tính góc nghiêng $\theta = \operatorname{atan2}(y_R - y_L, x_R - x_L)$ và xoay phẳng khuôn mặt quanh tâm box.
   - Cắt hình vuông cạnh `side = max(w, h) + 2*margin`, **pad viền xám `(128,128,128)`** nếu vượt khung ảnh thay vì cắt méo hình chữ nhật rồi kéo dãn về `160x160`.
3. **Trích xuất FaceNet (`InceptionResnetV1(pretrained="vggface2")`) + L2 Normalize**: Sinh vector 512 chiều chuẩn hóa độ dài đơn vị.
4. **Quyết định Ngưỡng Cosine Similarity**: `similarity > 0.70` $\to$ `"Matched"`, ngược lại $\to$ `"Unknown"`.

## 2. Cơ chế Bám mặt Thông minh Xa-Gần-Lệch Góc trên Web Presentation (`cvEngine.ts`)
- **Multi-scale Integral Tracker (`localizeFaceSmart`)**: Quét từ `11%` (đứng xa) tới `86%` (cận cảnh) kết hợp 4 đặc trưng: Likelihood màu da mềm YCbCr, **Tương phản Haar dọc (Trán & Má sáng hơn dải Mắt)**, mật độ biên mắt/miệng và **Đối xứng hai bên (Bilateral Symmetry)**.
- **Canonical Box Re-Anchoring**: Sau khi định vị chính xác tâm 2 mắt `(leftEye, rightEye)`, tính khoảng cách hai mắt `d_eye` và tái neo khung mặt chuẩn `canonW = d_eye / 0.40`, `canonH = canonW * 1.16` theo đúng tỷ lệ hình học khuôn mặt -> đảm bảo patch `48x48` Eye-Aligned luôn đồng nhất tuyệt đối dù người đứng xa, đứng gần hay lệch góc!
