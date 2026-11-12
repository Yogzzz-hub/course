import type { ReactNode } from "react";
import "./shared.css";

export interface DashboardShellProps {
  brandTitle: string;
  brandSubtitle: string;
  brandEmblem?: ReactNode;
  userDisplayName: string;
  userRoleLabel: string;
  headerActions?: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
}

export function DashboardShell({
  brandTitle,
  brandSubtitle,
  brandEmblem,
  userDisplayName,
  userRoleLabel,
  headerActions,
  sidebar,
  children,
}: DashboardShellProps) {
  return (
    <div className="fin-portal">
      <div className="fin-shell">
        <a href="#fin-main-content" className="fin-skip-link">
          Skip to workspace content
        </a>

        <header className="fin-header">
          <div className="fin-header-gold-rule" aria-hidden="true" />
          <div className="fin-header-inner">
            <div className="fin-brand-group">
              {brandEmblem && (
                <div className="fin-brand-emblem" aria-hidden="true">
                  {brandEmblem}
                </div>
              )}
              <div>
                <div className="fin-brand-title">{brandTitle}</div>
                <div className="fin-brand-subtitle">{brandSubtitle}</div>
              </div>
            </div>

            <div className="fin-header-actions">
              <div className="fin-user-pill" aria-label={`Signed in as ${userDisplayName}`}>
                <span>{userDisplayName}</span>
                <span className="fin-user-role">{userRoleLabel}</span>
              </div>
              {headerActions}
            </div>
          </div>
        </header>

        <div className="fin-shell-body">
          {sidebar}
          <main id="fin-main-content" className="fin-main" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
