import { useEffect, useId, useRef, useState } from "react";
import { LogOut, User } from "lucide-react";

export function ProfileMenu({
  initials,
  name,
  subtitle,
  onLogout,
  busy = false,
  logoutLabel = "Log out",
}: {
  initials?: string;
  name: string;
  subtitle?: string;
  onLogout: () => void;
  busy?: boolean;
  logoutLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const badgeText = initials?.trim().slice(0, 2).toUpperCase();

  return (
    <div ref={rootRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title={name}
        aria-label={`Profile menu for ${name}`}
        className="flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-xl text-xs font-bold shadow-xs transition hover:opacity-90 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          backgroundColor: "var(--btn-primary-bg, var(--accent))",
          color: "#ffffff",
          outlineColor: "var(--accent)",
        }}
      >
        {badgeText ? badgeText : <User size={16} aria-hidden="true" />}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-2xl border p-2 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
            color: "var(--text)",
          }}
        >
          <div
            className="px-3 py-2 border-b mb-1.5"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>
              {name}
            </div>
            {subtitle && (
              <div
                className="text-[11px] truncate mt-0.5"
                style={{ color: "var(--muted)" }}
              >
                {subtitle}
              </div>
            )}
          </div>

          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full min-h-[40px] items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50 transition disabled:opacity-50 cursor-pointer"
          >
            <LogOut size={15} aria-hidden="true" />
            <span>{busy ? "Signing out..." : logoutLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
}

