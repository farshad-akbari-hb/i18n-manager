/**
 * Toaster Component
 * Renders toast notifications from the toast store
 */

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useToastStore, type Toast, type ToastType } from '../../stores/toastStore';
import { cn } from '../../lib/utils';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-green-500" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
};

const styles: Record<ToastType, string> = {
  success: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50',
  error: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50',
  warning: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50',
  info: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50',
};

function ToastItem({ toast }: { toast: Toast }) {
  const [isExiting, setIsExiting] = useState(false);
  const removeToast = useToastStore((state) => state.removeToast);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => removeToast(toast.id), 150);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg',
        'transform transition-all duration-150 ease-out',
        isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0',
        styles[toast.type]
      )}
    >
      {icons[toast.type]}
      <p className="flex-1 text-sm font-medium text-foreground">{toast.message}</p>
      <button
        onClick={handleClose}
        className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
