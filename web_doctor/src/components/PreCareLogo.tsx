import React from 'react';

interface PreCareLogoProps {
  variant?: 'light' | 'dark' | 'simple';
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
  className?: string;
  onClick?: () => void;
}

export const PreCareLogo: React.FC<PreCareLogoProps> = ({
  variant = 'light',
  size = 'md',
  subtitle,
  className = '',
  onClick,
}) => {
  const isDark = variant === 'dark';

  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 38;
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg';
  const subtextSize = size === 'sm' ? 'text-[8px]' : size === 'lg' ? 'text-[11px]' : 'text-[9.5px]';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Icon Badge */}
      <div
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: size === 'sm' ? '8px' : '10px',
        }}
        className="bg-[#447C72] flex items-center justify-center shrink-0 shadow-sm shadow-teal-900/20"
      >
        <svg
          width={iconSize * 0.58}
          height={iconSize * 0.58}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          <path d="M3.22 12H9.5l1.5-3 2 6 1.5-3h6.28" />
        </svg>
      </div>

      {variant !== 'simple' && (
        <div className="flex flex-col text-left">
          <span
            className={`${textSize} font-bold leading-none tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            PreCare
          </span>
          {Boolean(subtitle) && (
            <span
              className={`${subtextSize} font-semibold uppercase tracking-[0.08em] leading-tight mt-1 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default PreCareLogo;
