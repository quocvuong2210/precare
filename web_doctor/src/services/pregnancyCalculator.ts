/**
 * Medical Calculation Engine for Pregnancy Profile (ACOG Practice Bulletin No. 700)
 * Hỗ trợ tính toán tuổi thai, ngày dự sinh, và phân loại tam cá nguyệt chuẩn lâm sàng.
 */

export interface GestationalAgeDetail {
  days: number;
  weeks: number;
  remainingDays: number;
  formatted: string; // VD: "32w4d"
  display: string; // VD: "32 tuần 4 ngày" hoặc "32 tuần"
  trimester: 1 | 2 | 3;
  trimesterName: string; // VD: "Quý 1", "Quý 2", "Quý 3"
  daysUntilEdd: number;
}

export interface PregnancyCalculationParams {
  targetDate?: string; // YYYY-MM-DD (mặc định hôm nay)
  lmp?: string; // Ngày đầu kỳ kinh cuối (YYYY-MM-DD)
  q1UltrasoundDate?: string; // Ngày siêu âm Q1 (YYYY-MM-DD)
  q1GestationalWeeks?: number; // Tuần thai lúc siêu âm Q1 (6 - 14)
  q1GestationalDays?: number; // Ngày thai lẻ lúc siêu âm Q1 (0 - 6)
  crlMm?: number; // Chiều dài đầu mông (10 - 84 mm)
  overrideEdd?: string; // Ngày dự sinh do BS chỉ định trực tiếp (YYYY-MM-DD)
}

export interface PregnancyCalculationResult {
  targetDate: string;
  calculatedEdd: string; // YYYY-MM-DD
  formattedEdd: string; // DD/MM/YYYY
  primaryMethod: 'lmp' | 'q1_ultrasound' | 'crl' | 'direct_edd';
  methodLabel: string;
  clinicalNote: string;
  gestationalAge: GestationalAgeDetail;
  daysUntilEdd: number;
}

export interface ValidationErrorItem {
  field: string;
  message: string;
}

// Helpers xử lý ngày không bị lệch timezone
export function parseDateOnly(dateStr: string): Date {
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 12, 0, 0);
  }
  return new Date(dateStr);
}

export function formatDateToISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateToDisplay(isoStr: string): string {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoStr;
}

export function addDays(d: Date, days: number): Date {
  const res = new Date(d.getTime());
  res.setDate(res.getDate() + days);
  return res;
}

export function diffDays(d1: Date, d2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((utc1 - utc2) / msPerDay);
}

export function getTodayISO(): string {
  return formatDateToISO(new Date());
}

/**
 * Ước tính tuổi thai (ngày) từ chiều dài đầu mông CRL (mm)
 * Robinson & Fleming / Hadlock:
 * GA_days = 8.052 * sqrt(crl_mm) + 23.73
 */
export function calculateGaFromCrl(crlMm: number): number {
  if (crlMm <= 0) return 0;
  const days = 8.052 * Math.sqrt(crlMm) + 23.73;
  return Math.round(days);
}

/**
 * Định dạng tuổi thai và tam cá nguyệt
 */
export function formatGestationalAge(
  gaDays: number,
  targetDate: Date,
  edd: Date
): GestationalAgeDetail {
  const safeDays = Math.max(0, gaDays);
  const weeks = Math.floor(safeDays / 7);
  const remainingDays = safeDays % 7;
  const formatted = `${weeks}w${remainingDays}d`;

  const display =
    remainingDays > 0 ? `${weeks} tuần ${remainingDays} ngày` : `${weeks} tuần`;

  let trimester: 1 | 2 | 3 = 1;
  let trimesterName = 'Quý 1';

  if (safeDays <= 97) {
    // 0w0d đến 13w6d
    trimester = 1;
    trimesterName = 'Quý 1';
  } else if (safeDays <= 195) {
    // 14w0d đến 27w6d
    trimester = 2;
    trimesterName = 'Quý 2';
  } else {
    // >= 28w0d
    trimester = 3;
    trimesterName = 'Quý 3';
  }

  const daysUntilEdd = diffDays(edd, targetDate);

  return {
    days: safeDays,
    weeks,
    remainingDays,
    formatted,
    display,
    trimester,
    trimesterName,
    daysUntilEdd,
  };
}

/**
 * Tính toán EDD và tuổi thai theo hướng dẫn ACOG số 700
 */
export function calculatePregnancyDates(
  params: PregnancyCalculationParams
): PregnancyCalculationResult {
  const targetDateStr = params.targetDate || getTodayISO();
  const targetDate = parseDateOnly(targetDateStr);

  // TH 4: Bác sĩ chỉ định EDD trực tiếp
  if (params.overrideEdd) {
    const edd = parseDateOnly(params.overrideEdd);
    const gaDays = 280 - diffDays(edd, targetDate);
    const eddIso = formatDateToISO(edd);
    const gaDetail = formatGestationalAge(gaDays, targetDate, edd);

    return {
      targetDate: targetDateStr,
      calculatedEdd: eddIso,
      formattedEdd: formatDateToDisplay(eddIso),
      primaryMethod: 'direct_edd',
      methodLabel: 'Chỉ định trực tiếp',
      clinicalNote: 'Ngày dự sinh được bác sĩ chỉ định trực tiếp.',
      gestationalAge: gaDetail,
      daysUntilEdd: gaDetail.daysUntilEdd,
    };
  }

  // 1. Tính toán theo LMP
  let eddLmp: Date | null = null;
  let lmpDate: Date | null = null;
  if (params.lmp) {
    lmpDate = parseDateOnly(params.lmp);
    eddLmp = addDays(lmpDate, 280);
  }

  // 2. Tính toán theo Siêu âm Quý 1
  let eddQ1: Date | null = null;
  let gaAtQ1: number | null = null;
  let usedCrl = false;
  let q1Date: Date | null = null;

  if (params.q1UltrasoundDate) {
    q1Date = parseDateOnly(params.q1UltrasoundDate);

    if (params.q1GestationalWeeks !== undefined && params.q1GestationalWeeks !== null) {
      gaAtQ1 = params.q1GestationalWeeks * 7 + (params.q1GestationalDays || 0);
    } else if (params.crlMm !== undefined && params.crlMm !== null) {
      gaAtQ1 = calculateGaFromCrl(params.crlMm);
      usedCrl = true;
    }

    if (gaAtQ1 !== null) {
      // EDD_Q1 = q1_date + (280 - GA_Q1)
      eddQ1 = addDays(q1Date, 280 - gaAtQ1);
    }
  }

  // TH 1: Chỉ có LMP
  if (eddLmp && !eddQ1 && lmpDate) {
    const gaDays = diffDays(targetDate, lmpDate);
    const eddIso = formatDateToISO(eddLmp);
    const gaDetail = formatGestationalAge(gaDays, targetDate, eddLmp);
    return {
      targetDate: targetDateStr,
      calculatedEdd: eddIso,
      formattedEdd: formatDateToDisplay(eddIso),
      primaryMethod: 'lmp',
      methodLabel: 'Ngày kinh cuối (LMP)',
      clinicalNote: 'Tính theo ngày đầu kỳ kinh cuối (LMP - Quy tắc Naegele).',
      gestationalAge: gaDetail,
      daysUntilEdd: gaDetail.daysUntilEdd,
    };
  }

  // TH 2: Chỉ có Siêu âm Quý 1
  if (eddQ1 && !eddLmp && q1Date && gaAtQ1 !== null) {
    const gaDays = gaAtQ1 + diffDays(targetDate, q1Date);
    const eddIso = formatDateToISO(eddQ1);
    const gaDetail = formatGestationalAge(gaDays, targetDate, eddQ1);
    const method = usedCrl ? 'crl' : 'q1_ultrasound';
    const methodLabel = usedCrl ? 'CRL Siêu âm Q1' : 'Siêu âm Quý 1';
    return {
      targetDate: targetDateStr,
      calculatedEdd: eddIso,
      formattedEdd: formatDateToDisplay(eddIso),
      primaryMethod: method,
      methodLabel,
      clinicalNote: 'Tính theo Siêu âm Quý 1 (Chuẩn vàng khi không rõ LMP).',
      gestationalAge: gaDetail,
      daysUntilEdd: gaDetail.daysUntilEdd,
    };
  }

  // TH 3: Có cả LMP và Siêu âm Quý 1 -> Đối chiếu luật ACOG No. 700
  if (eddLmp && eddQ1 && lmpDate && q1Date && gaAtQ1 !== null) {
    const deltaDays = Math.abs(diffDays(eddLmp, eddQ1));
    const q1Method = usedCrl ? 'crl' : 'q1_ultrasound';
    const q1Label = usedCrl ? 'CRL Siêu âm Q1' : 'Siêu âm Quý 1';

    // Tuổi thai <= 8w6d (<= 62 ngày)
    if (gaAtQ1 <= 62) {
      if (deltaDays > 5) {
        const gaDays = gaAtQ1 + diffDays(targetDate, q1Date);
        const eddIso = formatDateToISO(eddQ1);
        const gaDetail = formatGestationalAge(gaDays, targetDate, eddQ1);
        return {
          targetDate: targetDateStr,
          calculatedEdd: eddIso,
          formattedEdd: formatDateToDisplay(eddIso),
          primaryMethod: q1Method,
          methodLabel: q1Label,
          clinicalNote: `Chênh lệch giữa LMP và Siêu âm Q1 là ${deltaDays} ngày (> 5 ngày ở ≤ 8w6d). Ưu tiên Siêu âm Q1 theo ACOG.`,
          gestationalAge: gaDetail,
          daysUntilEdd: gaDetail.daysUntilEdd,
        };
      } else {
        const gaDays = diffDays(targetDate, lmpDate);
        const eddIso = formatDateToISO(eddLmp);
        const gaDetail = formatGestationalAge(gaDays, targetDate, eddLmp);
        return {
          targetDate: targetDateStr,
          calculatedEdd: eddIso,
          formattedEdd: formatDateToDisplay(eddIso),
          primaryMethod: 'lmp',
          methodLabel: 'Ngày kinh cuối (LMP)',
          clinicalNote: `Chênh lệch giữa LMP và Siêu âm Q1 là ${deltaDays} ngày (≤ 5 ngày). Đạt chuẩn đồng thuận lâm sàng, giữ theo LMP.`,
          gestationalAge: gaDetail,
          daysUntilEdd: gaDetail.daysUntilEdd,
        };
      }
    } else if (gaAtQ1 <= 97) {
      // Tuổi thai 9w0d - 13w6d (63 - 97 ngày)
      if (deltaDays > 7) {
        const gaDays = gaAtQ1 + diffDays(targetDate, q1Date);
        const eddIso = formatDateToISO(eddQ1);
        const gaDetail = formatGestationalAge(gaDays, targetDate, eddQ1);
        return {
          targetDate: targetDateStr,
          calculatedEdd: eddIso,
          formattedEdd: formatDateToDisplay(eddIso),
          primaryMethod: q1Method,
          methodLabel: q1Label,
          clinicalNote: `Chênh lệch giữa LMP và Siêu âm Q1 là ${deltaDays} ngày (> 7 ngày ở 9w0d - 13w6d). Ưu tiên Siêu âm Q1 theo ACOG.`,
          gestationalAge: gaDetail,
          daysUntilEdd: gaDetail.daysUntilEdd,
        };
      } else {
        const gaDays = diffDays(targetDate, lmpDate);
        const eddIso = formatDateToISO(eddLmp);
        const gaDetail = formatGestationalAge(gaDays, targetDate, eddLmp);
        return {
          targetDate: targetDateStr,
          calculatedEdd: eddIso,
          formattedEdd: formatDateToDisplay(eddIso),
          primaryMethod: 'lmp',
          methodLabel: 'Ngày kinh cuối (LMP)',
          clinicalNote: `Chênh lệch giữa LMP và Siêu âm Q1 là ${deltaDays} ngày (≤ 7 ngày). Đạt chuẩn đồng thuận lâm sàng, giữ theo LMP.`,
          gestationalAge: gaDetail,
          daysUntilEdd: gaDetail.daysUntilEdd,
        };
      }
    } else {
      // Sau 13w6d
      if (deltaDays > 7) {
        const gaDays = gaAtQ1 + diffDays(targetDate, q1Date);
        const eddIso = formatDateToISO(eddQ1);
        const gaDetail = formatGestationalAge(gaDays, targetDate, eddQ1);
        return {
          targetDate: targetDateStr,
          calculatedEdd: eddIso,
          formattedEdd: formatDateToDisplay(eddIso),
          primaryMethod: q1Method,
          methodLabel: q1Label,
          clinicalNote: `Chênh lệch ${deltaDays} ngày (> 7 ngày). Ưu tiên kết quả Siêu âm.`,
          gestationalAge: gaDetail,
          daysUntilEdd: gaDetail.daysUntilEdd,
        };
      } else {
        const gaDays = diffDays(targetDate, lmpDate);
        const eddIso = formatDateToISO(eddLmp);
        const gaDetail = formatGestationalAge(gaDays, targetDate, eddLmp);
        return {
          targetDate: targetDateStr,
          calculatedEdd: eddIso,
          formattedEdd: formatDateToDisplay(eddIso),
          primaryMethod: 'lmp',
          methodLabel: 'Ngày kinh cuối (LMP)',
          clinicalNote: `Chênh lệch ${deltaDays} ngày (≤ 7 ngày). Giữ theo LMP.`,
          gestationalAge: gaDetail,
          daysUntilEdd: gaDetail.daysUntilEdd,
        };
      }
    }
  }

  throw new Error('Cần cung cấp ít nhất một phương pháp: LMP, Siêu âm Quý 1 hoặc EDD chỉ định.');
}

/**
 * Kiểm tra tính hợp lệ dữ liệu lâm sàng nhập vào form
 */
export function validateClinicalInputs(params: PregnancyCalculationParams): ValidationErrorItem[] {
  const errors: ValidationErrorItem[] = [];
  const today = parseDateOnly(getTodayISO());

  if (params.lmp) {
    const lmpDate = parseDateOnly(params.lmp);
    if (diffDays(lmpDate, today) > 0) {
      errors.push({
        field: 'lmp',
        message: 'Ngày kinh cuối (LMP) không được ở tương lai.',
      });
    } else if (diffDays(today, lmpDate) > 300) {
      errors.push({
        field: 'lmp',
        message: 'Ngày kinh cuối vượt quá chu kỳ mang thai thông thường (> 300 ngày).',
      });
    }
  }

  if (params.q1UltrasoundDate) {
    const q1Date = parseDateOnly(params.q1UltrasoundDate);
    if (diffDays(q1Date, today) > 0) {
      errors.push({
        field: 'q1UltrasoundDate',
        message: 'Ngày siêu âm Quý 1 không được ở tương lai.',
      });
    }
    if (params.lmp) {
      const lmpDate = parseDateOnly(params.lmp);
      if (diffDays(q1Date, lmpDate) < 0) {
        errors.push({
          field: 'q1UltrasoundDate',
          message: 'Ngày siêu âm không thể diễn ra trước ngày kinh cuối.',
        });
      }
    }
  }

  if (params.q1GestationalWeeks !== undefined && params.q1GestationalWeeks !== null) {
    if (params.q1GestationalWeeks < 6 || params.q1GestationalWeeks > 14) {
      errors.push({
        field: 'q1GestationalWeeks',
        message: 'Tuần thai siêu âm Quý 1 cần nằm trong khoảng 6 đến 14 tuần.',
      });
    }
  }

  if (params.q1GestationalDays !== undefined && params.q1GestationalDays !== null) {
    if (params.q1GestationalDays < 0 || params.q1GestationalDays > 6) {
      errors.push({
        field: 'q1GestationalDays',
        message: 'Ngày lẻ thai siêu âm cần trong khoảng 0 đến 6 ngày.',
      });
    }
  }

  if (params.crlMm !== undefined && params.crlMm !== null) {
    if (params.crlMm < 10 || params.crlMm > 84) {
      errors.push({
        field: 'crlMm',
        message: 'Chiều dài đầu mông CRL đo được ở Q1 nên trong khoảng 10 - 84 mm.',
      });
    }
  }

  const hasMethod =
    Boolean(params.lmp) ||
    Boolean(params.q1UltrasoundDate && (params.q1GestationalWeeks || params.crlMm)) ||
    Boolean(params.overrideEdd);

  if (!hasMethod) {
    errors.push({
      field: 'method',
      message: 'Cần nhập ít nhất một phương pháp xác định: LMP, Siêu âm Quý 1 hoặc EDD chỉ định.',
    });
  }

  return errors;
}
