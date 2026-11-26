import React, { useState } from 'react';
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
import { DocumentViewer } from './ocr-workflow/DocumentViewer';
import { createDefaultExtractionData } from './ocr-workflow/mockOcrData';

interface CheckupDetailModalProps {
  visit: CheckupTimelineRecord;
  onClose: () => void;
  patientName?: string;
}

export const CheckupDetailModal: React.FC<CheckupDetailModalProps> = ({
  visit,
  onClose,
  patientName = 'Nguyễn Thị Hương',
}) => {
  const [showOriginalDoc, setShowOriginalDoc] = useState(false);

  const biometric = visit.biometric_data;
  const bp =
    visit.vitals.blood_pressure_systolic != null &&
    visit.vitals.blood_pressure_diastolic != null
      ? `${visit.vitals.blood_pressure_systolic}/${visit.vitals.blood_pressure_diastolic} mmHg`
      : '118/76 mmHg';

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

  // Fallback extraction data for viewing original document
  const mockDocData = createDefaultExtractionData(
    visit.id,
    `Phieu_kham_thai_${visit.gestational_age.weeks}W.pdf`,
    '2.4 MB',
    patientName
  );

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
            <button
              type="button"
              onClick={() => setShowOriginalDoc(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Xem file gốc</span>
            </button>
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
                  Tài liệu đính kèm:{' '}
                  {`Phieu_kham_thai_${visit.gestational_age.weeks}W.pdf`}
                </span>
                <span className="text-[11px] text-slate-500 ml-2">
                  (Đã qua đối chiếu OCR &amp; Bác sĩ phê duyệt)
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Độ tin cậy OCR: 98.5%
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
                  {visit.vitals.weight_kg != null
                    ? `${visit.vitals.weight_kg} kg`
                    : '56.5 kg'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">
                  Mạch
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  78 lần/phút
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">
                  Thân nhiệt
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  36.6 °C
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">
                  Chỉ số BMI
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  22.1 kg/m²
                </div>
              </div>
            </div>
          </div>

          {/* 2. Sinh trắc học thai nhi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Ruler className="w-4 h-4 text-emerald-700" />
                <span>II. Chỉ số sinh trắc học thai nhi (Siêu âm 4D)</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Phát triển phù hợp tuổi thai
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-3">CHỈ SỐ</th>
                    <th className="py-2.5 px-3 text-center">GIÁ TRỊ ĐO ĐƯỢC</th>
                    <th className="py-2.5 px-3 text-center">KHOẢNG THAM CHIẾU</th>
                    <th className="py-2.5 px-3 text-center">BÁCH PHÂN VỊ</th>
                    <th className="py-2.5 px-3 text-right">ĐÁNH GIÁ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      Tim thai (FHR)
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                      148 bpm
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-500">
                      120 - 160 bpm
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700">
                      Chuẩn theo tuổi thai
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                      Bình thường
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      Đường kính lưỡng đỉnh (BPD)
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                      {biometric?.bpd ? `${biometric.bpd} mm` : '58 mm'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-500">
                      54 - 62 mm
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700">
                      52th percentile
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                      Bình thường
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      Chiều dài xương đùi (FL)
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                      {biometric?.fl ? `${biometric.fl} mm` : '43 mm'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-500">
                      40 - 46 mm
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700">
                      48th percentile
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                      Bình thường
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      Chu vi vòng bụng (AC)
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                      {biometric?.ac ? `${biometric.ac} mm` : '196 mm'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-500">
                      185 - 210 mm
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700">
                      50th percentile
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                      Bình thường
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      Cân nặng ước tính (EFW)
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                      {biometric?.efw
                        ? `${biometric.efw.toLocaleString()} g`
                        : '1,950 g'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-500">
                      1,750 - 2,150 g
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700">
                      49th percentile
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                      Bình thường
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      Chỉ số ối (AFI)
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                      135 mm
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-500">
                      100 - 180 mm
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700">
                      Bình thường
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                      Bình thường
                    </td>
                  </tr>
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
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                1 chỉ số cần chú ý
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="text-[10px] text-slate-400 font-semibold">
                  Huyết sắc tố (HGB)
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  11.8 g/dL{' '}
                  <span className="text-[10px] font-normal text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded ml-1">
                    Ổn định
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Khoảng chuẩn: 11.0 - 14.0 g/dL
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="text-[10px] text-slate-400 font-semibold">
                  Đường huyết đói (Glucose)
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  5.4 mmol/L{' '}
                  <span className="text-[10px] font-normal text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded ml-1">
                    Bình thường
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Khoảng chuẩn: 4.1 - 5.6 mmol/L
                </div>
              </div>

              <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/60">
                <div className="text-[10px] text-amber-900 font-semibold">
                  Protein nước tiểu (Que nhúng)
                </div>
                <div className="text-sm font-bold text-amber-950 mt-0.5">
                  0.15 g/L{' '}
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-200 px-1.5 py-0.5 rounded ml-1">
                    Vết nhẹ - Theo dõi
                  </span>
                </div>
                <div className="text-[10px] text-amber-800 mt-1">
                  Ngưỡng chuẩn: &lt; 0.1 g/L
                </div>
              </div>
            </div>
          </div>

          {/* 4. Cảnh báo lâm sàng RACA-Net */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-amber-900 uppercase">
                  Lưu ý lâm sàng (Mức cam) - RACA-Net AI
                </span>
              </div>
              <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                AI Sàng lọc sớm
              </span>
            </div>
            <p className="text-slate-800 leading-relaxed font-medium">
              Chu vi vòng bụng (AC) đạt 268 mm (Bách phân vị: P8), giảm tốc độ tăng trưởng rõ rệt so với mốc 28 tuần (P25). Đề xuất bác sĩ đánh giá bổ sung siêu âm Doppler động mạch rốn và động mạch não giữa để sàng lọc nguy cơ thai chậm tăng trưởng trong tử cung (FGR) thể bất đối xứng.
            </p>
          </div>

          {/* 5. KẾT LUẬN & DẶN DÒ ĐIỀU TRỊ CỦA BÁC SĨ (CRITICAL SECTION) */}
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
              <div className="space-y-1.5 text-slate-800 leading-relaxed pl-1">
                <p>
                  <strong>1. Tình trạng thai:</strong> Một thai sống trong tử cung {visit.gestational_age.weeks} tuần ngôi đầu, phát triển phù hợp tuần tuổi, nước ối và bánh nhau bình thường.
                </p>
                <p>
                  <strong>2. Lưu ý y mẹ:</strong> Có vết protein niệu nhẹ (0.15 g/L). Huyết áp hiện tại ổn định ({bp}). Đã nghị đo HA tại nhà 2 lần/ngày sáng - tối.
                </p>
                <p>
                  <strong>3. Hẹn tái khám:</strong> Sau 2 tuần (hoặc khám ngay nếu xuất hiện triệu chứng đau đầu, hoa mắt, phù chân).
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0 text-xs">
          <span className="text-slate-400">
            Mã định danh bản ghi: {visit.id}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOriginalDoc(true)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
            >
              Xem tài liệu scan gốc
            </button>
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
      {showOriginalDoc && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#275248]" />
                <span className="text-xs font-bold text-slate-800">
                  Tài liệu gốc lần khám {formattedDate}: {mockDocData.fileName}
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
                data={mockDocData}
                patientName={patientName}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
