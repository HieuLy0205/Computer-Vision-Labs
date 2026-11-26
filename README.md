# Computer Vision Labs (Labs 1–5)

Kho lưu trữ tổng hợp 5 bài thực hành Thị giác Máy tính (Computer Vision) kèm **Web Presentation tương tác** xây dựng bằng **React + FastAPI** (tích hợp Express bridge chạy trực tiếp trên trình duyệt).

## Cấu trúc thư mục

```
Computer-Vision-Labs/
├── README.md
├── requirements.txt
├── docs/
│   ├── progress.md
│   └── team_members.md
├── backend/
│   └── main.py                  # FastAPI REST API thực thi Lab 1–5
├── Lab1/                        # Chương 1: OpenCV, Pillow, Không gian màu, Crop/Resize, Vẽ hình
├── Lab2/                        # Chương 2: Toán tử điểm ảnh, Lọc tuyến tính, Sobel/Prewitt, Kernel tùy chỉnh & Lọc phi tuyến
├── Lab3/                        # Chương 2 (Phần 2): Thuật toán Phát hiện Cạnh Canny (OpenCV & scikit-image)
├── Lab4/                        # Chương 4: So sánh tương đồng ảnh bằng Wavelet Hash & ROC
├── Lab5/                        # Nhận diện khuôn mặt thời gian thực với MTCNN & FaceNet
└── src/                         # React Interactive Presentation & Live Visualizers
```

## Cài đặt & Chạy Local (Python FastAPI + React)

1. **Cài đặt Python dependencies**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Chạy từng script Lab độc lập** (xuất ảnh kết quả & biểu đồ vào `LabX/results/`):
   ```bash
   python Lab1/src/lab1_basics.py
   python Lab2/src/lab2_point_and_linear.py
   python Lab3/src/lab3_canny_edge_detector.py
   python Lab4/src/lab4_wavelet_similarity.py
   python Lab5/src/lab5_facenet_mtcnn.py --enrolled Lab5/data/input/enrolled.jpg
   ```

3. **Chạy FastAPI Backend (cổng 8000)**:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```

4. **Chạy Web Presentation (cổng 3000)**:
   ```bash
   npm install
   npm run dev
   ```
