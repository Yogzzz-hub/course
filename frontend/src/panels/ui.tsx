import type { ReactNode } from 'react';
import { ApiError } from './api';

const IST = 'Asia/Kolkata';

export function fmtDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: IST });
}

export function fmtDateTime(value?: string | null): string {
  if (!value) return '—';
  return `${new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: IST })} IST`;
}

export function fmtInr(value?: number | null): string {
  if (value === null || value === undefined) return '—';
  return `₹${value.toLocaleString('en-IN')}`;
}

export function PageHead({ title, text, action, showTitle = false }: { title: string; text?: string; action?: ReactNode; showTitle?: boolean }) {
  // The sidebar already names the page, so the heading is hidden visually but kept for screen readers.
  return (
    <header className="p-head">
      <div>
        <h1 className={showTitle ? undefined : 'p-sr'}>{title}</h1>
        {text && <p className="p-muted">{text}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="p-card">
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

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="p-stat">
      <span className="p-stat-label">{label}</span>
      <strong className="p-stat-value">{value === null || value === undefined || value === '' ? '—' : value}</strong>
    </div>
  );
}

export function Table({ head, rows, empty }: { head: string[]; rows: ReactNode[][]; empty: string }) {
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  return (
    <div className="p-table-wrap">
      <table className="p-table">
        <thead>
          <tr>{head.map((h, index) => <th key={`${index}-${h}`} scope="col">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((cells, rowIndex) => (
            <tr key={rowIndex}>
              {cells.map((cell, cellIndex) => <td key={cellIndex} data-label={head[cellIndex]}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="p-empty">{children}</p>;
}

export function Loading() {
  return <p className="p-muted" role="status">Loading…</p>;
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'success' | 'danger'; children: ReactNode }) {
  return <p className={`p-alert p-alert-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>{children}</p>;
}

export function ErrorNotice({ error }: { error: unknown }) {
  if (!error) return null;
  const apiError = error as ApiError;
  return <Notice tone="danger">{apiError.message ?? 'Something went wrong.'}</Notice>;
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="p-field">
      <label>{label}</label>
      {children}
      {hint && <p className="p-hint">{hint}</p>}
      {error && <p className="p-error" role="alert">{error}</p>}
    </div>
  );
}

export function fieldErrors(error: unknown): Record<string, string> {
  const apiError = error as ApiError;
  return apiError?.fields ?? {};
}

export function StatusChip({ text, tone = 'neutral' }: { text: string; tone?: 'good' | 'warn' | 'bad' | 'neutral' }) {
  return <span className={`p-chip p-chip-${tone}`}>{text}</span>;
}
