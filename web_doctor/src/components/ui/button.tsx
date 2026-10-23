import * as React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading = false, children, disabled, ...props }, ref) => {
    const baseClasses =
      'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none';

    const variantClasses = {
      default: 'bg-[#4D7D74] hover:bg-[#436E66] text-white shadow-sm active:scale-[0.99]',
      destructive: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
      outline: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 shadow-sm',
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900',
      ghost: 'hover:bg-slate-100 text-slate-700',
      link: 'text-[#4D7D74] underline-offset-4 hover:underline p-0 h-auto',
    };

    const sizeClasses = {
      default: 'h-11 px-5 py-2.5',
      sm: 'h-9 px-3 text-xs',
      lg: 'h-12 px-8 text-base font-semibold',
      icon: 'h-10 w-10',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
