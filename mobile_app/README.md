# HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY PRECARE MOBILE TRÊN ANDROID
*Dành cho người mới bắt đầu – Windows 10/11, Visual Studio Code và Android Emulator*

---

## 1. Mục đích và yêu cầu

Tài liệu này hướng dẫn cách chuẩn bị máy tính, cài thư viện, mở máy ảo Android và chạy ứng dụng PreCare Mobile.

**Các công nghệ của ứng dụng:**
- React Native và TypeScript.
- Expo để khởi động ứng dụng.
- Android Studio và Android Emulator để chạy thử trên máy tính.

**Cần chuẩn bị:**
1. Mã nguồn dự án PreCare trên máy tính.
2. Node.js phiên bản LTS.
3. Visual Studio Code.
4. Android Studio, Android SDK và Android Emulator.
5. Kết nối Internet trong lần cài đặt thư viện.

> Lưu ý: Chạy được giao diện Mobile không có nghĩa tất cả chức năng nghiệp vụ đã hoàn thiện. Các chức năng cần dữ liệu máy chủ còn phụ thuộc vào Backend và địa chỉ API.

---

## 2. Cài đặt môi trường lần đầu

### Bước 1 – Cài Node.js

1. Tải và cài đặt **Node.js phiên bản LTS** từ trang chính thức: https://nodejs.org/
2. Trong quá trình cài đặt, giữ các lựa chọn mặc định.
3. Sau khi cài xong, mở CMD mới và chạy:

```cmd
node -v
npm -v
```

Nếu cả hai lệnh hiển thị số phiên bản thì Node.js và npm đã được cài đặt.

### Bước 2 – Cài Android Studio và Android SDK

1. Cài Android Studio từ trang chính thức: https://developer.android.com/studio
2. Mở Android Studio.
3. Vào **More Actions > SDK Manager** ở màn hình chào; nếu đang mở dự án, vào **Tools > SDK Manager**.
4. Trong tab **SDK Platforms**, cài Android SDK Platform phù hợp với máy ảo bạn định sử dụng.
5. Trong tab **SDK Tools**, bảo đảm đã chọn:
   - Android SDK Build-Tools.
   - Android SDK Platform-Tools.
   - Android Emulator.
6. Nhấn **Apply > OK** và chờ cài đặt hoàn tất.

### Bước 3 – Tạo máy ảo Android

1. Trong Android Studio, mở **More Actions > Virtual Device Manager**; ở một số phiên bản, mục này có tên **Device Manager**.
2. Chọn **Create Device**.
3. Chọn một thiết bị điện thoại, ví dụ Pixel hoặc Medium Phone, rồi nhấn **Next**.
4. Chọn phiên bản Android (System Image). Nếu chưa có, nhấn Download để tải.
5. Nhấn **Next > Finish**.
6. Trong Device Manager, nhấn nút **Play** để bật máy ảo.
7. Chờ máy ảo khởi động đến màn hình chính Android.

Máy hiện tại đang sử dụng máy ảo có tên **Medium_Phone**. Trên máy tính mới, tên AVD có thể khác; có thể chọn một máy ảo Android khác đã tạo.

### Bước 4 – Thiết lập ANDROID_HOME và PATH

Bước này giúp Windows nhận diện được công cụ ADB để kết nối với máy ảo.

1. Trong Android Studio, mở **SDK Manager** và xem mục **Android SDK Location** để biết chính xác thư mục SDK.
2. Trên Windows, tìm **Edit the system environment variables**.
3. Chọn **Environment Variables...**.
4. Trong phần **User variables**, chọn **New...**:
   - Variable name: `ANDROID_HOME`
   - Variable value: đường dẫn Android SDK vừa xem ở Android Studio.

Đường dẫn mặc định thường là:

```text
%LOCALAPPDATA%\Android\Sdk
```

5. Trong phần **User variables**, chọn biến `Path` > **Edit** > **New**, thêm:

```text
%ANDROID_HOME%\platform-tools
```

6. Nhấn **OK** để lưu tất cả cửa sổ.
7. Đóng và mở lại CMD hoặc Terminal để Windows nhận biến môi trường mới.

Kiểm tra bằng các lệnh:

```cmd
adb --version
adb devices
```

Khi máy ảo đang bật, kết quả `adb devices` cần có một thiết bị với trạng thái `device`, ví dụ:

```text
List of devices attached
emulator-5554    device
```

Nếu chưa thấy thiết bị, hãy kiểm tra máy ảo đã khởi động hoàn toàn chưa và xem phần Khắc phục lỗi ở cuối tài liệu.

---

## 3. Mở dự án và cài thư viện Mobile

### Bước 5 – Mở đúng thư mục dự án

1. Mở Visual Studio Code.
2. Chọn **File > Open Folder...**.
3. Chọn thư mục `mobile_app` của dự án PreCare.

Trên máy hiện tại, đường dẫn là:

```text
D:\HOC-TAP\NCKH\precare\mobile_app
```

Nếu dự án nằm ở ổ đĩa hoặc thư mục khác trên máy mới, hãy chọn đúng thư mục `mobile_app` tại vị trí đó.

Trong Explorer của VS Code, kiểm tra thấy các file/thư mục như:

```text
src
app.json
package.json
index.ts
tsconfig.json
```

### Bước 6 – Mở Terminal và cài thư viện

Trong VS Code, chọn **Terminal > New Terminal**.

Nếu Terminal chưa đứng ở thư mục `mobile_app`, nhập lệnh sau (đổi đường dẫn nếu dự án nằm ở vị trí khác):

```cmd
cd /d "D:\HOC-TAP\NCKH\precare\mobile_app"
```

Kiểm tra đang ở đúng thư mục:

```cmd
dir package.json
```

Cài thư viện:

```cmd
npm ci
```

`npm ci` sử dụng `package-lock.json` để cài đúng phiên bản thư viện đã khóa. Nếu thư mục dự án không có `package-lock.json`, dùng lệnh sau thay thế:

```cmd
npm install
```

Chỉ cần cài thư viện ở lần đầu hoặc khi các thư viện của dự án thay đổi. Không cần chạy lại mỗi ngày.

### Bước 7 – Kiểm tra dự án

Chạy lần lượt:

```cmd
npx expo-doctor
npx expo install --check
npx tsc --noEmit
```

Ý nghĩa:
- `npx expo-doctor`: kiểm tra cấu hình và môi trường Expo.
- `npx expo install --check`: kiểm tra phiên bản các gói liên quan Expo.
- `npx tsc --noEmit`: kiểm tra lỗi TypeScript mà không tạo file đầu ra.

Nếu lệnh nào báo lỗi, hãy đọc thông báo lỗi và xử lý trước khi tiếp tục. Không nên bỏ qua lỗi kiểm tra rồi kết luận dự án đã sẵn sàng.

---

## 4. Cấu hình để Expo chạy trong cửa sổ CMD riêng

### Bước 8 – Kiểm tra `package.json`

Mở file:

```text
mobile_app/package.json
```

Trong phần `scripts`, dòng Android của dự án hiện tại là:

```json
"android": "start \"PreCare Expo\" cmd.exe /k \"npx expo start --android\""
```

Giữ nguyên dòng này. Không cần thay bằng `expo start --android` nếu muốn Expo mở trong cửa sổ CMD riêng.

**Dòng lệnh trên hoạt động như sau:**
- Bạn gõ `npm run android` trong Terminal của VS Code.
- Windows mở thêm một cửa sổ CMD có tên **PreCare Expo**.
- Expo chạy trong cửa sổ CMD mới đó.
- Cửa sổ Terminal trong VS Code có thể tiếp tục dùng để nhập lệnh khác.

> Lưu ý: Cấu hình `start ... cmd.exe` này dành cho Windows. Không xóa hoặc sửa các dòng `ios`, `web` hay các dependencies khác nếu không có yêu cầu thay đổi.

---

## 5. Chạy ứng dụng PreCare Mobile lần đầu

### Bước 9 – Bật Android Emulator

1. Mở Android Studio.
2. Vào **Device Manager**.
3. Nhấn **Play** ở máy ảo muốn sử dụng, ví dụ `Medium_Phone`.
4. Chờ máy ảo vào màn hình chính Android.
5. Có thể kiểm tra kết nối bằng lệnh:

```cmd
adb devices
```

Chỉ tiếp tục khi máy ảo đã khởi động và ADB nhận thiết bị ở trạng thái `device`.

### Bước 10 – Chạy ứng dụng từ VS Code

1. Quay lại VS Code.
2. Mở Terminal tại thư mục `mobile_app`.
3. Chạy đúng một lệnh:

```cmd
npm run android
```

4. Windows sẽ tự mở cửa sổ CMD riêng có tên **PreCare Expo**.
5. Chờ Expo khởi động. Vì lệnh đã có `--android`, Expo sẽ yêu cầu mở ứng dụng trên Android Emulator.
6. Nếu ứng dụng chưa tự mở, nhấp vào cửa sổ **PreCare Expo** rồi nhấn phím:

```text
a
```

7. Chờ ứng dụng tải trên máy ảo.

### Nếu xuất hiện thông báo đổi cổng

Ví dụ:

```text
Port 8081 is being used by another process.
Use port 8082 instead?
```

Nhập:

```text
y
```

Sau đó nhấn Enter và chờ Expo tiếp tục chạy trên cổng mới.

**Quan trọng:** Sau khi `npm run android` đã khởi động Expo, không mở thêm Terminal khác để chạy `npx expo start -c` cùng lúc. Hai lệnh khởi động Expo riêng biệt có thể gây xung đột cổng hoặc khiến bạn không biết cửa sổ nào đang phục vụ ứng dụng.

---

## 6. Quy trình chạy ứng dụng hằng ngày

Sau khi đã cài đặt đầy đủ ở các bước trên, mỗi lần sử dụng chỉ cần:

1. Mở Android Studio và bật máy ảo Android.
2. Chờ máy ảo vào màn hình chính.
3. Mở VS Code và dự án `mobile_app`.
4. Chọn **Terminal > New Terminal**.
5. Nếu Terminal chưa ở đúng thư mục, nhập:

```cmd
cd /d "D:\HOC-TAP\NCKH\precare\mobile_app"
```

6. Chạy:

```cmd
npm run android
```

7. Chờ cửa sổ **PreCare Expo** mở và ứng dụng tải trên máy ảo.
8. Nếu ứng dụng chưa tự mở, nhấp vào cửa sổ Expo và nhấn `a`.

Không cần chạy lại `npm ci` mỗi ngày.

### Dừng ứng dụng

Khi muốn dừng Expo Server:

1. Nhấp vào cửa sổ CMD **PreCare Expo**.
2. Nhấn **Ctrl + C**.
3. Nếu CMD hỏi xác nhận, làm theo nội dung hiển thị.

Đóng hoặc dừng Expo sẽ ngắt máy chủ phát triển; muốn chạy lại thì bật máy ảo và chạy `npm run android`.

---

## 7. Các màn hình và cấu trúc mã nguồn đang có

Dựa trên các file được ghi nhận trong dự án:

| File/thư mục | Vai trò |
|---|---|
| `OnboardingScreen.tsx` | Màn hình giới thiệu ban đầu |
| `LoginScreen.tsx` | Màn hình đăng nhập |
| `RegisterScreen.tsx` | Màn hình đăng ký |
| `HomeScreen.tsx` | Màn hình chính |
| `AppNavigator.tsx` | Cấu hình điều hướng giữa các màn hình |
| `App.tsx` | Điểm vào cấp ứng dụng |
| `src/services/` | Các dịch vụ của ứng dụng, ví dụ phần gọi API |

**Lưu ý:** File màn hình tồn tại không có nghĩa chức năng đã hoàn thiện. Cần chạy ứng dụng, thao tác thực tế và kiểm tra logic/API để xác nhận từng luồng.

---

## 8. Kết nối Backend và địa chỉ API

Địa chỉ API dành cho Android Emulator được ghi nhận trong cấu hình dự án là:

```text
http://10.0.2.2:8000/api/v1

Địa chỉ 10.0.2.2 cho phép Android Emulator truy cập máy tính đang chạy backend.
Nếu backend chưa chạy, API chưa sẵn sàng hoặc sai cổng, những chức năng phụ thuộc
backend có thể không hoạt động dù giao diện mobile vẫn mở được.

Nếu cần kiểm tra chức năng có dữ liệu thật:
1. Khởi động backend theo hướng dẫn riêng của dự án backend.
2. Kiểm tra backend đang chạy đúng cổng.
3. Kiểm tra địa chỉ API trong file dịch vụ của mobile.
4. Thử chức năng trên ứng dụng và xem lỗi trong terminal/log nếu có.


7. KHẮC PHỤC LỖI THƯỜNG GẶP
-----------------------------------------------------------------------------------------------------------
LỖI A — Cổng 8081 đang được sử dụng
Thông báo có thể là:
Port 8081 is being used by another process
Use port 8082 instead?

Cách xử lý:
- Nhập y rồi Enter để dùng cổng 8082.
- Đây không nhất thiết là lỗi nghiêm trọng.

LỖI B — Expo báo không kết nối được cổng 5554
Ví dụ:
could not connect to TCP port 5554
cannot connect to 127.0.0.1:5554

Ý nghĩa:
- Công cụ ADB không kết nối được với máy ảo Android.
- Đây không phải lỗi được giải quyết chỉ bằng cách nhấn a.

Cách xử lý:
1. Nếu lệnh đã dừng và trở về dấu nhắc PowerShell, chạy lại không có tác dụng
   nếu máy ảo vẫn chưa kết nối.
2. Dừng phiên Expo cũ nếu nó còn chạy bằng Ctrl+C.
3. Mở Android Studio > Device Manager.
4. Tắt máy ảo bị treo nếu cần, rồi nhấn Play để khởi động lại.
5. Chờ đến màn hình chính Android.
6. Mở terminal mới và chạy lại:
   cd D:\HOC-TAP\NCKH\precare\mobile_app
   npm run android
7. Nếu Expo chạy nhưng ứng dụng chưa mở, nhấn a trong terminal Expo.

Nếu vẫn lỗi, mở một terminal PowerShell khác và nhập:
adb devices

- Nếu thấy dòng thiết bị có trạng thái device, ADB đã nhận thiết bị.
- Nếu thấy offline hoặc không thấy emulator, máy ảo/ADB chưa sẵn sàng.
- Nếu PowerShell báo không nhận lệnh adb, dùng đường dẫn ADB đầy đủ nếu Android
  SDK đang được cài tại vị trí mặc định:
  C:\Users\LENOVO\AppData\Local\Android\Sdk\platform-tools\adb.exe devices

LỖI C — Terminal hiện QR code nhưng app chưa mở
- Đảm bảo máy ảo đã khởi động hoàn toàn.
- Nhấp vào terminal Expo rồi nhấn a.
- Chờ một lúc và quan sát màn hình máy ảo.

LỖI D — Ứng dụng mở nhưng không thấy dữ liệu từ backend
- Giao diện mobile có thể chạy độc lập với backend.
- Kiểm tra backend có đang chạy không, địa chỉ API, cổng và nhật ký lỗi.
- Không tự đổi địa chỉ API nếu chưa xác định backend đang chạy ở đâu.

LỖI E — Muốn dừng ứng dụng
- Trong terminal đang chạy Expo, nhấn Ctrl+C.
- Nếu muốn chạy lại, dùng lệnh npm run android như hướng dẫn ở trên.


8. QUY TRÌNH CHẠY HẰNG NGÀY — BẢN NGẮN GỌN
-----------------------------------------------------------------------------------------------------------
Mỗi lần mở dự án, làm theo thứ tự:

1. Mở Android Studio và khởi động máy ảo Medium_Phone.
2. Chờ máy ảo vào màn hình chính Android.
3. Mở VS Code và mở thư mục mobile_app.
4. Chọn Terminal > New Terminal.
5. Nhập:
   cd D:\HOC-TAP\NCKH\precare\mobile_app
6. Nhập:
   npm run android
7. Nếu hỏi dùng cổng 8082, nhập y rồi Enter.
8. Nếu Expo chạy mà app chưa mở, nhấn a trong terminal Expo.
9. Thao tác thử các màn hình trên máy ảo.
10. Khi hoàn thành, quay về terminal và nhấn Ctrl+C để dừng Expo nếu không dùng nữa.


9. LƯU Ý KHI PHÁT TRIỂN
-----------------------------------------------------------------------------------------------------------
- Chỉ sửa code khi biết file đó phụ trách phần nào.
- Trước khi chỉnh sửa, nên lưu thay đổi và kiểm tra Git nếu dự án đang dùng Git.
- Không xóa node_modules hoặc file cấu hình chỉ để thử sửa lỗi thông thường.
- Nếu màn hình không chuyển được, kiểm tra AppNavigator.tsx và các sự kiện onPress.
- Nếu màn hình mở nhưng thao tác không có phản hồi, cần kiểm tra logic trong file
  màn hình; không phải cứ chạy được Expo là mọi chức năng đã hoàn thiện.
- Để xác nhận tính năng hoàn chỉnh, cần thử thao tác thực tế và kiểm tra kết nối
  backend/API khi tính năng có sử dụng dữ liệu máy chủ.

Cách hoạt động
------------------------------------------------------------------------------------------------------------
Lệnh chạy chính:
------------------------------------------------------------------------------------------------------------
Bước 1: npm run android  
- đợi trong vài phút 
- sau đó nhấn phím a sau đó máy ảo sẽ tự chạy lên
------------------------------------------------------------------------------------------------------------
sau khi máy ảo đã chạy lên thêm 1 terminal mới để chạy tiếp Bước 2
------------------------------------------------------------------------------------------------------------
Bước 2: npx expo start -c 
- lúc đầu sẽ hiện ra (y,n)
- nhấn y nếu hiện ra như này √ (Use port 8082 instead? ... yes) ĐÚNG
- đợi trong vài phút để chạy cài 
- sau đó nhấn phím a 
------------------------------------------------------------------------------------------------------------

