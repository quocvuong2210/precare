---
name: api-contract-sync
description: Synchronize FastAPI Pydantic v2 schemas and endpoints with Web Doctor (web_doctor/) and Mobile App (mobile_app/) TypeScript strict interfaces and API services/hooks, including HTTP 202 Celery job polling. Trigger when backend schemas/routes change or when building client API integration.
---

# Skill: API Contract Sync (FastAPI <-> Web Doctor & Mobile App)

## Objective
Eliminate schema drift between FastAPI (`backend/app/schemas/`), API Contract documentation (`docs/API_Contract_Interface/`), and client applications (`web_doctor/src/`, `mobile_app/src/`). Enforce strict TypeScript typing with clinical unit suffixes and generate deterministic data-fetching services/hooks.

---

## Pre-Flight Context Check
Before modifying any files:
1. Read `/AGENTS.md`, `/backend/AGENTS.md`, `/web_doctor/AGENTS.md`, and `/mobile_app/AGENTS.md`.
2. Inspect the target FastAPI router in `backend/app/api/` and its corresponding Pydantic v2 DTOs in `backend/app/schemas/` (verify exact field names, nullability, enum values, and HTTP response status codes).
3. Check `docs/API_Contract_Interface/` to ensure endpoint contracts remain aligned with documentation.

---

## Step-by-Step Execution Workflow

### Step 1: Map Pydantic v2 Schemas to TypeScript Strict Interfaces
1. Open or create the corresponding domain type file in `web_doctor/src/types/` (e.g., `pregnancyProfile.types.ts`, `auth.types.ts`, `deletion.types.ts`) and mirror shared contracts in `mobile_app/src/`.
2. Translate every Pydantic field accurately:
   - `UUID` / `datetime` / `date` $\rightarrow$ `string` (document ISO-8601 format in JSDoc).
   - `Optional[T]` / `T | None` $\rightarrow$ `T | null`.
   - Python `Enum` $\rightarrow$ TypeScript string union type (e.g., `export type IngestStatus = 'PENDING' | 'PROCESSING' | 'NEEDS_REVIEW' | 'COMPLETED' | 'FAILED';`).
3. **Clinical Unit Preservation (STRICT):**
   - Never strip unit suffixes during translation. Preserve exact units: `gaDays: number`, `efwGrams: number`, `crlMm: number`, `bpdMm: number`, `hcMm: number`, `acMm: number`, `flMm: number`, `ntMm: number`, `afiCm: number`.
   - **Zero `any` Policy:** Never use `any`, `@ts-ignore`, or loose `Record<string, any>`.

### Step 2: Implement Typed API Services (`web_doctor/src/services/` & `mobile_app/src/services/`)
1. Centralize HTTP calls inside `web_doctor/src/services/<domain>.service.ts` (using `api.ts`) and `mobile_app/src/services/api.ts`.
2. Explicitly type both request payloads (`Create<Entity>Request`, `Update<Entity>Request`) and response bodies (`<Entity>Response`).
3. Never hardcode base URLs or embed raw `axios`/`fetch` calls inside React/React Native UI screens or components.

### Step 3: Build TanStack Query Hooks & Query Key Factory (`web_doctor/`)
1. Define a hierarchical Query Key Factory in the service module:
   ```ts
   export const checkupKeys = {
     all: ['checkups'] as const,
     byPregnancy: (pregnancyId: string) => [...checkupKeys.all, 'pregnancy', pregnancyId] as const,
     detail: (recordId: string) => [...checkupKeys.all, 'detail', recordId] as const,
     ingestJob: (fileId: string) => [...checkupKeys.all, 'ingest', fileId] as const,
   };
   ```
2. Implement `useQuery` hooks for reads and `useMutation` hooks for writes, automatically invalidating the exact affected query keys in `onSuccess`.

### Step 4: Configure Async Celery Polling (If Endpoint Returns `HTTP 202 Accepted`)
When the backend endpoint queues an asynchronous Celery worker task (e.g., `process_ocr_task` in `backend/app/workers/`):
1. Create a status-polling hook using TanStack Query's `refetchInterval`:
   - Poll every `2000ms` while `status === 'PENDING' || status === 'PROCESSING'`.
   - Return `false` in `refetchInterval` immediately when `status` reaches `'NEEDS_REVIEW'`, `'COMPLETED'`, or `'FAILED'`.
2. Invalidate the parent pregnancy's checkup timeline, `ReviewIngestQueue`, and `TrajectoryChart` queries immediately upon job completion.

### Step 5: Sync API Contract Documentation (`docs/API_Contract_Interface/`)
If a new endpoint or breaking payload change was introduced, update the corresponding Markdown specification inside `docs/API_Contract_Interface/` to keep team documentation accurate.

---

## Verification Checklist
- [ ] Run `npx tsc --noEmit` inside `/web_doctor` and `/mobile_app` to verify zero TypeScript compilation errors.
- [ ] Confirm all nullable fields match Pydantic `None` defaults.
- [ ] Confirm no PII (patient names, phone numbers, national IDs) or raw clinical records are persisted in `localStorage` or unencrypted `AsyncStorage`.