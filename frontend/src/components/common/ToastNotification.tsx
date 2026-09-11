import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title?: string;
  duration?: number;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
}

type ToastListener = (toast: ToastItem) => void;

class ToastEventManager {
  private listeners: Set<ToastListener> = new Set();

  subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify(toast: ToastItem) {
    this.listeners.forEach((listener) => listener(toast));
  }
}

export const toastEvents = new ToastEventManager();

export const toast = {
  success: (message: string, options?: ToastOptions) => {
    toastEvents.notify({
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'success',
      message,
      title: options?.title,
      duration: options?.duration ?? 4000,
    });
  },
  error: (message: string, options?: ToastOptions) => {
    toastEvents.notify({
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'error',
      message,
      title: options?.title,
      duration: options?.duration ?? 5000,
    });
  },
  warning: (message: string, options?: ToastOptions) => {
    toastEvents.notify({
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'warning',
      message,
      title: options?.title,
      duration: options?.duration ?? 4500,
    });
  },
  info: (message: string, options?: ToastOptions) => {
    toastEvents.notify({
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'info',
      message,
      title: options?.title,
      duration: options?.duration ?? 4000,
    });
  },
};

const toastConfig: Record<
  ToastType,
  {
    icon: React.ComponentType<{ className?: string }>;
    cardClasses: string;
    iconClasses: string;
    defaultTitle: string;
    accentBar: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    cardClasses: 'bg-white/95 border-emerald-200 text-emerald-950 shadow-emerald-900/10',
    iconClasses: 'text-emerald-600 bg-emerald-100/70',
    defaultTitle: 'تم بنجاح',
    accentBar: 'bg-emerald-600',
  },
  error: {
    icon: AlertCircle,
    cardClasses: 'bg-white/95 border-rose-200 text-rose-950 shadow-rose-900/10',
    iconClasses: 'text-rose-600 bg-rose-100/70',
    defaultTitle: 'خطأ في العملية',
    accentBar: 'bg-rose-600',
  },
  warning: {
    icon: AlertTriangle,
    cardClasses: 'bg-white/95 border-amber-200 text-amber-950 shadow-amber-900/10',
    iconClasses: 'text-amber-600 bg-amber-100/70',
    defaultTitle: 'تنبيه',
    accentBar: 'bg-amber-500',
  },
  info: {
    icon: Info,
    cardClasses: 'bg-white/95 border-blue-200 text-blue-950 shadow-blue-900/10',
    iconClasses: 'text-blue-600 bg-blue-100/70',
    defaultTitle: 'إشعار',
    accentBar: 'bg-blue-600',
  },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const unsubscribe = toastEvents.subscribe((newToast) => {
      setToasts((prev) => [newToast, ...prev].slice(0, 5));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;

    const timerMap: Record<string, ReturnType<typeof setTimeout>> = {};

    toasts.forEach((t) => {
      if (t.duration > 0) {
        timerMap[t.id] = setTimeout(() => {
          dismiss(t.id);
        }, t.duration);
      }
    });

    return () => {
      Object.values(timerMap).forEach(clearTimeout);
    };
  }, [toasts, dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div
      dir="rtl"
      aria-live="polite"
      className="fixed top-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-[99999] flex flex-col gap-2.5 w-[calc(100vw-2rem)] sm:w-[380px] pointer-events-none select-none font-sans"
    >
      {toasts.map((t) => {
        const config = toastConfig[t.type];
        const Icon = config.icon;

        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto relative overflow-hidden rounded-2xl border shadow-xl backdrop-blur-md p-4 transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${config.cardClasses}`}
          >
            {/* Right accent line */}
            <div className={`absolute top-0 right-0 bottom-0 w-1.5 ${config.accentBar}`} />

            <div className="flex items-start gap-3 pr-2">
              <div className={`p-2 rounded-xl shrink-0 ${config.iconClasses}`}>
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-black tracking-tight text-slate-900">
                  {t.title || config.defaultTitle}
                </div>
                <div className="text-xs text-slate-700 leading-relaxed font-medium mt-0.5 whitespace-pre-line break-words">
                  {t.message}
                </div>
              </div>

              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="إغلاق التنبيه"
                className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
