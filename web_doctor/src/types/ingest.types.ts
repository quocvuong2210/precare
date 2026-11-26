/**
 * Strict TypeScript Interfaces cho phân hệ Tiếp nhận & Số hóa Cận lâm sàng (M-INGEST)
 * Đồng bộ 100% với Pydantic v2 schemas tại `backend/app/schemas/ingest.py`
 * và kết quả trích xuất từ Hybrid Fast Path (`pymupdf+pdfplumber`) / Slow Path (`PaddleOCR`).
 */

export type IngestFileStatus =
  | 'pending'
  | 'processing'
  | 'extracted'
  | 'verified'
  | 'failed';

export type CeleryTaskState =
  | 'PENDING'
  | 'PROCESSING'
  | 'STARTED'
  | 'SUCCESS'
  | 'FAILURE'
  | 'REVOKED';

export interface UploadedFileSummary {
  id: string;
  file_name: string | null;
  document_type: string;
  file_type: string;
  file_size_bytes: number | null;
  status: IngestFileStatus | string;
  uploaded_by_name: string | null;
  verified_by_name?: string | null;
  verified_at?: string | null;
  created_at: string;
}

export interface UploadResponseData {
  file_id: string;
  task_id: string | null;
  pregnancy_profile_id: string;
  checkup_id: string | null;
  file_name: string | null;
  file_type: string;
  file_size_bytes: number | null;
  document_type: string;
  status: IngestFileStatus | string;
  tracking_url: string;
  created_at: string;
}

export interface UploadSingleResponse {
  success: boolean;
  data: UploadResponseData;
  message: string;
}

export interface BatchUploadItem {
  file_id: string;
  task_id: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  status: IngestFileStatus | string;
}

export interface BatchUploadResponseData {
  batch_id: string;
  total_files: number;
  successful_enqueued: number;
  failed_enqueued: number;
  tracking_url: string;
  items: BatchUploadItem[];
}

export interface BatchUploadResponse {
  success: boolean;
  data: BatchUploadResponseData;
  message: string;
}

export interface TaskStatusResponseData {
  task_id: string;
  file_id: string | null;
  state: CeleryTaskState | string;
  progress_percentage: number;
  current_stage: string;
  stage_message: string;
  estimated_seconds_remaining: number | null;
  verification_url: string | null;
  error_code: string | null;
  can_retry: boolean | null;
}

export interface TaskStatusResponse {
  success: boolean;
  data: TaskStatusResponseData;
}

export interface BatchStatusItem {
  file_id: string;
  file_name: string | null;
  state: CeleryTaskState | string;
  progress_percentage: number;
  status: IngestFileStatus | string;
  verification_url: string | null;
}

export interface BatchStatusResponseData {
  batch_id: string;
  total_files: number;
  completed_files: number;
  failed_files: number;
  overall_progress_percentage: number;
  is_all_finished: boolean;
  files: BatchStatusItem[];
}

export interface BatchStatusResponse {
  success: boolean;
  data: BatchStatusResponseData;
}

export interface UploaderInfo {
  id: string;
  full_name: string;
  role: string;
}

/**
 * Các chỉ số sinh trắc học sản khoa chuẩn đơn vị PreCare
 * (trích xuất từ PdfFastPathExtractor hoặc OcrPipelineExtractor)
 */
export interface OcrExtractedFields {
  bpd_mm?: number | null;
  hc_mm?: number | null;
  ac_mm?: number | null;
  fl_mm?: number | null;
  efw_g?: number | null;
  crl_mm?: number | null;
  nt_mm?: number | null;
  afi_cm?: number | null;
  fhr_bpm?: number | null;
  gestational_age_days?: number | null;
}

export interface OcrClinicalSections {
  administrative_info?: {
    visit_date?: string | null;
    doctor_performer?: string | null;
    department?: string | null;
  };
  vitals?: {
    blood_pressure_systolic?: number | null;
    blood_pressure_diastolic?: number | null;
    weight_kg?: number | null;
    heart_rate_bpm?: number | null;
    temperature_c?: number | null;
    bmi?: number | null;
  };
  labs?: {
    hgb?: string | null;
    glucose?: string | null;
    urine_protein?: string | null;
    urine_ph?: string | null;
    urine_leukocyte?: string | null;
  };
  conclusions?: {
    summary?: string | null;
    recommendations?: string | null;
  };
}

export interface OcrRawPayload {
  document_type?: string;
  extraction_method?: 'pdf_text_layer_fast_path' | 'paddleocr_slow_path' | string | null;
  is_digital_pdf?: boolean;
  extracted_fields?: OcrExtractedFields;
  clinical_sections?: OcrClinicalSections;
  raw_text?: string;
  confidence_scores?: Record<string, number>;
  metadata?: {
    total_pages?: number;
    char_count?: number;
    tables_count?: number;
    engine?: string;
    is_digital_pdf?: boolean;
    processing_time_ms?: number;
    extracted_at?: string;
    note?: string;
  };
}

export interface FileDetailResponseData {
  id: string;
  pregnancy_profile_id: string;
  checkup_id: string | null;
  file_name: string | null;
  file_type: string;
  file_size_bytes: number | null;
  document_type: string;
  status: IngestFileStatus | string;
  presigned_view_url: string;
  presigned_url_expires_in_seconds: number;
  uploaded_by: UploaderInfo | null;
  ocr_raw_payload: OcrRawPayload | null;
  created_at: string;
}

export interface FileDetailResponse {
  success: boolean;
  data: FileDetailResponseData;
}

export interface PaginationMetadata {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface FileListResponseData {
  items: UploadedFileSummary[];
  pagination: PaginationMetadata;
}

export interface FileListResponse {
  success: boolean;
  data: FileListResponseData;
}

export interface CommonMessageResponse {
  success: boolean;
  message: string;
  data?: {
    file_id?: string;
    task_id?: string;
    tracking_url?: string;
    status?: string;
  } | null;
}

export interface WorklistQueueItem {
  id: string;
  pregnancy_profile_id: string;
  checkup_id: string | null;
  primary_doctor_id?: string | null;
  primary_doctor_name?: string | null;
  patient_name: string;
  patient_phone: string | null;
  gestational_age_formatted: string | null;
  document_type: string;
  file_name: string | null;
  file_type: string;
  file_size_bytes: number | null;
  status: IngestFileStatus | string;
  ocr_confidence: number | null;
  uploaded_by_name: string | null;
  verified_by_name?: string | null;
  verified_at?: string | null;
  created_at: string;
}

export interface WorklistQueueResponseData {
  items: WorklistQueueItem[];
  pagination: PaginationMetadata;
}

export interface WorklistQueueResponse {
  success: boolean;
  data: WorklistQueueResponseData;
}
