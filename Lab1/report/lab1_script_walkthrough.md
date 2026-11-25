# Lab 1 — Script Walkthrough (`lab1_basics.py`)

## 1. Cấu trúc Hàm & Luồng Thực thi
| Hàm / Khối | Nhiệm vụ chính | Đầu vào -> Đầu ra | Lưu ý kỹ thuật |
|---|---|---|---|
| `ensure_sample_image(path)` | Kiểm tra hoặc tự sinh ảnh mẫu PNG nếu thư mục `data/input/` trống | `Path -> Path` | Giúp script không bị lỗi `NoneType` khi chạy lần đầu trên máy mới. |
| `run_lab1(input_file, output_dir)` | Thực thi toàn bộ 5 bài tập Chương 1 và xuất 3 biểu đồ tổng hợp | `Path, Path -> dict` | Bắt buộc dùng `cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)` trước khi vẽ lên Matplotlib. |

## 2. Giải phẫu Từng Khối Lệnh Quan trọng
### a) Import ảnh & So sánh Định dạng Lưu (`.png`, `.jpg`, `.webp`)
- `img_bgr = cv2.imread(str(input_file), cv2.IMREAD_COLOR)`: Trả về `np.ndarray` shape `(H, W, 3)` kiểu `uint8`, thứ tự kênh **BGR**.
- `pil_img = Image.open(input_file).convert("RGB")`: Đối tượng Pillow chuẩn **RGB**; xuất `.webp` bằng `pil_img.save(..., quality=85)` để so sánh dung lượng nén với PNG lossless và JPEG lossy.

### b) Chuyển đổi Không gian màu
- **Grayscale BT.601**: `cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)` -> `(H, W)` dùng công thức $0.299R + 0.587G + 0.114B$.
- **HSV**: `cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)` -> H $\in [0, 179]$, S $\in [0, 255]$, V $\in [0, 255]$.
- **CIE LAB**: `cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)` -> $L^*$ tách rời độ sáng khỏi hai kênh sắc độ $a^*, b^*$.

### c) Crop, Resize & Hình học
- Cắt ROI bằng NumPy slicing: `crop = img_rgb[y1:y2, x1:x2]`.
- Thu nhỏ chất lượng cao: `cv2.resize(..., interpolation=cv2.INTER_AREA)` (chống aliasing tốt hơn `INTER_NEAREST`).
- Vẽ hình học: `cv2.rectangle`, `cv2.circle(..., -1)`, `cv2.line`, `cv2.putText` tạo khung chú thích trực tiếp trên bản sao `canvas = img_rgb.copy()`.
