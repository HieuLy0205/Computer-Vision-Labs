# Lab 5: Nhận diện Khuôn mặt Thời gian thực với MTCNN & FaceNet trên Webcam

## Nội dung thực hành
- Truy cập và thu thập khung hình trực tiếp từ **Webcam** bằng thư viện **OpenCV (`cv2.VideoCapture(0)`)**.
- Tích hợp **MTCNN** (Multi-task Cascaded Convolutional Networks) để phát hiện bounding box và 5 điểm mốc khuôn mặt (2 mắt, mũi, 2 khóe miệng).
- Sử dụng **FaceNet (`InceptionResnetV1` pretrained trên VGGFace2)** để trích xuất vector đặc trưng 512 chiều chuẩn hóa $L_2$.
- **Điều kiện so sánh Cosine Similarity**:
  - Nếu `similarity > 0.7`: hiển thị **`"Matched"`**
  - Nếu `similarity < 0.7`: hiển thị **`"Unknown"`**

## Cách chạy
```bash
# Thêm ảnh mẫu người cần nhận diện vào Lab5/data/input/enrolled.jpg
python Lab5/src/lab5_facenet_mtcnn.py --enrolled Lab5/data/input/enrolled.jpg --threshold 0.7
```
