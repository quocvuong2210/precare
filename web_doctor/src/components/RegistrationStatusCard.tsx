import React from 'react';
import { Mail, FileText, Shield, Check, Clock, AlertTriangle } from 'lucide-react';

export type StatusTone = 'green' | 'amber' | 'red' | 'gray';

export interface StatusItemConfig {
  label: string;
  sublabel?: string;
  statusText: string;
  tone: StatusTone;
}

export interface RegistrationStatusCardProps {
  emailStatus?: StatusItemConfig;
  profileStatus?: StatusItemConfig;
  accountStatus?: StatusItemConfig;
  customRows?: StatusItemConfig[];
  className?: string;
  style?: React.CSSProperties;
}

const getToneStyles = (tone: StatusTone) => {
  switch (tone) {
    case 'green':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        icon: Check,
      };
    case 'amber':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        icon: Clock,
      };
    case 'red':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
        icon: AlertTriangle,
      };
    case 'gray':
    default:
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
        icon: null,
      };
  }
};

const getRowIcon = (index: number) => {
  switch (index) {
    case 0:
      return <Mail className="w-4 h-4 text-[#447C72]" />;
    case 1:
      return <FileText className="w-4 h-4 text-[#447C72]" />;
    case 2:
      return <Shield className="w-4 h-4 text-[#447C72]" />;
    default:
      return <FileText className="w-4 h-4 text-[#447C72]" />;
  }
};

export const RegistrationStatusCard: React.FC<RegistrationStatusCardProps> = ({
  emailStatus = {
    label: 'Email xác thực',
    sublabel: 'bacsi.nguyen@precare.vn',
    statusText: 'Đã xác minh',
    tone: 'green',
  },
  profileStatus = {
    label: 'Hồ sơ bác sĩ',
    sublabel: 'Chứng chỉ & thông tin chuyên môn',
    statusText: 'Chờ duyệt',
    tone: 'amber',
  },
  accountStatus = {
    label: 'Trạng thái tài khoản',
    sublabel: 'Quyền truy cập cổng y tế',
    statusText: 'Chưa kích hoạt',
    tone: 'gray',
  },
  customRows,
  className = '',
  style,
}) => {
  const rows: StatusItemConfig[] = customRows || [
    emailStatus,
    profileStatus,
    accountStatus,
  ];

  return (
    <div
      style={style}
      className={`bg-[#F8FAFC] rounded-2xl border border-slate-200/90 p-3 flex flex-col gap-2.5 ${className}`}
    >
      {rows.map((row, idx) => {
        const toneStyle = getToneStyles(row.tone);
        const ToneIcon = toneStyle.icon;

        return (
          <div
            key={idx}
            className="bg-white rounded-xl border border-slate-200/80 p-3 px-3.5 flex items-center justify-between gap-3 shadow-2xs"
          >
            {/* Left: Icon + Text labels */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#F0F7F6] border border-[#D5EAE6] flex items-center justify-center shrink-0">
                {getRowIcon(idx)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-[13px] font-semibold text-slate-900 leading-tight truncate">
                  {row.label}
                </span>
                {row.sublabel && (
                  <span className="text-[11px] text-slate-500 leading-tight mt-0.5 truncate">
                    {row.sublabel}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Colored Status Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold shrink-0 ${toneStyle.bg} ${toneStyle.text} ${toneStyle.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${toneStyle.dot}`} />
              <span>{row.statusText}</span>
              {ToneIcon && <ToneIcon className="w-3 h-3 stroke-[2.5]" />}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RegistrationStatusCard;
