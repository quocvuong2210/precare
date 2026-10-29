/**
 * Ticket Module Exports
 */
// STORY-2.1: Quản lý Tài khoản & Xác thực Người dùng (M-AUTH)
export * from './auth.types';

// =========================================================================
// CLINICAL & ULTRASOUND DOMAIN TYPES
// =========================================================================
export type WarningLevel = 'green' | 'yellow' | 'red';
export type IngestStatus = 'pending' | 'processing' | 'extracted' | 'verified' | 'failed';
export type OcrFileStatus = 'pending' | 'processing' | 'extracted' | 'verified' | 'failed';
export type BiometricStatus = 'pending_verification' | 'verified';

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
  status: BiometricStatus;
  verified_by?: string;
}

export interface AnalysisResult {
  id: string;
  pregnancy_profile_id: string;
  checkup_id: string;
  biometric_data_id: string;
  model_version: string;
  rules_version: string;
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

/**
 * Hồ sơ thai kỳ & Đối soát cận lâm sàng (DTO hiển thị danh sách khám & cận lâm sàng)
 * Đồng bộ chính xác với API Gateway (:8000) & Analysis Microservice (:8001)
 */
export interface ClinicalPregnancyRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  edd: string;
  eddFormatted: string;
  trimester: 1 | 2 | 3;
  trimesterName: string;
  gestationalAgeDays: number;
  gestationalAgeFormatted: string;
  checkupDate: string;
  biometricSummary: string;
  warningLevel: WarningLevel;
  ocrStatus: OcrFileStatus;
  biometricStatus: BiometricStatus;
  hasOcrAttachment?: boolean;
  uploadedFileId?: string;
  // Thuộc tính tương thích ngược cho các dialog tìm kiếm & modal
  appointmentTime?: string;
  reason: string;
  status?: 'confirmed' | 'pending' | 'completed';
  roomNumber?: string;
  gestationalAge: string | { weeks?: number; days?: number; formatted: string };
}
