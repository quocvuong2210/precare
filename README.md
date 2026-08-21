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
```

### 2. Services Access Points
- **Doctor Web Portal**: `http://localhost:3000`
- **FastAPI Backend Swagger**: `http://localhost:8000/docs`
- **Analysis Microservice OpenAPI**: `http://localhost:8001/docs`
- **MinIO Storage Console**: `http://localhost:9001` (User: `precare_minio`, Pass: `precare_minio_secret`)

---

## Testing Safety Override Constraint

```bash
# Run unit tests for Analysis Microservice safety override
cd analysis_service
pytest tests/test_safety_override.py -v
```
