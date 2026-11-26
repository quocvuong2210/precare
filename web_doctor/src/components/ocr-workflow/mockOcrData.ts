/**
 * Mock data structures and generator for OCR Document Upload & Verification Flow (STORY-4.1, 4.2, 4.3)
 */

export interface UploadFileItem {
  id: string;
  file?: File;
  name: string;
  size: number;
  sizeFormatted: string;
  type: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  errorMsg?: string;
}

export interface BiometricMetric {
  code: 'FHR' | 'BPD' | 'FL' | 'AC' | 'EFW' | 'AFI';
  label: string;
  value: number;
  unit: string;
  standardRange: string;
  percentile: string;
  assessment: string;
  confidence: number;
}

export interface LabMetric {
  code: string;
  label: string;
  sublabel?: string;
  value: string;
  unit: string;
  normalRange: string;
  status: string;
  isAbnormal: boolean;
  confidence: number;
}

export interface DocumentExtractionData {
  fileId: string;
  fileName: string;
  fileSizeFormatted: string;
  presignedViewUrl?: string;
  fileType?: string;
  extractionMethod?: string;
  rawText?: string;
  ocrConfidence: number;
  doctorPerformer: string;
  doctorApprover: string;
  department: string;
  visitDate: string;
  gestationalAgeFormatted: string;
  groupingOption: 'merge_existing' | 'create_new';
  
  vitals: {
    bloodPressureSystolic: number;
    bloodPressureDiastolic: number;
    weightKg: number;
    heartRateBpm: number;
    temperatureC: number;
    bmi: number;
  };

  biometrics: BiometricMetric[];
  labs: LabMetric[];

  conclusions: {
    fetalCondition: string;
    maternalNotes: string;
    followUpAdvice: string;
  };

  racaNetAlert: {
    level: 'orange' | 'yellow' | 'red' | 'green';
    levelName: string;
    summary: string;
    recommendation: string;
    disclaimer: string;
  };
}

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Tạo dữ liệu trích xuất OCR giả lập chân thực chuẩn sản khoa
 */
export const createDefaultExtractionData = (
  fileId: string,
  fileName: string = 'Phieu_kham_thai_32W.pdf',
  fileSizeFormatted: string = '2.4 MB',
  patientName: string = 'Nguyễn Thị Hương'
): DocumentExtractionData => {
  return {
    fileId,
    fileName,
    fileSizeFormatted,
    ocrConfidence: 98.5,
    doctorPerformer: 'BS. CKI. Trần Ngọc Thảo Vy',
    doctorApprover: 'BS. Lê Minh',
    department: 'Khoa Chẩn đoán hình ảnh',
    visitDate: '2026-11-24',
    gestationalAgeFormatted: '32 tuần 4 ngày',
    groupingOption: 'merge_existing',

    vitals: {
      bloodPressureSystolic: 118,
      bloodPressureDiastolic: 76,
      weightKg: 56.5,
      heartRateBpm: 78,
      temperatureC: 36.6,
      bmi: 22.1,
    },

    biometrics: [
      {
        code: 'FHR',
        label: 'Tim thai (FHR)',
        value: 148,
        unit: 'bpm',
        standardRange: '120 - 160 bpm',
        percentile: 'Chuẩn theo tuổi thai',
        assessment: 'Bình thường',
        confidence: 99.1,
      },
      {
        code: 'BPD',
        label: 'Đường kính lưỡng đỉnh (BPD)',
        value: 58,
        unit: 'mm',
        standardRange: '54 - 62 mm',
        percentile: '52th percentile',
        assessment: 'Bình thường',
        confidence: 98.8,
      },
      {
        code: 'FL',
        label: 'Chiều dài xương đùi (FL)',
        value: 43,
        unit: 'mm',
        standardRange: '40 - 46 mm',
        percentile: '48th percentile',
        assessment: 'Bình thường',
        confidence: 99.0,
      },
      {
        code: 'AC',
        label: 'Chu vi bụng (AC)',
        value: 196,
        unit: 'mm',
        standardRange: '185 - 210 mm',
        percentile: '50th percentile',
        assessment: 'Bình thường',
        confidence: 98.4,
      },
      {
        code: 'EFW',
        label: 'Cân nặng thai ước tính (EFW)',
        value: 1950,
        unit: 'g',
        standardRange: '1,750 - 2,150 g',
        percentile: '49th percentile',
        assessment: 'Bình thường',
        confidence: 97.9,
      },
      {
        code: 'AFI',
        label: 'Chỉ số ối (AFI)',
        value: 135,
        unit: 'mm',
        standardRange: '100 - 180 mm',
        percentile: 'Bình thường',
        assessment: 'Bình thường',
        confidence: 98.2,
      },
    ],

    labs: [
      {
        code: 'HGB',
        label: 'Huyết sắc tố (HGB)',
        value: '11.8',
        unit: 'g/dL',
        normalRange: '11.0 - 14.0 g/dL',
        status: 'Ổn định',
        isAbnormal: false,
        confidence: 98.6,
      },
      {
        code: 'GLUCOSE',
        label: 'Đường huyết đói (Glucose)',
        value: '5.4',
        unit: 'mmol/L',
        normalRange: '4.1 - 5.6 mmol/L',
        status: 'Bình thường',
        isAbnormal: false,
        confidence: 99.2,
      },
      {
        code: 'PROTEIN_URINE',
        label: 'Protein nước tiểu',
        sublabel: 'Que nhúng 10 thông số',
        value: '0.15',
        unit: 'g/L',
        normalRange: 'Ngưỡng chuẩn < 0.1 g/L',
        status: 'Vết nhẹ - Theo dõi',
        isAbnormal: true,
        confidence: 97.5,
      },
      {
        code: 'PH_URINE',
        label: 'Độ pH nước tiểu',
        value: '6.5',
        unit: '',
        normalRange: '5.0 - 7.5',
        status: 'Bình thường',
        isAbnormal: false,
        confidence: 99.0,
      },
      {
        code: 'LEUKOCYTE',
        label: 'Bạch cầu niệu (Leukocyte)',
        value: 'Âm tính (-)',
        unit: '',
        normalRange: 'Chuẩn: Âm tính',
        status: 'Bình thường',
        isAbnormal: false,
        confidence: 98.9,
      },
    ],

    conclusions: {
      fetalCondition:
        'Một thai sống trong tử cung 32 tuần 4 ngày ngôi đầu, phát triển phù hợp tuần tuổi, nước ối và bánh nhau bình thường.',
      maternalNotes:
        'Có vết protein niệu nhẹ (0.15 g/L). Huyết áp hiện tại ổn định (118/76 mmHg). Đã nghị đo HA tại nhà 2 lần/ngày sáng - tối.',
      followUpAdvice:
        'Sau 2 tuần (hoặc khám ngay nếu xuất hiện triệu chứng đau đầu, hoa mắt, phù chân).',
    },

    racaNetAlert: {
      level: 'orange',
      levelName: 'MỨC CAM',
      summary:
        'Chu vi vòng bụng (AC) đạt 268 mm (Bách phân vị: P8), giảm tốc độ tăng trưởng rõ rệt so với mốc 28 tuần (P25). Cân nặng ước tính EFW đạt 1.790g (P14).',
      recommendation:
        'Đề xuất bác sĩ đánh giá bổ sung: Đề xuất bác sĩ đánh giá bổ sung siêu âm Doppler động mạch rốn và động mạch não giữa để sàng lọc nguy cơ thai chậm tăng trưởng trong tử cung (FGR) thể bất đối xứng.',
      disclaimer:
        'Lưu ý: Phân tích tự động hỗ trợ tham khảo lâm sàng, không thay thế chẩn đoán của bác sĩ chuyên khoa.',
    },
  };
};
