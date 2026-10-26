import * as React from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  title?: string;
  onClose?: () => void;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', title, children, onClose, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-slate-50 border-slate-200 text-slate-800',
      destructive: 'bg-rose-50 border-rose-200 text-rose-900',
      success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      warning: 'bg-amber-50 border-amber-200 text-amber-900',
    };

    const icons = {
      default: <Info className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />,
      destructive: <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />,
      success: <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />,
      warning: <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />,
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-xl border p-3.5 text-xs sm:text-sm flex gap-3 items-start',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {icons[variant]}
        <div className="flex-1 min-w-0">
          {title && <h5 className="font-semibold mb-0.5 leading-tight">{title}</h5>}
          <div className="text-xs leading-relaxed opacity-95">{children}</div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = 'Alert';
