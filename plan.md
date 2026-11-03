# Implementation Plan: Danh sách Bệnh nhân (PatientList) & UI Navigation

## Approach
1. **Thiết kế component `PatientList.tsx`**:
   - Dữ liệu kết hợp: Lấy danh sách bệnh nhân thai phụ (Role: `pregnant_woman`) liên kết với trạng thái từ `pregnancy_records` (lấy từ `pregnancyProfile.service.ts` hoặc mock storage).
   - Render table bám sát thiết kế Figma/Screenshot:
     - Avatar tròn mang chữ cái đầu của họ tên (với palette màu riêng biệt như Teal, Tím, Cam, Hồng, Xanh dương).
     - Họ tên thai phụ (font-bold) + SĐT kèm icon `Phone`.
     - Cột `EMAIL` thay thế cột Ngày sinh (theo đúng schema DB `users`).
     - Badge Trạng thái thai kỳ:
       - `● Đang mang thai (Xw)` (xanh lục pastel).
       - `Chưa có hồ sơ hoạt động` (xám slate pastel).
       - `⟲ Lần sinh trước: DD/MM/YYYY` (tím nhạt kèm icon rotate/clock).
     - Nút Thao tác:
       - Nếu có hồ sơ hoạt động: Nút `👁 Xem hồ sơ` (mở trang chi tiết bệnh nhân `PatientDetail`).
       - Nếu chưa có hồ sơ: Nút `+ Tạo hồ sơ` (mở modal tạo hồ sơ mới hoặc điều hướng sang màn hình tạo hồ sơ thai kỳ).
     - Phân trang ở chân bảng (Hiển thị 1 - 5 trong số X, nút trước/sau/số trang).
2. **Loại bỏ chấm xanh trên Navigation Sidebar (`App.tsx`)**:
   - Xóa bỏ thẻ `{isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>}` ở nav items.
   - Kết nối tab `patients` để hiển thị `PatientList` và tab `records` hiển thị `PregnancyProfile`.
   - Cập nhật tiêu đề Top Header ("Danh sách Bệnh nhân" khi ở tab `patients`).
3. **Kiểm tra và xác minh**:
   - Chạy lệnh build `npm --prefix web_doctor run build`.
   - Kiểm tra giao diện và hoạt động của bảng bệnh nhân, bộ lọc và tìm kiếm.
   - Cam kết: Không đụng BE, không push code.

## Files and changes
| File/module | Thay đổi dự kiến | AC liên quan |
|---|---|---|
| `web_doctor/src/pages/PatientList.tsx` | **Tạo mới**: Toàn bộ giao diện Cơ sở dữ liệu Bệnh nhân theo ảnh mẫu, hiển thị cột EMAIL, badge trạng thái thai kỳ, phân trang | AC 1, 2, 3, 4 |
| `web_doctor/src/App.tsx` | **Cập nhật**: Xóa chấm xanh indicator ở nav button, kết nối tab `patients` với `PatientList` | AC 5 |
| `web_doctor/src/services/patient.service.ts` | **Tạo mới (hoặc tích hợp)**: Service cung cấp danh sách bệnh nhân thai phụ với role `pregnant_woman` | AC 1 |

## Steps
- [x] 1. Xây dựng model và service `patient.service.ts` quản lý danh sách thai phụ.
- [x] 2. Xây dựng giao diện `PatientList.tsx` chuẩn theo ảnh screenshot (cột EMAIL, avatar màu, badge trạng thái, nút Xem/Tạo hồ sơ, search, filter, pagination).
- [x] 3. Chỉnh sửa `App.tsx`: Xóa chấm xanh trên sidebar, kết nối tab `patients` $\rightarrow$ `PatientList` và tab `records` $\rightarrow$ `PregnancyProfile`.
- [x] 4. Kiểm tra build `npm run build` và test hoạt động.
- [x] 5. Báo cáo Dev để kiểm tra và xác nhận.

## Verification
- [x] Lệnh build: `npm --prefix web_doctor run build` (exit code 0, không có lỗi, hoàn tất trong 7.33s).
- [x] Giao diện so khớp với ảnh 1: Cột EMAIL thay thế Ngày sinh, avatar initials màu pastel, badge trạng thái (Đang mang thai, Chưa có hồ sơ, Lần sinh trước), phân trang.
- [x] Sidebar so khớp với ảnh 2: Đã loại bỏ hoàn toàn chấm xanh ở nút chọn trang.
- [x] Bấm tab "Danh sách bệnh nhân" ra đúng `PatientList`, bấm "Hồ sơ thai kỳ" ra `PregnancyProfile`.
- [x] Bấm "Xem hồ sơ" mở chi tiết thai phụ, bấm "+ Tạo hồ sơ" mở form khởi tạo thai kỳ.

## Risks, dependencies, open questions
- Ràng buộc: "không đụng be, ko push code". Mọi thay đổi giữ cục bộ.

## Progress
- [x] Dev approved plan
- [x] Implementation complete
- [x] Checks run: command and result
- [x] PR prepared (local draft only, no push)
- [ ] Dev final confirmation
