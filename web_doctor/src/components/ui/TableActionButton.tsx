import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TableActionButtonProps {
  label: string;
  icon?: LucideIcon;
  variant?: 'primary' | 'outline';
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export const TableActionButton: React.FC<TableActionButtonProps> = ({
  label,
  icon: Icon,
  variant = 'outline',
  onClick,
  disabled = false,
  className = '',
}) => {
  const variantClasses =
    variant === 'primary'
      ? 'bg-[#275248] hover:bg-[#1f423a] text-white font-bold border border-transparent shadow-xs'
      : 'bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 shadow-2xs';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-[172px] h-9 px-3 rounded-xl text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses} ${className}`}
    >
      {Icon && (
        <Icon
          className={`w-3.5 h-3.5 shrink-0 ${
            variant === 'primary' ? 'text-white' : 'text-slate-500'
          }`}
        />
      )}
      <span className="truncate">{label}</span>
    </button>
  );
};
