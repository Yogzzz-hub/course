import type { ReactNode } from 'react';
import { ApiError } from './api';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const toneByStatus: Record<string, Tone> = {
  PAID: 'success', ACTIVE: 'success', WON: 'success', ATTENDED: 'success', COMPLETED: 'success', ACCEPTED: 'success', ENROLLED: 'success',
  DUE: 'warning', OVERDUE: 'danger', PENDING_APPROVAL: 'warning', PENDING_PAYMENT: 'warning', PAYMENT_PENDING: 'warning', NURTURE: 'warning',
  NO_SHOW: 'danger', LOST: 'danger', FAILED: 'danger', CANCELLED: 'danger', SUSPENDED: 'danger',
  BOOKED: 'info', SESSION_BOOKED: 'info', NEW: 'info', CONTACTED: 'info', REGISTERED: 'info', OFFER_SENT: 'info', UPCOMING: 'info',
};

export function toneFor(status: string): Tone {
  return toneByStatus[status] ?? 'neutral';
}

/** Status is always shown as text next to its colour, never colour alone (spec §3.2). */
export function StatusChip({ status, label }: { status: string; label?: string }) {
  const tone = toneFor(status);
  return <span className={`p-chip p-chip-${tone}`}><span className="p-chip-dot" aria-hidden="true" />{label ?? status.replace(/_/g, ' ').toLowerCase()}</span>;
}

export function PageHead({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="p-page-head">
      <div>
        <h1 tabIndex={-1}>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="p-page-actions">{actions}</div>}
    </header>
  );
}

export function Card({ title, children, actions, className = '' }: { title?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`p-card ${className}`}>
      {(title || actions) && (
        <div className="p-card-head">
          {title && <h2>{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="p-empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

/** Shown when the backend is not reachable yet, so screens still render and explain themselves. */
export function ErrorNotice({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const notConnected = error.code === 'NETWORK';
  return (
    <div className="p-alert p-alert-danger" role="alert">
      <p>
        {notConnected
          ? 'The academy service is not connected yet. This screen fills in once it is running.'
          : error.message}
      </p>
      {onRetry && <button type="button" className="p-btn p-btn-ghost" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <p className="p-muted" role="status">{label}</p>;
}

export function Stat({ label, value, note }: { label: string; value: number | string | null | undefined; note?: string }) {
  const shown = value === null || value === undefined ? '—' : value;
  return (
    <div className="p-stat">
      <span className="p-stat-label">{label}</span>
      <span className="p-stat-value">{shown}</span>
      {note && <span className="p-stat-note">{note}</span>}
    </div>
  );
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST';
}

export function fmtInr(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return '₹' + amount.toLocaleString('en-IN');
}
