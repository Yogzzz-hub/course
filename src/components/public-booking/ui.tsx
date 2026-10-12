import { AlertCircle, ArrowRight, LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export const inputClass = 'ss-input w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100';

export function Field({ name, label, error, hint, children }: { name: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return <div className="space-y-2"><label htmlFor={`booking-${name}`} className="block text-sm font-semibold text-slate-800">{label}</label>{children}{hint && <span id={`booking-${name}-hint`} className="block text-xs leading-relaxed text-slate-600">{hint}</span>}{error && <span id={`booking-${name}-error`} className="block text-sm text-red-700">{error}</span>}</div>;
}
export function fieldAccessibility(name: string, error?: string, hasHint = false) {
  return { id: `booking-${name}`, 'aria-invalid': !!error, 'aria-describedby': [hasHint ? `booking-${name}-hint` : '', error ? `booking-${name}-error` : ''].filter(Boolean).join(' ') || undefined };
}
export function ActionButton({ busy = false, children, secondary = false, className = '', disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; secondary?: boolean }) {
  return <button {...props} disabled={disabled || busy} className={`ss-action inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 ${secondary ? 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100' : 'bg-indigo-700 text-white hover:bg-indigo-800'} ${className}`}>{busy ? <LoaderCircle size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/> : null}{children}{!busy && !secondary && <ArrowRight size={16} aria-hidden="true"/>}</button>;
}
export function ErrorNotice({ children }: { children: ReactNode }) {
  return <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-800"><AlertCircle size={19} className="mt-0.5 shrink-0" aria-hidden="true"/><span>{children}</span></div>;
}
export function Skeleton({ label, count = 3 }: { label: string; count?: number }) {
  return <div role="status" aria-live="polite"><span className="sr-only">{label}</span><div aria-hidden="true" className="grid gap-4 sm:grid-cols-3">{Array.from({ length: count }, (_, index) => <div key={index} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6"><div className="h-5 w-2/3 animate-pulse rounded bg-slate-200 motion-reduce:animate-none"/><div className="h-3 animate-pulse rounded bg-slate-100 motion-reduce:animate-none"/><div className="h-24 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none"/></div>)}</div></div>;
}
