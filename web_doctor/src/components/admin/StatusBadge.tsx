import React from 'react';
import { UserStatus, ProfileStatus } from '../../types/admin.types';
import { CheckCircle2, Clock, Lock, XCircle, MailCheck, MailWarning } from 'lucide-react';

export interface StatusBadgeProps {
  status: UserStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'active':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap ${className}`}
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>Hoạt động</span>
        </span>
      );

    case 'pending':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-300 whitespace-nowrap ${className}`}
        >
          <Clock className="w-3 h-3 text-amber-600 shrink-0 animate-pulse" />
          <span>Chờ xét duyệt</span>
        </span>
      );

    case 'locked':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200 whitespace-nowrap ${className}`}
        >
          <Lock className="w-3 h-3 text-rose-600 shrink-0" />
          <span>Đã khóa</span>
        </span>
      );

    default:
      return null;
  }
};

export const ProfileStatusBadge: React.FC<{ status?: ProfileStatus; className?: string }> = ({
  status = 'pending',
  className = '',
}) => {
  switch (status) {
    case 'approved':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-teal-50 text-[#117366] border border-teal-200 whitespace-nowrap ${className}`}
          title="Hồ sơ chuyên môn đã được phê duyệt"
        >
          <CheckCircle2 className="w-3 h-3 text-[#117366] shrink-0" />
          <span>Đã duyệt CCHN</span>
        </span>
      );

    case 'rejected':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap ${className}`}
          title="Hồ sơ bị từ chối"
        >
          <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
          <span>Từ chối</span>
        </span>
      );

    case 'pending':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-300 whitespace-nowrap ${className}`}
          title="Hồ sơ đang chờ thẩm định"
        >
          <Clock className="w-3 h-3 text-amber-600 shrink-0 animate-pulse" />
          <span>Chờ duyệt CCHN</span>
        </span>
      );
  }
};

export const EmailVerifiedBadge: React.FC<{ verified: boolean; className?: string }> = ({
  verified,
  className = '',
}) => {
  if (verified) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap ${className}`}
        title="Email đã xác thực"
      >
        <MailCheck className="w-3 h-3 text-emerald-600 shrink-0" />
        <span>Email đã xác thực</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap ${className}`}
      title="Chưa xác thực email"
    >
      <MailWarning className="w-3 h-3 text-amber-600 shrink-0" />
      <span>Chưa xác thực email</span>
    </span>
  );
};

export default StatusBadge;
