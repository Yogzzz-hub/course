import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  variant?: "modal" | "drawer";
  returnFocusTo?: React.RefObject<HTMLElement | null>;
  footer?: ReactNode;
  children: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  variant = "modal",
  returnFocusTo,
  footer,
  children,
}: ModalProps) {
  const titleId = useId();
  const subtitleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      wasOpenRef.current = true;
      triggerRef.current =
        returnFocusTo?.current ??
        (typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null);

      requestAnimationFrame(() => {
        const panel = panelRef.current;
        if (!panel) return;
        const firstInput = panel.querySelector<HTMLElement>(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([data-close-modal="true"])'
        );
        if (firstInput) {
          firstInput.focus();
        } else {
          closeBtnRef.current?.focus();
        }
      });
    } else if (!open && wasOpenRef.current) {
      wasOpenRef.current = false;
      const target = returnFocusTo?.current ?? triggerRef.current;
      requestAnimationFrame(() => {
        if (target && typeof target.focus === "function" && target.isConnected) {
          target.focus();
        }
      });
    }
  }, [open, returnFocusTo]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={
        variant === "drawer"
          ? "fin-modal-overlay fin-modal-overlay--drawer"
          : "fin-modal-overlay"
      }
      data-testid={variant === "drawer" ? "fin-drawer-overlay" : "fin-modal-overlay"}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        className={
          variant === "drawer"
            ? "fin-modal-panel fin-modal-panel--drawer"
            : "fin-modal-panel"
        }
      >
        <div className="fin-modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && (
              <p id={subtitleId} style={{ marginTop: 2, fontSize: "0.8rem" }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            data-close-modal="true"
            className="fin-btn fin-btn-secondary fin-btn-sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={15} aria-hidden="true" />
            <span>Close</span>
          </button>
        </div>

        <div className="fin-modal-body">{children}</div>

        {footer && <div className="fin-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
