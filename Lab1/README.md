# Lab 1: Cơ bản về Xử lý Ảnh với OpenCV & Pillow

## Mục tiêu (Theo Bài thực hành Chương 1)
1. Cài đặt và làm quen thư viện **OpenCV (`cv2`)** và **Pillow (`PIL`)**.
2. **Đọc, hiển thị và lưu ảnh** với các định dạng khác nhau (`.jpg`, `.png`, `.webp`).
3. **Chuyển đổi không gian màu**: `RGB` $\to$ `Grayscale`, `HSV`, `CIE LAB`.
4. **Cắt xén (Cropping) & Thay đổi kích thước (Resizing)** theo tỷ lệ hoặc kích thước cố định.
5. **Vẽ hình cơ bản & Chèn văn bản**: đường thẳng (`cv2.line`), hình tròn (`cv2.circle`), hình chữ nhật (`cv2.rectangle`), văn bản (`cv2.putText`).

## Cách chạy
```bash
python Lab1/src/lab1_basics.py --input Lab1/data/input/sample.jpg
```
Kết quả xử lý và biểu đồ Histogram RGB / HSV / LAB được lưu tại `Lab1/results/`.
