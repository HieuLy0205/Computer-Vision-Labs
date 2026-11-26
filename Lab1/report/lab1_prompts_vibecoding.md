# Lab 1 — Prompts & Lệnh Vibe-Coding (`CVIP Chương 1`)

## 1. Prompt Sinh Script Python Lab 1 Chuẩn Công nghiệp
```text
Viết module Python `Lab1/src/lab1_basics.py` dùng OpenCV, Pillow, NumPy và Matplotlib thực hiện 5 bài thực hành Chương 1:
1. Đọc ảnh bằng cả cv2.imread và PIL.Image, lưu ra .png, .jpg (quality=90), .webp (quality=85) và in bảng so sánh dung lượng KB.
2. Chuyển đổi sang Grayscale (BT.601), HSV, CIE LAB và trực quan hóa từng kênh riêng biệt.
3. Tính & vẽ biểu đồ Histogram 256 mức cho cả ảnh xám và 3 kênh R/G/B bằng cv2.calcHist.
4. Cắt vùng ROI, resize theo tỷ lệ 0.5x (INTER_AREA) và 1.5x (INTER_LINEAR/INTER_NEAREST), cộng dịch chuyển Translation bằng warpAffine.
5. Vẽ rectangle, circle, line, putText và xuất ảnh kết quả vào `Lab1/results/`.
Kèm `argparse` nhận `--input` và `--output`. Không hardcode đường dẫn tuyệt đối.
```

## 2. Prompt Vibe-Coding Giao diện Web Presentation (React + FastAPI)
```text
Tạo component `Lab1Panel.tsx` và endpoint FastAPI `/api/lab1/run`:
- Cho phép chọn ảnh mẫu hoặc upload ảnh bất kỳ, chuyển đổi thời gian thực giữa RGB / Grayscale / HSV / CIE LAB.
- Tích hợp thanh trượt ROI Crop (x, y, w, h) và Resize Scale kèm chọn nội suy Bilinear vs Nearest.
- Khi di chuột trên ảnh kết quả, hiển thị tọa độ (x, y), giá trị RGB và Hex tại đúng pixel đó.
- Render biểu đồ Histogram kép (Ảnh gốc nét đứt vs Đã xử lý nét liền) bằng SVG mượt.
```

## 3. Lệnh Terminal Chạy & Kiểm tra Nhanh (CLI / Vibe-Coding Commands)
```bash
# Chạy script Lab 1 trên ảnh mẫu và xuất toàn bộ biểu đồ vào Lab1/results/
python3 Lab1/src/lab1_basics.py --input Lab1/data/input/sample.jpg --output Lab1/results

# Kiểm tra kích thước và định dạng file sau khi nén
ls -lh Lab1/results/

# Chạy FastAPI local để phục vụ endpoint /api/lab1/run
uvicorn backend.main:app --reload --port 8000
```

## 4. Prompt Sinh Báo cáo & Hỏi-Đáp Tự động từ Slide Bài giảng
```text
Dựa trên nội dung Chapter 1 (Introduction to CVIP: sampling, quantization, RGB/HSV/LAB, geometric transforms, histogram),
hãy giải thích rõ: vì sao OpenCV dùng BGR, vì sao cân nặng kênh Green trong BT.601 là 0.587, sự khác biệt giữa
INTER_AREA và INTER_NEAREST, và nhận xét ý nghĩa khi Histogram lệch trái / lệch phải / co cụm.
```
