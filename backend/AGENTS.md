# AGENTS.md - PreCare Backend Rules (FastAPI, PostgreSQL & Celery)

## 1. Backend Scope & Stack
This file governs all backend code inside `/backend`. It extends the root `/AGENTS.md` rules.
- **Framework:** Python 3.11+, FastAPI (async route handlers), Pydantic v2 (`ConfigDict(from_attributes=True)`).
- **Database:** PostgreSQL 16 with SQLAlchemy 2.0+ (Sync Session via `create_engine` with `pool_pre_ping=True`).
- **Schema Management:** DDL managed via `init-db/01-init.sql` (mapped to SQLAlchemy models in `app/models/`).
- **Analysis Microservice Integration:** Delegated clinical calculation & ML inference via asynchronous HTTP requests to `analysis_service` (port 8001).
- **Background Processing:** Celery + Redis broker (paraclinical OCR digitization, queue management, clinical alert evaluations).
- **Object Storage:** MinIO / S3-compatible client for raw ultrasound images and PDF reports.

---

## 2. Layered Architecture & Dependency Flow (STRICT 3-TIER)
The PreCare backend strictly enforces a 3-tier architecture:
$$\text{API Router (app/api/)} \longrightarrow \text{Domain Service (app/services/)} \longrightarrow \text{ORM Model (app/models/)}$$

> [!IMPORTANT]
> The backend does **NOT** use a separate `repositories/` layer. AI agents must **NEVER** generate a `repositories/` folder or introduce unnecessary abstraction layers.

1. **API Layer (`app/api/`):**
   - Handle HTTP routing, query/body parsing, authentication/RBAC checks (`Depends(get_current_active_user)`), and HTTP response status codes.
   - **Forbidden:** Direct raw SQL execution (`db.execute(text(...))`), raw database schema manipulations, or direct mathematical/clinical formulas inside route handlers.
2. **Schema Layer (`app/schemas/`):**
   - Clearly separate request and response DTOs: `<Entity>Create`, `<Entity>Update`, `<Entity>Response`.
   - Enforce strict medical range validation using Pydantic `Field` (e.g., `ga_days: int = Field(..., ge=14, le=310)`, `efw_grams: float = Field(..., gt=0)`).
3. **Domain Service Layer (`app/services/`):**
   - Encapsulate all business logic, obstetric calculations (`pregnancy_calculator.py`), OTP/Email operations (`otp_service.py`, `email_service.py`), and storage management (`storage_service.py`).
   - Interact directly with the database using SQLAlchemy `Session` (`db: Session = Depends(get_db)`), managing transactional commits and rollbacks at the service boundary.
   - Coordinate external microservice HTTP calls to `analysis_service` and dispatch Celery tasks (`task.delay()`).
4. **ORM Model Layer (`app/models/`):**
   - Declarative SQLAlchemy models reflecting the database schema.
   - Enforce UUID primary keys, relationships, and audit timestamps.

---

## 3. Database Schema & DDL Rules
- **DDL Source of Truth (`init-db/01-init.sql`):** The primary DDL definitions for PostgreSQL reside in `init-db/01-init.sql`. During container startup, Docker initializes the database from this file, while `backend/app/main.py` invokes `Base.metadata.create_all(bind=engine)`.
- **Schema Modification Policy:**
  - Any database schema change (new tables, added columns, indexes, or constraints) MUST be updated simultaneously in both `init-db/01-init.sql` and the corresponding SQLAlchemy model in `backend/app/models/`.
- **Alembic Migration Roadmap:**
  - When transitioning to staging/production environments with persistent data (where dropping/re-initializing the database is no longer feasible), the team will initialize Alembic (`alembic init alembic`) to manage linear migration versions (`upgrade()` and `downgrade()`). Until then, do not generate loose Alembic scripts without team consensus.
- **Naming Conventions:** Use `snake_case` for all table names (plural, e.g., `pregnancy_profiles`, `checkups`, `biometric_data`) and columns. Primary keys must be `UUID` (`DEFAULT gen_random_uuid()`).
- **Timestamps & Soft Deletes:** Every clinical table must include `created_at` (`TIMESTAMPTZ`, UTC), `updated_at` (`TIMESTAMPTZ`, UTC), and `deleted_at` (`TIMESTAMPTZ`, nullable) or `is_deleted` (`BOOLEAN`) for auditability—never hard-delete medical records.
- **Indexing:** Always add composite indexes on high-frequency clinical lookup patterns, specifically `(patient_id, ga_days)` and `(pregnancy_id, exam_date)`.

---

## 4. Asynchronous & Celery Worker Rules
- **Idempotency:** Every Celery task in `app/workers/` MUST be idempotent. Running the same task twice with the same `uploaded_file_id` must not create duplicate measurements or duplicate clinical alerts.
- **Lightweight Payloads:** Pass only primitive identifiers (`uploaded_file_id_str: str`, `patient_id_str: str`) as task arguments. Never serialize large JSON blobs or raw image bytes into Redis broker.
- **Retry & Timeout Policy:** Configure explicit `autoretry_for`, `max_retries=3`, and `retry_backoff=True` for external I/O (OCR pipelines, MinIO downloads).
- **Non-Blocking FastAPI:** Never call synchronous/blocking I/O (e.g., synchronous HTTP calls, `time.sleep`, heavy CPU image processing) directly inside `async def` FastAPI routes—offload to Celery or `asyncio.to_thread()`.

---

## 5. Error Handling & API Response Standards
- Raise domain-specific exceptions in `app/services/` and map them centrally to standardized JSON responses in `app/core/exceptions.py`.
- Use standard HTTP status codes: `200 OK` for reads, `201 Created` for resource creation, `202 Accepted` when a background Celery digitization job is queued, and `422 Unprocessable Entity` for schema/medical range validation errors.
- **Logging & Security:** Use structured logging (`logger.info(..., extra={"record_id": str(record_id)})`). Obey zero-PII rules: **never log patient names, phone numbers, or national IDs.**

---

## 6. Testing Standards (`backend/tests/`)
- Mirror the `app/` directory structure inside `backend/tests/`.
- Write isolated unit tests for all obstetric calculation utilities (e.g., gestational age calculation logic in `pregnancy_calculator.py`).
- Use isolated transactional DB fixtures (`db_session`) for API endpoint integration tests.

---

## 7. Integration with Analysis Microservice (`analysis_service`)
Obstetric biometrics analysis, Hadlock/INTERGROWTH-21st percentile lookups, and deep learning growth abnormality detection are decoupled from the backend gateway:

1. **Microservice Communication via HTTP:**
   - The backend communicates with `analysis_service` over HTTP using `settings.ANALYSIS_SERVICE_URL` (default: `http://localhost:8001` or `http://analysis_service:8001` in Docker).
   - Endpoints:
     - `POST /api/v1/predict`: Primary endpoint. Returns combined rule-based and RACA-Net machine learning evaluation with safety fusion enforcement.
     - `POST /api/v1/rules`: Fallback endpoint. Returns pure deterministic Hadlock rule evaluations when ML inference is unavailable.
2. **Zero ML/Tensor Dependencies in Backend:**
   - **Strict Rule:** NEVER import PyTorch, ONNX Runtime, SciPy, or deep learning model weights inside `backend/`. All tensor computations and normal distribution CDF functions are strictly isolated inside `analysis_service/`.
3. **Resilience & Graceful Degradation:**
   - When calling `analysis_service`, the backend service must wrap the HTTP request in a try-except block with a timeout.
   - If `analysis_service` is unreachable or times out, the backend should fallback to `POST /api/v1/rules` or flag the record with a clear diagnostic notice for the doctor without crashing the API request.
