import React from 'react';
import { ShieldCheck } from 'lucide-react';

export interface ClinicalDisclaimerBannerProps {
  rulesVersion?: string;
  modelVersion?: string;
  disclaimerText?: string;
  className?: string;
}

/**
 * Thanh cảnh báo an toàn lâm sàng và phiên bản phân tích mô hình AI/Rules.
 * Tuyên bố giới hạn sử dụng y tế luôn hiện diện cố định theo quy chuẩn an toàn.
 */
export const ClinicalDisclaimerBanner: React.FC<ClinicalDisclaimerBannerProps> = ({
  rulesVersion = 'Hadlock-ACOG-v1.0',
  modelVersion = 'RACA-Net-ResNet50-v1.2',
  disclaimerText = 'LƯU Ý Y TẾ: Kết quả phân tích của PreCare chỉ mang tính chất hỗ trợ sàng lọc và tham khảo, không thay thế quyết định chẩn đoán của bác sĩ chuyên khoa.',
  className = '',
}) => {
  return (
    <div
      role="note"
      aria-label="Thông báo an toàn lâm sàng và phiên bản phân tích"
      className={`w-full bg-slate-50/90 border border-teal-200/70 rounded-xl px-4 py-2.5 sm:px-4.5 sm:py-2.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs text-slate-700 ${className}`}
    >
      {/* Nội dung lưu ý y tế */}
      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-md bg-teal-100/70 border border-teal-200/80 flex items-center justify-center text-teal-800 shrink-0 mt-0.5 sm:mt-0">
          <ShieldCheck className="w-3.5 h-3.5 stroke-[2.2]" />
        </div>
        <p className="leading-relaxed font-medium text-slate-800">
          <strong className="text-teal-950 font-bold tracking-tight">LƯU Ý Y TẾ:</strong>{' '}
          {disclaimerText.replace(/^LƯU Ý Y TẾ:\s*/i, '')}
        </p>
      </div>

      {/* Thông tin phiên bản bộ luật & mô hình */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium shrink-0 self-start md:self-center">
        <span>Bộ luật: <span className="text-slate-700 font-semibold">{rulesVersion}</span></span>
        <span className="text-slate-400">·</span>
        <span>Mô hình: <span className="text-slate-700 font-semibold">{modelVersion}</span></span>
      </div>
    </div>
  );
};

export default ClinicalDisclaimerBanner;
