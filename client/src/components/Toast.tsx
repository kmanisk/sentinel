import React from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type ToastTone = "success" | "warning" | "error" | "info";

export interface ToastNotice {
  id: number;
  title: string;
  detail?: string;
  tone: ToastTone;
}

interface ToastStackProps {
  toasts: ToastNotice[];
  onDismiss: (id: number) => void;
}

const toneConfig = {
  success: { icon: CheckCircle2, label: "Success" },
  warning: { icon: AlertTriangle, label: "Notice" },
  error: { icon: AlertTriangle, label: "Error" },
  info: { icon: Info, label: "Info" },
};

export const ToastStack: React.FC<ToastStackProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      className="pointer-events-none fixed bottom-5 right-4 z-[80] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2 sm:right-6"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => {
        const config = toneConfig[toast.tone];
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            data-tone={toast.tone}
            className="sentinel-toast pointer-events-auto"
          >
            <div className="flex min-w-0 items-start gap-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--toast-accent)]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    {config.label}
                  </span>
                  <span className="truncate text-xs font-semibold">{toast.title}</span>
                </div>
                {toast.detail && (
                  <p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">{toast.detail}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="sentinel-icon-key -mr-1 -mt-1 shrink-0"
              aria-label={`Dismiss ${toast.title}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
