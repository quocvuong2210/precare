HƯỚNG DẪN SỬ DỤNG VÀ CHẠY ỨNG DỤNG MOBILE PRECARE
Dành cho người mới bắt đầu
============================================================

1. MỤC ĐÍCH TÀI LIỆU
-----------------------------------------------------------------------------------------------------------
Tài liệu này hướng dẫn cách mở dự án PreCare Mobile bằng Visual Studio Code,
khởi động máy ảo Android, chạy ứng dụng và kiểm tra các màn hình đã có trong
mã nguồn.

Thư mục dự án theo máy hiện tại:
D:\HOC-TAP\NCKH\precare\mobile_app

Công nghệ nhìn thấy trong dự án:
- React Native + TypeScript
- Expo để khởi động ứng dụng
- Android Emulator để chạy thử trên máy tính

LƯU Ý: Đây là hướng dẫn chạy và kiểm tra giao diện. Việc một màn hình đã có
file mã nguồn không đồng nghĩa mọi chức năng nghiệp vụ hoặc API đã hoàn thiện.


2. NGƯỜI MỚI BẮT ĐẦU NÊN LÀM GÌ ĐẦU TIÊN?
-----------------------------------------------------------------------------------------------------------
Làm theo đúng thứ tự dưới đây, không mở terminal chạy lệnh ngay khi máy ảo
chưa khởi động xong.

BƯỚC 1 — MỞ DỰ ÁN
1. Mở Visual Studio Code.
2. Chọn File > Open Folder...
3. Chọn thư mục:
   D:\HOC-TAP\NCKH\precare\mobile_app
4. Ở khung Explorer bên trái, kiểm tra thấy các mục như:
   src, app.json, package.json, index.ts, tsconfig.json.
5. Nếu thư mục node_modules đã có sẵn thì thường không cần cài lại thư viện.

BƯỚC 2 — MỞ MÁY ẢO ANDROID
1. Mở Android Studio.
2. Tại màn hình chào, vào More Actions > Virtual Device Manager
   (một số phiên bản gọi là Device Manager).
3. Tìm máy ảo có tên Medium_Phone.
4. Nhấn nút hình tam giác Play ở dòng máy ảo.
5. Chờ máy ảo khởi động hoàn toàn đến màn hình chính Android.
6. Không đóng cửa sổ máy ảo trong lúc chạy ứng dụng.

Nếu máy ảo đã mở sẵn và đang ở màn hình Android chính, có thể bỏ qua bước này.


3. CHẠY ỨNG DỤNG BẰNG TERMINAL
-----------------------------------------------------------------------------------------------------------
BƯỚC 3 — MỞ TERMINAL ĐÚNG THƯ MỤC
Trong VS Code, chọn Terminal > New Terminal.
Nhìn đường dẫn ở đầu dòng lệnh. Nếu chưa đúng thư mục dự án, nhập:

cd D:\HOC-TAP\NCKH\precare\mobile_app

Nhấn Enter.

BƯỚC 4 — KHỞI ĐỘNG EXPO
Nhập lệnh:

npm run android

Nhấn Enter và chờ Expo khởi động.

Nếu terminal hỏi:
Use port 8082 instead?
thì có nghĩa cổng 8081 đang được một tiến trình khác sử dụng. Có thể nhập y
rồi nhấn Enter để tiếp tục bằng cổng 8082.

BƯỚC 5 — MỞ ỨNG DỤNG TRÊN MÁY ẢO
- Nếu terminal tự mở ứng dụng trên máy ảo, hãy chờ ứng dụng tải.
- Nếu Expo đã chạy, terminal vẫn đang hoạt động nhưng ứng dụng chưa mở,
  nhấn phím chữ thường a trong cửa sổ terminal Expo.
- Không gõ chữ a vào file README hoặc vào màn hình điện thoại. Phải bấm vào
  đúng cửa sổ Terminal đang chạy Expo trước rồi mới nhấn a.
- Chờ thêm một lúc để ứng dụng tải trên máy ảo.

Khi Expo đang chạy, giữ nguyên terminal đó. Không đóng terminal và không nhấn
Ctrl+C nếu vẫn muốn ứng dụng tiếp tục kết nối với máy chủ phát triển.


4. CÁCH DÙNG CÁC CỬA SỔ TRÊN MÀN HÌNH
-----------------------------------------------------------------------------------------------------------
A. Visual Studio Code
- Explorer bên trái: xem thư mục và file mã nguồn.
- Các tab phía trên: mở file đang chỉnh sửa, ví dụ OnboardingScreen.tsx,
  LoginScreen.tsx, RegisterScreen.tsx, HomeScreen.tsx, AppNavigator.tsx.
- Terminal phía dưới: nhập lệnh chạy dự án và xem thông báo lỗi.
- Không cần sửa README.md để chạy ứng dụng.

B. Android Emulator
- Đây là điện thoại Android ảo trên máy tính.
- Dùng chuột để chạm nút, nhập thông tin và chuyển màn hình như điện thoại thật.
- Nếu bàn phím ảo không hiện khi chọn ô nhập, nhấp lại vào ô nhập hoặc kiểm tra
  cài đặt bàn phím của máy ảo.
- Sau khi sửa giao diện, có thể chờ Expo tự tải lại. Nếu cần tải lại thủ công,
  dùng phím r trong terminal Expo khi terminal đang nhận lệnh.

C. Terminal Expo
- Dòng thông báo và nhật ký chạy xuất hiện ở đây.
- QR code và địa chỉ exp:// là thông tin kết nối của Expo.
- Khi chạy Android Emulator trên cùng máy tính, ưu tiên phím a để yêu cầu Expo
  mở ứng dụng Android; không cần quét QR bằng điện thoại thật.


5. CÁC MÀN HÌNH/PHẦN ĐÃ CÓ TRONG MÃ NGUỒN
-----------------------------------------------------------------------------------------------------------
Dựa trên các file đang thấy trong thư mục src/screens và src/navigation:

1. OnboardingScreen.tsx
   - File màn hình giới thiệu ban đầu (Onboarding).
   - Có thể dùng để giới thiệu mục đích ứng dụng trước khi người dùng vào phần
     đăng nhập/đăng ký.
   - Cần chạy ứng dụng để kiểm tra chính xác giao diện và thao tác thực tế.

2. LoginScreen.tsx
   - File màn hình đăng nhập.
   - Dùng để hiển thị giao diện đăng nhập.
   - Không được mặc định rằng đăng nhập thật đã hoạt động; cần kiểm tra phần
     xử lý nút và kết nối API trong mã nguồn.

3. RegisterScreen.tsx
   - File màn hình đăng ký tài khoản.
   - File giao diện đã có trong dự án.
   - Cần kiểm tra luồng đăng ký và API trước khi kết luận đăng ký tài khoản thật
     đã hoàn thiện.

4. HomeScreen.tsx
   - File màn hình chính (Home) đã có trong thư mục screens.
   - Việc file tồn tại không đảm bảo màn hình này đã được nối vào luồng điều
     hướng hoặc người dùng đã chuyển tới được màn hình đó.

5. AppNavigator.tsx
   - File điều hướng giữa các màn hình.
   - Khi muốn biết nút nào chuyển sang màn hình nào, kiểm tra cấu hình tại đây.

6. App.tsx
   - File đầu vào cấp ứng dụng, thường dùng để gọi phần điều hướng chính.

7. src/services/
   - Thư mục chứa các phần dịch vụ, ví dụ phần gọi API.
   - Cấu hình địa chỉ API cần phù hợp với môi trường đang chạy.

TÓM TẮT TRẠNG THÁI:
- Đã có các file màn hình: Onboarding, Login, Register và Home.
- Đã có file điều hướng AppNavigator và file App.tsx.
- Cần chạy thực tế để xác nhận luồng điều hướng từng màn hình.
- Không khẳng định đăng nhập, đăng ký, lưu dữ liệu hay kết nối backend đã hoạt
  động nếu chưa kiểm tra và thử thành công.


6. ĐỊA CHỈ API KHI CHẠY TRÊN ANDROID
-----------------------------------------------------------------------------------------------------------
Trong cấu hình dự án đã được ghi nhận, địa chỉ API dành cho Android Emulator là:

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

