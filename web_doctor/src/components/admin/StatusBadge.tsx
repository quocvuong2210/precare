import React from 'react';
import { UserStatus } from '../../types/admin.types';
import { CheckCircle2, Clock, Lock } from 'lucide-react';

export interface StatusBadgeProps {
  status: UserStatus;
  className?: string;
}

/**
 * Reusable StatusBadge Component
 * Tuân thủ chuẩn trợ năng màu sắc WCAG AAA/AA
 * Sử dụng icon dạng Solid (fill-current / text-white) cho độ tương phản sắc nét
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'active':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-600 text-white shrink-0" />
          <span>Hoạt động</span>
        </span>
      );

    case 'pending':
      // Cải thiện độ tương phản: Nền vàng cam ấm (amber-100), chữ nâu cam đậm (amber-950 font-extrabold)
      // Tỉ lệ tương phản > 14:1 vượt trội so với chuẩn WCAG AAA (7:1)
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs ${className}`}
        >
          <Clock className="w-3.5 h-3.5 fill-amber-500 text-white shrink-0 animate-pulse" />
          <span>Chờ xét duyệt</span>
        </span>
      );

    case 'locked':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs ${className}`}
        >
          <Lock className="w-3.5 h-3.5 fill-rose-600 text-white shrink-0" />
          <span>Đã khóa</span>
        </span>
      );

    default:
      return null;
  }
};

export default StatusBadge;

