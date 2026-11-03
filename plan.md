# Implementation Plan: Quản lý Hồ sơ Thai kỳ (M2) - Web Bác sĩ

## Approach
Xây dựng trọn vẹn tính năng Quản lý Hồ sơ Thai kỳ trên Frontend `web_doctor` tuân thủ nghiêm ngặt yêu cầu "không đụng BE".
1. **Module Y khoa (`pregnancyCalculator.ts`)**: Tái hiện toàn bộ công thức tính toán y khoa lâm sàng theo hướng dẫn ACOG No. 700 và Robinson & Fleming / Hadlock (giống hệt logic của `backend/app/services/pregnancy_calculator.py`):
   - Tính tuổi thai từ CRL: $GA_{days} = \text{round}(8.052 \times \sqrt{CRL} + 23.73)$.
   - Tính ngày dự sinh theo LMP: $EDD = LMP + 280\text{ ngày}$.
   - Tính theo siêu âm Q1: $EDD = Q1_{date} + (280 - GA_{Q1})$.
   - Đối chiếu quy tắc ACOG: So sánh chênh lệch giữa LMP và Siêu âm Q1 (ngưỡng 5 ngày nếu $\le 8w6d$, ngưỡng 7 ngày nếu $> 8w6d$).
   - Phân loại tam cá nguyệt: Quý 1 ($\le 13w6d$), Quý 2 ($14w0d - 27w6d$), Quý 3 ($\ge 28w0d$).
2. **Quản lý Dữ liệu (`pregnancyProfile.service.ts`)**:
   - Khởi tạo 6 bản ghi mặc định khớp hoàn hảo với screenshot (Lê Hoàng Hải Yến, Nguyễn Thảo Chi, Phạm Minh Thư, Trần Hồng Nhung, Nguyễn Thị Mai, Phan Thanh Thủy).
   - Tích hợp với `localStorage` (`precare_pregnancy_records`) để thêm mới, cập nhật dữ liệu liên tục không bị mất khi reload.
   - Thử gửi request `POST /api/v1/pregnancy-profiles/calculate` tới Backend nếu backend đang chạy, đồng thời fallback mượt mà về client engine khi backend offline.
3. **Giao diện Danh sách & Modal (`PregnancyProfile.tsx`)**:
   - Render table và filter card theo đúng 100% giao diện trong screenshot của người dùng.
   - Modal Form "+ Tạo hồ sơ mới" với Tab / Section rõ ràng: Thông tin cá nhân, Phương pháp tính tuổi thai (LMP, Siêu âm Q1 hoặc EDD thủ công), Tiền sử sản khoa & bệnh nền.
   - Live Preview thẻ tóm tắt kết quả tính toán ngay khi nhập liệu (Tuổi thai hiện tại, Quý mấy, Ngày dự sinh, Phương pháp chính).
   - Chặn và hiển thị lỗi validation nếu chọn ngày không hợp lệ.
4. **Tích hợp Điều hướng (`App.tsx`)**:
   - Đồng bộ tab `records` (Hồ sơ thai kỳ), hiển thị badge chỉ mục đang chọn.
   - Cập nhật header title động ("Danh sách Hồ sơ Thai kỳ" khi ở tab Hồ sơ thai kỳ).
   - Kết nối "Xem chi tiết" chuyển sang `PatientDetail` với dữ liệu tương ứng và hỗ trợ nút quay lại danh sách.

## Files and changes
| File/module | Thay đổi dự kiến | AC liên quan |
|---|---|---|
| `web_doctor/src/services/pregnancyCalculator.ts` | **Tạo mới**: Thư viện tính toán tuổi thai, EDD, CRL, phân loại tam cá nguyệt và validation ngày tháng y khoa | AC 2, 4 |
| `web_doctor/src/services/pregnancyProfile.service.ts` | **Tạo mới**: Service quản lý danh sách hồ sơ thai kỳ (mock data screenshot, localStorage, search, filter, lưu mới) | AC 1, 2, 4 |
| `web_doctor/src/pages/PregnancyProfile.tsx` | **Cập nhật**: Toàn bộ giao diện danh sách hồ sơ thai kỳ theo ảnh đính kèm + Modal tạo mới hồ sơ có live preview và validate | AC 1, 2, 3, 4 |
| `web_doctor/src/App.tsx` | **Cập nhật**: Tích hợp tab `records`, hiển thị trang `PregnancyProfile`, xử lý điều hướng `PatientDetail` và header title | AC 4 |

## Steps
- [x] 1. Khởi tạo module tính toán y khoa `web_doctor/src/services/pregnancyCalculator.ts`.
- [x] 2. Xây dựng data service `web_doctor/src/services/pregnancyProfile.service.ts` với mock records khớp screenshot và cơ chế lưu trữ bền vững.
- [x] 3. Hiện thực hóa màn hình `web_doctor/src/pages/PregnancyProfile.tsx` bao gồm:
  - Bảng danh sách chuẩn UI PreCare: STT, Thai phụ, Bác sĩ phụ trách, Tuổi thai hiện tại, Ngày dự sinh, Trạng thái badge, Nút xem chi tiết.
  - Thanh công cụ tìm kiếm và lọc trạng thái.
  - Modal form "+ Tạo hồ sơ mới" đầy đủ validation và live preview tính toán.
- [x] 4. Cập nhật `web_doctor/src/App.tsx` để hiển thị trang `PregnancyProfile` khi chọn tab "Hồ sơ thai kỳ", đồng bộ header và kết nối navigation "Xem chi tiết".
- [x] 5. Chạy kiểm tra build `npm run build` của `web_doctor` và xác minh không có lỗi TypeScript / cú pháp.
- [x] 6. Báo cáo kết quả và trình bày cho Dev xác nhận.

## Verification
- [x] Lệnh kiểm tra build: `npm --prefix web_doctor run build` (thành công 100%, 0 lỗi, build in 5.15s).
- [x] Kiểm tra hiển thị khớp với ảnh chụp: Các cột bảng, typography, màu sắc badge xanh lá/xanh dương, nút bấm.
- [x] Kiểm tra logic tính toán y khoa: 6 ca kiểm thử y khoa đạt kết quả chính xác theo ACOG No. 700.
- [x] Kiểm tra validation: Chặn ngày tương lai, ngày LMP > 300 ngày, ngày siêu âm trước LMP, CRL ngoài 10-84mm.
- [x] Kiểm tra thêm mới: Tạo thử hồ sơ mới, xuất hiện ngay trong bảng và lưu vào `localStorage`.
- [x] Kiểm tra xem chi tiết: Nhấn "Xem chi tiết" liên kết sang `PatientDetail` đúng tên thai phụ và có nút quay lại.

## Risks, dependencies, open questions
- Ràng buộc: Backend không bị sửa đổi bất kỳ dòng code nào theo đúng chỉ thị ("không đụng be là giao diện web").
- Không push code theo chỉ thị của Dev ("ko push code").

## Progress
- [x] Dev approved plan
- [x] Implementation complete
- [x] Checks run: command and result
- [x] PR prepared (local draft only, no push)
- [ ] Dev final confirmation

