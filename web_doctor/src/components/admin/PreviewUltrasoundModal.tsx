import React, { useState, useEffect } from 'react';
import { MappingItem, StandardBiomarkerMetric } from '../../types/admin.types';
import {
  X,
  CheckCircle2,
  Sparkles,
  Loader2,
  Scan,
} from 'lucide-react';

export interface PreviewUltrasoundModalProps {
  item: MappingItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (itemId: string, targetMetric: StandardBiomarkerMetric, rawLabel: string, note?: string) => Promise<void>;
}

const CLINICAL_METRICS: { value: StandardBiomarkerMetric; label: string; desc: string; standardUnit: string }[] = [
  { value: 'bpd', label: 'BPD (Đường kính lưỡng đỉnh)', desc: 'Biparietal Diameter', standardUnit: 'mm' },
  { value: 'hc', label: 'HC (Chu vi vòng đầu)', desc: 'Head Circumference', standardUnit: 'mm' },
  { value: 'ac', label: 'AC (Chu vi vòng bụng)', desc: 'Abdominal Circumference', standardUnit: 'mm' },
  { value: 'fl', label: 'FL (Chiều dài xương đùi)', desc: 'Femur Length', standardUnit: 'mm' },
  { value: 'efw', label: 'EFW (Cân nặng thai ước tính)', desc: 'Estimated Fetal Weight', standardUnit: 'g' },
];

export const PreviewUltrasoundModal: React.FC<PreviewUltrasoundModalProps> = ({
  item,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<StandardBiomarkerMetric | ''>('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setSelectedMetric(item.suggested_metric || '');
      setNote('');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleConfirmMapping = async () => {
    if (!selectedMetric) {
      alert('Vui lòng chọn chỉ số lâm sàng chuẩn hóa!');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(item.id, selectedMetric as StandardBiomarkerMetric, item.raw_label, note);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
      <div
        className="bg-white rounded-xl max-w-4xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Đối chiếu Phiếu Siêu âm & Ánh xạ Nhãn OCR
                </h3>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                  Đối chiếu cận lâm sàng
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tập tin: <span className="font-mono font-medium text-slate-700">{item.file_name}</span>
                {(item as any).patient_code && ` • Mã BN: ${(item as any).patient_code}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: 2 Columns */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Cột Trái: Mô phỏng phiếu siêu âm gốc */}
          <div className="lg:col-span-7 flex flex-col space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <span>Bản quét tài liệu gốc</span>
              <span className="text-teal-700 font-mono font-normal">Máy: {(item as any).machine_model || 'Thiết bị siêu âm 4D'}</span>
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 text-slate-200 font-mono text-xs shadow-inner flex flex-col justify-between min-h-[340px]">
              {/* Header phiếu siêu âm */}
              <div className="border-b border-slate-700/80 pb-2.5 flex justify-between items-start text-[11px]">
                <div>
                  <div className="text-teal-400 font-bold tracking-wider">PRECARE OB/GYN CLINICAL LAB</div>
                  <div className="text-slate-400 text-[10px]">KHOA CHẨN ĐOÁN HÌNH ẢNH & THĂM DÒ CHỨC NĂNG</div>
                </div>
                <div className="text-right text-slate-400 text-[10px]">
                  <div>NGÀY KHÁM: {item.detected_at}</div>
                  <div>ID: {(item as any).patient_code || 'BN-84920'}</div>
                </div>
              </div>

              {/* Vùng hiển thị siêu âm & bảng chỉ số */}
              <div className="my-3 space-y-2.5">
                <div className="h-24 bg-slate-950/90 rounded-lg border border-slate-800 flex items-center justify-center relative overflow-hidden">
                  <div className="text-center z-10">
                    <Scan className="w-6 h-6 text-teal-500/80 mx-auto mb-1 animate-pulse" />
                    <span className="text-[10px] text-slate-400 font-sans block">
                      Hình ảnh siêu âm (Mặt cắt đo đạc sinh trắc)
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/90 rounded-lg p-2.5 border border-slate-800 space-y-1.5 text-[11px]">
                  <div className="text-[10px] text-slate-400 font-sans uppercase font-medium border-b border-slate-800 pb-1 flex justify-between">
                    <span>Chỉ số đo đạc</span>
                    <span>Kết quả</span>
                    <span>Trạng thái</span>
                  </div>

                  {/* Dòng được Highlight màu vàng (nhãn lạ cần đối chiếu) */}
                  <div className="flex items-center justify-between p-1.5 rounded bg-amber-500/20 border border-amber-400/80 text-amber-200">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      <strong className="text-amber-300 font-bold">[{item.raw_label}]</strong>
                    </div>
                    <span className="font-bold text-white text-xs">{item.sample_value}</span>
                    <span className="text-amber-300 font-sans text-[10px] font-medium">Cần ánh xạ</span>
                  </div>

                  <div className="flex items-center justify-between p-1 text-slate-400 text-[10px]">
                    <span>Chu vi đầu (HC)</span>
                    <span>292.0 mm</span>
                    <span className="text-emerald-400">Đã nhận diện</span>
                  </div>

                  <div className="flex items-center justify-between p-1 text-slate-400 text-[10px]">
                    <span>Chiều dài xương đùi (FL)</span>
                    <span>58.0 mm</span>
                    <span className="text-emerald-400">Đã nhận diện</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-2 flex justify-between">
                <span>Vị trí OCR: Trang 1/1</span>
                <span>Tài liệu: {item.file_name}</span>
              </div>
            </div>
          </div>

          {/* Cột Phải: Ánh xạ và xác nhận */}
          <div className="lg:col-span-5 flex flex-col space-y-3.5">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Thiết lập quy tắc chuẩn hóa
            </div>

            {/* Thông tin nhãn lạ */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block">Từ khóa lạ trích xuất (OCR Raw):</span>
                <span className="text-sm font-bold font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                  {item.raw_label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">Giá trị đo mẫu:</span>
                  <span className="font-medium text-slate-800 font-mono">{item.sample_value}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Tần suất xuất hiện:</span>
                  <span className="font-medium text-amber-800">{item.frequency} lần quét</span>
                </div>
              </div>

              {item.suggested_metric && (
                <div className="p-2 bg-teal-50 border border-teal-200 rounded-lg flex items-center gap-2 text-[11px] text-teal-900">
                  <Sparkles className="w-3.5 h-3.5 text-[#117366] shrink-0" />
                  <div>
                    <span>AI Gợi ý: </span>
                    <strong className="text-[#117366] font-bold uppercase">
                      [{item.suggested_metric}]
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Chọn chỉ số chuẩn */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-800">
                Ánh xạ sang chỉ số chuẩn Hadlock <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                {CLINICAL_METRICS.map((metric) => {
                  const isChecked = selectedMetric === metric.value;
                  return (
                    <label
                      key={metric.value}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-teal-50 border-[#117366] text-slate-900 font-medium'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="standardMetric"
                        value={metric.value}
                        checked={isChecked}
                        onChange={() => setSelectedMetric(metric.value)}
                        className="mt-0.5 text-[#117366] focus:ring-[#117366]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{metric.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap ml-1">
                            {metric.standardUnit}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">{metric.desc}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Ghi chú */}
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-600">
                Ghi chú nội bộ (Tùy chọn)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Quy tắc ánh xạ riêng cho dòng máy GE Voluson"
                className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#117366] focus:border-[#117366]"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Quy tắc sau khi lưu sẽ áp dụng tức thời cho toàn bộ pipeline OCR.
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 px-3 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmMapping}
              disabled={!selectedMetric || isSubmitting}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-medium text-white bg-[#117366] hover:bg-[#0e5c52] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Xác nhận</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewUltrasoundModal;
