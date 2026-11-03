# Task: Quản lý Danh sách Bệnh nhân (PatientList) & Tinh chỉnh UI Navigation

## Goal
1. Xây dựng giao diện Danh sách Bệnh nhân (`web_doctor/src/pages/PatientList.tsx`) theo đúng mẫu thiết kế, kết nối thông tin người dùng (`users` có role `pregnant_woman`) và trạng thái thai kỳ từ `pregnancy_records`. Bảng thay thế cột Ngày sinh bằng cột `EMAIL` (phù hợp với schema thực tế trong database).
2. Xóa chấm xanh tròn ở các mục chọn trang trên Sidebar navigation (`App.tsx`) theo ảnh phản hồi của người dùng.
3. Tuyệt đối không can thiệp Backend ("không đụng be") và không push code lên remote ("ko push code").

## Context
Bác sĩ cần một màn hình "Danh sách bệnh nhân" tổng quát để quản lý toàn bộ các thai phụ trong hệ thống (bao gồm thai phụ đang theo dõi thai kỳ, thai phụ chưa tạo hồ sơ, hoặc thai phụ đã hoàn thành thai kỳ trước đó). Đồng thời tinh chỉnh giao diện sidebar để thanh thoát, sạch sẽ hơn theo yêu cầu.

## Scope
- **Included**:
  - Xây dựng component `web_doctor/src/pages/PatientList.tsx`:
    - Header: "Cơ sở dữ liệu Bệnh nhân", phụ đề "Tổng số X thai phụ đang quản lý trong hệ thống".
    - Thanh công cụ: Ô tìm kiếm tên/SĐT, dropdown "Lọc trạng thái".
    - Bảng danh sách bệnh nhân:
      - Cột `STT`: "01", "02", ...
      - Cột `BỆNH NHÂN`: Avatar tròn chữ cái viết tắt với các màu sắc pastel (HY, TC, MT, HN, TM...), Tên in đậm, SĐT kèm icon điện thoại.
      - Cột `EMAIL`: Hiển thị email người dùng (thay cho cột ngày sinh không có trong DB).
      - Cột `TRẠNG THÁI THAI KỲ`: Badge với các trạng thái: `● Đang mang thai (32w)`, `Chưa có hồ sơ hoạt động`, `⟲ Lần sinh trước: DD/MM/YYYY`.
      - Cột `THAO TÁC`: Nút `👁 Xem hồ sơ` (nếu đang mang thai) hoặc `+ Tạo hồ sơ` (nếu chưa có hồ sơ / đã sinh).
    - Phân trang chuẩn giao diện: "Hiển thị 1 - 5 trong số X bệnh nhân" và các nút `< 1 2 3 ... >`.
  - Kết nối điều hướng trong `web_doctor/src/App.tsx`:
    - Khi click tab "Danh sách bệnh nhân" (`patients`), hiển thị `PatientList`.
    - Khi click tab "Hồ sơ thai kỳ" (`records`), hiển thị `PregnancyProfile`.
    - Xóa chấm xanh `{isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>}` ở mỗi nút chọn trang trên Sidebar.
- **Excluded**:
  - Không sửa đổi mã nguồn Backend (`backend/app/...`).
  - Không push code lên remote repository.

## Acceptance criteria
- [ ] Giao diện `PatientList.tsx` hiển thị đúng chuẩn thiết kế trong ảnh đính kèm: Avatar chữ cái viết tắt, tên đậm, SĐT, cột EMAIL, badge trạng thái thai kỳ, nút thao tác `Xem hồ sơ` hoặc `+ Tạo hồ sơ`.
- [ ] Tìm kiếm tức thì theo họ tên hoặc số điện thoại.
- [ ] Bộ lọc trạng thái hoạt động chính xác (Tất cả, Đang mang thai, Chưa có hồ sơ hoạt động, Đã sinh).
- [ ] Phân trang hiển thị đúng số lượng bệnh nhân.
- [ ] Xóa bỏ chấm xanh hiển thị bên cạnh tên mục trên sidebar trong `App.tsx`.
- [ ] Giữ nguyên toàn bộ logic và tính năng của trang `PregnancyProfile.tsx`.
- [ ] Build dự án `npm run build` không có lỗi TypeScript / cú pháp.

## Constraints and open questions
- Ràng buộc: Không đụng BE, không push code lên GitHub.
