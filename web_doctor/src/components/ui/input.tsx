import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, hasError, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 transition-colors',
          'focus-visible:outline-none focus-visible:ring-1',
          hasError
            ? 'border-rose-400 focus-visible:border-rose-500 focus-visible:ring-rose-400/30'
            : 'border-slate-200 hover:border-slate-300 focus-visible:border-[#4D7D74] focus-visible:ring-[#4D7D74]/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
