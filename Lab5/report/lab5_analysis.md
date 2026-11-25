# Báo cáo Phân tích Lab 5: Nhận diện Khuôn mặt Thời gian thực với MTCNN & FaceNet

## 1. Kiến trúc 3 tầng của MTCNN (Multi-task Cascaded CNN)
MTCNN phát hiện khuôn mặt và 5 điểm mốc (landmarks) theo cấu trúc thô đến tinh (coarse-to-fine):
1. **P-Net (Proposal Network)**: Mạng CNN nông quét qua tháp ảnh đa tỷ lệ (image pyramid) để đề xuất nhanh hàng trăm vùng ứng viên bounding box.
2. **R-Net (Refine Network)**: Lọc bỏ các vùng âm tính giả (false positives) và tinh chỉnh tọa độ hộp giới hạn.
3. **O-Net (Output Network)**: Mô hình sâu hơn cho kết quả bounding box chính xác cuối cùng kèm **5 landmarks**: mắt trái, mắt phải, đầu mũi, khóe miệng trái, khóe miệng phải — dùng để căn chỉnh (align) khuôn mặt về kích thước chuẩn $160 \times 160$ trước khi đưa vào FaceNet.

## 2. Trích xuất Đặc trưng FaceNet & Triplet Loss
FaceNet (`InceptionResnetV1`) ánh xạ ảnh khuôn mặt $160 \times 160$ vào không gian Euclid 512 chiều chuẩn hóa đơn vị ($\|\mathbf{e}\|_2 = 1$). Mạng được huấn luyện với hàm mất mát **Triplet Loss**:
$$\mathcal{L} = \max\left(\|\mathbf{e}_a - \mathbf{e}_p\|_2^2 - \|\mathbf{e}_a - \mathbf{e}_n\|_2^2 + \alpha,\; 0\right)$$
Nhờ đó, hai ảnh của **cùng một người** (Anchor và Positive) có vector đặc trưng nằm gần nhau, còn ảnh **người khác** (Negative) bị đẩy ra xa ít nhất một khoảng biên $\alpha$.

## 3. Phân tích Điều kiện Ngưỡng `similarity > 0.7`
Độ tương đồng Cosine giữa hai vector chuẩn hóa $L_2$ được tính bằng tích vô hướng:
$$\text{similarity}(\mathbf{e}_{\text{ref}}, \mathbf{e}_{\text{probe}}) = \mathbf{e}_{\text{ref}} \cdot \mathbf{e}_{\text{probe}} \in [-1, 1]$$
- **`similarity > 0.7` $\rightarrow$ `"Matched"`**: Hai khuôn mặt thuộc cùng một danh tính với độ tin cậy cao (tỷ lệ nhận nhầm người lạ FAR thấp).
- **`similarity < 0.7` $\rightarrow$ `"Unknown"`**: Khuôn mặt chưa có trong cơ sở dữ liệu hoặc góc nghiêng/ánh sáng quá khắc nghiệt.
- **Tối ưu thời gian thực trên Webcam**: Có thể phát hiện MTCNN mỗi $N=2$ frame hoặc thu nhỏ khung hình 50% khi chạy P-Net để giữ tốc độ $20\text{--}30\text{ FPS}$ trên CPU.
