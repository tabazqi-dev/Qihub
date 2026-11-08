import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
              isSuccess
                ? 'bg-neutral-900/90 text-neutral-100 border-neutral-700 dark:bg-neutral-900/95 dark:border-neutral-800'
                : isError
                ? 'bg-rose-950/90 text-rose-100 border-rose-800/60'
                : isWarning
                ? 'bg-amber-950/90 text-amber-100 border-amber-800/60'
                : 'bg-neutral-900/90 text-neutral-100 border-neutral-700'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {isError && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              {isWarning && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-indigo-400 shrink-0" />}
              <p className="text-xs font-medium truncate">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-neutral-400 hover:text-neutral-200 transition-colors p-1"
              aria-label="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
