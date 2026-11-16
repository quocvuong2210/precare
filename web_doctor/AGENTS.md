# AGENTS.md - PreCare Frontend Rules (React TypeScript Doctor Dashboard)

## 1. Frontend Scope & Stack
This file governs all web dashboard code inside `/web_doctor`. It extends the root `/AGENTS.md` rules.
- **Core:** React 18+, TypeScript (`strict: true`), Vite, Tailwind CSS.
- **Server State & Data Fetching:** TanStack Query (React Query) + typed Axios client.
- **Client UI State:** Scoped React Context / local state (only for ephemeral UI state like active modal, chart zoom range, or selected ultrasound parameter).
- **Visualization:** Clinical charting library (e.g., Recharts / Visx) for fetal growth percentile trajectories.

---

## 2. TypeScript Strictness & API Contract Rules
- **Zero `any` Policy:** Never use `any`, `@ts-ignore`, or loose `Record<string, any>`. Use `unknown` with explicit type guards when parsing external/untrusted data.
- **Backend Contract Sync:** All API request/response types in `src/types/` MUST strictly mirror backend Pydantic schemas (including nullable fields, UUID strings, and ISO-8601 timestamps).
- **Branded / Explicit Clinical Units:** Always suffix numeric variables and props with their exact unit to prevent clinical misinterpretation (e.g., `gaDays: number`, `efwGrams: number`, `acMm: number`, `afiCm: number`). Never pass raw unlabeled numbers like `weight` or `age`.
- **Presentation-Only Formatting:** Keep `gaDays` as an integer in state and props; convert to `"32w 2d"` (`32 tuần 2 ngày`) exclusively at the presentation layer via `src/services/pregnancyCalculator.ts` or helpers.

---

## 3. Server State, Caching & Async OCR Polling (`src/services/`)
- **Centralized API Layer:** Components and pages MUST NEVER call `fetch` or `axios` directly. All HTTP calls live in `src/services/<domain>.service.ts` and are exposed via custom TanStack Query hooks.
- **Deterministic Query Keys:** Use structured query key factories (e.g., `['patients', patientId, 'pregnancies', pregnancyId, 'ultrasounds']`) so mutations invalidate exact cache slices cleanly.
- **Celery OCR / Digitization Polling:** When a doctor uploads a scanned ultrasound image or PDF (`HTTP 202 Accepted`), use TanStack Query's `refetchInterval` to poll job status until `status === 'COMPLETED' | 'FAILED'`, then automatically invalidate the patient's measurement list and growth chart data.
- **Zero Local Storage for PHI:** Never persist Protected Health Information (patient records, ultrasound measurements) in `localStorage` or `sessionStorage`. Store only short-lived auth tokens according to security policy.

---

## 4. Fetal Growth Percentile Chart Standards (`src/components/TrajectoryChart.tsx`)
Clinical charts are the primary diagnostic tool for doctors. AI agents must enforce these visual and functional standards:

1. **Reference Percentile Bands:**
   - Every biometric chart (`EFW`, `AC`, `BPD`, `HC`, `FL`) MUST render the 5 standard reference curves against `gaDays`: **3rd, 10th, 50th (median), 90th, and 97th percentiles**.
   - Shade the normal physiological zone (**10th–90th percentile**) subtly; render the **3rd** and **97th** curves as dashed boundary lines.
2. **Clinical Red Flag Visual Encoding:**
   - **Normal (10th–90th percentile):** Neutral clinical blue/teal markers.
   - **Borderline (3rd–10th or 90th–97th percentile):** Amber/Warning highlight (`#D97706`).
   - **Abnormal / Red Flag (< 3rd or > 97th percentile, or > 20 percentile drop):** Prominent Red highlight (`#DC2626`) with clinical alert tooltip.
