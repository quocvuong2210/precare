# PreCare - Hướng Dẫn Sử Dụng Tài Khoản Demo & Dữ Liệu Seed

Tài liệu này cung cấp danh sách đầy đủ các tài khoản mẫu (demo accounts), hồ sơ thai kỳ và các kịch bản kiểm thử lâm sàng đã được nạp tự động vào PostgreSQL thông qua script khởi tạo `init-db/01-init.sql`.

---

## 1. Thông Tin Đăng Nhập Chung

Tất cả các tài khoản demo trong hệ thống đều được kích hoạt sẵn (`is_active = TRUE`) và sử dụng chung một mật khẩu mặc định:

- **Mật khẩu chung:** `password123`
- **Cơ chế băm mật khẩu:** Chuẩn Bcrypt thông qua hàm `crypt('password123', gen_salt('bf', 10))` của extension PostgreSQL `pgcrypto`, tương thích 100% với hàm xác thực `verify_password` phía Backend FastAPI.

> [!NOTE]
> **Cách Reset / Nạp lại Dữ Liệu Mẫu:**
> Khi cần làm sạch cơ sở dữ liệu và nạp lại toàn bộ dữ liệu seed từ đầu, hãy chạy lệnh:
> ```bash
> # Dừng container và xóa volume database cũ
> docker compose down -v
> 
> # Khởi động lại container database (PostgreSQL sẽ tự động chạy init-db/01-init.sql)
> docker compose up -d db
> ```

---

## 2. Danh Sách Tài Khoản Người Dùng (`users`)

### 2.1. Tài Khoản Quản Trị Viên (Role: `admin`)
Dùng để quản lý người dùng, xem toàn bộ nhật ký kiểm toán hệ thống (`audit_logs`) và phân quyền.

| Email Đăng Nhập | Mật Khẩu | Họ và Tên | Số Điện Thoại | Ghi Chú |
| :--- | :--- | :--- | :--- | :--- |
| `admin@precare.vn` | `password123` | Quản Trị Viên Hệ Thống | `0900000001` | Tài khoản Admin chính thức |
| `admin@example.com` | `password123` | System Admin (Test) | `0900000002` | Tài khoản phục vụ kiểm thử API |

---

### 2.2. Tài Khoản Bác Sĩ Sản Khoa (Role: `doctor`)
Dùng để đăng nhập vào **Web Doctor Portal** (`http://localhost:3000`), theo dõi biểu đồ bách phân vị tăng trưởng thai nhi, xác thực kết quả bóc tách OCR và xem xét các yêu cầu xóa dữ liệu.

| Email Đăng Nhập | Mật Khẩu | Họ và Tên | Đơn Vị / Chuyên Khoa | Số Điện Thoại | Ghi Chú |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `bacsi.leminh@phusantw.org` | `password123` | BS. CKI Lê Minh | BV Phụ sản TW (Khoa Sản thường) | `0901234567` | Bác sĩ chính phụ trách theo dõi thai kỳ chuẩn & ca FGR |
| `bacsi.nguyen@precare.vn` | `password123` | BS. Nguyễn Thu Hương | Khoa Khám thai sớm & Kế hoạch hóa | `0902345678` | Phụ trách ca thai sớm Quý 1 & ca đình chỉ thai kỳ |
| `nguyenminhhoang@precare.vn` | `password123` | BS. CKII Nguyễn Minh Hoàng | Trung tâm Chẩn đoán trước sinh | `0903456789` | Chuyên gia sàng lọc dị tật & can thiệp bào thai |
| `doctor@example.com` | `password123` | BS. Trần Văn B | Phòng khám Sản phụ khoa | `0909090909` | Phục vụ kiểm thử unit test Backend tự động |

---

### 2.3. Tài Khoản Thai Phụ (Role: `pregnant_woman`)
Dùng để đăng nhập vào **Mobile App (Patient Companion)** hoặc tra cứu bệnh án thai kỳ cá nhân.

| Email Đăng Nhập | Mật Khẩu | Họ và Tên | Tuần Thai Hiện Tại | Trạng Thái Hồ Sơ | Kịch Bản Lâm Sàng / Mục Đích Kiểm Thử |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `haiyen.le@gmail.com` | `password123` | Lê Hoàng Hải Yến | 32w 4d (Quý 3) | `active` | **Thai phát triển chuẩn (Green Alert):** 4 lần khám liên tiếp đạt phân vị 50th Hadlock IV, không có bất thường. |
| `thaochi.nguyen@gmail.com` | `password123` | Nguyễn Thảo Chi | 32w 0d (Quý 3) | `active` | **Cảnh báo thai chậm tăng trưởng FGR (Red Alert):** Vòng bụng AC & EFW tụt < 10th percentile, sụt giảm liên tiếp > 20 percentile points. |
| `minhthu.pham@gmail.com` | `password123` | Phạm Minh Thư | 18w 0d (Quý 2) | `active` | **Kiểm thử duyệt OCR:** Có phiếu siêu âm 18 tuần đã bóc tách (`extracted`), các chỉ số sinh trắc ở trạng thái `pending_verification` chờ bác sĩ duyệt. |
| `kimngan.bui@gmail.com` | `password123` | Bùi Kim Ngân | 7w 0d (Quý 1) | `active` | **Thai sớm Quý 1:** Tính tuổi thai theo chiều dài đầu mông (CRL = 10.0mm), dự sinh `2027-06-24`. |
| `hongnhung.tran@gmail.com` | `password123` | Trần Hồng Nhung | Đã sinh | `completed` | **Hồ sơ hoàn thành:** Đã sinh thường bé an toàn khỏe mạnh (3,250g), phục vụ kiểm tra lịch sử thai kỳ cũ. |
| `hoangmai.le@example.com` | `password123` | Lê Hoàng Mai | Đình chỉ thai | `terminated` | **Kiểm thử xóa dữ liệu (PRC-37):** Hồ sơ đình chỉ y khoa, có 1 yêu cầu xóa dữ liệu y tế ở trạng thái `pending` chờ bác sĩ duyệt. |
| `quynhanh.dang@gmail.com` | `password123` | Đặng Quỳnh Anh | Chưa có hồ sơ | *Không có* | **Kiểm thử tạo mới hồ sơ:** Thai phụ chưa từng tạo hồ sơ thai kỳ, hiển thị ngay khi gọi API `GET /api/v1/pregnancy-profiles/eligible-patients`. |
| `patient1@example.com` | `password123` | Nguyen Thi A (Test) | - | - | Phục vụ kiểm thử unit test Backend tự động |
| `patient2@example.com` | `password123` | Le Thi B (Test) | - | - | Phục vụ kiểm thử unit test Backend tự động |

---

## 3. Chi Tiết Kịch Bản Kiểm Thử Lâm Sàng

### Kịch Bản 1: Thai Kỳ Chuẩn Phát Triển Bình Thường (Green Alert)
- **Tài khoản thai phụ:** `haiyen.le@gmail.com`
- **Bác sĩ phụ trách:** `bacsi.leminh@phusantw.org`
- **Hồ sơ ID:** `10000000-0000-0000-0000-000000000002`
- **Đặc điểm dữ liệu:**
  - Có 4 lần khám thai định kỳ đầy đủ tại các tuần: **12w**, **20w2d**, **28w1d**, **32w4d**.
  - Các chỉ số sinh trắc học vàng (BPD, HC, AC, FL, EFW) đều dao động ổn định trong dải bách phân vị **48% – 56%** theo công thức Hadlock IV.
  - Kết quả phân tích RACA-Net: `anomaly_probability = 0.0210`, `warning_level = 'green'`.
  - **Mục tiêu test:** Kiểm tra đồ thị tăng trưởng Hadlock hiển thị 5 dải bách phân vị (3rd, 10th, 50th, 90th, 97th) vẽ đường cong liên tục, trơn tru của một thai kỳ bình thường.

---

### Kịch Bản 2: Cảnh Báo Lâm Sàng Thai Chậm Tăng Trưởng Trong Tử Cung FGR (Red Alert)
- **Tài khoản thai phụ:** `thaochi.nguyen@gmail.com`
- **Bác sĩ phụ trách:** `bacsi.leminh@phusantw.org`
- **Hồ sơ ID:** `10000000-0000-0000-0000-000000000003`
- **Đặc điểm dữ liệu:**
  - Lần khám 22w: Sinh trắc ở mức phân vị 45% (bình thường).
  - Lần khám 28w: Vòng bụng AC và cân nặng thai EFW bắt đầu giảm sút (tụt xuống phân vị 15%, giảm > 20 percentile points so với lần trước).
  - Lần khám 32w: Chu vi vòng bụng AC = 250mm (phân vị thứ **5.3%**) và EFW = 1510g (phân vị thứ **6.1%**) đều **< 10th percentile**.
  - Kết quả phân tích Safety Override: `anomaly_probability = 0.8420`, `warning_level = 'red'`.
  - **Mục tiêu test:** Kiểm tra biểu đồ Web Doctor bật cờ đỏ cảnh báo FGR, xuất hiện thông báo khuyến nghị đo Doppler động mạch rốn & động mạch não giữa, kiểm tra luật bất biến $\max(\text{rule}, \text{model})$.

---

### Kịch Bản 3: Hàng Đợi Duyệt Số Hóa OCR (Confirmation Barrier)
- **Tài khoản thai phụ:** `minhthu.pham@gmail.com`
- **Bác sĩ phụ trách:** `doctor@example.com`
- **File siêu âm ID:** `50000000-0000-0000-0000-000000000001`
- **Đặc điểm dữ liệu:**
  - Phiếu siêu âm 18 tuần đã bóc tách OCR thành công (`status = 'extracted'`), lưu payload JSONB chứa các trường `bpd_mm: 42`, `hc_mm: 153`, `ac_mm: 132`, `fl_mm: 28`, `efw_g: 235`.
  - Bản ghi sinh trắc học trong `biometric_data` đang ở trạng thái `pending_verification`.
  - **Mục tiêu test:** Bác sĩ đăng nhập vào Web Doctor Portal, mở màn hình duyệt phiếu OCR, chỉnh sửa thông số và bấm Xác nhận để chuyển trạng thái sang `verified`.

---

### Kịch Bản 4: Khởi Tạo Hồ Sơ Thai Kỳ Mới & Kiểm Tra Danh Sách Eligible
- **Tài khoản thai phụ:** `quynhanh.dang@gmail.com`
- **Đặc điểm dữ liệu:**
  - Tài khoản thai phụ đã đăng ký trong hệ thống nhưng chưa có bất kỳ hồ sơ thai kỳ nào.
  - Khi bác sĩ gọi API `GET /api/v1/pregnancy-profiles/eligible-patients`, tài khoản này sẽ xuất hiện trong danh sách lựa chọn.
  - **Mục tiêu test:** Bác sĩ chọn Đặng Quỳnh Anh để tạo hồ sơ thai kỳ mới theo phương pháp Kỳ kinh cuối (LMP) hoặc Siêu âm Quý 1 (Q1 Ultrasound/CRL).

---

### Kịch Bản 5: Quản Lý Yêu Cầu Xóa Dữ Liệu Y Tế (PRC-37)
- **Tài khoản thai phụ:** `hoangmai.le@example.com`
- **Yêu cầu xóa ID:** `70000000-0000-0000-0000-000000000001`
- **Đặc điểm dữ liệu:**
  - Hồ sơ thai kỳ đã kết thúc (`terminated`).
  - Thai phụ đã gửi yêu cầu xóa toàn bộ hồ sơ (`target_type = 'full_profile'`) với lý do chuyển viện, đồng ý cho phép sử dụng dữ liệu ẩn danh phục vụ NCKH (`allow_anonymized_research = TRUE`).
  - Trạng thái yêu cầu: `pending`.
  - **Mục tiêu test:** Bác sĩ truy cập tab **Yêu cầu xóa dữ liệu** trên Web Doctor để xem xét, phê duyệt hoặc từ chối yêu cầu.

---

## 4. Hướng Dẫn Sử Dụng Nhanh Cho Thành Viên Nhóm

### Đăng nhập Web Doctor Portal
1. Truy cập: `http://localhost:3000`
2. Nhập Email: `bacsi.leminh@phusantw.org` (hoặc `bacsi.nguyen@precare.vn`)
3. Nhập Password: `password123`
4. Vào Dashboard để xem danh sách thai phụ, lịch khám hôm nay và các cảnh báo nguy cơ cao.

### Đăng nhập Mobile App
1. Khởi động ứng dụng Expo / Android Emulator (`npm run start`).
2. Nhập Email: `haiyen.le@gmail.com` (hoặc `thaochi.nguyen@gmail.com`)
3. Nhập Password: `password123`
4. Xem thông tin thai kỳ, lịch hẹn khám và tải lên phiếu kết quả siêu âm mới.

### Kiểm thử API qua Swagger
1. Truy cập: `http://localhost:8000/docs`
2. Bấm nút **Authorize** ở góc phải trên.
3. Nhập `username`: `bacsi.leminh@phusantw.org`, `password`: `password123` rồi bấm **Authorize**.
4. Thực thi các endpoint được bảo vệ theo phân quyền RBAC.
