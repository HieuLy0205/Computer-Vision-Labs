# Lab 1 — Hỏi-Đáp Chuyên sâu & Phân tích Lỗi Thường gặp

## 1. Tại sao cùng một ảnh nhưng đọc bằng `cv2.imread` và `Image.open` lại khác kênh màu?
- OpenCV dùng **BGR**; Pillow dùng **RGB**.
- Luôn chuẩn hóa về **RGB** ngay sau khi đọc bằng `cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)` trước khi hiển thị trên web hoặc Matplotlib.

## 2. Phân tích Hiện tượng Histogram khi Dịch chuyển Ảnh (Translation) & Đổi Sáng
- **Dịch chuyển (`tx, ty`)**: Toàn bộ cấu trúc ảnh dịch sang vị trí mới; nếu biên trống được điền `0` (`BORDER_CONSTANT`), Histogram tại mức xám `0` sẽ vọt lên đúng bằng số pixel vùng nền đen mới lộ ra. Nếu dùng `BORDER_REFLECT`, cột gai tại `0` không xuất hiện.
- **Ảnh tối vs Ảnh sáng**: Histogram co bên trái `[0..70]` cho thấy ảnh thiếu sáng; co giữa `[90..150]` cho thấy ảnh thiếu tương phản; phân bố đều `[0..255]` cho thấy dải động tối ưu.

## 3. Bẫy kỹ thuật hay gặp ở Chương 1
- **Nhầm trục `(H, W)` và `(W, H)`**: NumPy slice là `img[y1:y2, x1:x2]`, trong khi `cv2.resize(img, (width, height))` và `cv2.rectangle(img, (x1, y1), (x2, y2))` lại đặt `x` (width) trước `y` (height).
- **Tràn bộ nhớ hoặc vỡ ảnh khi resize**: Phóng to bằng `INTER_NEAREST` tạo khối vuông răng cưa; thu nhỏ bằng `INTER_NEAREST` gây hiện tượng Moiré/aliasing -> luôn dùng `INTER_AREA` khi thu nhỏ.
