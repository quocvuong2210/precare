# PreCare – Detailed Project Plan & Schedule

- **Project Code:** C1SE.22 (CMU-IS 450)
- **System Name:** PreCare – A Clinical Support System for Digitizing Paraclinical Records and Pregnancy Monitoring
- **Document Version:** 1.1 (September 18, 2026)

---

## 1. Phase 1: Start Up (15 Days)

| No. | Task / Activity | Duration | Start Date | End Date | Assignee | Effort (Person-Hours) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Start Up** | **15 days** | **Aug 08, 2026** | **Aug 24, 2026** | **Team** | **225** |
| 1.1 | Gathering Requirement | 10 days | Aug 24, 2026 | Sep 03, 2026 | Team | 150 |
| 1.2 | Create Proposal Document | 2 days | Sep 05, 2026 | Sep 08, 2026 | Team | 32 |
| 1.3 | Project Kick-off Meeting | 3 days | Sep 08, 2026 | Sep 13, 2026 | Team | 45 |
| 1.4 | Make Project Plan Document | 3 days | Sep 14, 2026 | Sep 18, 2026 | Tram | 15 |
| 1.5 | Make Architecture Document | 4 days | Sep 14, 2026 | Sep 18, 2026 | Hung, Thuan, Vuong | 12 |
| 1.6 | Make Product Backlog, WBS | 3 days | Sep 16, 2026 | Sep 19, 2026 | Vuong | 9 |
| 1.7 | Review Document | 1 day | Sep 20, 2026 | Sep 21, 2026 | Team | 15 |

---

## 2. Phase 2: Development (84 Days | Sep 14, 2026 – Dec 06, 2026)

### 2.1. Sprint 1: Infrastructure, DevOps & Authentication (21 Days)

| No. | Epic / Task | Duration | Start Date | End Date | Assignee | Effort (Person-Hours) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **2.1** | **Sprint 1** | **21 days** | **Sep 14, 2026** | **Oct 04, 2026** | **Team** | **207** |
| **2.1.1** | **[EPIC 1] INFRA-DEVOPS: Infrastructure & Containerization** | **12 days** | **Sep 14, 2026** | **Sep 25, 2026** | **Vuong, Hung, Thuan** | **270** |
| - 1.1.1 | Configure Git repository, Gitflow branches, pre-commit | 5 days | Sep 14, 2026 | Sep 18, 2026 | Vuong | 45 |
| - 1.1.2 | Configure basic CI for linting and test suite | 4 days | Sep 14, 2026 | Sep 17, 2026 | Vuong | 36 |
| - 1.2.2 | Set up PostgreSQL 15+ service with JSONB support | 4 days | Sep 18, 2026 | Sep 21, 2026 | Vuong | 36 |
| - 1.2.3 | Configure Redis broker & Celery worker connection | 5 days | Sep 27, 2026 | Oct 01, 2026 | Vuong | 45 |
| **2.1.2** | **[EPIC 2] M-AUTH: Authentication, RBAC & Audit Trail** | **14 days** | **Sep 21, 2026** | **Oct 04, 2026** | **Team** | **267** |
| - 2.1.1 | `(BE)` Design `users` table, password encryption | 4 days | Sep 21, 2026 | Sep 24, 2026 | Vuong | 36 |
| - 2.1.2 | `(BE)` Implement Register, Login, JWT Tokens API | 8 days | Sep 25, 2026 | Oct 02, 2026 | Vuong | 72 |
| - 2.1.3 | `(Web/Mobile)` Build Register / Login / Forgot PW forms | 2 days | Sep 21, 2026 | Sep 22, 2026 | Nhi, Tram, Hung, Thuan | 24 |
| - 2.2.1 | `(BE)` FastAPI Security dependencies for role check | 5 days | Sep 27, 2026 | Oct 01, 2026 | Vuong | 45 |
| - 2.2.2 | `(Web)` Configure React Private Routes | 2 days | Sep 23, 2026 | Sep 24, 2026 | Nhi, Tram | 12 |
| - 2.2.3 | `(Mobile)` Restrict data scope for Pregnant Women | 1 day | Sep 23, 2026 | Sep 23, 2026 | Hung, Thuan | 6 |
| - 2.3.1 | `(BE)` Design `access_audit_logs` table | 3 days | Oct 02, 2026 | Oct 04, 2026 | Vuong | 27 |
| - 2.3.2 | `(BE)` Attach interceptor to log read/write actions | 5 days | Sep 30, 2026 | Oct 04, 2026 | Vuong | 45 |

---

### 2.2. Sprint 2: Records & Ingest Pipeline (21 Days)

| No. | Epic / Task | Duration | Start Date | End Date | Assignee | Effort (Person-Hours) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **2.2** | **Sprint 2 (Records & Ingest Pipeline)** | **21 days** | **Oct 05, 2026** | **Oct 25, 2026** | **Team** | **669** |
| **2.2.1** | **[EPIC 3] M-RECORD: Pregnancy Profile & Visits** | **14 days** | **Oct 05, 2026** | **Oct 18, 2026** | **Team** | **180** |
| - 3.1.1 | `(BE)` Design `pregnancy_records` schema | 4 days | Oct 05, 2026 | Oct 05, 2026 | Vuong | 36 |
| - 3.1.2 | `(BE)` Gestational age & due date calculation logic | 3 days | Oct 09, 2026 | Oct 11, 2026 | Vuong | 27 |
| - 3.1.3 | `(Web/Mobile)` Initial pregnancy info input form | 1 day | Oct 05, 2026 | Oct 05, 2026 | Nhi, Tram, Hung, Thuan | 12 |
| - 3.2.1 | `(BE)` Design visits & biometrics schema | 5 days | Oct 12, 2026 | Oct 16, 2026 | Vuong | 45 |
| - 3.2.2 | `(Web)` Visits Timeline interface | 5 days | Oct 12, 2026 | Oct 16, 2026 | Nhi, Tram | 30 |
| - 3.2.3 | `(BE/Web)` Record deletion request function | 2 days | Oct 17, 2026 | Oct 18, 2026 | Team | 30 |
| **2.2.2** | **[EPIC 4] M-INGEST: Document Upload & OCR Worker** | **21 days** | **Oct 05, 2026** | **Oct 25, 2026** | **Team** | **435** |
| - 4.1.1 | `(Client)` Drag-and-drop file upload component | 1 day | Oct 06, 2026 | Oct 06, 2026 | Nhi, Tram, Hung, Thuan | 12 |
| - 4.1.2 | `(BE)` Save raw file to Storage, generate Celery task | 7 days | Oct 07, 2026 | Oct 13, 2026 | Vuong | 63 |
| - 4.2.1 | `(Worker)` Extract direct text layer (Digital PDF) | 7 days | Oct 14, 2026 | Oct 20, 2026 | Vuong, Hung, Thuan | 63 |
| - 4.2.2 | `(Worker)` PaddleOCR pipeline for images/scans | 12 days | Oct 08, 2026 | Oct 19, 2026 | Vuong, Hung, Thuan | 108 |
| - 4.2.3 | `(Worker)` Regex & heuristic parser for metrics | 8 days | Oct 18, 2026 | Oct 25, 2026 | Vuong, Hung, Thuan | 72 |
| - 4.3.1 | `(Web/Mobile)` Split-screen verification interface | 2 days | Oct 20, 2026 | Oct 21, 2026 | Nhi, Tram, Hung, Thuan | 24 |
| - 4.3.2 | `(BE)` `is_verified` flag, prevent record overwrite | 4 days | Oct 22, 2026 | Oct 25, 2026 | Vuong | 36 |
| - 4.3.3 | `(BE)` Human corrections audit table | 5 days | Oct 21, 2026 | Oct 25, 2026 | Vuong | 45 |
| - 4.4.1 | `(Web/Mobile)` Manual ingest fallback form | 1 day | Oct 24, 2026 | Oct 24, 2026 | Nhi, Tram, Hung, Thuan | 12 |
| **2.2.3** | **[EPIC 8] ADMIN (P1): Biomarker Mapping Queue** | **7 days** | **Oct 19, 2026** | **Oct 25, 2026** | **Team** | **54** |
| - 8.2.1 | `(BE)` Save strange labels to `unknown_biomarkers` | 4 days | Oct 19, 2026 | Oct 22, 2026 | Vuong | 36 |
| - 8.2.2 | `(Web Admin)` Interface to approve & map standard metrics | 3 days | Oct 23, 2026 | Oct 25, 2026 | Nhi, Tram | 18 |

---

### 2.3. Sprint 3: Analysis Rules & Visualization (21 Days)

| No. | Epic / Task | Duration | Start Date | End Date | Assignee | Effort (Person-Hours) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **2.3** | **Sprint 3 (Analysis Rules & Visualization)** | **21 days** | **Oct 26, 2026** | **Nov 15, 2026** | **Team** | **336** |
| **2.3.1** | **[EPIC 5] M-ANALYSIS: Clinical Evaluation (Rules)** | **21 days** | **Oct 26, 2026** | **Nov 15, 2026** | **Vuong, Hung, Thuan** | **234** |
| - 5.1.1 | `(BE)` Load LMS INTERGROWTH-21st reference tables | 4 days | Oct 26, 2026 | Oct 29, 2026 | Vuong | 36 |
| - 5.1.2 | `(BE)` Write Z-score and percentile calculation logic | 5 days | Nov 04, 2026 | Nov 08, 2026 | Vuong | 45 |
| - 5.2.2 | `(BE)` Save evaluation results with `rule_version` | 4 days | Nov 09, 2026 | Nov 12, 2026 | Vuong | 36 |
| - 5.3.1 | `(BE)` Warning logic = `max(rule, model)` | 3 days | Nov 13, 2026 | Nov 15, 2026 | Vuong | 27 |
| - 5.3.2 | `(BE)` Unit Test to ensure ML doesn't override rules | 5 days | Nov 11, 2026 | Nov 15, 2026 | Vuong | 45 |
| **2.3.2** | **[EPIC 6] M-VIZ: Trajectory Charts & Percentiles** | **14 days** | **Nov 02, 2026** | **Nov 15, 2026** | **Team** | **102** |
| - 6.1.1 | `(Web)` Render time-series charts (Doctor) | 4 days | Nov 02, 2026 | Nov 05, 2026 | Nhi, Tram | 24 |
| - 6.1.2 | `(Web)` Render reference percentile bands | 3 days | Nov 06, 2026 | Nov 08, 2026 | Nhi, Tram | 18 |
| - 6.1.3 | `(Web)` Highlight abnormal points with red flags | 3 days | Nov 09, 2026 | Nov 11, 2026 | Nhi, Tram | 18 |
| - 6.2.1 | `(Mobile)` Simplified EFW chart (Patient) | 3 days | Nov 06, 2026 | Nov 08, 2026 | Hung, Thuan | 18 |
| - 6.2.2 | `(Mobile)` Status summary card with friendly language | 2 days | Nov 09, 2026 | Nov 10, 2026 | Hung, Thuan | 12 |
| - 6.3.1 | `(Web/Mobile)` Delta comparison table between visits | 1 day | Nov 12, 2026 | Nov 12, 2026 | Nhi, Tram, Hung, Thuan | 12 |

---

### 2.4. Sprint 4: Reports, Admin & Testing (21 Days)

| No. | Epic / Task | Duration | Start Date | End Date | Assignee | Effort (Person-Hours) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **2.4** | **Sprint 4 (Reports, Admin & Testing)** | **21 days** | **Nov 16, 2026** | **Dec 06, 2026** | **Team** | **396** |
| **2.4.1** | **[EPIC 7] M-REPORT: PDF Report Generation** | **13 days** | **Nov 16, 2026** | **Nov 28, 2026** | **Team** | **192** |
| - 7.1.1 | `(BE)` Build professional PDF template | 8 days | Nov 16, 2026 | Nov 23, 2026 | Vuong | 72 |
| - 7.1.2 | `(Web)` Export report button and preview | 2 days | Nov 24, 2026 | Nov 25, 2026 | Nhi, Tram | 12 |
| - 7.2.1 | `(BE)` Build simplified PDF template (Patient) | 5 days | Nov 19, 2026 | Nov 23, 2026 | Vuong | 45 |
| - 7.2.2 | `(Mobile)` PDF view and download functionality | 1 day | Nov 24, 2026 | Nov 24, 2026 | Hung, Thuan | 6 |
| - 7.3.1 | `(Web/Mobile)` Attach fixed mandatory Disclaimer | 1 day | Nov 26, 2026 | Nov 26, 2026 | Nhi, Tram, Hung, Thuan | 12 |
| - 7.3.2 | `(BE)` Safety filter blocking LLM drug name outputs | 5 days | Nov 24, 2026 | Nov 28, 2026 | Vuong | 45 |
| **2.4.2** | **[EPIC 8] ADMIN (P2): User Account Management** | **4 days** | **Nov 29, 2026** | **Dec 02, 2026** | **Nhi, Tram** | **24** |
| - 8.1.1 | `(Web)` Account list, lock/unlock, role assignment | 4 days | Nov 29, 2026 | Dec 02, 2026 | Nhi, Tram | 24 |
| **2.4.3** | **[EPIC 9] QA-SEC: Testing & Performance Tuning** | **5 days** | **Dec 02, 2026** | **Dec 06, 2026** | **Vuong, Hung, Thuan** | **180** |
| - 9.1.1 | Benchmark, optimize record load API `< 2 seconds` | 5 days | Dec 02, 2026 | Dec 06, 2026 | Vuong, Hung, Thuan | 45 |
| - 9.1.2 | Optimize Celery OCR worker to finish `< 30 seconds` | 5 days | Dec 02, 2026 | Dec 06, 2026 | Vuong, Hung, Thuan | 45 |
| - 9.2.1 | PII Data Anonymization Script | 5 days | Dec 02, 2026 | Dec 06, 2026 | Vuong, Hung, Thuan | 45 |
| - 9.2.2 | Review HTTPS/TLS config and security headers | 5 days | Dec 02, 2026 | Dec 06, 2026 | Vuong, Hung, Thuan | 45 |