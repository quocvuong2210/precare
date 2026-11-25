# Hướng Dẫn Các Bước Chạy PreCare Mobile (Bản Rút Gọn)

Tài liệu này rút gọn toàn bộ quy trình cài đặt và chạy ứng dụng PreCare Mobile. Các câu lệnh chạy thư viện, khởi động và phím bấm đều được đặt trong dấu `(...)` để người dùng dễ nhìn, dễ hiểu và dễ thao tác.

---------------------------------------------------------------------
## Bắc buộc phải có ANDROID_HOME nếu không có máy sẽ không nhận emulator-5554 device
- **Bước 1: vào File -> Setting -> Languages & Frameworks -> Android SDK**
    - Ở trang **Android SDK** sẽ thấy được dẫn trên **Android SDK Location** sao chép đoạn đó 
- **Bước 2: Bấm vào windown gõ -> Edit the system environment variables -> environment Variables...**
    - ở mục **user variables for ...** chọn vào New 
    - Variable name: ANDROID_HOME
    - Variable value: bỏ phần bạn đã sao chép trong phần **Android SDK Location**
  **Như vậy bạn đã hoàn tất và giờ thực hiện các bước phía dưới ***
---------------------------------------------------------------------
## 1. Cài đặt lần đầu tiên (Chỉ thực hiện 1 lần)
- **Bước 1: Kiểm tra công cụ đã cài đặt trên máy**
  - Mở cửa sổ dòng lệnh (CMD/Terminal), kiểm tra Node.js: (node -v)
  - Kiểm tra npm: (npm -v)
  - Kiểm tra kết nối máy ảo Android: (adb devices)

- **Bước 2: Di chuyển vào thư mục ứng dụng Mobile**
  - (cd mobile_app)

- **Bước 3: Cài đặt toàn bộ thư viện cần thiết**
  - (npm ci)
  - *(Trường hợp không có file lock hoặc báo lỗi, chạy lệnh thay thế: (npm install))*

- **Bước 4: Kiểm tra trạng thái dự án (không bắt buộc nhưng nên làm)**
  - Kiểm tra môi trường Expo: (npx expo-doctor)
  - Kiểm tra phiên bản gói: (npx expo install --check)
  - Kiểm tra lỗi code TypeScript: (npx tsc --noEmit)

--------------------------------------------------------------------

## 2. Các bước chạy ứng dụng hằng ngày (Quy trình chuẩn)

Mỗi lần mở máy để lập trình hoặc kiểm tra ứng dụng, chỉ cần làm đúng các bước sau:

- **Bước 1: Bật máy ảo Android**
  - Mở **Android Studio** -> chọn **Device Manager** -> bấm nút **Play** tại máy ảo (ví dụ: `Pixel_7`) và chờ máy ảo khởi động xong vào màn hình chính.

- **Bước 2: Mở Terminal tại thư mục Mobile**
  - Mở Terminal trong VS Code và gõ lệnh: (cd mobile_app)

- **Bước 3: Khởi chạy ứng dụng**
  - Chạy lệnh: (npm run android)
  - *(Lệnh này sẽ tự động mở một cửa sổ CMD riêng có tên "PreCare Expo" để vận hành ứng dụng)*

- **Bước 4: Mở ứng dụng trên máy ảo**
  - Nếu ứng dụng chưa tự động xuất hiện trên màn hình máy ảo, bạn bấm chuột vào cửa sổ **PreCare Expo** rồi nhấn phím: (a)
  - Chờ ứng dụng tải dữ liệu và hiển thị lên màn hình điện thoại ảo.

--------------------------------------------------------------------

## 3. Cách dừng ứng dụng và xử lý lỗi thường gặp

- **Dừng ứng dụng khi dùng xong:**
  - Bấm vào cửa sổ CMD **PreCare Expo** và nhấn tổ hợp phím: (Ctrl + C)

- **Khi bị thông báo trùng cổng (Port 8081 is being used...):**
  - Nhập phím sau rồi nhấn Enter để chuyển sang cổng 8082: (y)

- **Khi muốn xóa bộ nhớ đệm (cache) và khởi động lại sạch sẽ:**
  - Tắt cửa sổ Expo cũ bằng: (Ctrl + C)
  - Sau đó chạy lệnh làm mới cache: (npx expo start -c --android)

- **Khi máy ảo bị mất kết nối hoặc báo offline:**
  - Khởi động lại dịch vụ kết nối Android bằng các lệnh:
    - (adb kill-server)
    - (adb start-server)
    - (adb devices)
