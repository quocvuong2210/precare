import React, { useState } from 'react';
import {
  MappingItem,
  StandardBiomarkerMetric,
} from '../../types/admin.types';
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Loader2,
  FileText,
  Sparkles,
} from 'lucide-react';

export interface MappingQueueProps {
  items: MappingItem[];
  isLoading: boolean;
  onConfirmMapping: (itemId: string, targetMetric: StandardBiomarkerMetric, rawLabel: string) => Promise<void>;
}

const CLINICAL_METRICS: { value: StandardBiomarkerMetric; label: string; desc: string }[] = [
  { value: 'bpd', label: 'BPD (Đường kính lưỡng đỉnh)', desc: 'Biparietal Diameter' },
  { value: 'hc', label: 'HC (Chu vi vòng đầu)', desc: 'Head Circumference' },
  { value: 'ac', label: 'AC (Chu vi vòng bụng)', desc: 'Abdominal Circumference' },
  { value: 'fl', label: 'FL (Chiều dài xương đùi)', desc: 'Femur Length' },
  { value: 'efw', label: 'EFW (Cân nặng thai ước tính)', desc: 'Estimated Fetal Weight' },
];

export const MappingQueue: React.FC<MappingQueueProps> = ({
  items,
  isLoading,
  onConfirmMapping,
}) => {
  // Quản lý metric được chọn cho từng dòng
  const [selectedTargets, setSelectedTargets] = useState<Record<string, StandardBiomarkerMetric>>(() => {
    const initial: Record<string, StandardBiomarkerMetric> = {};
    items.forEach((item) => {
      if (item.suggested_metric) {
        initial[item.id] = item.suggested_metric;
      }
    });
    return initial;
  });

  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleSelectMetric = (itemId: string, metric: StandardBiomarkerMetric) => {
    setSelectedTargets((prev) => ({
      ...prev,
      [itemId]: metric,
    }));
  };

  const handleConfirm = async (item: MappingItem) => {
    const target = selectedTargets[item.id] || item.suggested_metric;
    if (!target) {
      alert('Vui lòng chọn chỉ số lâm sàng chuẩn hóa trước khi ánh xạ!');
      return;
    }

    setProcessingId(item.id);
    try {
      await onConfirmMapping(item.id, target, item.raw_label);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Thông tin nghiệp vụ */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 space-y-1">
          <div className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
            <span>Hàng đợi Chuẩn hóa & Ánh xạ Nhãn Siêu âm OCR (Biomarker Mapping Queue)</span>
            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-200 text-amber-800">
              Epic 8
            </span>
          </div>
          <p className="leading-relaxed">
            Hệ thống OCR tự động phát hiện các từ khóa lạ hoặc ký hiệu viết tắt không đồng nhất trên phiếu siêu âm (VD:
            <strong className="text-amber-950"> "ĐKLĐ", "B.P.D", "Vòng bụng"</strong>). Admin tiến hành ánh xạ sang 1 trong 5
            chỉ số chuẩn (BPD, HC, AC, FL, EFW) để mô hình <strong>RACA-Net</strong> và <strong>Luật Hadlock</strong> tự động nhận diện chính xác ở các lần sau.
          </p>
        </div>
      </div>

      {/* Bảng Hàng đợi */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#345C59]" />
            <h2 className="text-sm font-bold text-slate-800">
              Hàng đợi xử lý nhãn OCR ({items.length} nhãn đang chờ)
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Trạng thái: <strong className="text-teal-700">Tự động học máy (Active Learning)</strong>
          </span>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Từ khóa lạ trích xuất (OCR)</th>
                <th className="py-3.5 px-4">Giá trị đo mẫu</th>
                <th className="py-3.5 px-4">File siêu âm gốc</th>
                <th className="py-3.5 px-4">Tần suất</th>
                <th className="py-3.5 px-6">Ánh xạ sang chỉ số chuẩn</th>
                <th className="py-3.5 px-6 text-right">Thao tác</th>
              </tr>
            </thead>

            {isLoading ? (
              <tbody className="divide-y divide-slate-100 text-xs">
                {[1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-20 bg-slate-200 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-36 bg-slate-200 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-12 bg-slate-200 rounded"></div></td>
                    <td className="py-4 px-6"><div className="h-8 w-48 bg-slate-200 rounded-xl"></div></td>
                    <td className="py-4 px-6 text-right"><div className="h-8 w-28 bg-slate-200 rounded-xl ml-auto"></div></td>
                  </tr>
                ))}
              </tbody>
            ) : (
              <tbody className="divide-y divide-slate-100 text-xs">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        Hàng đợi ánh xạ nhãn OCR đang trống!
                      </div>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Tất cả các nhãn dị biệt đã được chuẩn hóa đồng bộ với bộ thông số Hadlock / Intergrowth-21st.
                      </p>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const currentTarget = selectedTargets[item.id] || item.suggested_metric || '';
                    const isProcessing = processingId === item.id;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Từ khóa lạ */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                              {item.raw_label}
                            </span>
                            {item.suggested_metric && (
                              <span
                                className="inline-flex items-center gap-0.5 text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 font-semibold"
                                title="AI RACA-Net gợi ý chỉ số này"
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                Gợi ý
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Phát hiện: {item.detected_at}</span>
                          </div>
                        </td>

                        {/* Giá trị mẫu */}
                        <td className="py-3.5 px-4 font-semibold text-slate-700 font-mono">
                          {item.sample_value}
                        </td>

                        {/* File tài liệu gốc */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 text-slate-700 max-w-[200px] truncate" title={item.file_name}>
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{item.file_name}</span>
                          </div>
                        </td>

                        {/* Tần suất xuất hiện */}
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                            {item.frequency} lần
                          </span>
                        </td>

                        {/* Dropdown 5 chỉ số chuẩn lâm sàng */}
                        <td className="py-3.5 px-6">
                          <select
                            value={currentTarget}
                            onChange={(e) => handleSelectMetric(item.id, e.target.value as StandardBiomarkerMetric)}
                            className="w-full max-w-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 cursor-pointer"
                          >
                            <option value="">-- Chọn chỉ số lâm sàng --</option>
                            {CLINICAL_METRICS.map((metric) => (
                              <option key={metric.value} value={metric.value}>
                                {metric.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Nút Xác nhận Map */}
                        <td className="py-3.5 px-6 text-right">
                          <button
                            onClick={() => handleConfirm(item)}
                            disabled={!currentTarget || isProcessing}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#345C59] hover:bg-[#2A4B48] transition-all shadow-xs cursor-pointer hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Lưu ánh xạ nhãn này vào bộ từ điển chuẩn PreCare"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Đang map...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Xác nhận Map</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            )}
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Nhãn đã ánh xạ thành công sẽ tự động được xóa khỏi hàng đợi và bổ sung vào từ điển OCR toàn hệ thống.
          </span>
          <span className="font-semibold text-slate-700">Hadlock-ACOG Standard Compliance</span>
        </div>
      </div>
    </div>
  );
};
export default MappingQueue;

