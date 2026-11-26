"""
Generator tạo 10 tài liệu Word (.docx) chuẩn OOXML cho Lab 1 -> Lab 5 (mỗi Lab gồm 2 file:
1) Kien_Thuc_Trong_Tam.docx (Toàn bộ lý thuyết slide PDF + quy trình thực hành + phân tích kết quả)
2) Hoi_Dap_QA.docx (Tất tần tật câu hỏi & trả lời vấn đáp / thi / xử lý sự cố)
Sử dụng hoàn toàn thư viện chuẩn Python (zipfile, xml.sax.saxutils) để đảm bảo chạy ổn định mọi môi trường.
"""

from pathlib import Path
from xml.sax.saxutils import escape
import zipfile

ROOT = Path(__file__).resolve().parent.parent

CONTENT_TYPES_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>
"""

RELS_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"""

DOC_RELS_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
"""

STYLES_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:color w:val="1E293B"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="120" w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:pPr><w:spacing w:before="120" w:after="200"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="0F172A"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="Heading 1"/>
    <w:pPr><w:spacing w:before="280" w:after="120"/><w:keepNext/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="30"/><w:color w:val="1D4ED8"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="Heading 2"/>
    <w:pPr><w:spacing w:before="200" w:after="80"/><w:keepNext/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="25"/><w:color w:val="0F172A"/></w:rPr>
  </w:style>
</w:styles>
"""


def p_title(text: str) -> str:
    return (
        f'<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr>'
        f'<w:r><w:t xml:space="preserve">{escape(text)}</w:t></w:r></w:p>'
    )


def p_subtitle(text: str) -> str:
    return (
        '<w:p><w:pPr><w:spacing w:after="220"/></w:pPr>'
        f'<w:r><w:rPr><w:i/><w:sz w:val="21"/><w:color w:val="475569"/></w:rPr>'
        f'<w:t xml:space="preserve">{escape(text)}</w:t></w:r></w:p>'
    )


def p_h1(text: str) -> str:
    return (
        f'<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>'
        f'<w:r><w:t xml:space="preserve">{escape(text)}</w:t></w:r></w:p>'
    )


def p_h2(text: str) -> str:
    return (
        f'<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr>'
        f'<w:r><w:t xml:space="preserve">{escape(text)}</w:t></w:r></w:p>'
    )


def p_text(text: str, bold_prefix: str = "") -> str:
    runs = []
    if bold_prefix:
        runs.append(
            f'<w:r><w:rPr><w:b/><w:color w:val="0F172A"/></w:rPr>'
            f'<w:t xml:space="preserve">{escape(bold_prefix)}</w:t></w:r>'
        )
    runs.append(f'<w:r><w:t xml:space="preserve">{escape(text)}</w:t></w:r>')
    return f'<w:p>{"".join(runs)}</w:p>'


def p_bullet(text: str, bold_prefix: str = "") -> str:
    runs = [f'<w:r><w:rPr><w:b/><w:color w:val="2563EB"/></w:rPr><w:t xml:space="preserve">•  </w:t></w:r>']
    if bold_prefix:
        runs.append(
            f'<w:r><w:rPr><w:b/><w:color w:val="0F172A"/></w:rPr>'
            f'<w:t xml:space="preserve">{escape(bold_prefix)}</w:t></w:r>'
        )
    runs.append(f'<w:r><w:t xml:space="preserve">{escape(text)}</w:t></w:r>')
    return (
        '<w:p><w:pPr><w:ind w:left="360" w:hanging="180"/><w:spacing w:after="80"/></w:pPr>'
        f'{"".join(runs)}</w:p>'
    )


def p_code(lines: list[str]) -> str:
    paras = []
    for line in lines:
        paras.append(
            '<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>'
            '<w:ind w:left="240" w:right="240"/><w:spacing w:before="20" w:after="20"/></w:pPr>'
            '<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>'
            '<w:sz w:val="19"/><w:color w:val="0F172A"/></w:rPr>'
            f'<w:t xml:space="preserve">{escape(line)}</w:t></w:r></w:p>'
        )
    return "".join(paras)


def p_table(headers: list[str], rows: list[list[str]]) -> str:
    col_w = int(9000 / max(1, len(headers)))
    borders = (
        '<w:tblBorders>'
        '<w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
        '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
        '<w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
        '<w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
        '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>'
        '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>'
        '</w:tblBorders>'
    )
    grid = "".join(f'<w:gridCol w:w="{col_w}"/>' for _ in headers)
    tr_list = []

    # Header row
    cells = []
    for h in headers:
        cells.append(
            f'<w:tc><w:tcPr><w:tcW w:w="{col_w}" w:type="dxa"/>'
            '<w:shd w:val="clear" w:color="auto" w:fill="EFF6FF"/></w:tcPr>'
            f'<w:p><w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr>'
            f'<w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="1E3A8A"/></w:rPr>'
            f'<w:t xml:space="preserve">{escape(h)}</w:t></w:r></w:p></w:tc>'
        )
    tr_list.append(f'<w:tr>{"".join(cells)}</w:tr>')

    for row in rows:
        cells = []
        for val in row:
            cells.append(
                f'<w:tc><w:tcPr><w:tcW w:w="{col_w}" w:type="dxa"/></w:tcPr>'
                f'<w:p><w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr>'
                f'<w:r><w:rPr><w:sz w:val="20"/></w:rPr>'
                f'<w:t xml:space="preserve">{escape(val)}</w:t></w:r></w:p></w:tc>'
            )
        tr_list.append(f'<w:tr>{"".join(cells)}</w:tr>')

    return (
        f'<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/>{borders}</w:tblPr>'
        f'<w:tblGrid>{grid}</w:tblGrid>{"".join(tr_list)}</w:tbl><w:p/>'
    )


def p_qa(index: int, question: str, answer: str, extra_bullets: list[str] | None = None) -> str:
    parts = [
        p_h2(f"Câu {index}: {question}"),
        p_text(answer, bold_prefix="Trả lời: "),
    ]
    if extra_bullets:
        for b in extra_bullets:
            parts.append(p_bullet(b))
    return "".join(parts)


def write_docx(out_path: Path, body_blocks: list[str]) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    doc_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f'<w:body>{"".join(body_blocks)}'
        '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>'
        '</w:body></w:document>'
    )
    with zipfile.ZipFile(out_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", CONTENT_TYPES_XML)
        zf.writestr("_rels/.rels", RELS_XML)
        zf.writestr("word/_rels/document.xml.rels", DOC_RELS_XML)
        zf.writestr("word/styles.xml", STYLES_XML)
        zf.writestr("word/document.xml", doc_xml)


def build_lab1_docs() -> None:
    docs_dir = ROOT / "Lab1" / "docs"
    write_docx(
        docs_dir / "Lab1_Kien_Thuc_Trong_Tam.docx",
        [
            p_title("LAB 1: CƠ BẢN VỀ XỬ LÝ ẢNH VỚI OPENCV & PILLOW"),
            p_subtitle("Tổng hợp toàn diện lý thuyết Chương 1 (Introduction to CVIP) & quy trình thực hành OpenCV / Pillow"),
            p_h1("1. Biểu diễn Ảnh số (Sampling, Quantization & Tensor Shape)"),
            p_text("Ảnh số trong máy tính là một ma trận hai chiều (ảnh xám) hoặc ba chiều (ảnh màu) được tạo thành qua hai bước: Lấy mẫu không gian (Spatial Sampling - quyết định kích thước H x W) và Lượng tử hóa cường độ (Quantization - với ảnh 8-bit uint8 mỗi điểm ảnh nhận giá trị nguyên từ 0 đến 255)."),
            p_bullet("Ảnh xám (Grayscale): Shape (H, W), dtype uint8, 1 kênh cường độ sáng từ 0 (đen tuyệt đối) đến 255 (trắng tuyệt đối)."),
            p_bullet("Ảnh màu RGB / BGR: Shape (H, W, 3), mỗi pixel gồm bộ 3 giá trị (Red, Green, Blue). Tổng số bit = H * W * 3 * 8 bit."),
            p_bullet("Ảnh có kênh Alpha (RGBA / BGRA): Shape (H, W, 4), kênh thứ 4 biểu diễn độ trong suốt (0 = trong suốt, 255 = đục hoàn toàn)."),

            p_h1("2. Import, Hiển thị và Xuất Ảnh (OpenCV vs Pillow)"),
            p_text("OpenCV mặc định đọc ảnh theo thứ tự kênh BGR (lịch sử camera thời kỳ đầu), trong khi Pillow và Matplotlib sử dụng RGB. Nếu đưa thẳng ma trận OpenCV BGR vào plt.imshow(), kênh Đỏ và Xanh dương bị tráo khiến da người chuyển sang màu xanh dương."),
            p_code([
                "import cv2",
                "from PIL import Image",
                "img_bgr = cv2.imread('Lab1/data/input/sample.jpg', cv2.IMREAD_COLOR)",
                "img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)",
                "pil_img = Image.open('Lab1/data/input/sample.jpg').convert('RGB')",
                "cv2.imwrite('output.png', img_bgr)  # Nén không mất dữ liệu (Lossless)",
                "cv2.imwrite('output.jpg', img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 90])",
                "cv2.imwrite('output.webp', img_bgr, [cv2.IMWRITE_WEBP_QUALITY, 85])",
            ]),
            p_table(
                ["Định dạng", "Cơ chế nén", "Kênh Alpha", "Đặc điểm & Ứng dụng"],
                [
                    ["PNG (.png)", "Lossless (DEFLATE)", "Có (RGBA)", "Giữ nguyên 100% giá trị pixel; dung lượng lớn nhất; tốt cho phân tích biên và ảnh gốc."],
                    ["JPEG (.jpg)", "Lossy (DCT + Chroma Subsampling)", "Không", "Dung lượng nhỏ hơn 5-12 lần; xuất hiện nhiễu khối (blocking artifact) nếu quality < 60."],
                    ["WEBP (.webp)", "Lossy & Lossless hiện đại", "Có", "Nhỏ hơn JPEG ~25-35% ở cùng mức chất lượng thị giác; tối ưu cho Web Presentation."],
                ],
            ),

            p_h1("3. Chuyển đổi Không gian màu (RGB -> Grayscale, HSV, CIE LAB)"),
            p_text("Mỗi không gian màu phục vụ một bài toán Thị giác máy tính khác nhau:"),
            p_bullet("Grayscale (Chuẩn ITU-R BT.601): Gray = 0.299*R + 0.587*G + 0.114*B. Tại sao hệ số Green cao nhất (0.587)? Vì mắt người có mật độ tế bào nón nhạy vùng xanh lá cao nhất, còn Blue ít nhạy nhất (0.114)."),
            p_bullet("HSV (Hue - Saturation - Value): Tách rời thông tin sắc màu (H) khỏi cường độ sáng (V). Trong OpenCV, H thuộc [0, 179] (do 360/2 để vừa uint8), S và V thuộc [0, 255]. Rất hiệu quả khi lọc đối tượng theo màu sắc dù điều kiện sáng tối thay đổi."),
            p_bullet("CIE LAB (L*, a*, b*): Không gian đồng nhất về cảm nhận thị giác con người. L* biểu diễn độ sáng [0..100], a* trục Xanh lá - Đỏ, b* trục Xanh dương - Vàng. Hữu ích khi cân bằng sáng riêng trên kênh L* mà không làm lệch màu."),

            p_h1("4. Biểu diễn và Nhận xét Histogram"),
            p_text("Histogram H(r_k) = n_k đếm số lượng pixel có mức xám r_k (0..255). Bằng cách quan sát Histogram, ta chẩn đoán được chất lượng phơi sáng của ảnh ngay lập tức:"),
            p_code([
                "hist_gray = cv2.calcHist([img_gray], [0], None, [256], [0, 256])",
                "for idx, col in enumerate(['r', 'g', 'b']):",
                "    h = cv2.calcHist([img_rgb], [idx], None, [256], [0, 256])",
                "    plt.plot(h, color=col)",
            ]),
            p_bullet("Histogram dồn về trái (0..80): Ảnh thiếu sáng / quá tối (Underexposed)."),
            p_bullet("Histogram dồn về phải (180..255): Ảnh dư sáng / cháy sáng (Overexposed)."),
            p_bullet("Histogram co cụm hẹp ở vùng giữa: Ảnh tương phản thấp (Low contrast), hình ảnh mờ nhạt."),
            p_bullet("Histogram trải đều từ 0 đến 255: Ảnh có dải động rộng, độ tương phản tốt, giàu chi tiết."),
            p_bullet("Histogram có 2 đỉnh rõ rệt (Bimodal): Lý tưởng để tách nền và vật thể bằng phương pháp cắt ngưỡng Otsu."),

            p_h1("5. Cắt ảnh (Crop), Thay đổi kích thước (Resize) & Dịch chuyển (Translation / Interpolation)"),
            p_text("Cắt ảnh trong OpenCV thực chất là thao tác slice mảng NumPy img[y1:y2, x1:x2] (lưu ý thứ tự trục hàng y trước, cột x sau). Resize thay đổi kích thước theo các phép nội suy khác nhau:"),
            p_table(
                ["Phép biến đổi / Nội suy", "Công thức / Cờ OpenCV", "Đặc điểm & Nhận xét"],
                [
                    ["Nearest Neighbor", "cv2.INTER_NEAREST", "Nhanh nhất; chọn pixel gần nhất -> dễ tạo răng cưa (pixelation) khi phóng to."],
                    ["Bilinear Interpolation", "cv2.INTER_LINEAR", "Nội suy song tuyến tính 2x2 lân cận; mượt, cân bằng tốc độ/chất lượng (mặc định phóng to)."],
                    ["Bicubic Interpolation", "cv2.INTER_CUBIC", "Nội suy bậc ba 4x4 lân cận; sắc nét hơn Bilinear khi phóng to."],
                    ["Pixel Area Relation", "cv2.INTER_AREA", "Tối ưu nhất khi thu nhỏ ảnh vì lấy trung bình vùng, tránh hiện tượng răng cưa (aliasing)."],
                    ["Dịch chuyển (Translation)", "M = [[1,0,tx],[0,1,ty]] + warpAffine", "Dịch toàn bộ ảnh sang phải tx, xuống dưới ty; phần trống sinh ra được điền màu đen (0) hoặc phản chiếu (BORDER_REFLECT)."],
                ],
            ),

            p_h1("6. Vẽ hình học cơ bản & Chú thích văn bản (Drawing Primitives)"),
            p_code([
                "cv2.rectangle(canvas, (x1, y1), (x2, y2), color=(235, 99, 37), thickness=3)",
                "cv2.circle(canvas, (cx, cy), radius=60, color=(16, 185, 129), thickness=-1)  # -1 tô đặc",
                "cv2.line(canvas, (x1, y1), (x2, y2), color=(245, 158, 11), thickness=2)",
                "cv2.putText(canvas, 'OpenCV Lab 1', (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255,255,255), 2)",
            ]),
        ],
    )

    write_docx(
        docs_dir / "Lab1_Hoi_Dap_QA.docx",
        [
            p_title("LAB 1: TỔNG HỢP CÂU HỎI & TRẢ LỜI VẤN ĐÁP (Q&A)"),
            p_subtitle("Bao quát toàn bộ câu hỏi lý thuyết, thực hành code OpenCV/Pillow và nhận xét dữ liệu Chương 1"),
            p_qa(1, "Tại sao đọc ảnh bằng cv2.imread() rồi hiển thị bằng Matplotlib lại bị sai màu (mặt người màu xanh)?",
                 "Do OpenCV đọc ảnh vào mảng NumPy theo thứ tự kênh Blue-Green-Red (BGR), còn Matplotlib/Pillow giả định mảng đầu vào là Red-Green-Blue (RGB). Vì vậy kênh Red và Blue bị tráo cho nhau. Cách khắc phục chuẩn là dùng cv2.cvtColor(img, cv2.COLOR_BGR2RGB) hoặc đảo slice img[:, :, ::-1]."),
            p_qa(2, "Sự khác nhau giữa OpenCV (cv2) và Pillow (PIL) là gì? Khi nào dùng thư viện nào?",
                 "OpenCV biểu diễn ảnh dưới dạng NumPy ndarray (BGR), tối ưu tốc độ C++/SIMD cho xử lý ma trận, lọc không gian, video thời gian thực. Pillow biểu diễn ảnh dưới dạng đối tượng PIL.Image (RGB), thuận tiện cho thao tác tệp ảnh, cắt/xoay giữ nguyên tỷ lệ và là đầu vào chuẩn của PyTorch/Torchvision."),
            p_qa(3, "Công thức chuyển ảnh màu RGB sang ảnh xám (Grayscale) và ý nghĩa từng trọng số?",
                 "Theo chuẩn ITU-R BT.601: Y = 0.299*R + 0.587*G + 0.114*B. Không lấy trung bình cộng (R+G+B)/3 vì thị giác con người nhạy nhất với ánh sáng xanh lục (0.587) và kém nhạy nhất với xanh lam (0.114). Nếu lấy trung bình cộng, vùng xanh dương sẽ trông sáng bất thường so với cảm nhận mắt người."),
            p_qa(4, "Nếu ảnh đọc lên có giá trị None trong OpenCV thì nguyên nhân là gì và kiểm tra thế nào?",
                 "cv2.imread() không ném Exception khi sai đường dẫn mà âm thầm trả về None. Nguyên nhân thường gặp: sai đường dẫn tương đối, tên file có ký tự Unicode trên Windows (cần dùng np.fromfile + cv2.imdecode), hoặc file hỏng. Luôn kiểm tra if img is None: raise FileNotFoundError(...)."),
            p_qa(5, "Nhận xét như thế nào khi Histogram của ảnh dồn về bên trái, bên phải hoặc cụm giữa?",
                 "Dồn sát bên trái (0..60): ảnh thiếu sáng, chi tiết vùng tối bị bết. Dồn sát bên phải (200..255): ảnh cháy sáng, mất chi tiết vùng trắng. Co cụm hẹp ở giữa: độ tương phản thấp, ảnh phẳng. Trải rộng từ 0..255: độ tương phản tốt."),
            p_qa(6, "Khi dịch chuyển (Translation) ảnh bằng ma trận Affine M = [[1,0,tx],[0,1,ty]], có đặc điểm gì xảy ra ở biên ảnh và Histogram?",
                 "Ảnh dịch chuyển tịnh tiến theo vector (tx, ty) nhưng giữ nguyên kích thước khung hình đầu ra (w, h). Phần ảnh vượt ra ngoài khung bị cắt bỏ, còn vùng trống mới lộ ra ở phía đối diện mặc định được điền giá trị 0 (màu đen). Do đó trên Histogram sẽ xuất hiện một cột gai cao tại mức xám 0 tương ứng diện tích vùng đen mới sinh ra (trừ khi dùng borderMode=cv2.BORDER_REFLECT)."),
            p_qa(7, "Khi phóng to hay thu nhỏ ảnh bằng cv2.resize(), nên chọn phép nội suy (Interpolation) nào?",
                 "Khi thu nhỏ ảnh (downscale): luôn ưu tiên cv2.INTER_AREA vì tính trung bình vùng pixel, chống gợn sóng aliasing. Khi phóng to ảnh (upscale): dùng cv2.INTER_LINEAR (nhanh, mượt) hoặc cv2.INTER_CUBIC (sắc nét hơn). Không dùng INTER_NEAREST cho ảnh tự nhiên vì gây hiệu ứng răng cưa vỡ hạt."),
            p_qa(8, "Không gian màu HSV và CIE LAB khác RGB ở điểm nào? Khi nào nên chuyển sang HSV hoặc LAB?",
                 "Trong RGB, cả 3 kênh R, G, B đều bị ảnh hưởng đồng thời khi độ sáng môi trường thay đổi. HSV tách riêng Hue (màu sắc thuần) và Value (độ sáng), giúp nhận diện màu ổn định hơn dưới nắng/bóng râm. CIE LAB có kênh L* tách biệt độ sáng và hai kênh màu a*, b* đồng nhất theo cảm nhận mắt người, lý tưởng cho cân bằng sáng hoặc đo khoảng cách màu Delta-E."),
            p_qa(9, "Tại sao phải cẩn thận với thứ tự tọa độ (x, y) và (row, col) trong OpenCV + NumPy?",
                 "Trong mảng NumPy img.shape trả về (height, width, channels) tương ứng (row=y, col=x), nên cắt ảnh phải viết img[y1:y2, x1:x2]. Ngược lại các hàm đồ họa OpenCV như cv2.resize(img, (width, height)), cv2.rectangle(img, (x1, y1), (x2, y2)) lại nhận tọa độ (x, y) trước!"),
            p_qa(10, "So sánh định dạng PNG, JPEG và WEBP khi lưu cùng một ảnh đầu vào?",
                 "PNG dùng nén lossless nên PSNR = vô cực (giá trị từng pixel giữ nguyên 100%) nhưng file nặng nhất. JPEG nén lossy bỏ bớt tần số cao và giảm mẫu màu nên dung lượng rất nhẹ nhưng giảm độ nét ở vùng biên chữ/đường kẻ. WEBP đạt tỷ lệ nén tốt hơn JPEG 25-35% mà vẫn giữ cạnh sắc nét hơn."),
        ],
    )


def build_lab2_docs() -> None:
    docs_dir = ROOT / "Lab2" / "docs"
    write_docx(
        docs_dir / "Lab2_Kien_Thuc_Trong_Tam.docx",
        [
            p_title("LAB 2: TOÁN TỬ ĐIỂM ẢNH, LỌC TUYẾN TÍNH, PHÁT HIỆN CẠNH & PHI TUYẾN"),
            p_subtitle("Tổng hợp đầy đủ Chương 2 (Phần I, II, III + Slide Chương 2 Phần 1 & Phần 2: Gamma, Histogram Equalization, Fourier, Morphology)"),
            p_h1("1. Phần I: Toán tử Điểm ảnh (Point Operations)"),
            p_text("Toán tử điểm ảnh ánh xạ từng pixel đầu vào r thành giá trị đầu ra s = T(r) mà không phụ thuộc lân cận:"),
            p_table(
                ["Phép biến đổi", "Công thức toán học", "Ảnh hưởng lên Histogram & Nhận xét"],
                [
                    ["Độ sáng (Brightness)", "s = clip(r + beta, 0, 255)", "Dịch chuyển toàn bộ Histogram sang phải (beta > 0) hoặc sang trái (beta < 0). Coi chừng hiện tượng bão hòa cắt cụt ở 0 hoặc 255."],
                    ["Độ tương phản (Contrast)", "s = clip(alpha * r, 0, 255)", "alpha > 1 làm giãn rộng Histogram ra hai phía (tăng tương phản); alpha < 1 làm co hẹp Histogram vào giữa."],
                    ["Biến đổi Gamma (Power-law)", "s = 255 * (r / 255)^gamma", "gamma < 1 (vd 0.5) kéo giãn vùng tối, giúp nhìn rõ chi tiết trong bóng tối mà không làm cháy vùng sáng. gamma > 1 nén vùng tối, làm đậm ảnh."],
                    ["Cân bằng Histogram (CDF)", "s_k = round(255 * CDF(r_k))", "Trải phẳng phân bố mức xám dựa trên hàm phân phối tích lũy CDF. Với ảnh màu nên thực hiện trên kênh Y (YCrCb) hoặc L* (LAB) để không làm biến đổi màu sắc."],
                    ["Âm bản (Negative)", "s = 255 - r", "Lật ngược đối xứng Histogram qua tâm 127.5; vùng tối hóa sáng giúp làm nổi bật chi tiết trắng trên nền đen (ảnh X-quang)."],
                    ["Cắt ngưỡng (Threshold)", "s = 255 nếu r >= T else 0", "Biến ảnh thành ảnh nhị phân 2 đỉnh 0 và 255 trên Histogram."],
                ],
            ),
            p_h1("2. Lỗi Tràn số (Uint8 Overflow) & Phép toán Video / Số học"),
            p_text("Lưu ý cực kỳ quan trọng khi xử lý ảnh bằng NumPy: phép cộng mảng uint8 như img + 50 sẽ xoay vòng modulo 256 (ví dụ 230 + 50 = 24, làm điểm sáng biến thành đen!). Luôn ép kiểu float32 rồi np.clip(..., 0, 255) hoặc dùng hàm bão hòa cv2.add(img, 50)."),
            p_bullet("Trộn ảnh (Alpha Blending): cv2.addWeighted(img1, alpha, img2, beta, gamma) dùng tạo hiệu ứng mờ dần hoặc lồng ảnh."),
            p_bullet("Trừ ảnh / Phát hiện chuyển động: cv2.absdiff(frame_t, frame_ref) kết hợp Background Subtraction (MOG2) để tách vật thể chuyển động trong video."),

            p_h1("3. Phần II: Lọc Tuyến tính (Spatial Convolution) & Padding"),
            p_text("Lọc tuyến tính trượt một ma trận trọng số (Kernel K kích thước (2k+1)x(2k+1)) qua từng pixel để tính tổng tích chập có trọng số:"),
            p_bullet("Lọc Trung bình (Mean Filter 3x3, 5x5): Mọi trọng số bằng 1/N^2. Giảm nhiễu nhưng làm nhòe cạnh mạnh vì đối xử bình đẳng mọi pixel trong cửa sổ."),
            p_bullet("Lọc Gaussian: Trọng số phân bố hình chuông G(x,y) = exp(-(x^2+y^2)/(2*sigma^2)). Điểm gần tâm có trọng số cao hơn nên làm mượt tự nhiên hơn Mean và giữ biên tốt hơn."),
            p_bullet("Làm sắc nét (Sharpen): Kernel [0,-1,0; -1,5,-1; 0,-1,0] tương đương I + (I - Mean_4), cộng thêm đạo hàm bậc hai đảo dấu để nhấn mạnh ranh giới sáng-tối."),
            p_bullet("Xử lý biên (Padding): Cần mở rộng biên trước khi trượt kernel bằng Zero-padding (BORDER_CONSTANT), Replicate hoặc Reflect (BORDER_REFLECT_101 - tự nhiên nhất)."),

            p_h1("4. Phần III: Sobel/Prewitt, Custom Kernel, MSE/PSNR & Lọc Phi tuyến"),
            p_bullet("Phát hiện cạnh Sobel vs Prewitt: Cả hai tính đạo hàm bậc 1 theo X và Y rồi tổng hợp G = sqrt(Gx^2 + Gy^2). Sobel gán trọng số 2 cho hàng/cột trung tâm nên kháng nhiễu tốt hơn Prewitt."),
            p_bullet("Kernel Tùy chỉnh: Emboss ([-2,-1,0; -1,1,1; 0,1,2]) tạo nổi 3D theo hướng chéo; Laplacian ([0,1,0; 1,-4,1; 0,1,0]) là đạo hàm bậc hai đẳng hướng bắt cạnh mọi chiều."),
            p_bullet("Đo lường MSE & PSNR: MSE = mean((I - K)^2); PSNR = 10 * log10(255^2 / MSE) dB. PSNR càng cao nghĩa là ảnh phục hồi càng gần ảnh gốc sạch."),
            p_bullet("Median Filter (Lọc Trung vị): Thay pixel tâm bằng giá trị trung vị sau khi sắp xếp cửa sổ. Loại bỏ gần như tuyệt đối nhiễu Muối-Tiêu (Salt & Pepper) vì giá trị ngoại lai 0 và 255 bị đẩy ra hai đầu dãy."),
            p_bullet("Bilateral Filter (Lọc Song phương): Kết hợp 2 trọng số Gaussian: khoảng cách không gian (sigma_s) và chênh lệch màu sắc (sigma_r). Làm mịn vùng phẳng cực mượt nhưng không làm mờ cạnh sắc!"),

            p_h1("5. Mở rộng từ Slide Chương 2 Phần 2: Biến đổi Fourier & Hình thái học (Morphology)"),
            p_bullet("Biến đổi Fourier (DFT / FFT): Chuyển ảnh từ miền không gian f(x,y) sang miền tần số F(u,v). Tâm phổ tần số chứa thành phần tần số thấp (vùng trơn, độ sáng trung bình), vùng rìa chứa tần số cao (cạnh, chi tiết mảnh, nhiễu). Bộ lọc Low-pass làm mịn ảnh, High-pass tách cạnh."),
            p_bullet("Hình thái học (Morphological Ops): Co (Erosion - thu nhỏ vùng trắng, xóa nhiễu đốm nhỏ), Giãn (Dilation - mở rộng vùng trắng, nối đứt gãy), Mở (Opening = Erode -> Dilate: xóa nhiễu ngoài), Đóng (Closing = Dilate -> Erode: lấp lỗ đen bên trong vật thể)."),
        ],
    )

    write_docx(
        docs_dir / "Lab2_Hoi_Dap_QA.docx",
        [
            p_title("LAB 2: TỔNG HỢP CÂU HỎI & TRẢ LỜI VẤN ĐÁP (Q&A)"),
            p_subtitle("Toàn bộ câu hỏi xoay quanh Toán tử điểm ảnh, Histogram, Tích chập, Lọc phi tuyến, Fourier & Hình thái học"),
            p_qa(1, "Sự khác nhau giữa tăng độ sáng (Brightness + beta) và tăng Gamma (< 1) trên Histogram là gì?",
                 "Cộng thêm hằng số beta dịch chuyển tịnh tiến toàn bộ Histogram sang phải với bước nhảy đều nhau, dễ làm cắt cụt (clipping) các điểm đã sáng sẵn thành 255. Biến đổi Gamma (s = 255*(r/255)^gamma với gamma < 1) là ánh xạ phi tuyến: nó kéo giãn mạnh các khoảng mức xám tối để làm lộ chi tiết bóng râm trong khi nén nhẹ vùng sáng, giữ nguyên biên 0 và 255 mà không gây cháy sáng."),
            p_qa(2, "Cân bằng Histogram (Histogram Equalization) hoạt động như thế nào và nhược điểm khi áp dụng trực tiếp lên từng kênh R, G, B?",
                 "Thuật toán sử dụng hàm phân phối tích lũy chuẩn hóa (CDF) để ánh xạ lại mức xám sao cho xác suất xuất hiện các mức xám dàn đều hơn trên [0, 255]. Nếu chạy equalizeHist riêng lẻ cho từng kênh R, G, B sẽ làm phá vỡ tỷ lệ màu gốc, gây sai lệch sắc thái nghiêm trọng. Cách chuẩn là chuyển ảnh sang YCrCb hoặc CIE LAB và chỉ cân bằng kênh sáng Y hoặc L*."),
            p_qa(3, "Tại sao không dùng phép cộng thông thường img + 50 trong NumPy mà phải dùng np.clip hoặc cv2.add?",
                 "Vì kiểu dữ liệu ảnh uint8 chỉ chứa [0..255]. Trong NumPy, phép cộng dùng số học modulo 256 (wrap-around): 240 + 50 = 34 (trắng biến thành đen loang lổ). Hàm cv2.add hoặc np.clip thực hiện phép cộng bão hòa (saturation): giá trị > 255 bị ghim về 255."),
            p_qa(4, "So sánh Lọc Trung bình (Mean), Lọc Gaussian và Lọc Trung vị (Median) khi khử nhiễu Muối-Tiêu (Salt & Pepper)?",
                 "Nhiễu Muối-Tiêu gồm các điểm cực trị 0 hoặc 255 rải rác. Mean và Gaussian tính trung bình cộng nên bị kéo lệch bởi giá trị 0/255, biến điểm nhiễu thành các đốm xám loang lổ và làm mờ cạnh (PSNR thấp). Median lấy giá trị ở giữa dãy đã sắp xếp nên 0 và 255 luôn bị loại ở hai đầu, cho PSNR cao nhất và giữ cạnh sắc nét."),
            p_qa(5, "Tại sao Bilateral Filter vừa làm mịn vùng da/nền vừa giữ được đường biên vật thể?",
                 "Do trọng số của Bilateral phụ thuộc tích của 2 nhân Gaussian: G_space (khoảng cách hình học) và G_range (độ chênh lệch cường độ màu |I(p)-I(q)|). Khi đi qua một cạnh sắc nét, sự chênh lệch màu rất lớn khiến G_range tiến về 0, ngăn không cho pixel bên này biên trộn sang bên kia biên."),
            p_qa(6, "So sánh Kernel phát hiện cạnh Sobel và Prewitt?",
                 "Prewitt dùng trọng số đồng nhất [-1, 0, 1] ở cả 3 hàng/cột. Sobel tăng trọng số hàng/cột tâm thành [-1, 0, 1; -2, 0, 2; -1, 0, 1], tương đương kết hợp làm mịn Gaussian nhẹ theo phương vuông góc với phương đạo hàm, giúp Sobel ít nhạy nhiễu hơn Prewitt."),
            p_qa(7, "Kích thước Kernel càng lớn (3x3 -> 5x5 -> 9x9) thì ảnh đầu ra thay đổi thế nào?",
                 "Vùng lân cận càng rộng thì mức độ làm mịn / khử nhiễu tăng lên, nhưng chi tiết mảnh và độ sắc nét biên bị mất đi nhiều hơn (over-smoothing), đồng thời chi phí tính toán tăng theo O(K^2)."),
            p_qa(8, "Ý nghĩa của chỉ số MSE và PSNR trong đánh giá bộ lọc là gì?",
                 "MSE (Mean Squared Error) đo trung bình bình phương sai lệch pixel giữa ảnh phục hồi và ảnh gốc sạch (càng nhỏ càng tốt). PSNR (Peak Signal-to-Noise Ratio) quy đổi sang thang logarit đơn vị dB: PSNR càng lớn (> 30 dB thường là tốt) chứng tỏ bộ lọc khôi phục ảnh càng trung thực."),
            p_qa(9, "Tích chập (Convolution) và Tương quan chéo (Correlation) khác nhau thế nào?",
                 "Correlation trượt trực tiếp kernel trên ảnh và nhân từng phần tử tương ứng. Convolution lật ngược kernel 180 độ (lật cả hàng lẫn cột) trước khi trượt. Với kernel đối xứng (Mean, Gaussian, Laplacian), hai phép toán cho kết quả giống hệt nhau; với kernel bất đối xứng (Sobel), cv2.filter2D thực chất thực hiện Correlation."),
            p_qa(10, "Trong xử lý Hình thái học (Morphology), Opening và Closing khác nhau ở đâu?",
                 "Opening = Erosion rồi Dilation: phá vỡ các cầu nối mảnh và xóa các hạt nhiễu trắng nhỏ tách rời trên nền đen. Closing = Dilation rồi Erosion: lấp đầy các lỗ đen nhỏ bên trong vùng đối tượng trắng và nối liền các khe nứt hẹp."),
            p_qa(11, "Làm sao nhận biết Low-pass và High-pass filter trong miền tần số Fourier?",
                 "Low-pass (thông thấp) giữ vùng tâm của phổ tần số đã dịch chuyển (fftshift) và triệt tiêu tần số cao ở rìa -> làm mờ ảnh, giảm nhiễu. High-pass (thông cao) che vùng tâm bằng 0 và giữ lại phần rìa -> chỉ giữ lại cạnh và chi tiết biến đổi nhanh."),
        ],
    )


def build_lab3_docs() -> None:
    docs_dir = ROOT / "Lab3" / "docs"
    write_docx(
        docs_dir / "Lab3_Kien_Thuc_Trong_Tam.docx",
        [
            p_title("LAB 3: THUẬT TOÁN PHÁT HIỆN CẠNH CANNY (CANNY EDGE DETECTOR)"),
            p_subtitle("Tổng hợp đầy đủ Chương 2 (Phần 2): 5 bước Canny, OpenCV vs Scikit-image, Khảo sát tham số, CLAHE/Auto-Canny & Phân đoạn vùng"),
            p_h1("1. Tại sao Canny được xem là bộ phát hiện cạnh tối ưu?"),
            p_text("John F. Canny (1986) thiết kế thuật toán dựa trên 3 tiêu chuẩn tối ưu toán học:"),
            p_bullet("Phát hiện tốt (Good Detection): Xác suất bỏ sót cạnh thật thấp và xác suất báo nhầm điểm nhiễu thành cạnh thấp."),
            p_bullet("Định vị tốt (Good Localization): Vị trí điểm cạnh phát hiện được phải trùng khít nhất với tâm cạnh thực tế."),
            p_bullet("Phản hồi đơn (Single Response): Mỗi cạnh thật chỉ được đánh dấu bằng một đường biên mảnh rộng đúng 1 pixel (không tạo đường viền kép dày cộm như Sobel)."),

            p_h1("2. Phân tích chi tiết 5 Bước của Thuật toán Canny"),
            p_table(
                ["Bước", "Tên giai đoạn", "Cơ chế & Vai trò"],
                [
                    ["Bước 1", "Gaussian Smoothing", "Tích chập ảnh với bộ lọc Gaussian G_sigma để loại bỏ nhiễu tần số cao trước khi tính đạo hàm."],
                    ["Bước 2", "Gradient & Direction", "Tính Gx, Gy bằng Sobel; độ lớn G = sqrt(Gx^2 + Gy^2); hướng theta = atan2(Gy, Gx) lượng tử hóa về 4 hướng chính: 0°, 45°, 90°, 135°."],
                    ["Bước 3", "Non-Maximum Suppression (NMS)", "So sánh pixel (x,y) với 2 pixel lân cận dọc theo hướng gradient theta. Nếu không phải cực đại địa phương -> gán về 0. Tạo đường cạnh mảnh 1px."],
                    ["Bước 4", "Double Thresholding", "Phân loại điểm sau NMS: >= T_high là Strong Edge (255); [T_low, T_high) là Weak Edge; < T_low bị loại bỏ (0)."],
                    ["Bước 5", "Edge Tracking by Hysteresis", "Duyệt 8-lân cận (BFS/DFS): giữ lại Weak Edge nếu nó nối thông với ít nhất một Strong Edge; các Weak Edge cô lập bị xóa bỏ."],
                ],
            ),

            p_h1("3. So sánh cv2.Canny vs skimage.feature.canny vs Sobel & Laplacian"),
            p_bullet("cv2.Canny(blurred, T_low, T_high): Yêu cầu ảnh uint8 [0..255], KHÔNG tự động làm mịn Gaussian nên bắt buộc gọi cv2.GaussianBlur trước; dùng Sobel mặc định apertureSize=3 và tính gradient L1 (mặc định) hoặc L2 (L2gradient=True)."),
            p_bullet("skimage.feature.canny(gray, sigma=1.4, low_threshold, high_threshold): Tích hợp sẵn lọc Gaussian theo tham số sigma ngay trong hàm; tự chuẩn hóa nội bộ sang float [0, 1] nếu cần."),
            p_bullet("So với Sobel & Laplacian: Sobel cho cạnh dày và phụ thuộc ngưỡng cắt đơn; Laplacian (đạo hàm bậc 2) rất nhạy với nhiễu và tạo cạnh kép tại biên bước nhảy; Canny giải quyết triệt để nhờ NMS và Hysteresis."),

            p_h1("4. Khảo sát Ảnh hưởng Tham số & 3 Điều kiện Ảnh Thực tế"),
            p_bullet("Tham số sigma (kích thước Gaussian): sigma nhỏ (0.6-1.0) giữ nhiều chi tiết nhỏ nhưng dễ sót nhiễu; sigma lớn (2.0-3.0) khử nhiễu mạnh nhưng làm trôi nhẹ vị trí cạnh và mất chi tiết nhỏ."),
            p_bullet("Ngưỡng (T_low, T_high): Tỷ lệ khuyến nghị T_high : T_low từ 2:1 đến 3:1 (ví dụ 50 và 150). Đặt quá thấp -> nhiễu background; đặt quá cao -> đứt gãy cạnh thật."),
            p_bullet("Ảnh nhiều nhiễu: Cần tăng sigma hoặc tiền xử lý bằng Median/Bilateral Filter trước khi chạy Canny."),
            p_bullet("Ảnh tương phản thấp: Dùng CLAHE (Contrast Limited Adaptive Histogram Equalization) kết hợp Auto-Canny theo trung vị mức xám M: T_low = max(0, (1 - 0.33)*M), T_high = min(255, (1 + 0.33)*M)."),
            p_bullet("Ảnh nhiều chi tiết phức tạp: Cần tăng ngưỡng T_low, T_high hoặc dùng sigma trung bình để giữ cấu trúc khung chính, tránh rối đường biên."),

            p_h1("5. Ứng dụng Phân đoạn Ảnh & 4 Câu hỏi Mở rộng"),
            p_bullet("Phân đoạn & Nhận diện hình học: Ảnh Canny -> Morphology Closing (lấp khe hở đường biên) -> cv2.findContours -> cv2.approxPolyDP để đếm số đỉnh phân loại Tam giác (3), Tứ giác (4), Đa giác / Hình tròn (> 6)."),
            p_bullet("Color Canny: Chạy Canny trên từng kênh màu R, G, B (hoặc L, a, b) rồi hợp lại bằng bitwise_or (hoặc dùng Gradient Tensor Di Zenzo), bắt được cả các ranh giới đổi màu nhưng cùng độ sáng (nơi ảnh xám bị mất cạnh)."),
            p_bullet("Video Canny: Chạy thời gian thực trên luồng frame từ VideoCapture, có thể dùng làm mịn theo thời gian (temporal EMA) để giảm nhấp nháy đường biên giữa các frame."),
        ],
    )

    write_docx(
        docs_dir / "Lab3_Hoi_Dap_QA.docx",
        [
            p_title("LAB 3: TỔNG HỢP CÂU HỎI & TRẢ LỜI VẤN ĐÁP (Q&A)"),
            p_subtitle("Giải đáp chi tiết mọi khía cạnh thuật toán Canny Edge Detector & 4 Câu hỏi mở rộng"),
            p_qa(1, "Tại sao bước Non-Maximum Suppression (NMS) lại kiểm tra theo hướng gradient chứ không phải hướng dọc theo đường cạnh?",
                 "Vì vector gradient luôn vuông góc với phương tiếp tuyến của đường cạnh! Để làm mảnh một đường cạnh đang bị nhòe dày, ta phải tìm đỉnh nhọn nhất dọc theo mặt cắt ngang vuông góc với cạnh — tức là chính theo hướng của vector gradient theta (được quy về 0°, 45°, 90°, 135°)."),
            p_qa(2, "Double Thresholding & Hysteresis giải quyết vấn đề gì mà một ngưỡng đơn (Single Threshold) không làm được?",
                 "Nếu dùng 1 ngưỡng cao T, các đoạn cạnh thật hơi mờ sẽ bị cắt đứt thành nhiều mảnh rời. Nếu hạ thấp T, nhiễu nền sẽ bùng nổ thành hàng loạt đốm trắng. Hysteresis dùng 2 ngưỡng: Strong (> T_high) làm mỏ neo chắc chắn, còn Weak (giữa T_low và T_high) chỉ được giữ nếu nối liền với Strong, vừa nối liền mạch đường cạnh vừa loại sạch nhiễu cô lập."),
            p_qa(3, "Điểm khác biệt quan trọng nhất khi gọi cv2.Canny() và skimage.feature.canny()?",
                 "cv2.Canny không tự làm mượt Gaussian nên người dùng phải gọi cv2.GaussianBlur trước, và mặc định tính độ lớn gradient theo chuẩn L1 |Gx|+|Gy| (muốn dùng sqrt(Gx^2+Gy^2) phải bật L2gradient=True). Trong khi đó skimage.feature.canny nhận tham số sigma và tự làm mượt Gaussian + tính L2 ngay bên trong."),
            p_qa(4, "Nếu ảnh bị mờ tối, tương phản thấp khiến Canny không bắt được cạnh, ta xử lý thế nào?",
                 "Kết hợp CLAHE (cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))) để tăng tương phản cục bộ trước, sau đó dùng công thức Auto-Canny dựa trên trung vị mức xám M: T_low = int(max(0, 0.67 * M)), T_high = int(min(255, 1.33 * M))."),
            p_qa(5, "Tại sao cần tỷ lệ T_high : T_low trong khoảng 2:1 hoặc 3:1?",
                 "Tỷ lệ này tạo ra vùng đệm đủ rộng cho thuật toán Hysteresis phát huy tác dụng. Nếu T_low quá sát T_high, thuật toán suy biến về ngưỡng đơn (dễ đứt nét). Nếu T_low quá thấp (ví dụ 1:10), quá nhiều điểm nhiễu yếu dính gần cạnh thật sẽ mọc nhánh giả."),
            p_qa(6, "Làm thế nào để đánh giá định lượng chất lượng ảnh cạnh đầu ra của Canny (Câu mở rộng 1)?",
                 "Khi không có Ground Truth: đo Edge Density (tỷ lệ pixel cạnh), Connectivity Ratio (tỷ lệ thành phần liên thông dài vs đốm nhiễu 1-3px), và Noise Sensitivity. Khi có Ground Truth: dùng Precision, Recall, F1-score (ODS/OIS) hoặc Pratt's Figure of Merit (PFOM) có xét khoảng cách dịch lệch pixel."),
            p_qa(7, "Làm sao cải thiện tốc độ và độ chính xác của Canny cho bài toán thực tế (Câu mở rộng 2)?",
                 "Về tốc độ: giảm kích thước ảnh hoặc chuyển xử lý sang GPU (cv2.cuda.createCannyEdgeDetector) hoặc tính gradient Sobel chuẩn L1. Về độ chính xác: thay Gaussian Blur bằng Bilateral Filter (giữ cạnh không bị mờ trước khi lấy đạo hàm), dùng CLAHE cho ảnh thiếu sáng, hoặc chạy Multi-scale Canny."),
            p_qa(8, "Khi nào Grayscale Canny thất bại và Color Canny giải quyết ra sao (Câu mở rộng 3)?",
                 "Khi hai vật thể cạnh nhau có màu sắc khác nhau (ví dụ Đỏ tinh khiết cạnh Xanh lục đậm) nhưng độ sáng Y khi quy đổi sang ảnh xám lại bằng nhau -> Grayscale Canny hoàn toàn mù! Color Canny chạy trên 3 kênh màu riêng biệt (RGB hoặc LAB) rồi lấy hợp bitwise_or (hoặc tính cấu trúc tensor màu), giúp phát hiện chính xác ranh giới sắc độ."),
            p_qa(9, "Tại sao sau khi chạy Canny thường phải dùng Morphology Closing trước khi findContours để đếm vật thể?",
                 "Đường biên Canny đôi khi vẫn hở 1-2 pixel tại góc giao nhau hoặc vùng bóng đổ, khiến findContours không khép kín được đường bao vật thể. Phép Closing (dilate -> erode với kernel 3x3) hàn kín khe hở nhỏ mà hầu như không làm phình kích thước vật thể."),
        ],
    )


def build_lab4_docs() -> None:
    docs_dir = ROOT / "Lab4" / "docs"
    write_docx(
        docs_dir / "Lab4_Kien_Thuc_Trong_Tam.docx",
        [
            p_title("LAB 4: SO SÁNH ẢNH VỚI BIẾN ĐỔI WAVELET, HAMMING & ĐÁNH GIÁ ROC"),
            p_subtitle("Tổng hợp Chương 3 (Phần 1: Feature Detection & Image Matching) & Bài thực hành 4 (PyWavelets 2D, Hash 64-bit, ROC/AUC)"),
            p_h1("1. Biến đổi Wavelet Rời rạc 2D (DWT - pywt.wavedec2)"),
            p_text("Khác với biến đổi Fourier chỉ phân tích tần số toàn cục (mất thông tin vị trí không gian), biến đổi Wavelet 2D phân rã ảnh theo cả không gian lẫn đa tầng tần số qua cặp bộ lọc Thông thấp (Low-pass L) và Thông cao (High-pass H):"),
            p_bullet("Subband LL (Approximation): Chứa thông tin tổng quan cấu trúc năng lượng thấp của ảnh (như ảnh thu nhỏ)."),
            p_bullet("Subband LH (Horizontal Detail): Lọc thấp theo dòng, lọc cao theo cột -> bắt các cạnh nằm ngang."),
            p_bullet("Subband HL (Vertical Detail): Lọc cao theo dòng, lọc thấp theo cột -> bắt các cạnh thẳng đứng."),
            p_bullet("Subband HH (Diagonal Detail): Lọc cao cả hai chiều -> bắt các chi tiết chéo và nhiễu hạt tần số cao."),

            p_h1("2. Thuật toán Tạo Mã băm Wavelet Hash (64-bit) & Khoảng cách Hamming"),
            p_code([
                "gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)",
                "resized = cv2.resize(gray, (64, 64), interpolation=cv2.INTER_AREA).astype(np.float32)",
                "coeffs = pywt.wavedec2(resized, wavelet='db4', level=3)",
                "cA = cv2.resize(coeffs[0], (8, 8), interpolation=cv2.INTER_AREA).flatten()",
                "med = np.median(cA)",
                "hash_bits = (cA >= med).astype(np.uint8)  # 64 bit nhị phân",
            ]),
            p_text("Khoảng cách Hamming giữa hai mã băm 64-bit A và B là số lượng vị trí bit khác nhau (0..64), tương ứng phép toán XOR rồi đếm bit 1: dist = sum(A != B). Độ tương đồng chuẩn hóa = 1 - dist / 64."),

            p_h1("3. Đánh giá Hiệu năng: Confusion Matrix, Accuracy, Sensitivity, Specificity & ROC/AUC"),
            p_table(
                ["Chỉ số", "Công thức", "Ý nghĩa bài toán tìm ảnh giống nhau"],
                [
                    ["Accuracy", "(TP + TN) / (TP + TN + FP + FN)", "Tỷ lệ phân loại đúng tổng thể trên toàn bộ các cặp ảnh."],
                    ["Sensitivity (TPR / Recall)", "TP / (TP + FN)", "Khả năng nhận ra đúng các cặp ảnh thực sự cùng nguồn (không bỏ sót bản sao)."],
                    ["Specificity (TNR)", "TN / (TN + FP)", "Khả năng từ chối đúng các cặp ảnh khác nhau (không báo nhầm ảnh lạ là giống)."],
                    ["False Positive Rate (FPR)", "1 - Specificity = FP / (FP + TN)", "Tỷ lệ báo nhầm ảnh khác là giống nhau."],
                    ["Đường cong ROC & AUC", "Đồ thị TPR theo FPR khi quét ngưỡng T từ 0..64", "AUC càng gần 1.0 bộ đặc trưng phân tách càng xuất sắc; AUC = 0.5 tương đương đoán ngẫu nhiên."],
                ],
            ),

            p_h1("4. So sánh Các Họ Wavelet (haar, db4, bior1.3, coif1)"),
            p_bullet("haar (Daubechies-1): Hàm bậc thang vuông, tính toán nhanh nhất, phù hợp ảnh có cạnh vuông góc sắc nét."),
            p_bullet("db4 (Daubechies-4): Hàm cơ sở trơn hơn, tập trung năng lượng tốt hơn trên ảnh tự nhiên -> thường đạt AUC cao hơn Haar."),
            p_bullet("bior1.3 (Biorthogonal): Tuyến tính pha (symmetric), không làm méo biên đối xứng khi tái tạo ảnh."),
            p_bullet("coif1 (Coiflet): Có cả moment triệt tiêu cho hàm tỷ lệ và hàm wavelet, cho xấp xỉ LL mịn."),

            p_h1("5. Lý thuyết Chương 3 Phần 1: Feature Detection & Image Matching (SIFT, SURF, ORB, RANSAC)"),
            p_bullet("Local vs Global Matching: Wavelet Hash là mô tả toàn cục (Global descriptor) cực nhanh O(1) bằng XOR để tìm ảnh trùng lặp/nén/chỉnh sáng nhẹ. Còn SIFT, SURF, ORB là đặc trưng cục bộ (Local keypoints + descriptors) bất biến khi xoay góc lớn, che khuất một phần hoặc thay đổi góc nhìn 3D."),
            p_bullet("SIFT (Scale-Invariant Feature Transform): Dùng Difference of Gaussians (DoG) tìm cực trị đa tỷ lệ và tạo vector 128-D bất biến tỷ lệ & góc xoay."),
            p_bullet("ORB (Oriented FAST and Rotated BRIEF): Kết hợp rFAST + rBRIEF nhị phân -> nhanh gấp ~100 lần SIFT, miễn phí bản quyền."),
            p_bullet("RANSAC (Random Sample Consensus): Lọc bỏ các cặp điểm khớp sai (outliers) khi ước lượng ma trận Homography giữa hai ảnh."),
        ],
    )

    write_docx(
        docs_dir / "Lab4_Hoi_Dap_QA.docx",
        [
            p_title("LAB 4: TỔNG HỢP CÂU HỎI & TRẢ LỜI VẤN ĐÁP (Q&A)"),
            p_subtitle("Giải đáp chi tiết Biến đổi Wavelet 2D, Hash 64-bit, Hamming, Đường cong ROC/AUC và Đối sánh SIFT/ORB/RANSAC"),
            p_qa(1, "Tại sao tạo Wavelet Hash lại dùng subband xấp xỉ LL (cA) chứ không dùng LH, HL hay HH?",
                 "Subband LL chứa thành phần tần số thấp mang nội dung cấu trúc cốt lõi và phân bố sáng tổng thể của bức ảnh, ít bị ảnh hưởng bởi nhiễu hạt, nén JPEG hay thay đổi độ sắc nét. Ngược lại LH, HL, HH chứa nhiễu và cạnh mảnh tần số cao dễ thay đổi khi ảnh bị resize hoặc nén lại."),
            p_qa(2, "Tại sao dùng giá trị trung vị (Median) để lượng tử hóa thành 0/1 thay vì giá trị trung bình (Mean)?",
                 "Trung vị chia tập 64 hệ số thành đúng hai nửa 32 bit 0 và 32 bit 1, giúp mã băm cân bằng entropy (tránh trường hợp toàn bit 1 hoặc toàn bit 0 khi ảnh có một đốm sáng cực gắt kéo lệch giá trị Mean)."),
            p_qa(3, "Wavelet Hash bất biến với những biến đổi nào và yếu trước những biến đổi nào?",
                 "Mạnh (bất biến tốt): Thay đổi kích thước (resize), nén JPEG, thay đổi nhẹ độ sáng/tương phản, làm mờ nhẹ, nhiễu Gaussian nhẹ. Yếu: Xoay ảnh góc lớn (> 15°), lật gương (flip), cắt xén mất hơn 40% bố cục ảnh — vì cấu trúc ma trận không gian 8x8 đã bị xoay lệch tọa độ."),
            p_qa(4, "Giải thích sự đánh đổi giữa Sensitivity và Specificity khi thay đổi ngưỡng Hamming Threshold?",
                 "Nếu tăng ngưỡng Hamming (ví dụ cho phép sai tối đa 24/64 bit vẫn nhận là giống): Sensitivity tăng (ít bỏ sót ảnh tương đồng) nhưng Specificity giảm (nhiều ảnh khác cũng bị lọt vào -> tăng Báo động giả FP). Nếu giảm ngưỡng (ví dụ chỉ cho sai 4 bit): Specificity rất cao nhưng Sensitivity giảm mạnh."),
            p_qa(5, "Đường cong ROC và giá trị AUC nói lên điều gì?",
                 "ROC vẽSensitivity (TPR) theo trục tung và 1-Specificity (FPR) theo trục hoành khi quét mọi giá trị ngưỡng T từ 0 đến 64. Đường cong càng bám sát góc trên bên trái thì bộ phân loại càng tốt. AUC (diện tích dưới đường cong) nằm trong [0.5, 1.0]: 0.90-1.00 là xuất sắc; 0.50 tương đương tung đồng xu."),
            p_qa(6, "So sánh độ phức tạp tính toán của Wavelet Hash (Hamming) với SIFT/ORB Matching?",
                 "Wavelet Hash biểu diễn cả bức ảnh chỉ bằng 1 số nguyên 64-bit (8 bytes), so sánh 2 ảnh chỉ tốn 1 lệnh CPU POPCNT(hashA ^ hashB), tìm kiếm triệu ảnh tính bằng mili-giây. SIFT trích xuất hàng trăm vector 128-D float mỗi ảnh, khớp bằng FLANN + RANSAC chậm hơn hàng nghìn lần nhưng chịu được xoay 360°, cắt góc và góc nhìn 3D."),
            p_qa(7, "Khi biến đổi Wavelet 3 cấp (level=3) trên ảnh 64x64, kích thước subband LL cấp 3 là bao nhiêu?",
                 "Mỗi cấp phân rã làm giảm chiều dài và chiều rộng đi một nửa (downsampling 2x): Level 1 -> 32x32, Level 2 -> 16x16, Level 3 -> 8x8 (với wavelet có bộ lọc dài như db4 kích thước có thể lớn hơn 8 một chút do padding biên, nên hàm vẫn resize về (8,8) trước khi băm 64 bit)."),
            p_qa(8, "Trong đối sánh đặc trưng cục bộ (Chương 3 Phần 1), Lowe's Ratio Test và RANSAC dùng để làm gì?",
                 "Lowe's Ratio Test so sánh khoảng cách khớp tốt nhất d1 và tốt nhì d2 (giữ lại nếu d1 < 0.75 * d2) để loại các điểm lặp lại mơ hồ (như cửa sổ giống nhau). Sau đó RANSAC tìm mô hình hình học (Homography) nhất quán cho đa số điểm và loại bỏ các cặp khớp ngoại lai (outliers)."),
        ],
    )


def build_lab5_docs() -> None:
    docs_dir = ROOT / "Lab5" / "docs"
    write_docx(
        docs_dir / "Lab5_Kien_Thuc_Trong_Tam.docx",
        [
            p_title("LAB 5: NHẬN DIỆN KHUÔN MẶT THỜI GIAN THỰC VỚI MTCNN & FACENET"),
            p_subtitle("Tổng hợp Chương 3 (Phần 2: Deep Photo Matching) & Bài thực hành Webcam MTCNN + FaceNet (InceptionResnetV1)"),
            p_h1("1. Kiến trúc Chuỗi Xử lý Thời gian thực (4 Giai đoạn)"),
            p_bullet("Giai đoạn 1 - Thu nhận khung hình (OpenCV VideoCapture): Đọc frame liên tục từ Webcam (hoặc ảnh kiểm thử Probe), chuyển từ BGR sang RGB."),
            p_bullet("Giai đoạn 2 - Phát hiện & Định vị Khuôn mặt (MTCNN): Mạng đa nhiệm 3 tầng (P-Net -> R-Net -> O-Net) vừa dự đoán Bounding Box vừa xác định chính xác 5 điểm mốc khuôn mặt (5 Landmarks: Mắt trái, Mắt phải, Đầu mũi, Khóe miệng trái, Khóe miệng phải)."),
            p_bullet("Giai đoạn 3 - Căn chỉnh Chuẩn hóa Giữ nguyên Tỷ lệ (Aspect-Ratio-Preserving Eye Alignment): Bước cốt lõi giúp ổn định khi đứng xa/gần hoặc nghiêng đầu."),
            p_bullet("Giai đoạn 4 - Trích xuất Embedding (FaceNet InceptionResnetV1) & So khớp Cosine Similarity: Tạo vector đặc trưng chuẩn hóa L2 (||v|| = 1), tính cos(theta) = dot(v_ref, v_probe). Nếu similarity > 0.70 -> 'Matched', ngược lại -> 'Unknown'."),

            p_h1("2. Tại sao phải Giữ nguyên Tỷ lệ (1:1 Aspect Ratio) và Bám theo khoảng cách 2 Mắt (d_eye)?"),
            p_text("Ba lỗi kinh điển khi code nhận diện khuôn mặt thực tế và cách Lab 5 đã giải quyết triệt để:"),
            p_bullet("Lỗi 1 - Bóp méo tỷ lệ ảnh (Anisotropic Resize): Nếu ảnh đầu vào chữ nhật (ví dụ 640x480 hay 16:9) mà ép resize thẳng thành hình vuông 160x160 hoặc 240x240, khuôn mặt bị nén dẹt -> sai lệch hoàn toàn tỷ lệ khoảng cách mắt-mũi-miệng, kéo tụt vector FaceNet."),
            p_bullet("Khắc phục 1: Cắt vùng hình vuông lấy cạnh max(w, h) + margin và pad viền (128,128,128) trước khi resize về 160x160; trên Canvas trình duyệt dùng tỷ lệ scale đồng nhất cho cả chiều rộng và chiều cao."),
            p_bullet("Lỗi 2 - Sai vị trí khi đứng xa / đứng gần / dịch chuyển góc khung hình: Nếu bộ dò chỉ tìm với kích thước tối thiểu quá lớn (min_face_size=40) hoặc neo box cố định ở giữa ảnh, khi người dùng lùi ra xa hoặc đứng lệch góc, box trượt ra ngoài mặt."),
            p_bullet("Khắc phục 2: Giảm min_face_size=20 trong MTCNN (và tìm đa tỷ lệ từ 11%..86% khung hình bằng Integral SAT + Haar Contrast + Bilateral Symmetry trong bản web), sau khi tìm được tâm 2 mắt leftEye, rightEye thì tái neo khung mặt theo chính khoảng cách d_eye (canonW = d_eye / 0.40) và xoay phẳng góc nghiêng atan2(dy, dx)!"),

            p_h1("3. Lý thuyết Chương 3 Phần 2: Deep Photo Matching (CNN, Siamese, Triplet Loss, ViT, SSL)"),
            p_table(
                ["Kiến trúc / Phương pháp", "Cơ chế cốt lõi", "Vai trò trong Đối sánh Ảnh sâu"],
                [
                    ["CNN Feature Extraction", "Tầng tích chập trích xuất từ cạnh (nông) đến bộ phận vật thể (sâu).", "Thay thế SIFT/HOG thủ công bằng biểu diễn học sâu bền vững ánh sáng & góc nhìn."],
                    ["Siamese Networks", "Hai nhánh mạng chia sẻ trọng số (shared weights) đưa 2 ảnh về cùng không gian vector.", "Học trực tiếp độ tương đồng cặp ảnh (Contrastive Loss)."],
                    ["FaceNet & Triplet Loss", "Tối ưu bộ ba (Anchor, Positive, Negative): kéo Positive lại gần Anchor, đẩy Negative ra xa ít nhất lề alpha.", "L = max(0, ||f(A)-f(P)||^2 - ||f(A)-f(N)||^2 + alpha). Chuẩn vàng nhận diện khuôn mặt."],
                    ["Vision Transformer (ViT)", "Chia ảnh thành các Patch 16x16, đưa qua cơ chế Self-Attention.", "Nắm bắt quan hệ toàn cục giữa các vùng xa nhau trên ảnh mà CNN thuần bị giới hạn receptive field."],
                    ["Self-Supervised Learning (SimCLR)", "Tạo cặp biến thể augmentation từ cùng 1 ảnh không cần nhãn.", "Học biểu diễn tổng quát khi thiếu dữ liệu gán nhãn thủ công."],
                ],
            ),
        ],
    )

    write_docx(
        docs_dir / "Lab5_Hoi_Dap_QA.docx",
        [
            p_title("LAB 5: TỔNG HỢP CÂU HỎI & TRẢ LỜI VẤN ĐÁP (Q&A)"),
            p_subtitle("Mọi câu hỏi chuyên sâu về MTCNN, 5 Landmarks, FaceNet, Triplet Loss, Lệch tỷ lệ & Bất biến Xa-Gần"),
            p_qa(1, "Tại sao cùng một người nhưng đứng xa hoặc lệch sang góc ảnh lại dễ báo 'Unknown' nếu không xử lý đúng?",
                 "Có 3 nguyên nhân: (1) Bộ dò khuôn mặt bỏ sót hoặc cắt lệch box làm chứa nhiều nền tường xung quanh khuôn mặt; (2) Nếu cắt box có nền khác nhau đưa thẳng vào bộ trích xuất đặc trưng mà không xoay phẳng và chuẩn hóa tỷ lệ theo khoảng cách hai mắt (d_eye), đặc trưng tóc/nền lấn át đặc trưng khuôn mặt; (3) Khi đứng xa độ phân giải mặt nhỏ, cần ngưỡng min_face_size nhỏ hơn (20px) và phép biến đổi affine phóng đại đồng nhất về kích thước chuẩn 160x160."),
            p_qa(2, "Giải thích vai trò của 3 mạng con P-Net, R-Net và O-Net trong MTCNN?",
                 "MTCNN là kiến trúc Cascade: (1) P-Net (Proposal) quét nhanh qua kim tự tháp ảnh để đề xuất hàng nghìn vùng ứng viên và lọc bằng NMS; (2) R-Net (Refine) loại bỏ phần lớn các vùng sai và tinh chỉnh lại tọa độ box; (3) O-Net (Output) quyết định chính xác Bounding Box cuối cùng, xác suất khuôn mặt và tọa độ 5 điểm Landmarks."),
            p_qa(3, "5 điểm Landmarks của MTCNN dùng để làm gì thay vì chỉ vẽ trang trí?",
                 "Hai điểm mắt (Left Eye, Right Eye) giúp tính góc nghiêng đầu roll = atan2(y_R - y_L, x_R - x_L) và khoảng cách d_eye. Từ đó thực hiện phép biến đổi Similarity/Affine xoay đầu về phương ngang chuẩn và canh chỉnh mắt vào đúng vị trí cố định trước khi đưa vào FaceNet, giúp tăng độ chính xác nhận diện vượt trội."),
            p_qa(4, "Nếu bóp méo tỷ lệ ảnh (ví dụ ảnh 16:9 ép thẳng thành 160x160) thì ảnh hưởng thế nào tới vector FaceNet?",
                 "FaceNet học tỷ lệ hình học giữa chiều rộng gò má, khoảng cách hai mắt, chiều dài mũi-cằm. Khi bị ép dẹt theo chiều ngang hoặc kéo dài theo chiều dọc, khuôn mặt bị biến dạng hình học thành người khác, làm giảm Cosine Similarity ngay cả khi so sánh cùng một người."),
            p_qa(5, "Tại sao vector đặc trưng FaceNet lại được chuẩn hóa L2 (L2-normalization)?",
                 "Sau khi chia cho chuẩn L2 (v / ||v||_2), mọi vector khuôn mặt nằm trên bề mặt siêu cầu đơn vị bán kính 1 (unit hypersphere). Khi đó tích vô hướng dot(a, b) chính bằng Cosine Similarity cos(theta) trong [-1, 1], đồng thời khoảng cách Euclidean ||a-b||^2 = 2*(1 - cos(theta)), giúp phép so khớp ổn định và nhanh."),
            p_qa(6, "Ý nghĩa của ngưỡng similarity > 0.7 -> Matched, < 0.7 -> Unknown?",
                 "Ngưỡng 0.70 (tương ứng góc giữa hai vector nhỏ hơn ~45.5°) là điểm cân bằng thực nghiệm giữa Tỷ lệ chấp nhận sai FAR (người lạ bị nhận nhầm thành Matched) và Tỷ lệ từ chối sai FRR (chủ nhân bị báo Unknown). Trong hệ thống bảo mật cao (ngân hàng) có thể nâng ngưỡng lên 0.78–0.85."),
            p_qa(7, "Triplet Loss trong huấn luyện FaceNet hoạt động như thế nào?",
                 "Mỗi bước huấn luyện lấy bộ ba ảnh: Anchor (mẫu gốc), Positive (cùng người với Anchor), Negative (người khác). Hàm mất mát L = max(0, ||f(A)-f(P)||^2 - ||f(A)-f(N)||^2 + alpha) ép khoảng cách cùng danh tính nhỏ hơn khoảng cách khác danh tính ít nhất một biên an toàn alpha."),
            p_qa(8, "Khi chạy Webcam thời gian thực cần lưu ý tối ưu gì để đạt FPS cao?",
                 "Chỉ cần tính vector embedding của ảnh mẫu (Enrolled ID) một lần duy nhất lúc khởi động và lưu vào bộ nhớ; không trích xuất lại mỗi frame. Có thể giảm kích thước frame dò MTCNN (hoặc giữ tỷ lệ max cạnh 480px), dùng GPU (CUDA) nếu có, và mượt hóa điểm similarity qua cửa sổ trượt nếu cần."),
        ],
    )


def build_troubleshooting_docs() -> None:
    # Lab 1: Giải thích tham số & vướng mắc
    write_docx(
        ROOT / "Lab1" / "docs" / "Lab1_Giai_Thich_Tham_So_Vuong_Mac.docx",
        [
            p_title("LAB 1: GIẢI THÍCH TẠI SAO CHỌN THAM SỐ & VƯỚNG MẮC THỰC TẾ"),
            p_subtitle("Giải đáp toàn bộ câu hỏi 'Tại sao lại chọn các con số này?' và hướng dẫn đọc Histogram Trước / Sau"),
            p_h1("1. Tại sao chọn các con số & hệ số đặc trưng trong Lab 1?"),
            p_table(
                ["Con số / Hệ số", "Giá trị được chọn", "Lý do toán học & Sinh lý học thị giác"],
                [
                    ["Trọng số Grayscale BT.601", "0.299 R + 0.587 G + 0.114 B", "Tổng = 1.000 (giữ nguyên dải [0..255]). Tế bào nón (M-cone) mắt người nhạy ánh sáng xanh lục nhất (~59%) và ít nhạy xanh lam nhất (~11%). Nếu chia đều 1/3 sẽ làm màu xanh dương trông sáng giả tạo."],
                    ["Dải Hue (H) trong OpenCV HSV", "0 .. 179 (thay vì 0 .. 360)", "Biến uint8 chỉ lưu được [0..255]. 360° không vừa 1 byte nên OpenCV chia đôi H/2 -> [0..179] để tiết kiệm RAM 50% mà vẫn đại diện trọn vòng tròn màu 360°."],
                    ["Chất lượng nén JPEG / WEBP", "JPEG = 90, WEBP = 85", "Ngưỡng 85-90 nằm ngay 'điểm khuỷu' (elbow): giảm dung lượng 6-10 lần so với PNG nhưng PSNR vẫn > 38 dB, mắt thường chưa thấy nhiễu khối DCT 8×8."],
                    ["Độ sâu màu uint8", "256 mức [0..255]", "2^8 = 256 mức đủ mượt để mắt người (chỉ phân biệt được ~60-100 sắc độ xám liên tiếp) không thấy hiện tượng phân dải bậc thang (banding)."],
                ],
            ),
            p_h1("2. Vướng mắc kinh điển: Nhầm tọa độ & Sai màu BGR/RGB"),
            p_bullet("Tại sao img[y1:y2, x1:x2] lại viết Y trước X, còn cv2.resize(img, (w, h)) viết X trước Y?", bold_prefix="Quy ước Ma trận vs Đồ họa: "),
            p_text("NumPy tuân theo đại số tuyến tính (Hàng = trục dọc Y, Cột = trục ngang X) nên shape là (H, W, C). OpenCV lại kế thừa quy ước tọa độ điểm ảnh trên màn hình (hoành độ x = Width, tung độ y = Height) cho cv2.resize, cv2.rectangle, cv2.circle."),
            p_h1("3. Đọc hiểu & Nhận xét Biểu đồ Histogram Trước / Sau trong Lab 1"),
            p_table(
                ["Thao tác Lab 1", "Hình dạng Histogram Trước -> Sau", "Nhận xét cần trình bày khi vấn đáp"],
                [
                    ["Chuyển RGB -> Gray", "3 đường R, G, B riêng biệt -> 1 đường L duy nhất", "Đường Gray nằm khoảng giữa 3 đường R, G, B (nặng về phía kênh G nhất do trọng số 0.587). Tổng số pixel không đổi."],
                    ["Chuyển RGB -> HSV / LAB", "Phân bố cân đối -> Tập trung theo góc màu & độ sáng", "Kênh 1 (H hoặc L*) và kênh 2, 3 (a*, b* tụ quanh 128 với ảnh ít rực) thay đổi hoàn toàn cấu trúc đỉnh."],
                    ["Crop ROI & Resize nhỏ", "Giữ nguyên hình dáng -> Chiều cao cột giảm tỷ lệ", "Nếu cắt vào vùng trời sáng -> phần bên trái (vùng tối) trên Histogram biến mất. Thu nhỏ 50% -> số lượng pixel trên mỗi bin giảm ~4 lần."],
                    ["Dịch chuyển (Translation)", "Bình thường -> Xuất hiện gai nhọn cực đại tại Bin 0", "Phần viền đen mới chèn vào khiến hàng nghìn pixel nhận đúng giá trị 0, tạo cột gai đột biến sát mép trái."],
                ],
            ),
        ],
    )

    # Lab 2: Giải thích ma trận Kernel (bao gồm [0,-1,0; -1,5,-1; 0,-1,0]), Gamma & Histogram Trước/Sau
    write_docx(
        ROOT / "Lab2" / "docs" / "Lab2_Giai_Thich_Tham_So_Vuong_Mac.docx",
        [
            p_title("LAB 2: GIẢI THÍCH MA TRẬN KERNEL, THAM SỐ & BIỂU ĐỒ HISTOGRAM TRƯỚC / SAU"),
            p_subtitle("Giải đáp tường tận 'Tại sao Kernel Sharpen lại là [0,-1,0; -1,5,-1; 0,-1,0]?' và tất cả các con số Chương 2"),
            p_h1("1. Giải mã Ma trận Làm nét (Sharpen): Tại sao là 5 ở tâm và -1 ở 4 hướng?"),
            p_text("Xét ma trận 3×3 hiển thị trên giao diện Lab 2:"),
            p_code([
                "[  0   -1    0 ]",
                "[ -1    5   -1 ]   ->  Tổng trọng số = 0 + (-1) + 0 + (-1) + 5 + (-1) + 0 + (-1) + 0 = +1",
                "[  0   -1    0 ]",
            ]),
            p_bullet("Nguồn gốc toán học (Unsharp Masking + Laplacian):", bold_prefix="1) Chứng minh công thức: "),
            p_text("Ảnh sắc nét = Ảnh gốc + (Ảnh gốc − Đạo hàm bậc hai/Trung bình lân cận). Cụ thể: I_sharp = I + [4*I − (Trên + Dưới + Trái + Phải)] = 5*I − (Trên + Dưới + Trái + Phải). Đó chính là lý do tâm bằng 5, 4 hàng xóm chữ thập bằng -1, còn 4 góc chéo bằng 0!"),
            p_bullet("Tại sao tổng tất cả 9 ô PHẢI bằng 1?", bold_prefix="2) Bảo toàn độ sáng nền: "),
            p_text("Ở vùng phẳng có cùng mức xám C, kết quả tích chập = C * (tổng ma trận) = C * 1 = C. Nếu tổng > 1 ảnh sẽ bị cháy trắng dần; nếu tổng = 0 (như ma trận Laplacian [0,1,0; 1,-4,1; 0,1,0]) vùng phẳng sẽ biến thành màu đen (0) và chỉ giữ lại đường viền cạnh!"),
            p_bullet("Nếu muốn làm nét mạnh hơn hoặc nhẹ hơn thì đổi số nào?", bold_prefix="3) Tùy chỉnh cường độ nét: "),
            p_text("Giữ nguyên -1 ở 4 ô chữ thập và tăng tâm: với alpha bất kỳ, tâm = 1 + 4*alpha. Ví dụ alpha=1 -> tâm = 5; alpha=2 -> tâm = 9 (tổng vẫn = 9 - 4*1? Không: phải nhân cả 4 ô -1 lên alpha, tức tâm = 1 + 4*alpha, 4 ô lân cận = -alpha, ví dụ [-2 ở lân cận, 9 ở tâm] thì tổng vẫn bằng 1!)."),

            p_h1("2. Tại sao chọn các ma trận & hằng số khác trong Chương 2?"),
            p_table(
                ["Bộ lọc / Tham số", "Con số cụ thể", "Tại sao chọn như vậy?"],
                [
                    ["Mean Filter 3×3 & 5×5", "1/9 (≈0.111) và 1/25 (=0.04)", "Chia đều tổng cho số lượng ô (3×3=9, 5×5=25) để tổng trọng số = 1.0, giữ nguyên độ sáng trung bình của ảnh."],
                    ["Gaussian Blur 3×3", "[1,2,1; 2,4,2; 1,2,1] / 16", "Tích ngoài của nhị thức Pascal [1, 2, 1]^T × [1, 2, 1] xấp xỉ chuẩn hình chuông 2D. Chia 16 (=1+2+1+2+4+2+1+2+1) để tổng bằng 1. Trọng tâm=4 gấp 4 lần góc=1."],
                    ["Sobel Gx & Gy", "[-1,0,1; -2,0,2; -1,0,1]", "Tổng bằng 0 (bắt biến thiên, triệt tiêu vùng phẳng). Trọng số ±2 ở hàng/cột giữa thực chất là kết hợp làm mịn Gaussian [1,2,1] theo một trục và lấy vi phân [-1,0,1] theo trục vuông góc -> kháng nhiễu tốt hơn Prewitt (±1 đều)."],
                    ["Emboss (Nổi 3D)", "[-2,-1,0; -1,1,1; 0,1,2]", "Bất đối xứng từ góc trên-trái (-2) xuống dưới-phải (+2) tạo cảm giác ánh sáng chiếu từ trên-trái hắt bóng 3D; giữ tổng = +1 nên vẫn thấy nền gốc chứ không bị đen xì."],
                    ["Gamma γ = 0.45 vs 1.8", "r_norm^γ * 255", "Khi γ < 1 (vd 0.45): đường cong lồi lên phía trên, nâng mức sáng tối (r=0.2 -> 0.2^0.45 = 0.48, tăng gấp 2.4 lần!) nhưng không làm tràn điểm 255. Khi γ > 1 (1.8): đường cong lõm xuống, tăng chiều sâu ảnh chói."],
                    ["Bilateral (σ_s=4, σ_r=45)", "Không gian 4 px · Màu 45", "σ_s=4 quy định bán kính gom lân cận; σ_r=45 nghĩa là 2 pixel chênh màu < 45 mức xám (cùng bề mặt da/tường) được trộn mượt, còn qua mép cạnh chênh > 90 mức thì trọng số ~ 0 nên giữ cạnh cực sắc."],
                ],
            ),

            p_h1("3. So sánh & Nhận xét Biểu đồ Histogram Trước / Sau cho từng phép toán"),
            p_table(
                ["Phép biến đổi", "Sự thay đổi Histogram Trước -> Sau", "Giải thích & Nhận xét"],
                [
                    ["Brightness (+β / -β)", "Tịnh tiến toàn bộ đường cong sang phải / trái đúng β đơn vị", "Hình dáng đường cong giữ nguyên nhưng dễ bị tích tụ thành cột gai cao tại bin 255 (cháy sáng) hoặc bin 0 (bết tối). Độ lệch chuẩn σ gần như không đổi nếu chưa clipping."],
                    ["Contrast (α > 1)", "Đường cong giãn rộng ra 2 phía (σ tăng mạnh)", "Khoảng cách giữa vùng tối và vùng sáng giãn ra giúp ảnh sắc nét hơn; α < 1 thì co hẹp về giữa (ảnh xám xịt)."],
                    ["Gamma (γ < 1)", "Các bin vùng tối (0..90) giãn thưa sang phải, vùng sáng dồn nhẹ lại", "Không tạo gai clipping tại 255 như Brightness tuyến tính -> cứu chi tiết vùng tối an toàn nhất."],
                    ["Hist Equalization (CDF)", "Các đỉnh cao bị tách giãn, khoảng trống bị thu hẹp -> dàn phẳng đều [0..255]", "Tăng entropy hiển thị cực đại cho ảnh sương mù/tương phản thấp; nếu ảnh gốc vốn đã cân đối thì dễ làm nhiễu nền lộ rõ hơn."],
                    ["Negative (255 - I)", "Lật ngược đối xứng gương qua tâm 127.5 (μ_sau = 255 - μ_trước)", "Các đỉnh ở vùng tối nhảy sang vùng sáng, giúp mắt người dễ quan sát chi tiết nhỏ trên nền tối (như X-quang)."],
                    ["Threshold (T = 128)", "Dải liên tục biến mất hoàn toàn, chỉ còn 2 cột tại 0 và 255", "Dùng để kiểm tra tỷ lệ diện tích Vật thể (255) vs Nền (0)."],
                    ["Mean / Gaussian Blur", "Độ lệch chuẩn σ giảm, các đỉnh cục bộ gom lại và cao lên", "Do lấy trung bình lân cận làm triệt tiêu các điểm sáng/tối đột biến."],
                    ["Sharpen", "Phần đuôi trái (0..30) và phải (220..255) hơi phình ra (σ tăng)", "Hiệu ứng overshoot nhấn mạnh ranh giới sáng-tối quanh cạnh."],
                    ["Median vs Muối–Tiêu", "2 cột gai đột biến tại bin 0 và bin 255 biến mất hoàn toàn", "Khẳng định lọc phi tuyến loại bỏ nhiễu cực trị triệt để mà không làm co bẹp phân bố gốc như Mean/Gaussian."],
                ],
            ),
        ],
    )

    # Lab 3: Giải thích tham số Canny & Histogram
    write_docx(
        ROOT / "Lab3" / "docs" / "Lab3_Giai_Thich_Tham_So_Vuong_Mac.docx",
        [
            p_title("LAB 3: GIẢI THÍCH THAM SỐ THUẬT TOÁN CANNY & BIỂU ĐỒ HISTOGRAM"),
            p_subtitle("Giải đáp 'Tại sao chọn σ = 1.4, T_low = 50, T_high = 150, tỷ lệ 1:3?' và đọc Histogram qua 5 bước Canny"),
            p_h1("1. Tại sao chọn các con số kinh điển trong Canny Edge Detector?"),
            p_table(
                ["Tham số", "Giá trị kinh điển", "Lý do chọn & Hệ quả nếu chỉnh sai"],
                [
                    ["Gaussian σ = 1.4", "σ = 1.4 (tương ứng Kernel 5×5)", "Quy tắc kích thước nhân Gaussian k = 2*ceil(2.5*σ)+1. Với σ=1.4 ta có nhân vừa khít 5×5 pixel: đủ rộng để triệt nhiễu hạt 1-2px nhưng không làm mờ mất nét mảnh hay trôi vị trí cạnh."],
                    ["Ngưỡng kép (50, 150)", "T_high : T_low = 2:1 đến 3:1", "Khuyến nghị của chính John Canny (1986). Nếu tỷ lệ < 1.5:1 (2 ngưỡng quá sát nhau), Hysteresis mất tác dụng -> nét bị đứt đoạn. Nếu quá xa (vd 1:10), nhiễu yếu dính gần cạnh sẽ mọc rễ giả."],
                    ["4 Góc lượng tử NMS", "0°, 45°, 90°, 135° (chia 22.5°)", "Trên lưới pixel rời rạc 3×3 xung quanh tâm chỉ có 8 lân cận chia làm 4 cặp đối xứng qua tâm (ngang 0°, chéo 45°, dọc 90°, chéo 135°). Mỗi góc chiếm vùng rộng 45° (±22.5°)."],
                    ["Auto-Canny ±33%", "0.67 * Median & 1.33 * Median", "Với hệ số sigma_auto = 0.33, hai ngưỡng tự co giãn theo độ sáng trung vị của từng ảnh mà vẫn đảm bảo tỷ lệ gần 1:2 (1.33 / 0.67 ≈ 1.98)."],
                    ["approxPolyDP ε = 0.02*P", "2% đến 4% chu vi Contour", "Độ sai số xấp xỉ đa giác: quá nhỏ (< 0.5%) sẽ đếm dư đỉnh răng cưa; quá lớn (> 8%) sẽ bóp méo hình ngũ giác thành tam giác."],
                ],
            ),
            p_h1("2. Biến đổi Histogram Trước / Sau qua từng giai đoạn của Canny"),
            p_table(
                ["Giai đoạn", "Phân bố Histogram", "Nhận xét kỹ thuật"],
                [
                    ["Ảnh đầu vào -> Bước 1 (Gaussian)", "Đường cong mượt hơn, σ giảm nhẹ", "Loại bỏ các dao động cục bộ cao tần nên đỉnh Histogram gom gọn lại."],
                    ["Bước 2 (Sobel Gradient |G|)", "Dồn rất mạnh về phía trái (0..30), đuôi mảnh kéo tới 255", "Phần lớn ảnh là nền phẳng (gradient nhỏ); số ít điểm trên đuôi phải chính là các đường biên sắc nét."],
                    ["Bước 3 (NMS)", "Đẩy > 90% pixel về đúng Bin 0", "Chỉ giữ lại cực đại 1 pixel dọc chiều rộng cạnh nên mật độ pixel khác 0 giảm đột ngột."],
                    ["Bước 5 (Final Canny)", "Đúng 2 cột nhị phân: Bin 0 (~92-97%) và Bin 255 (~3-8%)", "Nếu mật độ ở Bin 255 vượt 15% nghĩa là ngưỡng quá thấp (lẫn quá nhiều nhiễu nền); nếu < 1% nghĩa là ngưỡng quá cao (mất cạnh thật)."],
                ],
            ),
        ],
    )

    # Lab 4: Giải thích ma trận nhị phân 8x8 (từ ảnh screenshot user gửi) & Wavelet
    write_docx(
        ROOT / "Lab4" / "docs" / "Lab4_Giai_Thich_Tham_So_Vuong_Mac.docx",
        [
            p_title("LAB 4: GIẢI MÃ MA TRẬN WAVELET HASH 8×8, NGƯỠNG HAMMING & BIỂU ĐỒ"),
            p_subtitle("Trả lời chi tiết cho bảng 64 bit (1 / 0) trên Web, lý do chọn kích thước 64×64, Level 3, Median và ROC"),
            p_h1("1. Giải mã Ma trận 8×8 số 0 và 1 (Wavelet Hash 64-bit)"),
            p_text("Trên giao diện Lab 4 hiển thị lưới 8 hàng × 8 cột gồm các ô màu đen số 1 và ô màu trắng số 0 (tổng cộng 64 bit). Dưới đây là ý nghĩa chính xác của từng con số:"),
            p_bullet("Tại sao kích thước ma trận lại đúng 8×8 = 64 bit?", bold_prefix="1) Tối ưu phần cứng 64-bit & Chi tiết vừa đủ: "),
            p_text("64 bit vừa khít 1 thanh ghi số nguyên uint64 của CPU hiện đại. So sánh 2 ảnh chỉ tốn đúng 1 lệnh XOR + POPCNT phần cứng (tốc độ vài tỷ phép tính/giây). Nếu 4×4 (16 bit) quá thô dễ trùng ảnh khác nhau; nếu 16×16 (256 bit) lại quá nhạy với dịch chuyển 1-2 pixel."),
            p_bullet("Tại sao thu ảnh về 64×64 rồi phân rã Level 3?", bold_prefix="2) Khớp chia đôi lũy thừa 2: "),
            p_text("Mỗi cấp biến đổi Wavelet 2D (DWT) thực hiện giảm mẫu (downsampling) chiều dài và chiều rộng đi 2 lần: 64×64 -> Level 1 (32×32) -> Level 2 (16×16) -> Level 3 (8×8)! Subband LL cấp 3 thu được chính là ma trận năng lượng thấp 8×8 đại diện bố cục toàn ảnh."),
            p_bullet("Tại sao mỗi ô lại mang giá trị 1 hoặc 0 theo Median?", bold_prefix="3) Nguyên tắc mã hóa 1 / 0: "),
            p_text("Bit[i] = 1 nếu hệ số LL[i] >= median(64 ô), ngược lại = 0. Điều này có 2 ý nghĩa lớn: (a) Ô số 1 đại diện vùng sáng/năng lượng cao hơn trung vị bức ảnh, ô số 0 là vùng tối hơn -> trực tiếp phác họa lại 'bản đồ sáng tối' (sáng 1, tối 0) của ảnh gốc; (b) Nếu tăng/giảm độ sáng toàn ảnh thêm +30, cả hệ số lẫn trung vị cùng tăng +30 nên chuỗi 64 bit giữ nguyên 100%!"),

            p_h1("2. Tại sao chọn ngưỡng Hamming mặc định = 10 bit (hay ~15%) và dùng Wavelet db4?"),
            p_table(
                ["Tham số / Lựa chọn", "Giá trị", "Lý do chọn"],
                [
                    ["Ngưỡng Hamming T = 10", "10 / 64 bit (~84.4% giống)", "Thực nghiệm trên các phép biến đổi cùng nguồn (nén JPEG, chỉnh sáng, blur, nhiễu nhẹ) thường chỉ làm lật 0 đến 6 bit; ảnh khác chủ đề hoàn toàn thường lệch 24 đến 38 bit (xấp xỉ tung đồng xu 50% = 32 bit). Mức 10 nằm ở vùng khe hở an toàn nhất giữa 2 phân phối."],
                    ["Họ Wavelet 'db4'", "Daubechies bậc 4 (8 tap lọc)", "Hàm Haar (db1) bậc thang vuông dễ bị gãy cạnh khi resize; db4 có 4 moment triệt tiêu nên lọc mượt hơn và gom năng lượng vào subband LL tốt hơn -> đạt AUC cao nhất trên ảnh tự nhiên."],
                    ["Dùng Subband LL thay LH/HL/HH", "Approximation cA", "Các băng chi tiết LH, HL, HH chứa nhiều nhiễu hạt & cạnh mảnh rất dễ thay đổi khi nén JPEG; ngược lại LL giữ lại bộ khung vĩ mô bất biến."],
                ],
            ),

            p_h1("3. Nhận xét phân bố Histogram của ảnh gốc vs các Subband Wavelet & Khoảng cách Hamming"),
            p_bullet("Histogram Subband LL (xấp xỉ): Giữ nguyên hình dạng tổng thể của Histogram ảnh gốc (chiếm > 90% tổng năng lượng ảnh) nên nhìn vẫn ra hình dáng ảnh thu nhỏ."),
            p_bullet("Histogram Subband LH, HL, HH (chi tiết): Tạo thành phân bố nhọn cực cao tại điểm 0 và hai đuôi đối xứng rất hẹp (phân bố Laplacian thưa thớt) — đây chính là cơ sở cho chuẩn nén ảnh JPEG2000."),
            p_bullet("Biểu đồ phân bố Hamming (Same vs Different): Cặp Same tập trung sát 0..8 bit; cặp Different tạo hình chuông quanh tâm 32 bit (xác suất mỗi bit ngẫu nhiên khớp nhau = 0.5 -> 64 * 0.5 = 32)."),
        ],
    )

    # Lab 5: Giải thích tham số MTCNN, BlazeFace, FaceNet 0.70 & Vướng mắc Webcam thực tế
    write_docx(
        ROOT / "Lab5" / "docs" / "Lab5_Giai_Thich_Tham_So_Vuong_Mac.docx",
        [
            p_title("LAB 5: GIẢI THÍCH THAM SỐ FACENET / MTCNN & XỬ LÝ VƯỚNG MẮC WEBCAM THỰC TẾ"),
            p_subtitle("Giải đáp tại sao ngưỡng 0.70, kích thước 160×160, d_eye Alignment, và cách khắc phục triệt để lỗi định vị sai vùng cổ / tóc mái"),
            p_h1("1. Giải đáp: Tại sao lại chọn các con số này trong Lab 5?"),
            p_table(
                ["Tham số / Công thức", "Giá trị chọn", "Cơ sở khoa học & Thực nghiệm"],
                [
                    ["Ngưỡng Cosine Similarity = 0.70", "similarity > 0.70 -> Matched", "Trên không gian L2 (bán kính = 1), cos(theta) = 0.70 tương ứng góc giữa hai vector ~ 45.5°. Cùng một người qua ánh sáng/xoay nhẹ thường đạt 0.78–0.96; hai người khác nhau sau khi chuẩn hóa không gian thường rơi vào 0.10–0.55."],
                    ["Kích thước chuẩn FaceNet 160×160", "160 × 160 × 3 (Tỷ lệ 1:1)", "Kiến trúc InceptionResnetV1 của FaceNet huấn luyện cố định đầu vào 160×160 và chuẩn hóa pixel (x - 127.5)/128 về [-1, 1]. Pad viền xám (128,128,128) vào khung hình vuông max(w,h) giúp KHÔNG bóp méo tỷ lệ mặt."],
                    ["Tỷ lệ chuẩn 2 mắt (d_eye)", "d_eye ≈ 40% chiều rộng box", "Theo nhân trắc học khuôn mặt người trưởng thành, khoảng cách giữa 2 tâm đồng tử luôn chiếm ~38%–44% chiều rộng xương gò má. Nhờ đó dùng d_eye tái xác định tỷ lệ mặt chính xác dù đứng xa hay gần."],
                    ["min_face_size = 20 (MTCNN)", "20 px (thay vì mặc định 40)", "Khi đứng xa camera, mặt chỉ rộng khoảng 40–70 px. Nếu giữ min_face_size=40 cộng stride kim tự tháp 0.709, P-Net dễ bỏ sót hoàn toàn khuôn mặt ở xa."],
                    ["Triplet Loss margin α = 0.2", "L = max(0, d(A,P) - d(A,N) + 0.2)", "Ép khoảng cách bình phương giữa cùng người (Positive) nhỏ hơn người lạ (Negative) ít nhất một khoảng trống an toàn 0.2 trên siêu cầu đơn vị."],
                ],
            ),
            p_h1("2. Vướng mắc thực tế trên Webcam (Tóc mái, Đứng xa, Cổ hở, Nền tối) & Cách khắc phục"),
            p_bullet("Vấn đề 1 — Lỗi trôi Box lên tóc hoặc tụt xuống vùng cổ áo:", bold_prefix="Tại sao các bộ dò dựa trên màu da đơn giản hay nhận nhầm cổ hoặc trán tóc mái? "),
            p_text("Khi người dùng để tóc mái che trán hoặc mặc áo cổ rộng để lộ vùng da cổ, bộ dò chỉ đếm màu da (YCbCr Skin Mask) dễ thấy vùng miệng tối + vùng cổ sáng tương tự cấu trúc 'mắt tối + má sáng' và vẽ khung xuống vùng cổ! Cách khắc phục triệt để trên Web là tích hợp trực tiếp mạng nơ-ron sâu MediaPipe BlazeFace CNN (6 Keypoints thực) kết hợp MTCNN 3 tầng ở Python Backend để nhận diện đặc trưng hình học mắt–mũi–miệng thực sự chứ không chỉ dựa vào màu da."),
            p_bullet("Vấn đề 2 — Đứng xa / đứng lệch góc nhưng vẫn giữ Similarity cao:", bold_prefix="Tại sao chỉ tìm Box đúng vẫn chưa đủ mà phải xoay phẳng theo 2 mắt (Eye-Aligned Affine)? "),
            p_text("Dù Box khoanh đúng mặt, nếu đầu nghiêng 5° hay nền xung quanh lọt vào khác nhau, ma trận pixel đưa vào trích xuất vector sẽ bị lệch hàng/cột. Bước biến đổi Similarity Affine đưa RightEye và LeftEye về đúng tọa độ cố định (0.30*S, 0.36*S) và (0.70*S, 0.36*S) với tỷ lệ scale 1:1 triệt tiêu hoàn toàn ảnh hưởng của vị trí, khoảng cách xa/gần và góc nghiêng đầu."),
            p_bullet("Vấn đề 3 — Tại sao hai người khác nhau đôi khi có Cosine Similarity cao giả tạo?", bold_prefix="Chuẩn hóa 0-trung bình (Zero-centering): "),
            p_text("Các đặc trưng biên HOG thuần túy đều mang giá trị không âm (>= 0), khiến mọi khuôn mặt chính diện chia sẻ phần nền dương giống nhau (~0.68). Khi trừ giá trị trung bình từng cell (zero-mean centering) và chuẩn hóa L2 phần patch nội mặt, người lạ tụt xuống ~0.25–0.40 trong khi cùng một người giữ vững > 0.90."),
        ],
    )


if __name__ == "__main__":
    build_lab1_docs()
    build_lab2_docs()
    build_lab3_docs()
    build_lab4_docs()
    build_lab5_docs()
    build_troubleshooting_docs()
    print("Generated 15 valid .docx files inside Lab1/docs .. Lab5/docs successfully!")
