import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown, ChevronUp, Check } from 'lucide-react';

export type FilterStatus = 'all' | 'pending_ocr' | 'verified' | 'red_warning' | 'confirmed' | 'pending' | 'completed';

export interface StatusCounts {
  all: number;
  pending_ocr: number;
  verified: number;
  red_warning?: number;
  confirmed?: number;
  pending?: number;
  completed?: number;
  [key: string]: number | undefined;
}

export interface StatusFilterDropdownProps {
  value: FilterStatus;
  onChange: (status: FilterStatus) => void;
  counts: StatusCounts;
  className?: string;
}

interface FilterOption {
  id: FilterStatus;
  label: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { id: 'all', label: 'Tất cả hồ sơ' },
  { id: 'pending_ocr', label: 'Chờ duyệt OCR' },
  { id: 'verified', label: 'Đã xác nhận' },
  { id: 'red_warning', label: 'Cờ đỏ nguy cơ cao' },
];

export const StatusFilterDropdown: React.FC<StatusFilterDropdownProps> = ({
  value,
  onChange,
  counts,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption =
    FILTER_OPTIONS.find((opt) => opt.id === value) ||
    // Hỗ trợ backwards compatibility: nếu value là 'confirmed' thì hiển thị 'Đã xác nhận', nếu 'pending' thì 'Chờ duyệt OCR'
    (value === 'confirmed' ? FILTER_OPTIONS[2] : value === 'pending' ? FILTER_OPTIONS[1] : FILTER_OPTIONS[0]);

  const isFiltering = value !== 'all';

  const handleSelect = (status: FilterStatus) => {
    onChange(status);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold cursor-pointer transition-all shadow-2xs whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
          isFiltering
            ? 'bg-teal-50 border border-teal-300 text-teal-800 hover:bg-teal-100/70 shadow-xs'
            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
        }`}
      >
        <Filter className={`w-3.5 h-3.5 shrink-0 ${isFiltering ? 'text-teal-700' : 'text-slate-500'}`} />
        <span className="truncate">{selectedOption.label}</span>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform" />
        )}
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Danh sách trạng thái hồ sơ thai kỳ"
          className="absolute right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-slate-200/90 p-2 min-w-[230px] w-max max-w-[280px] animate-in fade-in-0 zoom-in-95 duration-100 origin-top-right"
        >
          {/* Tiêu đề trên cùng */}
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 select-none border-b border-slate-100 mb-1">
            LỌC THEO TRẠNG THÁI
          </div>

          {/* Danh sách các mục lựa chọn */}
          <div className="flex flex-col space-y-0.5">
            {FILTER_OPTIONS.map((option) => {
              const isSelected =
                option.id === value ||
                (option.id === 'verified' && value === 'confirmed') ||
                (option.id === 'pending_ocr' && value === 'pending');

              // Tính toán số đếm cho option tương ứng
              let count = counts[option.id] ?? 0;
              if (option.id === 'pending_ocr' && count === 0 && counts.pending) {
                count = counts.pending;
              }
              if (option.id === 'verified' && count === 0 && counts.confirmed) {
                count = counts.confirmed;
              }

              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.id)}
                  className={`w-full flex justify-between items-center px-2.5 py-2 rounded-lg cursor-pointer text-xs sm:text-sm transition-colors select-none text-left ${
                    isSelected
                      ? 'bg-teal-50 text-teal-900 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50 font-medium'
                  }`}
                >
                  {/* Icon Check & Tên mục */}
                  <div className="flex items-center gap-2 min-w-0">
                    {isSelected ? (
                      <Check className="w-4 h-4 text-teal-700 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 shrink-0" aria-hidden="true" />
                    )}
                    <span className="truncate">{option.label}</span>
                  </div>

                  {/* Badge đếm số lượng */}
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold ml-2 shrink-0 ${
                      isSelected
                        ? 'bg-teal-200/70 text-teal-900'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusFilterDropdown;
