import React, { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-lg h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300"
        style={{
          backgroundColor: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          color: "var(--text)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 border-b shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <h2 className="text-lg font-bold tracking-tight">{title}</h2>
            {subtitle && (
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: "var(--muted)" }}
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">{children}</div>
      </div>
    </div>
  );
}

