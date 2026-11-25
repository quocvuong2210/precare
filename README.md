# PreCare - Digital Paraclinical Records & Pregnancy Tracking System
*(Hệ thống số hóa hồ sơ cận lâm sàng và theo dõi thai kỳ)*

## System Architecture

PreCare is designed as a modular micro-services monorepo architecture:

- `backend`: FastAPI Gateway & Core Business Logic + Celery Workers (Auth, Records, Confirmation Barrier, Audit Logs, Report PDF Generation).
- `analysis_service`: Clinical Analysis Microservice (Hadlock & INTERGROWTH-21st growth charts, Rule-based Engine, RACA-Net Model inference, Safety override logic).
- `web_doctor`: Doctor Portal (React 18 + TypeScript + Vite + Recharts Centile Trajectory Curves).
- `mobile_app`: Pregnant Woman Mobile App (React Native / Flutter scaffold).
- `infra`: Docker Compose, PostgreSQL 16, Redis, MinIO Object Storage.

---

## Architectural Rules & Safety Commitments

1. **Decoupled Architecture**: Backend and Analysis Service are independent. Backend falls back to the clinical rule engine if the ML model is unreachable.
2. **Confirmation Barrier**: Raw OCR payloads are ingested into `uploaded_files` (`status='extracted'`). Data CANNOT enter `biometric_data` or `clinical_records` without explicit doctor confirmation via `POST /api/v1/ingest/confirm`.
3. **Safety / Red-Flag Override**: Warning level follows `max(rule_level, model_level)`. Machine Learning can ONLY elevate warning levels, NEVER lower a clinical red flag.
4. **Audit Logging & Versioning**: All clinical data accesses are tracked in `audit_logs`. Every analysis result persists `model_version` and `rules_version`.

---

## Quick Start (Local Development)

### 1. Docker Compose Setup
```bash
cp .env.example .env
docker-compose up --build -d

docker-compose down
```

### 2. Services Access Points
- **Doctor Web Portal**: `http://localhost:3000`
- **FastAPI Backend Swagger**: `http://localhost:8000/docs`
- **Analysis Microservice OpenAPI**: `http://localhost:8001/docs`
- **MinIO Storage Console**: `http://localhost:9001` (User: `precare_minio`, Pass: `precare_minio_secret`)

### 3. Demo Accounts & Seed Data
PreCare provides a comprehensive set of pre-seeded accounts (doctors, pregnant women, and admin) initialized automatically via `init-db/01-init.sql`.

👉 **[Chi tiết danh sách tài khoản & kịch bản kiểm thử lâm sàng (docs/SEED_ACCOUNTS.md)](docs/SEED_ACCOUNTS.md)**
- **Mật khẩu chung cho tất cả tài khoản:** `password123`
- **Tài khoản Bác sĩ chính:** `bacsi.leminh@phusantw.org` / `password123`
- **Tài khoản Thai phụ mẫu (thai kỳ chuẩn):** `haiyen.le@gmail.com` / `password123`
- **Tài khoản Thai phụ mẫu (cảnh báo FGR):** `thaochi.nguyen@gmail.com` / `password123`

## Run the Mobile App on Android

From the repository root, install the Mobile dependencies:

```bash
cd mobile_app
npm ci
```

### Create the Android emulator

1. Open Android Studio and open **Device Manager**. From the Welcome screen, choose **More Actions > Virtual Device Manager**; from an open project, choose **Tools > Device Manager**.
2. Select **Create Device**, choose a Pixel phone profile (for example, Pixel 8), then select **Next**.
3. Select a system image and download it if prompted. Select **Next**, then **Finish**.
4. In Device Manager, start the new virtual device with the **Play** button. Name it `Pixel_8` so the command below can find it.

In PowerShell, list the available Android Virtual Devices (AVDs):

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -list-avds
```

Start the `Pixel_8` emulator. Run this command in a separate PowerShell window:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Pixel_8
```

In the `mobile_app` folder, start Expo:

```bash
npm run start
```

When Expo is ready, press `a` in the terminal to open the app in the running emulator. Keep the Expo terminal open while using the app.

---

## Testing Safety Override Constraint

```bash
# Run unit tests for Analysis Microservice safety override
cd analysis_service
pytest tests/test_safety_override.py -v
```
