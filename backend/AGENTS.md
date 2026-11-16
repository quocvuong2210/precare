# AGENTS.md - PreCare Backend Rules (FastAPI, PostgreSQL & Celery)

## 1. Backend Scope & Stack
This file governs all backend code inside `/backend`. It extends the root `/AGENTS.md` rules.
- **Framework:** Python 3.11+, FastAPI (async-first), Pydantic v2 (`ConfigDict(from_attributes=True)`).
- **Database:** PostgreSQL 15+ with SQLAlchemy 2.0+ (`AsyncSession`) and Alembic for migrations.
- **Background Processing:** Celery + Redis broker (paraclinical OCR digitization, growth trajectory calculations, clinical alert evaluation).
- **Object Storage:** MinIO / S3-compatible client for raw ultrasound images and PDF reports.

---

## 2. Layered Architecture & Dependency Flow (STRICT)
Code must strictly follow a unidirectional dependency flow: `API Router` $\rightarrow$ `Service` $\rightarrow$ `Repository` $\rightarrow$ `ORM Model`. **Never skip layers.**

1. **API Layer (`app/api/`):**
   - Handle HTTP routing, request parsing, authentication/RBAC checks (`Depends(get_current_doctor)`), and HTTP status codes only.
   - **Forbidden:** Direct database queries (`select()`, `session.execute()`) or clinical math formulas inside route functions.
2. **Schema Layer (`app/schemas/`):**
   - Separate request and response DTOs clearly: `<Entity>Create`, `<Entity>Update`, `<Entity>Response`.
   - Enforce strict field validation using Pydantic `Field` (e.g., `ga_days: int = Field(..., ge=14, le=310)`, `efw_grams: float = Field(..., gt=0)`).
3. **Service Layer (`app/services/`):**
   - Contain all business workflows and obstetric calculations (Hadlock IV EFW formula, growth percentile interpolation, red flag detection).
   - Coordinate calls across multiple repositories and trigger Celery tasks (`task.delay()`).
4. **Repository Layer (`app/repositories/`):**
   - Encapsulate all SQLAlchemy async queries.
   - Accept `AsyncSession` via dependency injection; **never call `session.commit()` inside a repository**—commit transactions at the Service or Unit-of-Work boundary so multi-step operations remain atomic.

---

## 3. Database & Alembic Migration Rules
- **Naming Conventions:** Use `snake_case` for all tables (plural, e.g., `ultrasound_records`, `fetal_measurements`) and columns. Primary keys must be `UUID` (`uuid4`).
- **Timestamps & Soft Deletes:** Every clinical table must include `created_at` (`TIMESTAMPTZ`, UTC), `updated_at` (`TIMESTAMPTZ`, UTC), and `deleted_at` (`TIMESTAMPTZ`, nullable) for auditability—never hard-delete medical records.
- **Indexing:** Always add composite indexes on high-frequency clinical lookup patterns, specifically `(patient_id, ga_days)` and `(pregnancy_id, exam_date)`.
- **Alembic Workflow:**
  - Never manually edit already-applied migration files.
  - Every schema change must generate a descriptive revision (`alembic revision --autogenerate -m "add_nt_and_afi_columns"`) and verify both `upgrade()` and `downgrade()` paths before committing.

---

## 4. Asynchronous & Celery Worker Rules
- **Idempotency:** Every Celery task in `app/workers/` MUST be idempotent. Running the same task twice with the same `record_id` must not create duplicate measurements or duplicate clinical alerts.
- **Lightweight Payloads:** Pass only primitive identifiers (`record_id: str`, `patient_id: str`) as task arguments. Never serialize large JSON blobs or raw image bytes into Redis.
- **Retry & Timeout Policy:** Configure explicit `autoretry_for`, `max_retries=3`, and `retry_backoff=True` for external I/O (OCR pipelines, MinIO downloads).
- **Non-Blocking FastAPI:** Never call synchronous/blocking I/O (e.g., `requests`, `time.sleep`, heavy CPU image processing) inside `async def` FastAPI routes—offload to Celery or `asyncio.to_thread()`.

---

## 5. Error Handling & API Response Standards
- Raise domain-specific exceptions in `app/services/` (e.g., `RecordNotFoundError`, `InvalidGestationalAgeError`) and map them centrally to HTTP responses in `app/core/exceptions.py`.
- Use standard HTTP status codes: `201` for resource creation, `202` when a background Celery digitization job is queued, `422` for clinical/schema validation errors.
- **Logging:** Use structured logging (`logger.info(..., extra={"record_id": str(record_id)})`). Strictly obey root privacy rules: **never log patient names, phone numbers, or national IDs.**

---

## 6. Testing Standards (`backend/tests/`)
- Mirror the `app/` directory structure inside `tests/`.
- Write isolated unit tests for all obstetric math and percentile threshold edge cases (e.g., exact boundary at 10th percentile, >20 percentile drop across consecutive visits).
- Use `pytest-asyncio` and isolated transactional DB fixtures for repository/API integration tests.

---

## 7. Deep Learning Inference Rules (`RACA-Net` Fetal Growth Abnormality Detection)
This section governs the integration of the **RACA-Net** (Time-aware conditional growth encoding architecture) model inside `/backend`.

### 1. Module Placement & Execution Boundary
- **Model & Inference Wrapper (`app/ml/raca_net/`):** Keep model architecture definitions, weight loading, tensor preprocessing, and post-processing isolated inside `app/ml/raca_net/`. Never import PyTorch/ONNX runtime inside `app/api/` or `app/repositories/`.
- **Async Execution via Celery:** Model inference on longitudinal ultrasound series MUST run asynchronously inside a dedicated Celery worker task (`app/workers/ml_inference.py`) triggered after new biometric records are saved/verified—never block FastAPI event loops with tensor operations.
- **Singleton Model Loading:** Load model weights (`model.eval()`, `torch.no_grad()`) once per Celery worker process startup (`@worker_process_init.connect`), never per inference request.

### 2. Time-Aware Tensor Preprocessing & Sequence Validation
- **Chronological Ordering & $\Delta t$ Encoding:** Sort all historical ultrasound visits for a pregnancy strictly ascending by `ga_days`. Compute exact inter-visit intervals ($\Delta t_i = \text{ga\_days}_i - \text{ga\_days}_{i-1}$) for the model's time-aware encoding layer.
- **Minimum Sequence Length:** RACA-Net requires longitudinal context (at least `N >= 2` distinct ultrasound visits separated by $\ge 14$ days). If a pregnancy has fewer than 2 visits, skip RACA-Net inference gracefully and rely on single-timepoint percentile rules (`Hadlock` / reference curves).
- **Feature Vector & Unit Normalization:**
  - Input features must follow the exact training feature order and units: `[ga_days, bpd_mm, hc_mm, ac_mm, fl_mm, efw_grams]` plus maternal baseline conditioning features (e.g., maternal age, BMI, parity) masked cleanly if optional values are missing.
  - Apply the exact persisted scaler/normalization parameters (`scaler_stats.json` versioned alongside model weights)—never compute ad-hoc batch normalization on single-patient inference.

### 3. Output Schema, Versioning & Clinical Guardrails
- **Model Versioning:** Every inference result stored in PostgreSQL (`growth_risk_assessments` table) MUST record `model_version` (e.g., `"raca-net-v1.0.0"`), `evaluated_at` (`TIMESTAMPTZ`), `risk_score` (`float` in `[0.0, 1.0]`), `predicted_label`, and `attention_weights` / feature attribution metadata for doctor explainability.
- **Decision-Support Framing (Never Auto-Diagnose):**
  - RACA-Net outputs are strictly **clinical decision-support risk indicators** for the obstetrician dashboard (`/frontend`).
  - Never overwrite or suppress deterministic clinical red flags (e.g., `EFW < 3rd percentile` or `NT >= 3.0 mm`). Display RACA-Net risk alerts alongside standard biometric percentile trajectories.