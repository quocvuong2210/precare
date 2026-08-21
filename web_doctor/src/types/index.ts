export type WarningLevel = 'green' | 'yellow' | 'red';
export type IngestStatus = 'pending' | 'processing' | 'extracted' | 'verified' | 'failed';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'doctor' | 'pregnant_woman' | 'admin';
  phone_number?: string;
}

export interface PregnancyProfile {
  id: string;
  patient_id: string;
  primary_doctor_id?: string;
  patient_name?: string;
  lmp?: string;
  q1_ultrasound_date?: string;
  q1_gestational_weeks?: number;
  q1_gestational_days?: number;
  edd: string;
  status: 'active' | 'completed' | 'terminated';
  created_at: string;
}

export interface Checkup {
  id: string;
  pregnancy_profile_id: string;
  doctor_id: string;
  checkup_date: string;
  gestational_age_days: number;
  weight_kg?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  notes?: string;
}

export interface OCRRawPayload {
  document_type: string;
  extracted_fields: {
    bpd_mm?: number;
    hc_mm?: number;
    ac_mm?: number;
    fl_mm?: number;
    efw_g?: number;
  };
  raw_text: string;
  confidence_scores: Record<string, number>;
}

export interface UploadedFileReview {
  uploaded_file_id: string;
  status: IngestStatus;
  ocr_raw_payload?: OCRRawPayload;
  file_url: string;
  pregnancy_profile_id: string;
  checkup_id?: string;
}

export interface BiometricData {
  id: string;
  pregnancy_profile_id: string;
  checkup_id: string;
  uploaded_file_id?: string;
  gestational_age_days: number;
  bpd?: number;
  hc?: number;
  ac?: number;
  fl?: number;
  efw?: number;
  status: 'pending_verification' | 'verified';
  verified_by?: string;
}

export interface AnalysisResult {
  id: string;
  pregnancy_profile_id: string;
  checkup_id: string;
  biometric_data_id: string;
  model_version: str;
  rules_version: str;
  bpd_zscore?: number;
  bpd_percentile?: number;
  hc_zscore?: number;
  hc_percentile?: number;
  ac_zscore?: number;
  ac_percentile?: number;
  fl_zscore?: number;
  fl_percentile?: number;
  efw_zscore?: number;
  efw_percentile?: number;
  anomaly_probability: number;
  warning_level: WarningLevel;
  explanation_doctor: string;
  explanation_patient: string;
  disclaimer_text: string;
  analyzed_at: string;
}
