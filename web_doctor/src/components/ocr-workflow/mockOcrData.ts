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
  isManualEntry?: boolean;
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
/**
 * Khởi tạo dữ liệu trống cho chế độ nhập tay đầy đủ khi OCR thất bại (Sub-task 4.4.1)
 */
export const createBlankManualExtractionData = (
  fileId: string,
  fileName: string = 'Tai_lieu_kham.pdf',
  fileSizeFormatted: string = '—',
  patientName: string = 'Thai phụ'
): DocumentExtractionData => {
  const todayIso = new Date().toISOString().slice(0, 10);
  return {
    fileId,
    fileName,
    fileSizeFormatted,
    extractionMethod: 'manual_entry',
    isManualEntry: true,
    ocrConfidence: 0,
    doctorPerformer: '',
    doctorApprover: '',
    department: 'Khoa Sản',
    visitDate: todayIso,
    gestationalAgeFormatted: '',
    groupingOption: 'merge_existing',

    vitals: {
      bloodPressureSystolic: 0,
      bloodPressureDiastolic: 0,
      weightKg: 0,
      heartRateBpm: 0,
      temperatureC: 0,
      bmi: 0,
    },

    biometrics: [
      {
        code: 'FHR',
        label: 'Tim thai (FHR)',
        value: 0,
        unit: 'bpm',
        standardRange: '120 - 160 bpm',
        percentile: 'Nhập tay',
        assessment: 'Chờ nhập',
        confidence: 0,
      },
      {
        code: 'BPD',
        label: 'Đường kính lưỡng đỉnh (BPD)',
        value: 0,
        unit: 'mm',
        standardRange: '10 - 120 mm',
        percentile: 'Nhập tay',
        assessment: 'Chờ nhập',
        confidence: 0,
      },
      {
        code: 'FL',
        label: 'Chiều dài xương đùi (FL)',
        value: 0,
        unit: 'mm',
        standardRange: '5 - 95 mm',
        percentile: 'Nhập tay',
        assessment: 'Chờ nhập',
        confidence: 0,
      },
      {
        code: 'AC',
        label: 'Chu vi bụng (AC)',
        value: 0,
        unit: 'mm',
        standardRange: '50 - 450 mm',
        percentile: 'Nhập tay',
        assessment: 'Chờ nhập',
        confidence: 0,
      },
      {
        code: 'EFW',
        label: 'Cân nặng thai ước tính (EFW)',
        value: 0,
        unit: 'g',
        standardRange: '50 - 6,000 g',
        percentile: 'Nhập tay',
        assessment: 'Chờ nhập',
        confidence: 0,
      },
      {
        code: 'AFI',
        label: 'Chỉ số ối (AFI)',
        value: 0,
        unit: 'cm',
        standardRange: '5 - 24 cm',
        percentile: 'Nhập tay',
        assessment: 'Chờ nhập',
        confidence: 0,
      },
    ],

    labs: [
      {
        code: 'HB',
        label: 'Hemoglobin (HGB)',
        sublabel: 'Huyết sắc tố',
        value: '',
        unit: 'g/dL',
        normalRange: '11.0 - 14.5',
        status: 'Chờ nhập',
        isAbnormal: false,
        confidence: 0,
      },
      {
        code: 'WBC',
        label: 'Bạch cầu (WBC)',
        sublabel: 'Số lượng bạch cầu',
        value: '',
        unit: 'G/L',
        normalRange: '4.0 - 11.0',
        status: 'Chờ nhập',
        isAbnormal: false,
        confidence: 0,
      },
      {
        code: 'PLT',
        label: 'Tiểu cầu (PLT)',
        sublabel: 'Số lượng tiểu cầu',
        value: '',
        unit: 'G/L',
        normalRange: '150 - 400',
        status: 'Chờ nhập',
        isAbnormal: false,
        confidence: 0,
      },
      {
        code: 'GLU',
        label: 'Glucose máu đói',
        sublabel: 'Đường huyết lúc đói',
        value: '',
        unit: 'mmol/L',
        normalRange: '3.9 - 5.1',
        status: 'Chờ nhập',
        isAbnormal: false,
        confidence: 0,
      },
      {
        code: 'URINE_PRO',
        label: 'Protein niệu',
        sublabel: 'Tổng phân tích nước tiểu',
        value: '',
        unit: '-',
        normalRange: 'Âm tính',
        status: 'Chờ nhập',
        isAbnormal: false,
        confidence: 0,
      },
    ],

    conclusions: {
      fetalCondition: '',
      maternalNotes: '',
      followUpAdvice: '',
    },

    racaNetAlert: {
      level: 'yellow',
      levelName: 'NHẬP THỦ CÔNG KHI OCR THẤT BẠI',
      summary: `Hệ thống OCR không trích xuất được tự động tài liệu cho thai phụ ${patientName}. Bác sĩ vui lòng đối chiếu trực tiếp tài liệu gốc bên trái và nhập đầy đủ các chỉ số.`,
      recommendation: 'Đề xuất bác sĩ kiểm tra kỹ các chỉ số sinh trắc học (BPD, HC, AC, FL, EFW) và sinh hiệu trước khi lưu vào bệnh án điện tử.',
      disclaimer: '*Dữ liệu nhập tay sẽ được đánh dấu xác thực bởi bác sĩ phụ trách.',
    },
  };
};

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
