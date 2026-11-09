import React, { useState } from 'react';
import {
  MappingItem,
  StandardBiomarkerMetric,
} from '../../types/admin.types';
import { PreviewUltrasoundModal } from './PreviewUltrasoundModal';
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Sparkles,
  Eye,
  CheckCheck,
} from 'lucide-react';

export interface MappingQueueProps {
  items: MappingItem[];
  isLoading: boolean;
  onConfirmMapping: (itemId: string, targetMetric: StandardBiomarkerMetric, rawLabel: string, note?: string) => Promise<void>;
}

const CLINICAL_METRICS: { value: StandardBiomarkerMetric; label: string }[] = [
  { value: 'bpd', label: 'BPD (Đường kính lưỡng đỉnh)' },
  { value: 'hc', label: 'HC (Chu vi vòng đầu)' },
  { value: 'ac', label: 'AC (Chu vi vòng bụng)' },
  { value: 'fl', label: 'FL (Chiều dài xương đùi)' },
  { value: 'efw', label: 'EFW (Cân nặng ước tính)' },
];

export const MappingQueue: React.FC<MappingQueueProps> = ({
  items,
  isLoading,
  onConfirmMapping,
}) => {
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
  const [previewItem, setPreviewItem] = useState<MappingItem | null>(null);

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
      {/* Clinical Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2.5 text-xs text-amber-900">
        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-amber-950">Lưu ý lâm sàng:</strong> Việc chuẩn hóa từ điển nhãn OCR do Quản trị viên thiết lập mang tính hệ thống, không thay thế bước kiểm tra và xác nhận giá trị đo cuối cùng của Bác sĩ trực tiếp điều trị.
        </p>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#117366]" />
            <h2 className="text-sm font-semibold text-slate-800">
              Hàng đợi xử lý nhãn OCR ({items.length} nhãn chờ ánh xạ)
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Cơ chế: <strong className="text-[#117366] font-medium">Tự động cập nhật từ điển toàn cục</strong>
          </span>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[940px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-[220px] min-w-[200px]">Từ khóa trích xuất (OCR)</th>
                <th className="py-3 px-4 w-[120px] min-w-[110px]">Giá trị đo</th>
                <th className="py-3 px-4 w-[230px] min-w-[210px]">Tài liệu nguồn & Đối chiếu</th>
                <th className="py-3 px-4 w-[90px] min-w-[80px] text-center">Tần suất</th>
                <th className="py-3 px-4 w-[210px] min-w-[200px]">Ánh xạ sang chỉ số chuẩn</th>
                <th className="py-3 px-4 w-[110px] min-w-[100px] text-right">Thao tác</th>
              </tr>
            </thead>

            {isLoading ? (
              <tbody className="divide-y divide-slate-100 text-xs">
                {[1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-16 bg-slate-200 rounded"></div></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-36 bg-slate-200 rounded"></div></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-12 bg-slate-200 rounded mx-auto"></div></td>
                    <td className="py-3.5 px-4"><div className="h-8 w-44 bg-slate-200 rounded-lg"></div></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-8 w-20 bg-slate-200 rounded-lg ml-auto"></div></td>
                  </tr>
                ))}
              </tbody>
            ) : (
              <tbody className="divide-y divide-slate-100 text-xs">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#117366] flex items-center justify-center mx-auto mb-2">
                        <CheckCheck className="w-6 h-6 stroke-[1.8]" />
                      </div>
                      <div className="text-xs font-semibold text-slate-800">
                        Hàng đợi ánh xạ nhãn OCR đang trống
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm mx-auto">
                        Tất cả các nhãn dị biệt đã được chuẩn hóa đồng bộ với bộ thông số Hadlock.
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
                        <td className="py-3 px-4 align-middle">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-semibold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs whitespace-nowrap">
                              {item.raw_label}
                            </span>
                            {item.suggested_metric && (
                              <span
                                className="inline-flex items-center gap-0.5 text-[10px] text-[#117366] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 font-medium whitespace-nowrap"
                                title="AI Gợi ý chỉ số này"
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Gợi ý</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-1 flex items-center gap-1 whitespace-nowrap">
                            <Clock className="w-3 h-3" />
                            <span>{item.detected_at}</span>
                          </div>
                        </td>

                        {/* Giá trị đo mẫu */}
                        <td className="py-3 px-4 align-middle font-mono font-semibold text-slate-800 whitespace-nowrap">
                          {item.sample_value}
                        </td>

                        {/* Tài liệu gốc */}
                        <td className="py-3 px-4 align-middle">
                          <div className="flex items-center gap-1.5 max-w-[210px]">
                            <button
                              type="button"
                              onClick={() => setPreviewItem(item)}
                              className="group flex items-center gap-1.5 text-slate-700 hover:text-[#117366] text-xs truncate cursor-pointer text-left"
                              title={item.file_name}
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#117366] shrink-0" />
                              <span className="truncate underline decoration-slate-300 group-hover:decoration-[#117366]">
                                {item.file_name}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewItem(item)}
                              className="p-1 rounded text-slate-400 hover:text-[#117366] hover:bg-teal-50 shrink-0 cursor-pointer"
                              title="Đối chiếu bản quét"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {item.machine_model && (
                            <div className="text-[11px] text-slate-400 truncate max-w-[210px] mt-0.5" title={item.machine_model}>
                              {item.machine_model}
                            </div>
                          )}
                        </td>

                        {/* Tần suất */}
                        <td className="py-3 px-4 align-middle text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                            {item.frequency} lần
                          </span>
                        </td>

                        {/* Dropdown chỉ số */}
                        <td className="py-3 px-4 align-middle">
                          <select
                            value={currentTarget}
                            onChange={(e) => handleSelectMetric(item.id, e.target.value as StandardBiomarkerMetric)}
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#117366] focus:border-[#117366] cursor-pointer"
                          >
                            <option value="">-- Chọn chỉ số chuẩn --</option>
                            {CLINICAL_METRICS.map((metric) => (
                              <option key={metric.value} value={metric.value}>
                                {metric.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Nút thao tác */}
                        <td className="py-3 px-4 align-middle text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleConfirm(item)}
                            disabled={!currentTarget || isProcessing}
                            className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-lg text-xs font-medium text-white bg-[#117366] hover:bg-[#0e5c52] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                            title="Lưu ánh xạ nhãn này vào từ điển"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isProcessing ? 'Đang lưu...' : 'Xác nhận'}</span>
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
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Nhãn sau khi xác nhận sẽ tự động bổ sung vào từ điển OCR toàn hệ thống.</span>
          <span className="font-medium text-slate-700">Tuân thủ tiêu chuẩn Hadlock-ACOG</span>
        </div>
      </div>

      <PreviewUltrasoundModal
        item={previewItem}
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
        onConfirm={async (itemId, metric, label, note) => {
          await onConfirmMapping(itemId, metric, label, note);
        }}
      />
    </div>
  );
};

export default MappingQueue;
