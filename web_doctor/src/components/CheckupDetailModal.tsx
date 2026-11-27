import React, { useEffect, useState } from 'react';
import {
  X,
  FileText,
  Calendar,
  Stethoscope,
  HeartPulse,
  Ruler,
  AlertTriangle,
  CheckCircle2,
  Eye,
  ShieldCheck,
  Activity,
  ClipboardList,
} from 'lucide-react';
import { CheckupTimelineRecord } from '../services/checkup.service';
import { evaluateBiometricRulesApi } from '../services/clinicalRule.service';
import { AnalysisResult } from '../types';
import {
  ClinicalDisclaimerBanner,
  ClinicalExplanationTable,
  WarningLevelBadge,
} from './ClinicalEvaluationPanel';
import { DocumentViewer } from './ocr-workflow/DocumentViewer';
import { DocumentExtractionData } from './ocr-workflow/mockOcrData';

interface CheckupDetailModalProps {
  visit: CheckupTimelineRecord;
  onClose: () => void;
  patientName?: string;
  documentData?: DocumentExtractionData | null;
  existingAnalysis?: AnalysisResult | null;
  onEvaluationComplete?: (analysis: AnalysisResult) => void;
}

export const CheckupDetailModal: React.FC<CheckupDetailModalProps> = ({
  visit,
  onClose,
  patientName = 'Thai phụ',
  documentData = null,
  existingAnalysis = null,
  onEvaluationComplete,
}) => {
  const [showOriginalDoc, setShowOriginalDoc] = useState(false);
  const [ruleAnalysis, setRuleAnalysis] = useState<AnalysisResult | null>(existingAnalysis);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  useEffect(() => {
    setRuleAnalysis(existingAnalysis ?? null);
    setEvalError(null);
  }, [visit.id, existingAnalysis]);

  const biometric = visit.biometric_data;

  const handleEvaluateRules = async () => {
    if (!biometric?.id) return;
    setIsEvaluating(true);
    setEvalError(null);
    try {
      const res = await evaluateBiometricRulesApi({
        biometric_data_id: biometric.id,
        standard: 'intergrowth_21st',
      });
      setRuleAnalysis(res);
      onEvaluationComplete?.(res);
    } catch {
      setEvalError('Không thể chạy đánh giá Rule Engine cho bản ghi này.');
    } finally {
      setIsEvaluating(false);
    }
  };
  const bp =
    visit.vitals.blood_pressure_systolic != null &&
    visit.vitals.blood_pressure_diastolic != null
      ? `${visit.vitals.blood_pressure_systolic}/${visit.vitals.blood_pressure_diastolic} mmHg`
      : documentData?.vitals.bloodPressureSystolic && documentData?.vitals.bloodPressureDiastolic
        ? `${documentData.vitals.bloodPressureSystolic}/${documentData.vitals.bloodPressureDiastolic} mmHg`
        : 'Chưa ghi nhận';

  const weightDisplay =
    visit.vitals.weight_kg != null
      ? `${visit.vitals.weight_kg} kg`
      : documentData?.vitals.weightKg
        ? `${documentData.vitals.weightKg} kg`
        : 'Chưa ghi nhận';

  const heartRateDisplay = documentData?.vitals.heartRateBpm
    ? `${documentData.vitals.heartRateBpm} lần/phút`
    : 'Chưa ghi nhận';
  const tempDisplay = documentData?.vitals.temperatureC
    ? `${documentData.vitals.temperatureC} °C`
    : 'Chưa ghi nhận';
  const bmiDisplay = documentData?.vitals.bmi
    ? `${documentData.vitals.bmi} kg/m²`
    : 'Chưa ghi nhận';

  const findDocBiometric = (code: 'FHR' | 'BPD' | 'FL' | 'AC' | 'EFW' | 'AFI') =>
    documentData?.biometrics.find((b) => b.code === code);

  const fhrMetric = findDocBiometric('FHR');
  const afiMetric = findDocBiometric('AFI');

  const biometricRows = [
    {
      label: 'Tim thai (FHR)',
      value: fhrMetric && fhrMetric.value > 0 ? `${fhrMetric.value} bpm` : null,
      range: '120 - 160 bpm',
      percentile: fhrMetric?.value ? fhrMetric.percentile || '—' : '—',
    },
    {
      label: 'Đường kính lưỡng đỉnh (BPD)',
      value:
        biometric?.bpd != null
          ? `${biometric.bpd} mm`
          : findDocBiometric('BPD')?.value
            ? `${findDocBiometric('BPD')?.value} mm`
            : null,
      range: 'Theo tuổi thai',
      percentile:
        ruleAnalysis?.bpd_percentile != null
          ? `${Number(ruleAnalysis.bpd_percentile).toFixed(1)}%`
          : findDocBiometric('BPD')?.value
            ? findDocBiometric('BPD')?.percentile || '—'
            : '—',
    },
    {
      label: 'Chu vi vòng đầu (HC)',
      value: biometric?.hc != null ? `${biometric.hc} mm` : null,
      range: 'Theo tuổi thai',
      percentile:
        ruleAnalysis?.hc_percentile != null
          ? `${Number(ruleAnalysis.hc_percentile).toFixed(1)}%`
          : '—',
    },
    {
      label: 'Chiều dài xương đùi (FL)',
      value:
        biometric?.fl != null
          ? `${biometric.fl} mm`
          : findDocBiometric('FL')?.value
            ? `${findDocBiometric('FL')?.value} mm`
            : null,
      range: 'Theo tuổi thai',
      percentile:
        ruleAnalysis?.fl_percentile != null
          ? `${Number(ruleAnalysis.fl_percentile).toFixed(1)}%`
          : findDocBiometric('FL')?.value
            ? findDocBiometric('FL')?.percentile || '—'
            : '—',
    },
    {
      label: 'Chu vi vòng bụng (AC)',
      value:
        biometric?.ac != null
          ? `${biometric.ac} mm`
          : findDocBiometric('AC')?.value
            ? `${findDocBiometric('AC')?.value} mm`
            : null,
      range: 'Theo tuổi thai',
      percentile:
        ruleAnalysis?.ac_percentile != null
          ? `${Number(ruleAnalysis.ac_percentile).toFixed(1)}%`
          : findDocBiometric('AC')?.value
            ? findDocBiometric('AC')?.percentile || '—'
            : '—',
    },
    {
      label: 'Cân nặng ước tính (EFW)',
      value:
        biometric?.efw != null
          ? `${biometric.efw.toLocaleString('vi-VN')} g`
          : findDocBiometric('EFW')?.value
            ? `${findDocBiometric('EFW')?.value.toLocaleString('vi-VN')} g`
            : null,
      range: 'Theo tuổi thai',
      percentile:
        ruleAnalysis?.efw_percentile != null
          ? `${Number(ruleAnalysis.efw_percentile).toFixed(1)}%`
          : findDocBiometric('EFW')?.value
            ? findDocBiometric('EFW')?.percentile || '—'
            : '—',
    },
    {
      label: 'Chỉ số ối (AFI)',
      value: afiMetric && afiMetric.value > 0 ? `${afiMetric.value} ${afiMetric.unit}` : null,
      range: '5 - 24 cm',
      percentile: afiMetric?.value ? afiMetric.percentile || '—' : '—',
    },
  ];

  const recordedLabs = (documentData?.labs || []).filter(
    (lab) => lab.value && lab.value.trim() !== '' && lab.value.trim() !== '--'
  );

  // Format date helper
  const formattedDate = (() => {
    try {
      const [year, month, day] = visit.checkup_date.slice(0, 10).split('-').map(Number);
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(year, month - 1, day));
    } catch {
      return visit.checkup_date;
    }
  })();

  // Parse notes / dặn dò
  const notesText = visit.notes || '';
  const lines = notesText
    .replace(/^\[DỮ LIỆU DEMO TIMELINE\]\s*/, '')
    .split('\n')
    .filter((l) => l.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-auto">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#275248] flex items-center justify-center shrink-0 border border-teal-100">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Chi tiết hồ sơ lần khám &amp; Kết quả cận lâm sàng
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Tuần {visit.gestational_age.weeks}
                  {visit.gestational_age.remaining_days > 0
                    ? ` + ${visit.gestational_age.remaining_days} ngày`
                    : ''}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Ngày khám: <strong>{formattedDate}</strong> • Bác sĩ phụ trách:{' '}
                <strong>BS. {visit.doctor.full_name}</strong> • Quý{' '}
                {visit.gestational_age.trimester}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {documentData && (
              <button
                type="button"
                onClick={() => setShowOriginalDoc(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Xem file gốc</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top File Attachment Banner */}
          <div className="p-3.5 rounded-xl bg-teal-50/50 border border-teal-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-[#275248]" />
              <div>
                <span className="font-bold text-slate-800">
                  {documentData ? `Tài liệu đính kèm: ${documentData.fileName}` : 'Hồ sơ lần khám điện tử'}
                </span>
                <span className="text-[11px] text-slate-500 ml-2">
                  {documentData
                    ? '(Đã qua đối chiếu OCR & Bác sĩ phê duyệt)'
                    : '(Dữ liệu lưu trữ trong bệnh án)'}
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {documentData?.ocrConfidence
                ? `Độ tin cậy OCR: ${documentData.ocrConfidence}%`
                : 'Đã xác nhận hồ sơ'}
            </span>
          </div>

          {/* 1. Thông tin mẹ & Sinh hiệu */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <HeartPulse className="w-4 h-4 text-rose-500" />
              <span>I. Thông tin sinh hiệu mẹ bầu</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">
                  Huyết áp
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{bp}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">
                  Cân nặng
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {weightDisplay}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">
                  Mạch
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {heartRateDisplay}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">
                  Thân nhiệt
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {tempDisplay}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">
                  Chỉ số BMI
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {bmiDisplay}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Sinh trắc học thai nhi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Ruler className="w-4 h-4 text-emerald-700" />
                <span>II. Chỉ số sinh trắc học thai nhi (Siêu âm)</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {biometric?.status === 'verified' ? 'Đã bác sĩ đối chiếu' : 'Dữ liệu ghi nhận'}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-3">CHỈ SỐ</th>
                    <th className="py-2.5 px-3 text-center">GIÁ TRỊ ĐO ĐƯỢC</th>
                    <th className="py-2.5 px-3 text-center">THAM CHIẾU</th>
                    <th className="py-2.5 px-3 text-center">BÁCH PHÂN VỊ</th>
                    <th className="py-2.5 px-3 text-right">TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {biometricRows.map((row) => (
                    <tr key={row.label}>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {row.label}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                        {row.value ?? <span className="text-slate-400 font-normal">Chưa ghi nhận</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500">
                        {row.range}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-700">
                        {row.percentile}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        {row.value ? (
                          <span className="text-emerald-700">Đã ghi nhận</span>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Xét nghiệm Huyết học & Nước tiểu */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Activity className="w-4 h-4 text-teal-700" />
                <span>III. Kết quả xét nghiệm sinh hóa &amp; nước tiểu</span>
              </div>
            </div>

            {recordedLabs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {recordedLabs.map((lab) => (
                  <div
                    key={lab.code}
                    className={`p-3 rounded-xl border ${
                      lab.isAbnormal
                        ? 'border-amber-300 bg-amber-50/60'
                        : 'border-slate-200 bg-slate-50/60'
                    }`}
                  >
                    <div className="text-[10px] text-slate-500 font-semibold">
                      {lab.label}
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {lab.value} {lab.unit}
                    </div>
                    {lab.normalRange && (
                      <div className="text-[10px] text-slate-400 mt-1">
                        Ngưỡng chuẩn: {lab.normalRange}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-xs text-slate-500">
                Chưa ghi nhận chỉ số xét nghiệm sinh hóa / nước tiểu trên phiếu này.
              </div>
            )}
          </div>

          {/* 4. KẾT LUẬN & DẶN DÒ ĐIỀU TRỊ CỦA BÁC SĨ */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold uppercase tracking-wider">
              <Stethoscope className="w-4 h-4 text-[#275248]" />
              <span>IV. Kết luận chuyên môn &amp; Lời dặn dò điều trị</span>
            </div>

            {lines.length > 0 ? (
              <div className="space-y-1.5 text-slate-800 leading-relaxed pl-1">
                {lines.map((line, idx) => (
                  <p key={idx} className="font-medium">
                    {line}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 italic pl-1">
                Chưa có kết luận hoặc lời dặn dò từ bác sĩ cho lần khám này.
              </p>
            )}
          </div>
        </div>

        {/* V. Đánh giá Rule Engine & Disclaimer cố định */}
        <div className="px-6 py-3 border-t border-slate-100 bg-white space-y-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#275248]" />
              <span>Đánh giá Rule Engine 3 mức</span>
            </div>
            <div className="flex items-center gap-2">
              {ruleAnalysis && (
                <WarningLevelBadge level={ruleAnalysis.warning_level} size="sm" />
              )}
              {biometric?.id && (
                <button
                  type="button"
                  disabled={isEvaluating}
                  onClick={handleEvaluateRules}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#E6F4F1] text-[#275248] hover:bg-[#d5ece7] border border-teal-200 disabled:opacity-50 cursor-pointer"
                >
                  {isEvaluating
                    ? 'Đang đánh giá...'
                    : ruleAnalysis
                      ? 'Đánh giá lại Rule Engine'
                      : 'Chạy đánh giá Rule Engine'}
                </button>
              )}
            </div>
          </div>
          {evalError && <p className="text-xs text-red-600">{evalError}</p>}
          {ruleAnalysis && (
            <div className="max-h-56 overflow-y-auto">
              <ClinicalExplanationTable analysis={ruleAnalysis} />
            </div>
          )}
          <ClinicalDisclaimerBanner disclaimerText={ruleAnalysis?.disclaimer_text} />
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0 text-xs">
          <span className="text-slate-400">
            Mã định danh bản ghi: {visit.id}
          </span>
          <div className="flex items-center gap-2">
            {documentData && (
              <button
                type="button"
                onClick={() => setShowOriginalDoc(true)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
              >
                Xem tài liệu scan gốc
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-[#275248] hover:bg-[#1f423a] text-white font-semibold cursor-pointer shadow-2xs"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Modal View Original Document */}
      {showOriginalDoc && documentData && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#275248]" />
                <span className="text-xs font-bold text-slate-800">
                  Tài liệu gốc lần khám {formattedDate}: {documentData.fileName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowOriginalDoc(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-2 bg-slate-100 overflow-hidden">
              <DocumentViewer
                data={documentData}
                patientName={patientName}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
