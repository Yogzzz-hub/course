import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastTone = "info" | "success" | "danger" | "warning";

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
}

interface ToastItem extends ToastInput {
  id: string;
}

interface ToastContextValue {
  showToast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, description, tone = "info" }: ToastInput) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, title, description, tone }]);
      setTimeout(() => {
        dismiss(id);
      }, 6000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fin-toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((item) => {
          const toneClass =
            item.tone === "success"
              ? "fin-toast fin-toast--success"
              : item.tone === "danger"
                ? "fin-toast fin-toast--danger"
                : item.tone === "warning"
                  ? "fin-toast fin-toast--warning"
                  : "fin-toast";
          return (
            <div
              key={item.id}
              className={toneClass}
              role={item.tone === "danger" ? "alert" : "status"}
            >
              <span aria-hidden="true" style={{ marginTop: 2 }}>
                {item.tone === "success" ? (
                  <CheckCircle2 size={17} />
                ) : item.tone === "danger" ? (
                  <AlertCircle size={17} />
                ) : (
                  <Info size={17} />
                )}
              </span>
              <div className="fin-toast-content">
                <div className="fin-toast-title">{item.title}</div>
                {item.description && (
                  <div className="fin-toast-desc">{item.description}</div>
                )}
              </div>
              <button
                type="button"
                className="fin-btn fin-btn-secondary fin-btn-sm"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {},
    };
  }
  return ctx;
}
