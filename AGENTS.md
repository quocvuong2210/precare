# AGENTS.md - PreCare Project Context & Engineering Rules

## 1. Project Overview
**PreCare** is a clinical decision support and paraclinical medical record digitization platform designed to track fetal growth trajectories and detect gestational abnormalities early.

### System Architecture & Tech Stack
- **Web Dashboard (Doctor Portal - `web_doctor/`):** React, TypeScript (Strict mode), Vite, Tailwind CSS, data visualization for fetal growth percentile curves and paraclinical queue review.
- **Mobile Client (Patient Companion - `mobile_app/`):** React Native / Expo, TypeScript, patient companion interface for record access, milestone tracking, and OCR document capture.
- **Backend API Gateway (`backend/`):** Python 3.11+, FastAPI (RESTful asynchronous APIs, Pydantic v2 validation), SQLAlchemy 2.0+ ORM.
- **Analysis & ML Service (`analysis_service/`):** Python, FastAPI, NumPy, SciPy, dedicated microservice hosting the Hadlock & Intergrowth-21st rule engine and the RACA-Net deep learning growth abnormality detection model wrapper with safety fusion constraint.
- **Database & Storage:** PostgreSQL 16 (relational clinical data), Redis 7 (message broker & caching), MinIO / S3 Object Storage (raw ultrasound images & scanned paraclinical documents).
- **Asynchronous Workers:** Celery (handling heavy tasks: paraclinical OCR/digitization, longitudinal growth trajectory calculations, clinical alert evaluations).
- **Infrastructure:** Docker & Docker Compose (`docker-compose.yml`) for multi-container orchestration and local development.

---

## 2. Obstetric & Fetal Biometry Domain Glossary (CRITICAL)
AI agents MUST strictly adhere to these medical abbreviations, units, and storage conventions. **Never mix units (e.g., `cm` vs `mm`) or alter gestational age formats in the database.**

| Code | Full Term | Vietnamese Term | Standard Unit | Storage & Calculation Rules |
| :--- | :--- | :--- | :--- | :--- |
| **GA** | Gestational Age | Tuổi thai | `days` (DB) | **Always store as total integer days in PostgreSQL** (e.g., `226`). Format to `"32w 2d"` (`32 tuần 2 ngày`) only at the UI/presentation layer. |
| **CRL** | Crown-Rump Length | Chiều dài đầu mông | `mm` | Used primarily in the first trimester (up to ~13w 6d) to establish/confirm GA. |
| **BPD** | Biparietal Diameter | Đường kính lưỡng đỉnh | `mm` | Standard second/third-trimester cranial measurement. |
| **HC** | Head Circumference | Chu vi vòng đầu | `mm` | Measured in the same plane as BPD. |
| **AC** | Abdominal Circumference | Chu vi vòng bụng | `mm` | Most sensitive single biometric indicator for fetal growth disturbances (FGR/macrosomia). |
| **FL** | Femur Length | Chiều dài xương đùi | `mm` | Diaphysis length measurement. |
| **EFW** | Estimated Fetal Weight | Ước tính cân nặng thai nhi | `grams` (`g`) | Calculated using standard Hadlock formulas (typically Hadlock IV using BPD, HC, AC, FL). |
| **NT** | Nuchal Translucency | Độ mờ da gáy | `mm` | Measured between 11w 0d and 13w 6d. Values $\ge 3.0\text{ mm}$ require clinical flagging. |
| **AFI** | Amniotic Fluid Index | Chỉ số ối | `cm` | Sum of deepest vertical pockets in 4 quadrants. Flag oligohydramnios ($< 5\text{ cm}$) and polyhydramnios ($> 24\text{ cm}$). |

### Clinical Growth & Red Flag Rules
- **Percentile Curves:** Fetal growth charts must evaluate measurements against standard reference curves at the **3rd, 10th, 50th, 90th, and 97th percentiles** for the exact `GA` (in days).
- **Clinical Red Flags:**
  - **FGR (Fetal Growth Restriction):** `EFW` or `AC` $< 10\text{th}$ percentile (severe if $< 3\text{rd}$ percentile).
  - **LGA / Macrosomia:** `EFW` or `AC` $> 90\text{th}$ percentile.
  - **Growth Trajectory Drop:** A drop of $> 20$ percentile points across consecutive ultrasound exams must trigger a clinical warning flag, even if the current value remains within the $10\text{th}–90\text{th}$ normal range.

---

## 3. Medical Data Privacy & Security Rules
- **Zero PII in Logs:** Never log Personally Identifiable Information (patient full name, phone number, national ID, address) in application logs, Celery task logs, or error tracebacks. Always reference records by internal `patient_id` or `record_id` (UUID).
- **Anonymized Fixtures:** When generating seed data, unit tests, or mock JSON responses, use synthetic/anonymized patient identifiers and realistic but fictional biometric trajectories.
- **File Access:** Raw ultrasound scans and PDFs in object storage must never be exposed via public URLs; always use short-lived pre-signed URLs authenticated through the backend.

---

## 4. Team Workflow & Git Conventions

### Branching Strategy
- `main`: Production-ready, protected branch.
- `develop`: Integration branch for completed features.
- Feature branches must branch off `develop` using the format:
  - `feat/<scope>-<short-description>` (e.g., `feat/be-hadlock-calculator`, `feat/fe-percentile-chart`)
  - `fix/<scope>-<short-description>` (e.g., `fix/celery-ocr-retry`)
  - `docs/<short-description>` (e.g., `docs/update-agents-rules`)

### Commit Message Format (Conventional Commits)
`<type>(<scope>): <imperative summary>`
- **Types:** `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `ci`
- **Scopes:** `be`, `fe`, `worker`, `db`, `docker`, `domain`
- *Example:* `feat(be): add Hadlock IV EFW calculation and percentile lookup service`

### Pull Request & Code Review Checklist
1. **Contract Sync:** Any change to FastAPI Pydantic schemas must be reflected in Frontend TypeScript interfaces within the same PR or linked immediately.
2. **Database Migrations:** Schema modifications must include a tested Alembic migration script (both `upgrade` and `downgrade`).
3. **Self-Contained Context:** If a PR introduces a new architectural pattern, shared utility, or domain rule, update the relevant `AGENTS.md` file in the same PR.

---

## 5. Repository Structure & File Placement Rules

### 5.1. Actual Workspace Directory Tree
Dưới đây là sơ đồ cây thư mục thực tế của dự án **PreCare** (đã loại bỏ các thư mục build/cache như `.git`, `node_modules`, `__pycache__`, `.venv`, `.pytest_cache`):

```text
precare/
├── .github/                         # Cấu hình GitHub Actions và quản lý CI/CD
│   └── workflows/                   # Pipelines tự động hóa CI (ci-backend, ci-web, ci-analysis)
├── analysis_service/                # [Phân hệ ML & Rule Analysis] Dịch vụ tính toán lâm sàng và mô hình RACA-Net
│   ├── app/                         # Mã nguồn FastAPI microservice
│   │   ├── api/                     # Endpoints routing (/api/v1/health, /rules, /predict)
│   │   ├── core/                    # Cấu hình hệ thống (config.py) và hằng số ngưỡng y tế (constants.py)
│   │   └── engines/                 # Động cơ phân tích: Rule Engine lâm sàng & Model Engine (RACA-Net)
│   ├── tests/                       # Unit test cho động cơ phân tích và kiểm thử an toàn Safety Override
│   ├── Dockerfile                   # Dockerfile triển khai container analysis_service (Port 8001)
│   └── requirements.txt             # Danh sách thư viện Python (FastAPI, NumPy, SciPy, Pydantic)
├── backend/                         # [Phân hệ Backend Gateway & Workers] API Gateway và điều phối tác vụ nền
│   ├── app/                         # Mã nguồn chính của Backend application
│   │   ├── api/                     # HTTP router & endpoints (auth, checkup, pregnancy, ingest, deletion_request, deps)
│   │   ├── core/                    # Cấu hình chung (config.py), kết nối DB (database.py), JWT (security.py), audit trail (audit.py)
│   │   ├── models/                  # SQLAlchemy ORM models (User, PregnancyProfile, BiometricData, Checkup, UploadedFile, v.v.)
│   │   ├── schemas/                 # Pydantic v2 DTOs (Request / Response validation schemas)
│   │   ├── services/                # Business logic, tính toán tuổi thai sản khoa, OTP, email, MinIO storage
│   │   ├── templates/               # Mẫu Jinja2 HTML email (OTP kích hoạt, reset password)
│   │   └── workers/                 # Celery workers & background tasks (OCR số hóa tài liệu, hàng đợi xử lý)
│   ├── tests/                       # Bộ kiểm thử tự động Backend (Pytest, Pytest-asyncio)
│   ├── AGENTS.md                    # Hướng dẫn kỹ thuật và quy tắc riêng cho Backend & Celery
│   ├── Dockerfile                   # Dockerfile triển khai container backend & celery_worker (Port 8000)
│   └── requirements.txt             # Danh sách thư viện Python Backend (FastAPI, SQLAlchemy, Celery, Redis, MinIO)
├── docs/                            # [Tài liệu kỹ thuật] Tài liệu hệ thống và hợp đồng giao tiếp API
│   └── API_Contract_Interface/      # Đặc tả API contracts chi tiết từng Story (Auth, Pregnancy, Visits, Upload)
├── init-db/                         # [Cơ sở dữ liệu] Scripts khởi tạo cơ sở dữ liệu cho container PostgreSQL
│   └── 01-init.sql                  # Script SQL DDL tạo schemas và bảng dữ liệu ban đầu
├── mobile_app/                      # [Phân hệ Mobile Client] Ứng dụng di động dành cho Thai phụ / Sản phụ
│   ├── src/                         # Mã nguồn ứng dụng React Native / Expo
│   │   ├── assets/                  # Hình ảnh tĩnh, minh họa onboarding, icons
│   │   ├── components/              # Reusable UI components (EmergencyContacts, PrimaryButton)
│   │   ├── context/                 # Context quản lý trạng thái ứng dụng (AppSettingsContext)
│   │   ├── navigation/              # Cấu hình điều hướng React Navigation (AppNavigator, MainTabs, UploadNavigator)
│   │   ├── screens/                 # Màn hình chức năng (Home, Charts, Upload, Appointments, Auth, Profile)
│   │   ├── services/                # API client giao tiếp với Backend Gateway (api.ts)
│   │   └── theme/                   # Design system tokens, màu sắc (colors.ts), cấu hình hiển thị (settings.ts)
│   ├── tests/                       # Unit tests cho mobile client
│   ├── AGENTS.md                    # Hướng dẫn kỹ thuật và quy tắc riêng cho Mobile Client
│   ├── app.json                     # Cấu hình dự án Expo / React Native
│   ├── package.json                 # Quản lý dependencies JavaScript/TypeScript của Mobile Client
│   └── tsconfig.json                # Cấu hình TypeScript cho Mobile Client
├── web_doctor/                      # [Phân hệ Frontend Doctor Portal] Web Dashboard dành cho Bác sĩ Sản khoa
│   ├── public/                      # Static assets phục vụ trình duyệt
│   ├── scripts/                     # Shell/Node scripts hỗ trợ build và kiểm thử
│   ├── src/                         # Mã nguồn ứng dụng React TypeScript
│   │   ├── assets/                  # Hình ảnh, logo, icons
│   │   ├── components/              # Reusable components & biểu đồ lâm sàng (TrajectoryChart, ReviewIngestQueue, UI primitives)
│   │   ├── lib/                     # Tiện ích bổ trợ (utils.ts)
│   │   ├── pages/                   # Các trang giao diện (Dashboard, PatientDetail, PregnancyProfile, Auth)
│   │   ├── services/                # API communication layer, TanStack Query hooks & services (patient, auth, v.v.)
│   │   └── types/                   # TypeScript interfaces đồng bộ với backend Pydantic schemas
│   ├── AGENTS.md                    # Hướng dẫn kỹ thuật và quy tắc riêng cho Web Doctor Dashboard
│   ├── Dockerfile                   # Dockerfile build và phục vụ Web Dashboard qua Nginx (Port 3000)
│   ├── nginx.conf                   # Cấu hình máy chủ web Nginx cho single-page application (SPA)
│   ├── package.json                 # Quản lý dependencies Web Frontend (React 18, Vite, Tailwind CSS)
│   ├── tsconfig.json                # Cấu hình TypeScript Strict Mode cho Frontend
│   └── vite.config.ts               # Cấu hình bundler Vite
├── .env.example                     # File mẫu biến môi trường chuẩn cho toàn bộ hệ sinh thái PreCare
├── docker-compose.yml               # File cấu hình điều phối toàn bộ Docker services (db, redis, minio, backend, workers, web)
├── git_flow.md                      # Quy chuẩn chi tiết về quy trình phân nhánh Git Flow và Review PR
└── AGENTS.md                        # File hướng dẫn trung tâm chi phối toàn bộ Workspace (Root Context)
```

---

### 5.2. Layer Boundaries & File Placement Rules (Ranh giới tầng và quy tắc đặt file)

Để đảm bảo kiến trúc phân tách ranh giới rõ ràng, dễ bảo trì và mở rộng, AI agents và lập trình viên phải tuân thủ nghiêm ngặt các quy tắc đặt file theo từng phân hệ:

#### 1. Backend Gateway & Workers (`backend/`)
- **API Endpoints (`backend/app/api/`):** Chỉ xử lý HTTP routing, request parsing, phân quyền RBAC/auth (`Depends(get_current_active_user)`), và trả HTTP response status code. **Tuyệt đối không viết câu truy vấn cơ sở dữ liệu (`select()`, raw SQL) hay công thức tính toán lâm sàng trong route.**
- **Pydantic Schemas (`backend/app/schemas/`):** Tách bạch rõ ràng giữa request payload và response payload: `<Entity>Create`, `<Entity>Update`, `<Entity>Response`. Mọi schema phải validate chặt chẽ phạm vi giá trị y tế (ví dụ: `ga_days: int = Field(..., ge=14, le=310)`).
- **ORM Database Models (`backend/app/models/`):** Khai báo các thực thể SQLAlchemy 2.0. Mọi bảng dữ liệu lâm sàng bắt buộc có khóa chính `UUID`, cột audit `created_at`, `updated_at`, và hỗ trợ soft-delete `deleted_at`.
- **Domain Services (`backend/app/services/`):** Nơi chứa toàn bộ nghiệp vụ lõi phía Backend: điều phối tính toán tuổi thai (`pregnancy_calculator.py`), tương tác kho lưu trữ đối tượng MinIO (`storage_service.py`), tạo/xác thực mã OTP (`otp_service.py`), gửi email thông báo (`email_service.py`), và gọi tích hợp sang `analysis_service`.
- **Asynchronous Workers (`backend/app/workers/`):** Khai báo Celery task (`celery_app.py`, `tasks.py`). Mọi task xử lý nặng (như OCR số hóa tài liệu `process_ocr_task`, tổng hợp quỹ đạo tăng trưởng) phải đảm bảo **tính bất biến/idempotency** và chỉ nhận tham số định danh nguyên thủy (`uploaded_file_id_str: str`), không truyền payload dữ liệu lớn qua Redis broker.

#### 2. Clinical Analysis & Machine Learning Service (`analysis_service/` - Tương ứng phân hệ ML / Rule Engine)
- **API Endpoints (`analysis_service/app/api/`):** Định nghĩa các route microservice:
  - `POST /api/v1/rules`: Đánh giá thuần túy theo luật lâm sàng (Hadlock & Intergrowth-21st) – dùng làm fallback khi mô hình ML không khả dụng.
  - `POST /api/v1/predict`: Endpoint chính thực thi suy luận mô hình RACA-Net kết hợp Safety Fusion.
  - `GET /api/v1/health`: Kiểm tra sức khỏe dịch vụ và phiên bản `rule_version`, `model_version`.
- **Core Configuration (`analysis_service/app/core/`):** Chứa thiết lập môi trường (`config.py`) và ngưỡng tham chiếu y tế chuẩn (`constants.py`).
- **Engines (`analysis_service/app/engines/`):**
  - **Rule Engine (`rule_engine.py`):** Cài đặt công thức Hadlock IV EFW, tính toán phân vị bách phân vị (3rd, 10th, 50th, 90th, 97th) và phát hiện các cờ đỏ lâm sàng determinism (`FGR`, `LGA`, bất thường `NT`, `AFI`).
  - **Model Engine (`model_engine.py`):** Wrapper quản lý mô hình Deep Learning **RACA-Net** (Time-aware conditional growth encoding architecture). Chịu trách nhiệm load trọng số, tiền xử lý chuỗi thời gian siêu âm, tính toán xác suất bất thường (`anomaly_probability`).
  - **Safety Fusion Constraint (Ràng buộc an toàn bất biến):**
    $$\text{Final Warning Level} = \max(\text{Clinical Rule Level}, \text{Model Prediction Level})$$
    *Mô hình Deep Learning CHỈ ĐƯỢC PHÉP NÂNG MỨC CẢNH BÁO, TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP HẠ MỨC CẢNH BÁO LÂM SÀNG CỦA HỆ LUẬT.*

#### 3. Web Dashboard Bác sĩ (`web_doctor/` - Tương ứng phân hệ Web Frontend)
- **Biểu đồ lâm sàng (`web_doctor/src/components/`):** Đặt các biểu đồ theo dõi tăng trưởng thai nhi (`TrajectoryChart.tsx`), bắt buộc trực quan hóa đủ 5 dải bách phân vị chuẩn (3rd, 10th, 50th, 90th, 97th) và hiển thị các mốc cảnh báo cờ đỏ.
- **UI Components & Layouts (`web_doctor/src/components/` và `web_doctor/src/components/ui/`):** Các thành phần giao diện tái sử dụng: hàng đợi duyệt số hóa (`ReviewIngestQueue.tsx`), quản lý yêu cầu xóa dữ liệu (`DeletionRequestsReview.tsx`, `RequestDeletionModal.tsx`), và các controls cơ bản (button, input, alert, checkbox).
- **Màn hình trang (`web_doctor/src/pages/`):** Mỗi trang đại diện cho một view hoàn chỉnh: `Dashboard.tsx` (tổng quan khám & hàng đợi duyệt), `PatientDetail.tsx` (chi tiết hồ sơ & biểu đồ thai phụ), `PregnancyProfile.tsx`, `Login.tsx`, `Register.tsx`.
- **API Services & Data Fetching (`web_doctor/src/services/`):** Quản lý kết nối HTTP (`api.ts`), custom hooks / Axios services (`patient.service.ts`, `pregnancyProfile.service.ts`, `auth.service.ts`, `deletion.service.ts`). Tuyệt đối không gọi trực tiếp `axios.get/post` bên trong view components. Áp dụng cơ chế polling định kỳ để theo dõi trạng thái tác vụ OCR từ Backend (`HTTP 202 Accepted`).
- **Contracts & Data Types (`web_doctor/src/types/`):** Chứa định nghĩa interface TypeScript (`index.ts`, `auth.types.ts`, `pregnancyProfile.types.ts`, `deletion.types.ts`) đồng bộ 100% với Pydantic Schemas của Backend. Nghiêm cấm sử dụng kiểu `any`.

#### 4. Mobile Companion App (`mobile_app/` - Tương ứng phân hệ Mobile Client)
- **Màn hình giao diện (`mobile_app/src/screens/`):** Phân nhóm theo nghiệp vụ:
  - Màn hình chính & theo dõi: `HomeScreen.tsx`, `ChartsScreen.tsx`, `AppointmentsScreen.tsx`.
  - Thu thập tài liệu siêu âm & cận lâm sàng: `UploadScreen.tsx`, `ManualResultEntryScreen.tsx`.
  - Phân hệ xác thực & tài khoản: `LoginScreen.tsx`, `OnboardingScreen.tsx`, `SettingsScreen.tsx`, và các thư mục con `forgot-password/`, `register/`, `profile/`.
- **Điều hướng (`mobile_app/src/navigation/`):** Định nghĩa cấu trúc stack và tab bar (`AppNavigator.tsx`, `MainTabs.tsx`, `UploadNavigator.tsx`).
- **Thành phần giao diện tái sử dụng (`mobile_app/src/components/`):** Các UI cards, buttons thân thiện với sản phụ (`EmergencyContacts.tsx`, `PrimaryButton.tsx`, các modal hướng dẫn chụp ảnh tài liệu rõ nét).
- **Trạng thái & Context (`mobile_app/src/context/`):** Quản lý cài đặt người dùng, trạng thái offline (`AppSettingsContext.tsx`).
- **Dịch vụ mạng (`mobile_app/src/services/`):** Khởi tạo client kết nối Backend Gateway (`api.ts`), tự động gắn Bearer Token và quản lý refresh token an toàn qua SecureStore.
- **Design Tokens & Theme (`mobile_app/src/theme/`):** Bảng màu giao diện ấm áp, dễ đọc, giảm căng thẳng cho sản phụ (`colors.ts`), kích thước chữ và cài đặt hiển thị (`settings.ts`).

#### 5. Cơ sở dữ liệu & Hạ tầng điều phối (`init-db/`, `docker-compose.yml`, `docs/`)
- **Khởi tạo dữ liệu (`init-db/`):** File `01-init.sql` chứa cấu trúc bảng ban đầu và dữ liệu seed mẫu cho container PostgreSQL.
- **Tài liệu hợp đồng API (`docs/API_Contract_Interface/`):** Mọi sự thay đổi về endpoint hay payload DTO giữa Backend và Frontend/Mobile phải được cập nhật tương ứng vào tài liệu contract tại đây.
- **Điều phối Container (`docker-compose.yml`):** Cấu hình toàn bộ mạng lưới microservices cục bộ (`db`, `redis`, `minio`, `analysis_service`, `backend`, `celery_worker`, `web_doctor`).

---

## 6. Sub-Directory AGENTS.md Instructions

Khi thực hiện nhiệm vụ bên trong các thư mục con chuyên biệt, AI agents và lập trình viên phải đọc và tuân thủ các quy định chi tiết trong file `AGENTS.md` tương ứng của từng phân hệ:

- [backend/AGENTS.md](file:///d:/IT/NCKH/precare/backend/AGENTS.md): Quy định chi tiết kiến trúc phân tầng FastAPI (Router $\rightarrow$ Service $\rightarrow$ Repository $\rightarrow$ ORM Model), chuẩn Pydantic v2, quản lý transaction với SQLAlchemy AsyncSession, quy chuẩn di chuyển dữ liệu Alembic, đảm bảo tính idempotent của Celery Task, và hướng dẫn tích hợp mô hình Machine Learning RACA-Net.
- [web_doctor/AGENTS.md](file:///d:/IT/NCKH/precare/web_doctor/AGENTS.md): Quy định chi tiết cho Web Dashboard Bác sĩ (React 18, TypeScript Strict Mode, Vite, Tailwind CSS), quy tắc đồng bộ contract Pydantic, quản lý server state bằng TanStack Query, polling tác vụ số hóa OCR, và tiêu chuẩn trực quan hóa biểu đồ bách phân vị tăng trưởng thai nhi (3rd, 10th, 50th, 90th, 97th).
- [mobile_app/AGENTS.md](file:///d:/IT/NCKH/precare/mobile_app/AGENTS.md): Quy định chi tiết cho ứng dụng di động Thai phụ (React Native / Expo), nguyên tắc truyền thông lâm sàng nhân văn (không gây hoang mang cho sản phụ), quy trình chụp ảnh/nén ảnh cận lâm sàng, bước xác nhận OCR bắt buộc, bảo mật lưu trữ token qua hardware-backed SecureStore, và thiết kế UI công thái học một tay.
