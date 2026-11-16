# AGENTS.md - PreCare Analysis & ML Service Rules (Hadlock Rule Engine & RACA-Net)

## 1. Service Scope & Tech Stack
This file governs all code inside `/analysis_service`. It extends the root `/AGENTS.md` rules.
- **Role:** Dedicated microservice for clinical biometrics evaluation, Hadlock & INTERGROWTH-21st percentile calculations, and RACA-Net deep learning growth abnormality detection.
- **Tech Stack:** Python 3.11+, FastAPI (port 8001), NumPy, SciPy (`scipy.stats.norm`), Pydantic Settings.
- **Stateless Operation:** This service does NOT connect directly to the database or object storage; it receives biometric payloads via HTTP and returns structured clinical risk assessments.

---

## 2. Directory Structure & Layer Boundaries
Code inside `analysis_service/` must adhere to the following layout:
- `app/api/endpoints.py`:
  - `POST /api/v1/predict`: Primary endpoint. Runs clinical rule analysis and RACA-Net deep learning inference, combined via the Safety Fusion Constraint.
  - `POST /api/v1/rules`: Fallback endpoint for deterministic clinical rule evaluation (Hadlock formulas, Z-scores, percentiles, and red flag warnings).
  - `GET /api/v1/health`: Health status returning `rule_version` and `model_version`.
- `app/core/`:
  - `config.py`: Service configuration and version tracking (`RULE_VERSION`, `MODEL_VERSION`).
  - `constants.py`: Hadlock polynomial regression formulas (BPD, HC, AC, FL, EFW) and standard deviations.
- `app/engines/`:
  - `rule_engine.py`: Single-timepoint biometric evaluation, Z-score and percentile calculations via `scipy.stats.norm.cdf`, and deterministic red-flag evaluations (`green`, `yellow`, `red`).
  - `model_engine.py`: Deep learning **RACA-Net** model wrapper (Time-aware conditional growth encoding architecture) and safety fusion enforcement (`fuse_warning_levels`).
- `tests/`:
  - `test_safety_override.py`: Automated tests verifying the Safety Fusion Constraint and boundary condition handling.

---

## 3. Non-Negotiable Safety Fusion Constraint (RÀNG BUỘC AN TOÀN BẤT BIẾN)
All risk evaluations combining clinical rules and deep learning predictions MUST strictly enforce:

$$\text{Final Warning Level} = \max(\text{Clinical Rule Level}, \text{Model Prediction Level})$$

### Warning Level Hierarchy
$$\text{green (1)} < \text{yellow (2)} < \text{red (3)}$$

### Safety Rules:
1. **Model Elevation Only:** The machine learning model is **ONLY permitted to elevate** the warning level (e.g., green $\rightarrow$ yellow, green $\rightarrow$ red, yellow $\rightarrow$ red).
2. **Never Suppress Clinical Red Flags:** The machine learning model is **ABSOLUTELY FORBIDDEN from downgrading** or suppressing a clinical rule warning. If the rule engine flags a RED level (e.g., `EFW < 3rd percentile` or `AC < 3rd percentile`), the final warning level MUST remain `red`, regardless of how low the model's anomaly probability is.
3. **Dual Explanations:** Output separate, appropriate explanations for both doctor (`explanation_doctor`) and expectant mother (`explanation_patient`), accompanied by the mandatory medical disclaimer.

---

## 4. Obstetric Rule Engine Standards (`rule_engine.py`)
- **Reference Standards:** Hadlock FP et al. (BPD, HC, AC, FL, EFW) and INTERGROWTH-21st Project reference curves.
- **Biometric Input Units:**
  - `gestational_age_days`: `int` (Total days, e.g., 210 = 30 weeks 0 days).
  - `bpd`, `hc`, `ac`, `fl`: `float` in millimeters (`mm`).
  - `efw`: `float` in grams (`g`).
- **Z-Score & Percentile Computation:**
  $$Z = \frac{\text{value} - \text{expected}}{\text{SD}}, \quad \text{Percentile} = \Phi(Z) \times 100$$
- **Clinical Red Flag Thresholds:**
  - **RED (Severe Anomaly):** `EFW < 3rd percentile` or `AC < 3rd percentile` (Severe FGR / fetal malnutrition).
  - **YELLOW (Warning):** `EFW` or `AC` $< 10\text{th}$ percentile (SGA / mild FGR) or $> 97\text{th}$ percentile (LGA / macrosomia); cranial/femur measurements outside $5\text{th}–95\text{th}$ percentiles.
  - **GREEN (Normal):** All biometric parameters within the physiological $10\text{th}–90\text{th}$ percentile range.

---

## 5. RACA-Net Deep Learning Inference Standards (`model_engine.py`)
This section governs the integration of the **RACA-Net** (Time-aware conditional growth encoding architecture) model:

### 1. Time-Aware Sequence Validation
- **Chronological Sorting & $\Delta t$ Encoding:** Historical ultrasound visits must be sorted ascending by `ga_days`. The inter-visit interval ($\Delta t_i = \text{ga\_days}_i - \text{ga\_days}_{i-1}$) must be computed for time-aware encoding.
- **Minimum Sequence Length:** RACA-Net requires longitudinal context (at least $N \ge 2$ visits separated by $\ge 14$ days). If fewer than 2 visits are available, skip RACA-Net and fallback cleanly to single-timepoint `rule_engine.analyze()`.

### 2. Feature Vectors & Normalization
- Feature inputs must match training dimensions and units: `[ga_days, bpd_mm, hc_mm, ac_mm, fl_mm, efw_grams]` plus maternal baseline conditioning features (masked cleanly if optional values are absent).
- Apply versioned scaler parameters (`scaler_stats.json` alongside model weights)—never perform ad-hoc batch normalization on single-patient inference.

### 3. Decision-Support Principle (Never Auto-Diagnose)
- RACA-Net predictions are strictly decision-support risk indicators for obstetricians.
- The service must return `model_version`, `rules_version`, `anomaly_probability`, `raw_model_level`, `final_warning_level`, and feature attribution metadata.

---

## 6. Resilience & Fallback Strategy
- If model inference encounters an error, missing weights, or exceeds the timeout budget, the endpoint MUST gracefully degrade to pure clinical rule evaluation via `rule_engine.analyze()` (`POST /api/v1/rules`), logging the exception without dropping the request.
