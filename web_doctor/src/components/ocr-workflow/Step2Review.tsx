import React, { useState } from 'react';
import {
  ChevronLeft,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Stethoscope,
  Activity,
  Layers,
  Sparkles,
  Edit3,
  Calendar,
  UserCheck,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trash2,
  Loader2,
  X,
} from 'lucide-react';
import { DocumentExtractionData, UploadFileItem } from './mockOcrData';
import { DocumentViewer } from './DocumentViewer';

interface Step2ReviewProps {
  files: UploadFileItem[];
  activeFileIndex: number;
  onSelectFileIndex: (index: number) => void;
  extractionData: DocumentExtractionData;
  onUpdateExtractionData: (data: DocumentExtractionData) => void;
  onBackToStep1: () => void;
  onBackToQueue?: () => void;
  onDeleteFile?: () => Promise<void> | void;
  isDeletingFile?: boolean;
  onProceedToStep3: () => void;
  patientName?: string;
}

export const Step2Review: React.FC<Step2ReviewProps> = ({
  files,
  activeFileIndex,
  onSelectFileIndex,
  extractionData,
  onUpdateExtractionData,
  onBackToStep1,
  onBackToQueue,
  onDeleteFile,
  isDeletingFile = false,
  onProceedToStep3,
  patientName,
}) => {
  // Collapsible sections state
  const [openSection, setOpenSection] = useState<'vitals' | 'biometrics' | 'labs' | 'conclusions'>('biometrics');
  const [hasModified, setHasModified] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const formattedVisitDate = (() => {
    if (!extractionData.visitDate) return 'Chưa rõ ngày';
    const m = extractionData.visitDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : extractionData.visitDate;
  })();

  const vitalsFilledCount = [
    extractionData.vitals.bloodPressureSystolic > 0 && extractionData.vitals.bloodPressureDiastolic > 0,
    extractionData.vitals.weightKg > 0,
    extractionData.vitals.heartRateBpm > 0,
    extractionData.vitals.temperatureC > 0,
    extractionData.vitals.bmi > 0,
  ].filter(Boolean).length;

  const bioFilledCount = extractionData.biometrics.filter((b) => b.value > 0).length;
  const labsFilledCount = extractionData.labs.filter((l) => Boolean(l.value && l.value.trim())).length;

  // Field change handlers
  const handleVitalChange = (field: keyof DocumentExtractionData['vitals'], value: number) => {
    onUpdateExtractionData({
      ...extractionData,
      vitals: {
        ...extractionData.vitals,
        [field]: value,
      },
    });
    setHasModified(true);
  };

  const handleBiometricChange = (code: string, value: number) => {
    onUpdateExtractionData({
      ...extractionData,
      biometrics: extractionData.biometrics.map((m) =>
        m.code === code ? { ...m, value } : m
      ),
    });
    setHasModified(true);
  };

  const handleLabChange = (code: string, value: string) => {
    onUpdateExtractionData({
      ...extractionData,
      labs: extractionData.labs.map((l) =>
        l.code === code ? { ...l, value } : l
      ),
    });
    setHasModified(true);
  };

  const handleConclusionChange = (
    field: keyof DocumentExtractionData['conclusions'],
    value: string
  ) => {
    onUpdateExtractionData({
      ...extractionData,
      conclusions: {
        ...extractionData.conclusions,
        [field]: value,
      },
    });
    setHasModified(true);
  };

  const isBatch = files.length > 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {onBackToQueue && (
            <button
              type="button"
              onClick={onBackToQueue}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/80 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-slate-500" />
              <span>Quay lại hàng đợi</span>
            </button>
          )}
          <button
            type="button"
            onClick={onBackToStep1}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/80 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>{onBackToQueue ? 'Thay thế / Tải lại tệp (Bước 1)' : 'Quay lại Bước 1 (Tải tệp)'}</span>
          </button>
          {onDeleteFile && (
            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={isDeletingFile}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50/80 border border-rose-200 hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Xóa phiếu này</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-[#275248] border border-teal-200/80 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            Độ tin cậy OCR: {extractionData.ocrConfidence}%
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
            Chờ bác sĩ đối chiếu
          </span>
        </div>
      </div>

      {/* Main Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Đối chiếu dữ liệu trích xuất AI
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Kiểm tra trực tiếp kết quả bóc tách tự động so với tài liệu gốc trước khi đồng bộ vào bệnh án điện tử.
        </p>
      </div>

      {/* 3-Step Stepper Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Step 1: Completed */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-emerald-200 shadow-2xs">
          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
            ✓
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-800">1. Chọn &amp; tải tệp</div>
            <div className="text-[10px] text-emerald-700 font-semibold truncate">Đã xong ({files.length} tệp)</div>
          </div>
        </div>

        {/* Step 2: Active */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border-2 border-[#275248] shadow-xs">
          <div className="w-7 h-7 rounded-full bg-[#275248] text-white flex items-center justify-center text-xs font-bold shrink-0">
            2
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#275248]">2. Xử lý &amp; đối chiếu tài liệu</div>
            <div className="text-[10px] text-slate-500 truncate">Đối chiếu OCR &amp; RACA-Net</div>
          </div>
        </div>

        {/* Step 3: Pending */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200/80 opacity-70">
          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0">
            3
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-700">3. Kiểm tra &amp; xác nhận</div>
            <div className="text-[10px] text-slate-400 truncate">Ký số &amp; đồng bộ bệnh án</div>
          </div>
        </div>
      </div>

      {/* BATCH MODE TOOLBAR (Shown when multiple files uploaded) */}
      {isBatch && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-700" />
              <span className="font-bold text-slate-800">
                Chế độ duyệt hàng loạt (Batch Review)
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 font-medium">
                Đang xử lý tệp {activeFileIndex + 1} / {files.length}
              </span>
            </div>

            {/* Quick switcher buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onSelectFileIndex(Math.max(0, activeFileIndex - 1))}
                disabled={activeFileIndex === 0}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
              >
                Tệp trước
              </button>
              <button
                type="button"
                onClick={() =>
                  onSelectFileIndex(Math.min(files.length - 1, activeFileIndex + 1))
                }
                disabled={activeFileIndex >= files.length - 1}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
              >
                Tệp sau
              </button>
            </div>
          </div>

          {/* File Switcher Cards Carousel / Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {files.map((file, idx) => {
              const isSelected = idx === activeFileIndex;
              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => onSelectFileIndex(idx)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all border shrink-0 text-left cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50/70 border-[#275248] ring-1 ring-[#275248] font-bold text-slate-900'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isSelected
                        ? 'bg-[#275248] text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="min-w-0 max-w-[160px] truncate">
                    <div className="truncate">{file.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {file.sizeFormatted}
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SPLIT VIEW: Left Original Document Viewer + Right Verification & Editing Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols on lg, 6 cols on xl): Original Document Viewer */}
        <div className="lg:col-span-5 xl:col-span-6 h-[820px] sticky top-6">
          <DocumentViewer
            data={extractionData}
            patientName={patientName}
          />
        </div>

        {/* Right Column (7 cols on lg, 6 cols on xl): Verification & Editing Forms */}
        <div className="lg:col-span-7 xl:col-span-6 space-y-5">
          {/* 1. Visit Grouping Rules ("Ghép phiên khám / Nhóm lần khám") */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#275248]" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Quy tắc ghép phiên khám (Visit Grouping)
                </h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {extractionData.visitDate ? `Mốc ngày ${formattedVisitDate}` : 'Chưa xác định ngày khám'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  extractionData.groupingOption === 'merge_existing'
                    ? 'border-[#275248] bg-teal-50/40 text-slate-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="grouping_option"
                  checked={extractionData.groupingOption === 'merge_existing'}
                  onChange={() =>
                    onUpdateExtractionData({
                      ...extractionData,
                      groupingOption: 'merge_existing',
                    })
                  }
                  className="mt-0.5 accent-[#275248]"
                />
                <div>
                  <div className="font-bold text-slate-900">
                    Ghép vào lần khám hiện tại
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                    {formattedVisitDate} • {extractionData.gestationalAgeFormatted || 'Chưa xác định tuổi thai'}
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  extractionData.groupingOption === 'create_new'
                    ? 'border-[#275248] bg-teal-50/40 text-slate-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="grouping_option"
                  checked={extractionData.groupingOption === 'create_new'}
                  onChange={() =>
                    onUpdateExtractionData({
                      ...extractionData,
                      groupingOption: 'create_new',
                    })
                  }
                  className="mt-0.5 accent-[#275248]"
                />
                <div>
                  <div className="font-bold text-slate-900">
                    Tạo phiên khám mới độc lập
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                    Ghi nhận như một lượt khám lâm sàng riêng biệt
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 2. RACA-Net Clinical Alert Card (Matching Image 3) */}
          <div className="bg-[#FFFBEB] rounded-2xl p-5 border border-amber-300 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-amber-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-tight">
                  {extractionData.racaNetAlert.levelName || 'ĐÁNH GIÁ LÂM SÀNG'}
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

          {/* 3. Editable Verification Forms */}
          <div className="space-y-4">
            {/* Section I: Thông tin khám & Sinh hiệu */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  setOpenSection(openSection === 'vitals' ? 'biometrics' : 'vitals')
                }
                className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/60 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#275248] text-xs font-bold flex items-center justify-center">
                    I
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Thông tin khám &amp; Chỉ số sinh hiệu
                    </h4>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Huyết áp, cân nặng, mạch, thân nhiệt, BMI
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    {vitalsFilledCount}/5 chỉ số đã có
                  </span>
                  {openSection === 'vitals' ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {openSection === 'vitals' && (
                <div className="p-5 space-y-4 border-t border-slate-100 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Ngày khám thực hiện
                      </label>
                      <input
                        type="date"
                        value={extractionData.visitDate}
                        onChange={(e) =>
                          onUpdateExtractionData({
                            ...extractionData,
                            visitDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-[#275248]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Bác sĩ thực hiện siêu âm
                      </label>
                      <input
                        type="text"
                        value={extractionData.doctorPerformer}
                        onChange={(e) =>
                          onUpdateExtractionData({
                            ...extractionData,
                            doctorPerformer: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-[#275248]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                    {/* Huyết áp (Tâm thu / Tâm trương) */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1 whitespace-nowrap">
                        Huyết áp (Tâm thu / Tâm trương)
                      </label>
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white focus-within:border-[#275248] focus-within:ring-1 focus-within:ring-[#275248] transition-colors">
                        <input
                          type="number"
                          aria-label="Huyết áp tâm thu"
                          value={extractionData.vitals.bloodPressureSystolic}
                          onChange={(e) =>
                            handleVitalChange(
                              'bloodPressureSystolic',
                              Number(e.target.value)
                            )
                          }
                          className="w-full min-w-0 text-xs font-bold text-slate-800 text-left outline-none bg-transparent"
                        />
                        <span className="text-slate-300 font-bold select-none">/</span>
                        <input
                          type="number"
                          aria-label="Huyết áp tâm trương"
                          value={extractionData.vitals.bloodPressureDiastolic}
                          onChange={(e) =>
                            handleVitalChange(
                              'bloodPressureDiastolic',
                              Number(e.target.value)
                            )
                          }
                          className="w-full min-w-0 text-xs font-bold text-slate-800 text-left outline-none bg-transparent"
                        />
                        <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                          mmHg
                        </span>
                      </div>
                    </div>

                    {/* Cân nặng */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1 whitespace-nowrap">
                        Cân nặng
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white focus-within:border-[#275248] focus-within:ring-1 focus-within:ring-[#275248] transition-colors">
                        <input
                          type="number"
                          step="0.1"
                          aria-label="Cân nặng"
                          value={extractionData.vitals.weightKg}
                          onChange={(e) =>
                            handleVitalChange('weightKg', Number(e.target.value))
                          }
                          className="w-full min-w-0 text-xs font-bold text-slate-800 text-left outline-none bg-transparent"
                        />
                        <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                          kg
                        </span>
                      </div>
                    </div>

                    {/* Mạch */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1 whitespace-nowrap">
                        Mạch
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white focus-within:border-[#275248] focus-within:ring-1 focus-within:ring-[#275248] transition-colors">
                        <input
                          type="number"
                          aria-label="Mạch"
                          value={extractionData.vitals.heartRateBpm}
                          onChange={(e) =>
                            handleVitalChange(
                              'heartRateBpm',
                              Number(e.target.value)
                            )
                          }
                          className="w-full min-w-0 text-xs font-bold text-slate-800 text-left outline-none bg-transparent"
                        />
                        <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                          bpm
                        </span>
                      </div>
                    </div>

                    {/* Thân nhiệt */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1 whitespace-nowrap">
                        Thân nhiệt
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white focus-within:border-[#275248] focus-within:ring-1 focus-within:ring-[#275248] transition-colors">
                        <input
                          type="number"
                          step="0.1"
                          aria-label="Thân nhiệt"
                          value={extractionData.vitals.temperatureC}
                          onChange={(e) =>
                            handleVitalChange(
                              'temperatureC',
                              Number(e.target.value)
                            )
                          }
                          className="w-full min-w-0 text-xs font-bold text-slate-800 text-left outline-none bg-transparent"
                        />
                        <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                          °C
                        </span>
                      </div>
                    </div>

                    {/* BMI */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1 whitespace-nowrap">
                        Chỉ số BMI
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white focus-within:border-[#275248] focus-within:ring-1 focus-within:ring-[#275248] transition-colors">
                        <input
                          type="number"
                          step="0.1"
                          aria-label="Chỉ số BMI"
                          value={extractionData.vitals.bmi}
                          onChange={(e) =>
                            handleVitalChange('bmi', Number(e.target.value))
                          }
                          className="w-full min-w-0 text-xs font-bold text-slate-800 text-left outline-none bg-transparent"
                        />
                        <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                          kg/m²
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section II: Sinh trắc học thai nhi 4D (Core Section) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  setOpenSection(
                    openSection === 'biometrics' ? 'vitals' : 'biometrics'
                  )
                }
                className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/60 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#275248] text-xs font-bold flex items-center justify-center">
                    II
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Sinh trắc học thai nhi (Siêu âm 4D Tuần 32)
                    </h4>
                    <span className="text-[10px] text-slate-500 font-normal">
                      BPD, HC, AC, FL, EFW (Hadlock IV), AFI
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    {bioFilledCount}/{extractionData.biometrics.length} chỉ số đã trích xuất
                  </span>
                  {openSection === 'biometrics' ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {openSection === 'biometrics' && (
                <div className="p-5 space-y-3 border-t border-slate-100 text-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-500 text-[11px] font-semibold">
                          <th className="py-2.5 px-2">Chỉ số sinh trắc</th>
                          <th className="py-2.5 px-2 text-center">Giá trị hiệu chỉnh</th>
                          <th className="py-2.5 px-2 text-center">Khoảng chuẩn</th>
                          <th className="py-2.5 px-2 text-center">Bách phân vị</th>
                          <th className="py-2.5 px-2 text-center">Tin cậy OCR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {extractionData.biometrics.map((metric) => (
                          <tr
                            key={metric.code}
                            className="hover:bg-slate-50/70 transition-colors"
                          >
                            <td className="py-3 px-2 font-bold text-slate-800">
                              {metric.label}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={metric.value}
                                  onChange={(e) =>
                                    handleBiometricChange(
                                      metric.code,
                                      Number(e.target.value)
                                    )
                                  }
                                  className="w-20 px-2 py-1 rounded-lg border border-slate-200 text-xs font-black text-slate-900 text-center outline-none focus:border-[#275248] focus:ring-1 focus:ring-[#275248]"
                                />
                                <span className="text-[10px] text-slate-500 font-medium">
                                  {metric.unit}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center text-slate-500 text-[11px]">
                              {metric.standardRange}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200/60">
                                {metric.percentile}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="text-[10px] font-bold text-emerald-700">
                                {metric.confidence}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Section III: Xét nghiệm Huyết học & Nước tiểu */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  setOpenSection(openSection === 'labs' ? 'biometrics' : 'labs')
                }
                className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/60 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#275248] text-xs font-bold flex items-center justify-center">
                    III
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Xét nghiệm huyết học &amp; Sinh hóa nước tiểu
                    </h4>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Huyết sắc tố, đường huyết, protein niệu, pH, bạch cầu
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {labsFilledCount}/{extractionData.labs.length} chỉ số đã có
                  </span>
                  {openSection === 'labs' ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {openSection === 'labs' && (
                <div className="p-5 space-y-3 border-t border-slate-100 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {extractionData.labs.map((lab) => (
                      <div
                        key={lab.code}
                        className={`p-3 rounded-xl border space-y-1.5 ${
                          lab.isAbnormal
                            ? 'bg-amber-50/70 border-amber-300'
                            : 'bg-slate-50/60 border-slate-200/80'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-slate-800">
                              {lab.label}
                            </div>
                            {lab.sublabel && (
                              <div className="text-[10px] text-slate-400">
                                {lab.sublabel}
                              </div>
                            )}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              lab.isAbnormal
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {lab.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={lab.value}
                            onChange={(e) =>
                              handleLabChange(lab.code, e.target.value)
                            }
                            className="w-24 px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                          />
                          <span className="text-[11px] text-slate-500 font-medium">
                            {lab.unit}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-auto">
                            [{lab.normalRange}]
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section IV: Kết luận chuyên môn & Dặn dò điều trị */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  setOpenSection(
                    openSection === 'conclusions' ? 'biometrics' : 'conclusions'
                  )
                }
                className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/60 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#275248] text-xs font-bold flex items-center justify-center">
                    IV
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Kết luận chuyên môn &amp; Dặn dò điều trị
                    </h4>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Tình trạng thai, theo dõi huyết áp &amp; lịch tái khám
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                    Đã chuẩn hóa
                  </span>
                  {openSection === 'conclusions' ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {openSection === 'conclusions' && (
                <div className="p-5 space-y-3.5 border-t border-slate-100 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      1. Tình trạng thai &amp; Bánh nhau
                    </label>
                    <textarea
                      rows={2}
                      value={extractionData.conclusions.fetalCondition}
                      onChange={(e) =>
                        handleConclusionChange('fetalCondition', e.target.value)
                      }
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-normal text-slate-800 outline-none focus:border-[#275248]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      2. Lưu ý y khoa &amp; Hướng dẫn mẹ bầu
                    </label>
                    <textarea
                      rows={2}
                      value={extractionData.conclusions.maternalNotes}
                      onChange={(e) =>
                        handleConclusionChange('maternalNotes', e.target.value)
                      }
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-normal text-slate-800 outline-none focus:border-[#275248]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      3. Hẹn tái khám &amp; Dấu hiệu cảnh báo
                    </label>
                    <input
                      type="text"
                      value={extractionData.conclusions.followUpAdvice}
                      onChange={(e) =>
                        handleConclusionChange('followUpAdvice', e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-normal text-slate-800 outline-none focus:border-[#275248]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && onDeleteFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Xóa phiếu khỏi hàng đợi tiếp nhận?
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Thao tác này sẽ xóa tệp gốc và dữ liệu trích xuất chưa phê duyệt.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isDeletingFile}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
              <div className="font-semibold text-slate-900 truncate">{extractionData.fileName}</div>
              {patientName && (
                <div className="text-[11px] text-slate-500 mt-0.5">Thai phụ: {patientName}</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isDeletingFile}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDeleteFile();
                  setIsDeleteConfirmOpen(false);
                }}
                disabled={isDeletingFile}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isDeletingFile ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác nhận xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sticky Action Bar */}
      <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToStep1}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Quay lại Bước 1 (Tải tệp)</span>
        </button>

        <div className="flex items-center gap-3">
          {hasModified && (
            <span className="text-[11px] text-amber-700 font-medium">
              * Có thông số đã được bác sĩ hiệu chỉnh thủ công
            </span>
          )}

          <button
            type="button"
            onClick={onProceedToStep3}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#275248] hover:bg-[#1f423a] shadow-sm transition-all cursor-pointer"
          >
            <span>Tiếp tục: Kiểm tra &amp; Xác nhận (Bước 3)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
