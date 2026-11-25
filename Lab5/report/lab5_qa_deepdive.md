# Lab 5 — Hỏi-Đáp Chuyên sâu (MTCNN, FaceNet, Deep Matching & Bất biến Tỷ lệ)

## 1. Tại sao bản đầu tiên dễ báo "Unknown" khi ảnh đứng xa, lệch góc hoặc đổi tỷ lệ?
- **Vấn đề 1 (Bóp méo tỷ lệ)**: Resize thẳng khung chữ nhật thành hình vuông làm co dãn khuôn mặt -> thay đổi tỷ lệ mắt/mũi/cằm khiến vector FaceNet lệch khỏi mẫu gốc.
- **Vấn đề 2 (Neo box cứng tại tâm ảnh)**: Khi khuôn mặt dịch sang góc hoặc đứng xa, hộp cắt lấy phải tường/nền hoặc lệch mắt -> vector bị nhiễu nền chi phối.
- **Giải pháp triệt để**: Dò đa tỷ lệ `11%..86%` + Haar + Bilateral Symmetry -> định vị tâm 2 mắt -> tái neo kích thước box theo `d_eye` -> xoay phẳng góc nghiêng -> chiếu đẳng hướng `1:1` về khung chuẩn.

## 2. Câu hỏi Lý thuyết Chương 3 Phần 2 (Deep Photo Matching)
- **Triplet Loss tối ưu điều gì?** Ép khoảng cách giữa `(Anchor, Positive)` nhỏ hơn `(Anchor, Negative)` ít nhất một biên $\alpha$: $\mathcal{L} = \max(0, \|f(A)-f(P)\|_2^2 - \|f(A)-f(N)\|_2^2 + \alpha)$.
- **Siamese Network khác CNN phân loại thường chỗ nào?** CNN phân loại đóng cố định số lớp (10 người); Siamese dùng chung trọng số trích xuất embedding trong không gian metric để so sánh bất kỳ người mới nào chưa từng thấy lúc train (One-shot / Open-set Recognition).
- **Vision Transformer (ViT) hoạt động ra sao?** Chia ảnh thành các patch `16x16`, mã hóa vị trí (Positional Embedding) rồi dùng Multi-Head Self-Attention nắm bắt quan hệ toàn cục.
