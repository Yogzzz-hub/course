import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Info, ShieldCheck, X } from 'lucide-react';
import { setConsent, subscribeConsent, getConsent } from '../../analytics/consent';
import { eventsSnapshot, serverEventsSnapshot, subscribeEvents, track } from '../../analytics/events';
import { contextualPrompt } from '../../analytics/personalize';
import { hasSavedProgress, latestAttempt } from '../../assessment/store';
import './platform.css';

/** Compact page header for tools: the page's own heading, a short description, optional aside. */
export function ToolHero({ title, description, children, aside }: { title: ReactNode; description: ReactNode; children?: ReactNode; aside?: ReactNode }) {
  return <section className="container pf-hero">
    <div className="pf-hero-copy"><h1 tabIndex={-1} className="display-title">{title}</h1><p>{description}</p>{children}</div>
    {aside && <div className="pf-hero-aside">{aside}</div>}
  </section>;
}

export function Breadcrumbs({ items }: { items: { to?: string; label: string }[] }) {
  return <nav className="breadcrumbs pf-breadcrumbs" aria-label="Breadcrumb">{items.map((item, index) => <span key={item.label}>{index > 0 && <span aria-hidden="true">/ </span>}{item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</span>)}</nav>;
}

export function CodeBlock({ source, language, label }: { source: string; language: string; label?: string }) {
  const lines = source.split('\n');
  return <figure className="pf-code" aria-label={label ?? `${language} code`}>
    <figcaption>{language.toUpperCase()}</figcaption>
    <pre tabIndex={0}><code>{lines.map((line, index) => <span className="pf-code-line" key={index}><span className="pf-code-no" aria-hidden="true">{index + 1}</span>{line || ' '}{'\n'}</span>)}</code></pre>
  </figure>;
}

export function Meter({ value, label, tone = 'accent' }: { value: number; label: string; tone?: 'accent' | 'soft' | 'muted' }) {
  return <div className={`pf-meter pf-meter-${tone}`} role="img" aria-label={`${label}: ${value}%`}><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }}/></div>;
}

export function Notice({ tone = 'info', title, children }: { tone?: 'info' | 'warning' | 'success'; title?: string; children: ReactNode }) {
  const Icon = tone === 'warning' ? AlertTriangle : tone === 'success' ? ShieldCheck : Info;
  return <div className={`pf-notice pf-notice-${tone}`} role={tone === 'warning' ? 'alert' : 'note'}><Icon size={18} aria-hidden="true"/><div>{title && <strong>{title}</strong>}<div>{children}</div></div></div>;
}

export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="pf-empty" role="status"><span className="pf-empty-mark" aria-hidden="true"/><h3>{title}</h3><p>{children}</p>{action}</div>;
}

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return <div className="pf-stat"><span className="pf-stat-label">{label}</span><strong className="pf-stat-value">{value ?? '—'}</strong>{note && <span className="pf-stat-note">{note}</span>}</div>;
}

/** Horizontal bar chart drawn with CSS; every bar carries its exact value as text. */
export function BarList({ rows, unit = '', empty }: { rows: { label: string; value: number | null; note?: string }[]; unit?: string; empty: string }) {
  const max = Math.max(1, ...rows.map(row => row.value ?? 0));
  if (!rows.length || rows.every(row => !row.value)) return <EmptyState title="No data yet">{empty}</EmptyState>;
  return <ul className="pf-bars">{rows.map(row => <li key={row.label}><span className="pf-bars-label">{row.label}</span><span className="pf-bars-track"><span style={{ width: `${((row.value ?? 0) / max) * 100}%` }}/></span><span className="pf-bars-value">{row.value === null ? '—' : `${row.value}${unit}`}{row.note && <small> {row.note}</small>}</span></li>)}</ul>;
}

const subscribeNoop = () => () => {};
/** Opt-in consent card. It never blocks the page and remembers the choice. */
export function ConsentBanner() {
  const consent = useSyncExternalStore(subscribeConsent, getConsent, () => null);
  const hydrated = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const { pathname } = useLocation();
  if (!hydrated || consent || pathname === '/privacy-choices') return null;
  return <section className="pf-consent" aria-label="Analytics choice">
    <p><strong>Help improve Aintrix Academy?</strong> With your permission we count page visits and test completions on this device to improve the site. No advertising, no third parties, nothing from your answers is sent anywhere.</p>
    <div className="pf-consent-actions">
      <button type="button" className="button button-primary" onClick={() => { setConsent('analytics'); track('page_view'); }}>Allow analytics</button>
      <button type="button" className="button button-secondary" onClick={() => setConsent('essential')}>Essential only</button>
      <Link to="/privacy-choices" className="text-link">Privacy choices</Link>
    </div>
  </section>;
}

/** One contextual next step for the current page. Dismissable; never a pop-up. */
export function ContextPromptCard({ className = '' }: { className?: string }) {
  const { pathname } = useLocation();
  const events = useSyncExternalStore(subscribeEvents, eventsSnapshot, serverEventsSnapshot);
  const [state, setState] = useState<{ saved: boolean; result: boolean } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => { setState({ saved: hasSavedProgress(), result: !!latestAttempt() }); }, [pathname]);
  const prompt = useMemo(() => state ? contextualPrompt({ path: pathname, events, savedProgress: state.saved, hasResult: state.result }) : null, [pathname, events, state]);
  if (!prompt || dismissed) return null;
  return <aside className={`pf-prompt ${className}`} aria-label="Suggested next step">
    <div><strong>{prompt.title}</strong><p>{prompt.body}</p></div>
    <Link to={prompt.cta.to} className="button button-primary" onClick={() => track('prompt_clicked', { prompt: prompt.id })}>{prompt.cta.label}<ArrowRight size={16} aria-hidden="true"/></Link>
    <button type="button" className="pf-prompt-close" aria-label="Dismiss suggestion" onClick={() => setDismissed(true)}><X size={16}/></button>
  </aside>;
}
