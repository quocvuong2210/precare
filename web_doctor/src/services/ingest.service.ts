/**
 * Paraclinical Document Ingestion & OCR Polling Service (M-INGEST)
 * Kết nối với Backend FastAPI `/api/v1/ingest/*` (hỗ trợ cả Hybrid Fast Path PDF & Slow Path OCR).
 */

import { apiClient } from './auth.service';
import {
  BatchStatusResponse,
  BatchStatusResponseData,
  BatchUploadResponse,
  BatchUploadResponseData,
  CommonMessageResponse,
  FileDetailResponse,
  FileDetailResponseData,
  FileListResponse,
  FileListResponseData,
  TaskStatusResponse,
  TaskStatusResponseData,
  UploadResponseData,
  UploadSingleResponse,
  WorklistQueueResponse,
  WorklistQueueResponseData,
} from '../types/ingest.types';
import {
  DocumentExtractionData,
  createBlankManualExtractionData,
  createDefaultExtractionData,
  formatFileSize,
} from '../components/ocr-workflow/mockOcrData';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string | null | undefined): boolean {
  return Boolean(value && UUID_REGEX.test(value.trim()));
}

export const ingestService = {
  /**
   * 1. Tải lên đơn lẻ 1 phiếu khám -> Backend trả về HTTP 202 Accepted + task_id
   */
  async uploadSingleDocument(
    file: File,
    pregnancyProfileId: string,
    documentType: string = 'ultrasound_report',
    checkupId?: string,
    onUploadProgress?: (percent: number) => void
  ): Promise<UploadResponseData> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('pregnancy_profile_id', pregnancyProfileId);
    formData.append('document_type', documentType);
    if (checkupId) {
      formData.append('checkup_id', checkupId);
    }

    const response = await apiClient.post<UploadSingleResponse>(
      '/ingest/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (onUploadProgress && progressEvent.total) {
            const pct = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onUploadProgress(pct);
          }
        },
      }
    );
    return response.data.data;
  },

  /**
   * 2. Tải lên hàng loạt nhiều phiếu khám (tối đa 10 files) -> HTTP 202 Accepted + batch_id
   */
  async uploadDocumentsBatch(
    files: File[],
    pregnancyProfileId: string,
    documentType: string = 'ultrasound_report',
    checkupId?: string,
    onUploadProgress?: (percent: number) => void
  ): Promise<BatchUploadResponseData> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    formData.append('pregnancy_profile_id', pregnancyProfileId);
    formData.append('document_type', documentType);
    if (checkupId) {
      formData.append('checkup_id', checkupId);
    }

    const response = await apiClient.post<BatchUploadResponse>(
      '/ingest/upload-batch',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (onUploadProgress && progressEvent.total) {
            const pct = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onUploadProgress(pct);
          }
        },
      }
    );
    return response.data.data;
  },

  /**
   * 3. Polling trạng thái xử lý của một tác vụ Celery đơn lẻ
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResponseData> {
    const response = await apiClient.get<TaskStatusResponse>(
      `/ingest/tasks/${taskId}/status`
    );
    return response.data.data;
  },

  /**
   * 4. Polling trạng thái tổng hợp của cả đợt tải hàng loạt
   */
  async getBatchStatus(batchId: string): Promise<BatchStatusResponseData> {
    const response = await apiClient.get<BatchStatusResponse>(
      `/ingest/batches/${batchId}/status`
    );
    return response.data.data;
  },

  /**
   * 5. Lấy chi tiết file sau khi trích xuất xong (Presigned URL MinIO + ocr_raw_payload)
   */
  async getFileDetail(fileId: string): Promise<FileDetailResponseData> {
    const response = await apiClient.get<FileDetailResponse>(
      `/ingest/files/${fileId}`
    );
    return response.data.data;
  },

  /**
   * 6. Lấy danh sách tài liệu đã tải lên của một hồ sơ thai kỳ
   */
  async listProfileFiles(
    profileId: string,
    params?: {
      status?: string;
      document_type?: string;
      page?: number;
      page_size?: number;
    }
  ): Promise<FileListResponseData> {
    const response = await apiClient.get<FileListResponse>(
      `/ingest/profiles/${profileId}/files`,
      { params }
    );
    return response.data.data;
  },

  /**
   * 7. Thử lại quá trình trích xuất nếu task Celery bị failed
   */
  async retryFailedFile(
    fileId: string
  ): Promise<{ file_id?: string; task_id?: string; tracking_url?: string }> {
    const response = await apiClient.post<CommonMessageResponse>(
      `/ingest/files/${fileId}/retry`
    );
    return response.data.data || {};
  },

  /**
   * 8. Xóa tài liệu tải lên nhầm (khi status là pending hoặc failed)
   */
  async deleteUploadedFile(fileId: string): Promise<void> {
    await apiClient.delete(`/ingest/files/${fileId}`);
  },

  /**
   * 9. Lấy danh sách hàng đợi tài liệu cận lâm sàng toàn khoa
   */
  async listWorklistQueue(params?: {
    status?: string;
    document_type?: string;
    page?: number;
    page_size?: number;
  }): Promise<WorklistQueueResponseData> {
    const response = await apiClient.get<WorklistQueueResponse>(
      '/ingest/queue',
      { params }
    );
    return response.data.data;
  },

  /**
   * 10. Đánh dấu tài liệu đã được bác sĩ đối chiếu và phê duyệt ở Bước 3
   */
  async verifyUploadedFile(
    fileId: string,
    checkupId?: string,
    correctedPayload?: Record<string, unknown>
  ): Promise<void> {
    await apiClient.post(`/ingest/files/${fileId}/verify`, {
      checkup_id: checkupId || null,
      corrected_payload: correctedPayload || null,
    });
  },

  /**
   * Polling định kỳ cho 1 task đến khi SUCCESS hoặc FAILURE.
   * Fast Path (PyMuPDF + pdfplumber) thường hoàn tất trong < 1.5s.
   */
  async pollTaskUntilFinished(
    taskId: string,
    onProgress?: (status: TaskStatusResponseData) => void,
    intervalMs: number = 1200,
    timeoutMs: number = 240000
  ): Promise<TaskStatusResponseData> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const status = await this.getTaskStatus(taskId);
      if (onProgress) onProgress(status);

      if (status.state === 'SUCCESS') {
        return status;
      }
      if (status.state === 'FAILURE' || status.state === 'REVOKED') {
        throw new Error(
          status.stage_message || 'Quá trình trích xuất tài liệu thất bại.'
        );
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error('Hết thời gian chờ phản hồi từ Celery Worker.');
  },

  /**
   * Polling định kỳ cho batch upload đến khi tất cả files hoàn thành.
   */
  async pollBatchUntilFinished(
    batchId: string,
    onProgress?: (status: BatchStatusResponseData) => void,
    intervalMs: number = 1500,
    timeoutMs: number = 420000
  ): Promise<BatchStatusResponseData> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const status = await this.getBatchStatus(batchId);
      if (onProgress) onProgress(status);

      if (status.is_all_finished) {
        return status;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error('Hết thời gian chờ xử lý lô tài liệu.');
  },
};

/**
 * Chuyển đổi kết quả từ Backend (`FileDetailResponseData` với `ocr_raw_payload`)
 * sang `DocumentExtractionData` để điền tự động vào Form đối chiếu Bước 2.
 */
export function mapFileDetailToExtractionData(
  detail: FileDetailResponseData,
  patientName: string
): DocumentExtractionData {
  const fileName = detail.file_name || 'Tai_lieu_can_lam_sang.pdf';
  const fileSizeFormatted = detail.file_size_bytes
    ? formatFileSize(detail.file_size_bytes)
    : '1.2 MB';

  const base = createDefaultExtractionData(
    detail.id,
    fileName,
    fileSizeFormatted,
    patientName
  );

  const payload = detail.ocr_raw_payload;
  if (!payload || detail.status === 'failed') {
    const manualBase = createBlankManualExtractionData(
      detail.id,
      fileName,
      fileSizeFormatted,
      patientName
    );
    return {
      ...manualBase,
      presignedViewUrl: detail.presigned_view_url,
      fileType: detail.file_type,
      isManualEntry: detail.status === 'failed' || !payload,
    };
  }

  const fields = payload.extracted_fields || {};
  const sections = payload.clinical_sections || {};
  const confScores = payload.confidence_scores || {};

  // Tính độ tin cậy trung bình
  const confValues = Object.values(confScores).filter(
    (v): v is number => typeof v === 'number'
  );
  const avgConfidence =
    confValues.length > 0
      ? Number(
        (
          (confValues.reduce((acc, v) => acc + v, 0) / confValues.length) *
          100
        ).toFixed(1)
      )
      : payload.is_digital_pdf
        ? 99.2
        : base.ocrConfidence;

  // Format tuổi thai (nếu backend trả về tổng số ngày)
  let gaFormatted = '';
  if (typeof fields.gestational_age_days === 'number') {
    const w = Math.floor(fields.gestational_age_days / 7);
    const d = fields.gestational_age_days % 7;
    gaFormatted = `${w} tuần ${d} ngày`;
  }

  // Cập nhật các chỉ số sinh trắc học từ kết quả trích xuất thật (không điền số giả nếu phiếu không có)
  const updatedBiometrics = base.biometrics.map((metric) => {
    let nextVal: number | null = null;
    let nextConf = 0;

    if (metric.code === 'FHR' && typeof fields.fhr_bpm === 'number') {
      nextVal = fields.fhr_bpm;
      nextConf = Math.round((confScores.fhr ?? 0.99) * 100);
    } else if (metric.code === 'BPD' && typeof fields.bpd_mm === 'number') {
      nextVal = fields.bpd_mm;
      nextConf = Math.round((confScores.bpd ?? 0.99) * 100);
    } else if (metric.code === 'FL' && typeof fields.fl_mm === 'number') {
      nextVal = fields.fl_mm;
      nextConf = Math.round((confScores.fl ?? 0.99) * 100);
    } else if (metric.code === 'AC' && typeof fields.ac_mm === 'number') {
      nextVal = fields.ac_mm;
      nextConf = Math.round((confScores.ac ?? 0.99) * 100);
    } else if (metric.code === 'EFW' && typeof fields.efw_g === 'number') {
      nextVal = fields.efw_g;
      nextConf = Math.round((confScores.efw ?? 0.99) * 100);
    } else if (metric.code === 'AFI' && typeof fields.afi_cm === 'number') {
      nextVal = metric.unit === 'mm' ? Math.round(fields.afi_cm * 10) : fields.afi_cm;
      nextConf = Math.round((confScores.afi ?? 0.98) * 100);
    }

    return {
      ...metric,
      value: nextVal ?? 0,
      confidence: nextConf,
      percentile: nextVal !== null ? metric.percentile : '--',
      assessment: nextVal !== null ? metric.assessment : 'Chưa có trên phiếu',
    };
  });

  // Cập nhật sinh hiệu từ clinical_sections (không lấy số mẫu nếu phiếu không có)
  const v = sections.vitals || {};
  const updatedVitals = {
    bloodPressureSystolic:
      typeof v.blood_pressure_systolic === 'number' ? v.blood_pressure_systolic : 0,
    bloodPressureDiastolic:
      typeof v.blood_pressure_diastolic === 'number' ? v.blood_pressure_diastolic : 0,
    weightKg: typeof v.weight_kg === 'number' ? v.weight_kg : 0,
    heartRateBpm: typeof v.heart_rate_bpm === 'number' ? v.heart_rate_bpm : 0,
    temperatureC: typeof v.temperature_c === 'number' ? v.temperature_c : 0,
    bmi: typeof v.bmi === 'number' ? v.bmi : 0,
  };

  // Cập nhật xét nghiệm huyết học & nước tiểu từ clinical_sections
  const l = sections.labs || {};
  const updatedLabs = base.labs.map((lab) => {
    let val = '';
    if (lab.code === 'HGB' && l.hgb) val = l.hgb;
    else if (lab.code === 'GLUCOSE' && l.glucose) val = l.glucose;
    else if (lab.code === 'PROTEIN' && l.urine_protein) val = l.urine_protein;
    else if (lab.code === 'PH' && l.urine_ph) val = l.urine_ph;
    else if (lab.code === 'LEUKOCYTE' && l.urine_leukocyte) val = l.urine_leukocyte;

    return {
      ...lab,
      value: val,
      status: val ? 'Đã trích xuất' : 'Chưa có trên phiếu',
      isAbnormal: false,
      confidence: val ? 98 : 0,
    };
  });

  const admin = sections.administrative_info || {};
  const conc = sections.conclusions || {};

  // Chuẩn hóa ngày DD/MM/YYYY -> YYYY-MM-DD cho <input type="date">
  let normalizedVisitDate = '';
  if (admin.visit_date) {
    const ddmmyyyy = admin.visit_date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddmmyyyy) {
      normalizedVisitDate = `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(admin.visit_date)) {
      normalizedVisitDate = admin.visit_date;
    }
  }

  return {
    ...base,
    presignedViewUrl: detail.presigned_view_url,
    fileType: detail.file_type,
    extractionMethod: payload.extraction_method || undefined,
    rawText: payload.raw_text || undefined,
    ocrConfidence: avgConfidence,
    doctorPerformer: admin.doctor_performer || '',
    department: admin.department || '',
    visitDate: normalizedVisitDate,
    gestationalAgeFormatted: gaFormatted,
    vitals: updatedVitals,
    biometrics: updatedBiometrics,
    labs: updatedLabs,
    conclusions: {
      fetalCondition: conc.summary || '',
      maternalNotes: '',
      followUpAdvice: conc.recommendations || '',
    },
    racaNetAlert: {
      level: 'yellow',
      levelName: 'CHỜ ĐÁNH GIÁ RACA-NET',
      summary:
        'Các chỉ số trích xuất từ tài liệu sẽ được động cơ lâm sàng Hadlock IV & mô hình RACA-Net phân tích sau khi bác sĩ xác nhận lưu hồ sơ.',
      recommendation:
        'Vui lòng đối chiếu kỹ các số đo sinh trắc học và sinh hiệu so với phiếu gốc trước khi chuyển sang Bước 3 phê duyệt.',
      disclaimer:
        'Lưu ý: Phân tích tự động hỗ trợ tham khảo lâm sàng, không thay thế chẩn đoán của bác sĩ chuyên khoa.',
    },
  };
}
