# AGENTS.md - PreCare Mobile Client Rules (Maternal Companion App)

## 1. Mobile Scope & Stack
This file governs all mobile application code inside `/mobile_app`. It extends the root `/AGENTS.md` rules.
- **Target Audience:** Expectant mothers (patients)—prioritize warm, accessible, anxiety-reducing UX over dense clinical terminology.
- **Core:** TypeScript (`strict: true`), React Native / Expo, modular component architecture.
- **Networking & Caching:** Typed API client synced with FastAPI `/api/v1` schemas (`src/services/api.ts`), offline-first read caching for historical pregnancy records.

---

## 2. Patient-Friendly Clinical Communication Rules (CRITICAL)
Unlike the Doctor Dashboard (`/web_doctor`), the mobile client translates raw biometric data into reassuring, understandable guidance for patients:
1. **Human-Readable Gestational Age:** Always display `gaDays` in localized Vietnamese format (`"32 tuần 2 ngày"`) alongside milestone context (e.g., `"Tam cá nguyệt thứ 3"`).
2. **Non-Alarmist Alert Framing:**
   - Never display raw technical diagnostic codes like `"SEVERE FGR RED FLAG"` directly to the patient.
   - When the backend flags an abnormal growth trajectory or measurement (`< 10th` or `> 90th` percentile, or `> 20` percentile drop), render a calm, actionable advisory banner (e.g., *"Chỉ số tăng trưởng cần bác sĩ theo dõi thêm — Hãy mang kết quả này đến lịch khám gần nhất"*).
3. **Unit Clarity:** Always pair clinical measurements with familiar comparisons or clear labels (e.g., `EFW: 1,850 g` — *"Cân nặng ước tính của bé"*).

---

## 3. Paraclinical Record Capture & OCR Upload Pipeline
Capturing paper ultrasound reports and lab results is a core mobile workflow:
1. **Client-Side Image Optimization:**
   - Before uploading to the backend/MinIO, compress captured photos (JPEG/WebP, max width `2048px`, quality `0.85`) while preserving text sharpness so Celery OCR workers can extract numbers accurately without mobile data timeouts.
   - Provide a document framing guide overlay on the camera screen to reduce skewed or blurry ultrasound printouts.
2. **Async Digitization State Machine:**
   - Handle the `HTTP 202 Accepted` response from the upload endpoint with clear progress states: `UPLOADING` $\rightarrow$ `OCR_PROCESSING` (polling Celery job status) $\rightarrow$ `NEEDS_REVIEW` $\rightarrow$ `VERIFIED`.
3. **Mandatory Patient Confirmation Step:**
   - Never save OCR-extracted biometric values (`BPD`, `HC`, `AC`, `FL`, `EFW`, `AFI`, `NT`) silently. Present an editable confirmation card where the mother can verify the extracted numbers against her paper printout before final submission.

---

## 4. Mobile Security & Health Data Privacy
- **Secure Token Storage:** Store JWT access/refresh tokens exclusively in hardware-backed encrypted storage (`Expo SecureStore` / `Keychain` / `Keystore`). **Never use plain `AsyncStorage` or `SharedPreferences` for auth tokens or medical records.**
- **Biometric App Lock:** Support optional FaceID / Fingerprint unlock when resuming the app from the background to protect sensitive pregnancy records.
- **Zero PHI in Crash Reports:** Strip all patient names, phone numbers, and ultrasound values from crash analytics (Sentry/Firebase) and console logs.
- **Pre-Signed Media Handling:** Fetch ultrasound images via short-lived pre-signed URLs from the backend; clear sensitive cached images from temporary storage on logout.

---

## 5. Mobile UX & Accessibility Standards
- **One-Handed Ergonomics & Readability:** Use a minimum body font size of `15px–16px` with generous touch targets (`>= 44x44pt`), accommodating expectant mothers experiencing fatigue or visual strain.
- **Simplified Growth Visualization:** Use a clean, smoothed growth curve showing the baby's trajectory against a single shaded *"Vùng phát triển khỏe mạnh"* (10th–90th percentile band) rather than overwhelming patients with 5 dense clinical lines.
- **Offline Resilience:** Cache the user's latest pregnancy timeline, upcoming antenatal checkup reminders, and verified ultrasound history locally (encrypted) so records remain viewable inside hospital clinics with weak cellular reception.

---

## 6. Directory Structure (`mobile_app/src/`)
Follow the scoped layout strictly:
- `src/components/`: Reusable UI components (`EmergencyContacts`, `PrimaryButton`).
- `src/context/`: Application state management (`AppSettingsContext`).
- `src/navigation/`: Navigation stacks & tabs (`AppNavigator`, `MainTabs`, `UploadNavigator`).
- `src/screens/`: Domain screens (`HomeScreen`, `ChartsScreen`, `UploadScreen`, `forgot-password/`, `register/`, `profile/`).
- `src/services/`: API client (`api.ts`) synced with backend schemas.
- `src/theme/`: Visual theme, colors (`colors.ts`), settings (`settings.ts`).
