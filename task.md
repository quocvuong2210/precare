# Task: Quản lý Hồ sơ Thai kỳ (M2) - Giao diện Web Bác sĩ (Doctor Web Portal)

## Goal
Xây dựng giao diện Danh sách Hồ sơ Thai kỳ và Form tạo mới/xem hồ sơ trên Web Bác sĩ (`web_doctor`), đảm bảo hiển thị đúng 100% theo bản thiết kế được cung cấp, tính toán chính xác tuổi thai (tuần + ngày), tam cá nguyệt (quý 1, 2, 3), ngày dự sinh (EDD) dựa trên LMP hoặc siêu âm Quý 1 / CRL theo chuẩn ACOG No. 700, hỗ trợ tìm kiếm, lọc trạng thái, xem chi tiết và lưu trữ hồ sơ mà không can thiệp/sửa đổi Backend.

## Context
Bác sĩ sản khoa cần một giao diện trực quan để theo dõi danh sách thai phụ do mình phụ trách, xem nhanh tình trạng thai kỳ (tuổi thai tuần/ngày, tam cá nguyệt, ngày dự sinh, trạng thái hoạt động) và khởi tạo hồ sơ thai kỳ ban đầu với các kiểm tra validation y khoa nghiêm ngặt (chặn ngày không hợp lệ, ngày tương lai, chênh lệch bất thường).

## Scope
- **Included**:
  - Hoàn thiện trang `web_doctor/src/pages/PregnancyProfile.tsx` khớp hoàn toàn với thiết kế ảnh đính kèm (PreCare theme, bảng danh sách thai phụ, tìm kiếm theo tên/SĐT, lọc theo trạng thái, nút "+ Tạo hồ sơ mới", nút "Xem chi tiết").
  - Xây dựng module tính toán y khoa `web_doctor/src/services/pregnancyCalculator.ts` thực hiện chuẩn hóa logic tính tuổi thai (tuần + ngày), tam cá nguyệt (quý 1, 2, 3), ngày dự sinh (EDD) từ LMP hoặc Siêu âm Quý 1 (CRL hoặc tuần+ngày) theo ACOG No. 700.
  - Xây dựng Modal "+ Tạo hồ sơ mới" hỗ trợ nhập thông tin ban đầu: Họ tên thai phụ, SĐT, Email, Bác sĩ phụ trách, Tiền sử cơ bản (nhóm máu, dị ứng, bệnh nền, tiền sử sản khoa), thông số xác định thai (LMP, Siêu âm Q1 hoặc EDD chỉ định), kèm live calculation preview và validation y khoa.
  - Cập nhật điều hướng trong `web_doctor/src/App.tsx`: Kích hoạt tab "Hồ sơ thai kỳ" trên Sidebar, đồng bộ tiêu đề Header ("Danh sách Hồ sơ Thai kỳ"), điều hướng mượt mà đến `PatientDetail` khi bấm "Xem chi tiết".
  - Lưu trữ hồ sơ thai kỳ vào `pregnancy_records` (state + localStorage `precare_pregnancy_records`), thử gọi API backend nếu có sẵn mà không phụ thuộc cứng.
- **Excluded**:
  - Không chỉnh sửa backend codebase (`backend/app/...`) theo yêu cầu nghiêm ngặt "không đụng be là giao diện web".
  - Quản lý chuỗi các lần khám định kỳ và số đo sinh trắc học chi tiết (thuộc STORY-3.2).
  - Tải lên file phiếu khám PDF/ảnh (thuộc Epic M-INGEST).
  - Ứng dụng Mobile thai phụ (nằm ở `mobile_app`).

## Acceptance criteria
- [ ] Giao diện danh sách hồ sơ thai kỳ khớp chuẩn với ảnh thiết kế: STT (01, 02...), Thai phụ (Tên đậm, SĐT nhỏ), Bác sĩ phụ trách, Tuổi thai hiện tại (số tuần ngày + Quý), Ngày dự sinh (DD/MM/YYYY), Trạng thái ("Đang hoạt động" - màu xanh lục, "Hoàn thành" - màu xanh dương nhạt), Thao tác ("Xem chi tiết").
- [ ] Thanh công cụ bao gồm tiêu đề, phụ đề ("Tổng số X thai phụ đang theo dõi • Y lượt khám hôm nay"), ô tìm kiếm theo tên/SĐT, dropdown lọc theo trạng thái, nút "+ Tạo hồ sơ mới".
- [ ] Hàm logic y khoa tính toán chính xác tuổi thai (tuần + ngày) và ngày dự sinh (EDD) từ LMP hoặc Siêu âm Quý 1 / CRL tại mọi thời điểm, tuân thủ quy tắc lâm sàng ACOG No. 700.
- [ ] Form "+ Tạo hồ sơ mới" có đầy đủ thông tin ban đầu của thai kỳ và tiền sử cơ bản, kiểm tra (validate) không cho phép nhập ngày tương lai hoặc ngày không hợp lệ.
- [ ] Preview tính toán tức thì (Live Gestational Age & EDD Preview) hiển thị trực quan ngay trong form khi bác sĩ nhập liệu.
- [ ] Lưu trữ thành công hồ sơ vào danh sách (`precare_pregnancy_records`), hiển thị ngay lập tức trong bảng dữ liệu.
- [ ] Nhấn "Xem chi tiết" mở màn hình chi tiết hồ sơ bệnh nhân (`PatientDetail`) và có nút quay lại danh sách.
- [ ] Build dự án `npm run build` không có lỗi TypeScript hoặc lint.

## Constraints and open questions
- Ràng buộc: Tuyệt đối không can thiệp code Backend ("không đụng be là giao diện web"). Mọi tương tác lưu trữ và tính toán cần hoạt động hoàn hảo ở Web Frontend kể cả khi Backend chưa có endpoint lưu trữ hoặc đang offline.

