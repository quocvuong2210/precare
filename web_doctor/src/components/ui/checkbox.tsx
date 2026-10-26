import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ checked = false, onCheckedChange, disabled = false, className, id, ...props }, ref) => {
    return (
      <button
        type="button"
        role="checkbox"
        id={id}
        ref={ref}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange && onCheckedChange(!checked)}
        className={cn(
          'peer h-4 w-4 shrink-0 rounded border transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
          checked
            ? 'bg-[#4D7D74] border-[#4D7D74] text-white shadow-xs'
            : 'border-slate-300 bg-white hover:border-slate-400',
          className
        )}
        {...props}
      >
        {checked && <Check className="h-3 w-3 stroke-[3]" />}
      </button>
    );
  }
);
Checkbox.displayName = 'Checkbox';
