import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import type { ToastMessage } from "./types";

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full"
    >
      {toasts.map((toast) => {
        const icon =
          toast.type === "success" ? (
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          ) : toast.type === "warning" ? (
            <AlertTriangle size={18} className="shrink-0 text-amber-600" />
          ) : toast.type === "danger" ? (
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
          ) : (
            <Info size={18} className="shrink-0 text-indigo-600" />
          );

        return (
          <div
            key={toast.id}
            role="alert"
            className="flex items-start justify-between gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          >
            <div className="flex items-start gap-2.5">
              {icon}
              <div>
                <p className="text-sm font-bold tracking-tight">{toast.title}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {toast.message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-label="Dismiss toast"
              style={{ color: "var(--muted)" }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

