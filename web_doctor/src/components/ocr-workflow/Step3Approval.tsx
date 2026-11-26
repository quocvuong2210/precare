import React, { useState } from 'react';
import {
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Eye,
  Check,
  Send,
  Lock,
  Sparkles,
  ArrowRight,
  Stethoscope,
  X,
} from 'lucide-react';
import { DocumentExtractionData } from './mockOcrData';
import { DocumentViewer } from './DocumentViewer';

interface Step3ApprovalProps {
  extractionData: DocumentExtractionData;
  onBackToStep2: () => void;
  onConfirmAndSave: () => void;
  patientName?: string;
}

export const Step3Approval: React.FC<Step3ApprovalProps> = ({
  extractionData,
  onBackToStep2,
  onConfirmAndSave,
  patientName,
}) => {
  const [isChecked1, setIsChecked1] = useState(true);
  const [isChecked2, setIsChecked2] = useState(true);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const vitalsFilledCount = [
    extractionData.vitals.bloodPressureSystolic > 0 && extractionData.vitals.bloodPressureDiastolic > 0,
    extractionData.vitals.weightKg > 0,
    extractionData.vitals.heartRateBpm > 0,
    extractionData.vitals.temperatureC > 0,
    extractionData.vitals.bmi > 0,
  ].filter(Boolean).length;

  const bioFilledCount = extractionData.biometrics.filter((b) => b.value > 0).length;

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      onConfirmAndSave();
    }, 600);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToStep2}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/80 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-slate-500" />
          <span>Quay lại Bước 2 (Đối chiếu)</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-[#275248] border border-teal-200/80 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            Độ tin cậy OCR: {extractionData.ocrConfidence}%
          </span>
        </div>
      </div>

      {/* Main Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Kiểm tra tổng hợp &amp; Phê duyệt lưu vào hồ sơ điện tử
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Đảm bảo toàn bộ chỉ số trích xuất đã được bác sĩ xác minh tính chính xác trước khi lưu vào CSDL.
        </p>
      </div>

      {/* 3-Step Stepper Bar (Matching Image 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Step 1: Đã xong */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-emerald-200 shadow-2xs">
          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
            ✓
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-800">1. Chọn &amp; tải tệp</div>
            <div className="text-[10px] text-emerald-700 font-semibold truncate">Đã xong</div>
          </div>
        </div>

        {/* Step 2: Đã xong */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-emerald-200 shadow-2xs">
          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
            ✓
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-800">2. Xử lý &amp; đối chiếu tài liệu</div>
            <div className="text-[10px] text-emerald-700 font-semibold truncate">Đã xong</div>
          </div>
        </div>

        {/* Step 3: Đang làm (Active) */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border-2 border-[#275248] shadow-xs">
          <div className="w-7 h-7 rounded-full bg-[#275248] text-white flex items-center justify-center text-xs font-bold shrink-0">
            3
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#275248]">3. Kiểm tra &amp; xác nhận</div>
            <div className="text-[10px] text-slate-500 font-medium truncate">Đang làm</div>
          </div>
        </div>
      </div>

      {/* File Metadata Banner Card (Matching Image 3) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#275248] flex items-center justify-center shrink-0 border border-teal-100">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-900 truncate">
                {extractionData.fileName}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-[#275248] border border-teal-200">
                Độ tin cậy AI: {extractionData.ocrConfidence}%
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">
              {extractionData.fileSizeFormatted} • BS thực hiện:{' '}
              <strong className="text-slate-700">{extractionData.doctorPerformer}</strong> •{' '}
              {extractionData.department}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsPreviewModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs shrink-0 cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          <span>Xem file gốc</span>
        </button>
      </div>

      {/* Main 2-Column Grid Layout (Matching Image 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Read-only Summary Cards */}
        <div className="lg:col-span-8 space-y-5">
          {/* Section I: THÔNG TIN THAI PHỤ & CHỈ SỐ SINH HIỆU */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 tracking-wider uppercase">
                I. THÔNG TIN THAI PHỤ &amp; CHỈ SỐ SINH HIỆU
              </h3>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                {vitalsFilledCount}/5 chỉ số đã có
              </span>
            </div>

            {/* 5 Vital Metric Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* Card 1: Huyết áp */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 text-center">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">
                  Huyết áp
                </div>
                <div className="text-base font-black text-slate-900 mt-1">
                  {extractionData.vitals.bloodPressureSystolic}/
                  {extractionData.vitals.bloodPressureDiastolic}
                  <span className="text-[10px] font-normal text-slate-500 ml-1">
                    mmHg
                  </span>
                </div>
              </div>

              {/* Card 2: Cân nặng */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 text-center">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">
                  Cân nặng
                </div>
                <div className="text-base font-black text-slate-900 mt-1">
                  {extractionData.vitals.weightKg}
                  <span className="text-[10px] font-normal text-slate-500 ml-1">
                    kg
                  </span>
                </div>
              </div>

              {/* Card 3: Mạch */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 text-center">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">
                  Mạch
                </div>
                <div className="text-base font-black text-slate-900 mt-1">
                  {extractionData.vitals.heartRateBpm}
                  <span className="text-[10px] font-normal text-slate-500 ml-1">
                    lần/phút
                  </span>
                </div>
              </div>

              {/* Card 4: Thân nhiệt */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 text-center">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">
                  Thân nhiệt
                </div>
                <div className="text-base font-black text-slate-900 mt-1">
                  {extractionData.vitals.temperatureC}
                  <span className="text-[10px] font-normal text-slate-500 ml-1">
                    °C
                  </span>
                </div>
              </div>

              {/* Card 5: BMI */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 text-center">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">
                  Chỉ số BMI
                </div>
                <div className="text-base font-black text-slate-900 mt-1">
                  {extractionData.vitals.bmi}
                  <span className="text-[10px] font-normal text-slate-500 ml-1">
                    kg/m²
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section II: SINH TRẮC HỌC THAI NHI (SIÊU ÂM 4D TUẦN 32) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 tracking-wider uppercase">
                II. SINH TRẮC HỌC THAI NHI (SIÊU ÂM)
              </h3>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                {bioFilledCount}/{extractionData.biometrics.length} chỉ số đã có
              </span>
            </div>

            {/* Table of Biometrics */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 text-[11px] font-semibold">
                    <th className="py-2.5 px-2">CHỈ SỐ</th>
                    <th className="py-2.5 px-2 text-center">GIÁ TRỊ TRÍCH XUẤT</th>
                    <th className="py-2.5 px-2 text-center">KHOẢNG CHUẨN THAM CHIẾU</th>
                    <th className="py-2.5 px-2 text-center">BÁCH PHÂN VỊ (GA)</th>
                    <th className="py-2.5 px-2 text-right">ĐÁNH GIÁ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {extractionData.biometrics.map((m) => (
                    <tr key={m.code} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-2 font-bold text-slate-800">
                        {m.label}
                      </td>
                      <td className="py-3 px-2 text-center font-black text-slate-900">
                        {m.code === 'EFW'
                          ? `${m.value.toLocaleString()} ± 120 g`
                          : `${m.value.toLocaleString()} ${m.unit}`}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-500 text-[11px]">
                        {m.standardRange}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-700 bg-slate-100">
                          {m.percentile}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                          {m.assessment}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section III: XÉT NGHIỆM HUYẾT HỌC & SINH HÓA NƯỚC TIỂU */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 tracking-wider uppercase">
                III. XÉT NGHIỆM HUYẾT HỌC &amp; SINH HÓA NƯỚC TIỂU
              </h3>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                1 chỉ số cần chú ý
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Lab 1: Huyết sắc tố */}
              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white space-y-1">
                <div className="text-[10px] text-slate-500 font-semibold">
                  Huyết sắc tố (HGB)
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-sm font-black text-slate-900">
                    11.8 <span className="text-xs font-normal text-slate-500">g/dL</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Ổn định
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">(11.0 - 14.0 g/dL)</div>
              </div>

              {/* Lab 2: Đường huyết đói */}
              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white space-y-1">
                <div className="text-[10px] text-slate-500 font-semibold">
                  Đường huyết đói (Glucose)
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-sm font-black text-slate-900">
                    5.4 <span className="text-xs font-normal text-slate-500">mmol/L</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Bình thường
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">(4.1 - 5.6 mmol/L)</div>
              </div>

              {/* Lab 3: Protein nước tiểu (Highlighted Amber Warning) */}
              <div className="sm:col-span-2 p-3.5 rounded-xl border border-amber-300 bg-[#FFFBEB] space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-amber-950 font-bold">
                    Protein nước tiểu (Que nhúng 10 thông số)
                  </div>
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded">
                    Vết nhẹ - Theo dõi
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-base font-black text-amber-950">
                    0.15 <span className="text-xs font-normal text-amber-900">g/L</span>
                  </div>
                  <span className="text-[10px] text-amber-800 font-medium">
                    [Ngưỡng chuẩn &lt; 0.1 g/L]
                  </span>
                </div>
              </div>

              {/* Lab 4: Độ pH nước tiểu */}
              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white space-y-1">
                <div className="text-[10px] text-slate-500 font-semibold">
                  Độ pH nước tiểu
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-sm font-black text-slate-900">6.5</div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Bình thường
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">(5.0 - 7.5)</div>
              </div>

              {/* Lab 5: Bạch cầu niệu */}
              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white space-y-1">
                <div className="text-[10px] text-slate-500 font-semibold">
                  Bạch cầu niệu (Leukocyte)
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-sm font-black text-slate-900">Âm tính (-)</div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Bình thường
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">Chuẩn: Âm tính</div>
              </div>
            </div>
          </div>

          {/* Section IV: KẾT LUẬN CHUYÊN MÔN & DẶN DÒ ĐIỀU TRỊ */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 tracking-wider uppercase">
                IV. KẾT LUẬN CHUYÊN MÔN &amp; DẶN DÒ ĐIỀU TRỊ
              </h3>
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                Đã hiệu chỉnh bởi BS
              </span>
            </div>

            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 text-xs text-slate-800 space-y-2 leading-relaxed">
              <p>
                <strong>1. Tình trạng thai:</strong>{' '}
                {extractionData.conclusions.fetalCondition}
              </p>
              <p>
                <strong>2. Lưu ý y mẹ:</strong>{' '}
                {extractionData.conclusions.maternalNotes}
              </p>
              <p>
                <strong>3. Hẹn tái khám:</strong>{' '}
                {extractionData.conclusions.followUpAdvice}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): RACA-Net Card + Digital Signature Section */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: RACA-Net Clinical Alert Card (Matching Image 3) */}
          <div className="bg-[#FFFBEB] rounded-2xl p-5 border border-amber-300 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-amber-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-tight">
                  LƯU Ý LÂM SÀNG (MỨC CAM)
                </h3>
              </div>
              <span className="text-[10px] font-black tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                RACA-Net
              </span>
            </div>

            <p className="text-xs text-slate-800 leading-relaxed font-medium">
              {extractionData.racaNetAlert.summary}
            </p>

            <div className="p-3 bg-amber-100/70 rounded-xl text-xs text-amber-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-amber-800" />
                <span>Đề xuất đánh giá bổ sung:</span>
              </div>
              <p className="leading-relaxed text-[11px]">
                {extractionData.racaNetAlert.recommendation.replace(
                  'Đề xuất bác sĩ đánh giá bổ sung: ',
                  ''
                )}
              </p>
            </div>

            <p className="text-[10px] text-amber-900/80 italic">
              {extractionData.racaNetAlert.disclaimer}
            </p>
          </div>

          {/* Card 2: Phân quyền & Chữ ký điện tử duyệt hồ sơ (Matching Image 3) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Phân quyền &amp; Chữ ký điện tử duyệt hồ sơ
            </h3>

            {/* Doctor 1 Item */}
            <div className="p-3 rounded-xl border border-teal-200 bg-teal-50/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0 border border-emerald-300">
                  LM
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    BS. Lê Minh
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    Bác sĩ ký duyệt • Đã xác thực sinh trắc học
                  </div>
                </div>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            </div>

            {/* Doctor 2 Item */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0 border border-teal-200">
                  TV
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    BS. CKI. Trần Ngọc Thảo Vy
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    Bác sĩ siêu âm &amp; lập phiếu • Đã ghi nhận
                  </div>
                </div>
              </div>
              <Check className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 pt-1 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer text-slate-700 leading-snug">
                <input
                  type="checkbox"
                  checked={isChecked1}
                  onChange={(e) => setIsChecked1(e.target.checked)}
                  className="mt-0.5 rounded text-[#275248] focus:ring-[#275248] accent-[#275248]"
                />
                <span className="text-[11px] font-medium">
                  Tôi đã kiểm tra đối chiếu dữ liệu trích xuất với phiếu khám gốc và chịu trách nhiệm chuyên môn.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-slate-700 leading-snug">
                <input
                  type="checkbox"
                  checked={isChecked2}
                  onChange={(e) => setIsChecked2(e.target.checked)}
                  className="mt-0.5 rounded text-[#275248] focus:ring-[#275248] accent-[#275248]"
                />
                <span className="text-[11px] font-medium">
                  Gửi thông báo và cập nhật dữ liệu vào ứng dụng dành cho mẹ bầu (PreCare Mom App).
                </span>
              </label>
            </div>

            {/* Main Action Button inside Card (Matching Image 3) */}
            <button
              type="button"
              onClick={handleSave}
              disabled={!isChecked1 || isSaving}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#275248] hover:bg-[#1f423a] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {isSaving
                  ? 'Đang đồng bộ hồ sơ...'
                  : 'Xác nhận & Đồng bộ vào Hồ sơ bệnh nhân'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Fixed/Sticky Bar (Matching Image 3) */}
      <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToStep2}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <span>Xem lại đối chiếu OCR</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={!isChecked1 || isSaving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#275248] hover:bg-[#1f423a] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>
            {isSaving ? 'Đang lưu vào hồ sơ...' : 'Xác nhận & Lưu hồ sơ'}
          </span>
        </button>
      </div>

      {/* Modal Preview Document (When clicking "Xem file gốc") */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#275248]" />
                <span className="text-xs font-bold text-slate-800">
                  Tài liệu gốc: {extractionData.fileName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-2 bg-slate-100 overflow-hidden">
              <DocumentViewer
                data={extractionData}
                patientName={patientName}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
