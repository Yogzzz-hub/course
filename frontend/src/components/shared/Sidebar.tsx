import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export interface SidebarNavItem {
  id: string;
  label: string;
  to: string;
  icon: ReactNode;
  active?: boolean;
  badge?: string | number;
}

export interface SidebarProps {
  heading?: string;
  items: SidebarNavItem[];
  footer?: ReactNode;
  ariaLabel?: string;
}

export function Sidebar({
  heading = "Finance Navigation",
  items,
  footer,
  ariaLabel = "Portal sections",
}: SidebarProps) {
  return (
    <aside className="fin-sidebar" aria-label={ariaLabel}>
      {heading && <div className="fin-sidebar-heading">{heading}</div>}
      <nav className="fin-sidebar-nav" aria-label={ariaLabel}>
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.to}
            className="fin-nav-item"
            aria-current={item.active ? "page" : undefined}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge !== null && (
              <span className="fin-nav-badge">{item.badge}</span>
            )}
          </Link>
        ))}
      </nav>
      {footer && <div className="fin-sidebar-footer">{footer}</div>}
    </aside>
  );
}
