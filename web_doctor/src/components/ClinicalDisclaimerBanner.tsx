import React from 'react';
import { ShieldCheck } from 'lucide-react';

export interface ClinicalDisclaimerBannerProps {
  disclaimerText?: string;
  className?: string;
  rulesVersion?: string;
  modelVersion?: string;
}

/**
 * Thanh cảnh báo an toàn lâm sàng.
 * Tuyên bố giới hạn sử dụng y tế luôn hiện diện cố định theo quy chuẩn an toàn.
 * Đã loại bỏ hoàn toàn các huy hiệu thuật toán/mô hình (Hadlock / RACA-Net) theo yêu cầu.
 */
export const ClinicalDisclaimerBanner: React.FC<ClinicalDisclaimerBannerProps> = ({
  disclaimerText = 'LƯU Ý Y TẾ: Kết quả phân tích của PreCare chỉ mang tính chất hỗ trợ sàng lọc và tham khảo, không thay thế quyết định chẩn đoán của bác sĩ chuyên khoa.',
  className = '',
}) => {
  return (
    <div
      role="note"
      aria-label="Thông báo an toàn lâm sàng"
      className={`w-full bg-slate-50/90 border border-teal-200/70 rounded-xl px-4 py-2.5 sm:px-4.5 sm:py-2.5 shadow-2xs flex items-center gap-2.5 text-xs text-slate-700 ${className}`}
    >
      {/* Nội dung lưu ý y tế */}
      <div className="w-6 h-6 rounded-md bg-teal-100/70 border border-teal-200/80 flex items-center justify-center text-teal-800 shrink-0">
        <ShieldCheck className="w-3.5 h-3.5 stroke-[2.2]" />
      </div>
      <p className="leading-relaxed font-medium text-slate-800">
        <strong className="text-teal-950 font-bold tracking-tight">LƯU Ý Y TẾ:</strong>{' '}
        {disclaimerText.replace(/^LƯU Ý Y TẾ:\s*/i, '')}
      </p>
    </div>
  );
};

export default ClinicalDisclaimerBanner;
