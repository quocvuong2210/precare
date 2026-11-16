---
name: api-contract-sync
description: Synchronize FastAPI Pydantic v2 schemas and endpoints with Frontend/Mobile TypeScript strict interfaces and TanStack Query hooks, including HTTP 202 Celery job polling. Trigger when backend schemas/routes change or when building frontend API integration.
---

# Skill: API Contract Sync (FastAPI <-> React TypeScript)

## Objective
Eliminate schema drift between FastAPI (`backend/app/schemas/`) and client applications (`frontend/src/`, `mobile/src/`), enforce strict TypeScript typing with clinical unit suffixes, and generate deterministic TanStack Query hooks.

---

## Pre-Flight Context Check
1. Read `/AGENTS.md`, `/backend/AGENTS.md`, and `/frontend/AGENTS.md`.
2. Inspect the target FastAPI router in `backend/app/api/` and its corresponding Pydantic v2 models in `backend/app/schemas/` (check exact field names, optionality, enum values, and HTTP response status codes).

---

## Step-by-Step Execution Workflow

### Step 1: Map Pydantic v2 Schemas to TypeScript Strict Interfaces
1. Open or create the corresponding domain type file in `frontend/src/types/<domain>.ts` (and `mobile/src/types/<domain>.ts` if shared).
2. Translate every Pydantic field accurately:
   - `UUID` / `datetime` / `date` $\rightarrow$ `string` (document ISO-8601 format in JSDoc).
   - `Optional[T]` / `T | None` $\rightarrow$ `T | null`.
   - Python `Enum` $\rightarrow$ TypeScript string union type (e.g., `export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';`).
3. **Clinical Unit Preservation (STRICT):**
   - Never strip unit suffixes during translation. Keep `gaDays: number`, `efwGrams: number`, `bpdMm: number`, `hcMm: number`, `acMm: number`, `flMm: number`, `ntMm: number`, `afiCm: number`.
   - **Zero `any` Policy:** Never use `any` or `unknown` for known API payloads.

### Step 2: Implement Typed API Client Functions (`src/api/<domain>.api.ts`)
1. Centralize raw Axios/Fetch calls inside `frontend/src/api/<domain>.api.ts`.
2. Explicitly type both request payloads (`Create<Entity>Request`, `Update<Entity>Request`) and response bodies (`<Entity>Response`).
3. Never hardcode base URLs or embed raw HTTP calls inside React UI components.

### Step 3: Build TanStack Query Hooks & Query Key Factory
1. Define a hierarchical Query Key Factory at the top of `src/api/<domain>.api.ts`:
   ```ts
   export const ultrasoundKeys = {
     all: ['ultrasounds'] as const,
     byPregnancy: (pregnancyId: string) => [...ultrasoundKeys.all, 'pregnancy', pregnancyId] as const,
     detail: (recordId: string) => [...ultrasoundKeys.all, 'detail', recordId] as const,
     jobStatus: (jobId: string) => [...ultrasoundKeys.all, 'job', jobId] as const,
   };