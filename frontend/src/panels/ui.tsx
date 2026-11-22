import { useState, useRef, useEffect, type ReactNode } from 'react';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronDown,
  BookOpen,
  UploadCloud,
  FileText,
  X,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { ApiError } from './api';

const IST = 'Asia/Kolkata';

export function fmtDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: IST,
  });
}

export function fmtDateTime(value?: string | null): string {
  if (!value) return '—';
  return `${new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: IST,
  })} IST`;
}

export function fmtInr(value?: number | null): string {
  if (value === null || value === undefined) return '—';
  return `₹${value.toLocaleString('en-IN')}`;
}

export function PageHead({
  title,
  text,
  action,
}: {
  title?: string;
  text?: string;
  action?: ReactNode;
}) {
  if (!action) return null;
  return (
    <div className="p-head-action-only">
      {action}
    </div>
  );
}

/** Modern welcome greeting card inspired by the Lurni LMS dashboard */
export function WelcomeBanner({
  name,
  role = 'Student',
  message,
}: {
  name: string;
  role?: string;
  message?: string;
}) {
  const firstName = name.split(' ')[0] || name;
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="p-welcome-banner">
      <div className="p-welcome-left">
        <div className="p-welcome-date">
          <Calendar size={13} className="inline mr-1 opacity-70" />
          {today}
        </div>
        <h1 className="p-welcome-title">Welcome back, {firstName}</h1>
        <p className="p-welcome-sub">
          {message ?? `Here is your current ${role.toLowerCase()} overview, schedule and progress.`}
        </p>
      </div>
      <div className="p-welcome-right">
        <div className="p-welcome-badge">
          <Sparkles size={14} className="animate-spin-slow" />
          <span>Active Term</span>
        </div>
      </div>
    </div>
  );
}

/** Modern KPI Overview Card whose colors adapt 100% to the active theme */
export function MetricCard({
  icon: Icon,
  variant = 1,
  iconBg,
  label,
  value,
  trend,
  trendPositive = true,
}: {
  icon: LucideIcon;
  variant?: 1 | 2 | 3 | 4;
  iconBg?: string;
  label: string;
  value: ReactNode;
  trend?: string;
  trendPositive?: boolean;
}) {
  return (
    <div className="p-metric-card">
      <div
        className={`p-metric-icon-box p-metric-icon-box--${variant}`}
        style={iconBg ? { background: iconBg } : undefined}
      >
        <Icon size={22} />
      </div>
      <div className="p-metric-content">
        <span className="p-metric-label">{label}</span>
        <strong className="p-metric-val">
          {value === null || value === undefined || value === '' ? '—' : value}
        </strong>
        {trend && (
          <span
            className={`p-metric-trend ${trendPositive ? 'p-metric-trend--pos' : 'p-metric-trend--neg'}`}
          >
            {trendPositive && <TrendingUp size={12} className="inline mr-1" />}
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

/** Textual Course & Metric Engagement Card replacing graph visuals with clean readable textual data */
export function CourseEngagementChart({
  title = 'Top Engaged Courses',
  data,
  totalLabel = 'Total Value',
  totalValue = '₹750,000',
  trendText = '+10.3% Last 30 Days',
}: {
  title?: string;
  data: { name: string; value: number; secondary?: string }[];
  totalLabel?: string;
  totalValue?: string;
  trendText?: string;
}) {
  const [rangeOpen, setRangeOpen] = useState(false);
  const [range, setRange] = useState('This Month');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setRangeOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const RANGES = ['This Week', 'This Month', 'All Time'];
  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="p-chart-card">
      <div className="p-chart-header">
        <h2 className="p-chart-title">{title}</h2>
        <div className="p-chart-dropdown-wrap" ref={dropdownRef}>
          <button
            type="button"
            className="p-chart-dropdown"
            onClick={() => setRangeOpen(prev => !prev)}
            aria-expanded={rangeOpen}
          >
            <span>{range}</span>
            <ChevronDown size={14} className={`p-chart-dropdown-chevron ${rangeOpen ? 'rotate-180' : ''}`} />
          </button>
          {rangeOpen && (
            <div className="p-chart-dropdown-menu">
              {RANGES.map(r => (
                <button
                  key={r}
                  type="button"
                  className={`p-chart-dropdown-item ${range === r ? 'p-chart-dropdown-item--active' : ''}`}
                  onClick={() => {
                    setRange(r);
                    setRangeOpen(false);
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-chart-body">
        {/* Textual Data breakdown rows replacing graphic curve */}
        <div className="p-text-breakdown-list">
          {data.length === 0 ? (
            <div className="p-muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              No data records available for this period.
            </div>
          ) : (
            data.map((item, idx) => {
              const pct = Math.min(Math.round((item.value / maxVal) * 100), 100);
              return (
                <div key={item.name + idx} className="p-text-metric-row">
                  <div className="p-text-metric-main">
                    <span className="p-text-metric-name">{item.name}</span>
                    {item.secondary && (
                      <span className="p-text-metric-sub">{item.secondary}</span>
                    )}
                  </div>
                  <div className="p-text-metric-val-wrap">
                    <div className="p-text-metric-bar-bg" aria-hidden="true">
                      <div
                        className="p-text-metric-bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="p-text-metric-value">{item.value}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-chart-footer">
          <div className="p-chart-summary">
            <span className="p-chart-sum-label">{totalLabel}</span>
            <div className="p-chart-sum-value">{totalValue}</div>
          </div>
          {trendText && (
            <div className="p-chart-trend-badge">
              <TrendingUp size={13} className="inline mr-1" />
              <span>{trendText}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Custom curved rectangle dropdown with website theme colors and icons
 */
export function CurvedSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; icon?: LucideIcon }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className="p-curved-select" ref={ref}>
      <button
        type="button"
        className={`p-curved-select-trigger ${open ? 'p-curved-select-trigger--open' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="p-curved-select-label">
          {selected ? (
            <span className="p-curved-select-opt-content">
              {selected.icon && <selected.icon size={16} className="text-[var(--accent)]" />}
              <span>{selected.label}</span>
            </span>
          ) : (
            placeholder || 'Select option'
          )}
        </span>
        <ChevronDown size={16} className={`p-curved-select-chevron ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="p-curved-select-menu" role="listbox">
          {options.map(opt => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`p-curved-select-item ${isSelected ? 'p-curved-select-item--active' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <div className="p-curved-select-opt-content">
                  {opt.icon && <opt.icon size={16} />}
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check size={15} className="p-curved-select-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type DatePreset = 'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'this_month' | 'custom';

export interface DateRange {
  preset: DatePreset;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

export function defaultDateRange(): DateRange {
  return { preset: 'all', from: '', to: '' };
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function calculateDatePreset(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const todayStr = toIsoDate(now);

  if (preset === 'today') {
    return { from: todayStr, to: todayStr };
  }
  if (preset === 'yesterday') {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yestStr = toIsoDate(yest);
    return { from: yestStr, to: yestStr };
  }
  if (preset === 'last7') {
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 6);
    return { from: toIsoDate(d7), to: todayStr };
  }
  if (preset === 'last30') {
    const d30 = new Date(now);
    d30.setDate(d30.getDate() - 29);
    return { from: toIsoDate(d30), to: todayStr };
  }
  if (preset === 'this_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toIsoDate(firstDay), to: todayStr };
  }
  return { from: '', to: '' };
}

export function matchesDateRange(itemDate: string | undefined | null, range: DateRange): boolean {
  if (!range || range.preset === 'all' || (!range.from && !range.to)) {
    return true;
  }
  if (!itemDate) return false;
  const target = itemDate.trim().slice(0, 10);
  if (range.from && target < range.from) return false;
  if (range.to && target > range.to) return false;
  return true;
}

/**
 * Modern, theme-aware date range filter with presets and custom date pickers
 */
export function DateRangeFilter({
  value,
  onChange,
  label = 'All Dates',
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  label?: string;
}) {
  const [showCustom, setShowCustom] = useState(value.preset === 'custom');

  const presetOptions = [
    { value: 'all', label: 'All Dates', icon: Calendar },
    { value: 'today', label: 'Today', icon: Clock },
    { value: 'yesterday', label: 'Yesterday', icon: Clock },
    { value: 'last7', label: 'Last 7 Days', icon: Calendar },
    { value: 'last30', label: 'Last 30 Days', icon: Calendar },
    { value: 'this_month', label: 'This Month', icon: Calendar },
    { value: 'custom', label: 'Custom Range…', icon: Sparkles },
  ];

  function handlePresetChange(newPreset: string) {
    const preset = newPreset as DatePreset;
    if (preset === 'custom') {
      setShowCustom(true);
      onChange({ ...value, preset: 'custom' });
    } else {
      setShowCustom(false);
      const { from, to } = calculateDatePreset(preset);
      onChange({ preset, from, to });
    }
  }

  const isFiltered = value.preset !== 'all' || Boolean(value.from || value.to);

  return (
    <div className="p-date-filter-wrap">
      <div className="p-date-filter-controls">
        <div className="p-date-filter-select">
          <CurvedSelect
            value={value.preset}
            onChange={handlePresetChange}
            options={presetOptions}
            placeholder={label}
          />
        </div>

        {(showCustom || value.preset === 'custom') && (
          <div className="p-date-custom-range">
            <label className="p-date-input-group">
              <span className="p-date-input-label">From</span>
              <input
                type="date"
                className="p-date-picker-input"
                value={value.from}
                onChange={e => onChange({ ...value, preset: 'custom', from: e.target.value })}
                aria-label="From date"
              />
            </label>
            <span className="p-date-sep">to</span>
            <label className="p-date-input-group">
              <span className="p-date-input-label">To</span>
              <input
                type="date"
                className="p-date-picker-input"
                value={value.to}
                onChange={e => onChange({ ...value, preset: 'custom', to: e.target.value })}
                aria-label="To date"
              />
            </label>
          </div>
        )}

        {isFiltered && (
          <button
            type="button"
            className="p-date-filter-clear-btn"
            onClick={() => {
              setShowCustom(false);
              onChange(defaultDateRange());
            }}
            title="Reset date filter"
            aria-label="Reset date filter"
          >
            <X size={12} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {isFiltered && (value.from || value.to) && (
        <div className="p-date-filter-active-pill" title="Active date filter range">
          <span className="p-date-filter-active-dot" />
          <span>
            {value.from && value.to
              ? `${value.from} → ${value.to}`
              : value.from
              ? `From ${value.from}`
              : `Until ${value.to}`}
          </span>
        </div>
      )}
    </div>
  );
}

export interface ActivityItem {
  id: string | number;
  title: string;
  subtitle?: string;
  time: string;
  icon?: LucideIcon;
  tone?: 'blue' | 'green' | 'amber' | 'purple';
}

/** Recent Activity Timeline component matching the right card in Lurni image */
export function ActivityTimeline({
  title = 'Recent Activity',
  items,
}: {
  title?: string;
  items: ActivityItem[];
}) {
  const [filter, setFilter] = useState<'All' | 'Classes' | 'Tasks'>('All');
  const phone = useIsPhone();
  const [expanded, setExpanded] = useState(false);
  const limited = phone && !expanded && items.length > 4;
  const visibleItems = limited ? items.slice(0, 4) : items;

  return (
    <div className="p-activity-card">
      <div className="p-activity-head">
        <h2 className="p-activity-title">{title}</h2>
        <div className="p-ai-summary-pill">
          <Sparkles size={12} />
          <span>Live feed</span>
        </div>
      </div>

      <div className="p-activity-tabs">
        {(['All', 'Classes', 'Tasks'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            className={`p-activity-tab ${filter === tab ? 'p-activity-tab--active' : ''}`}
            onClick={() => setFilter(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-activity-list">
        {items.length === 0 ? (
          <div className="p-activity-empty">No recent activity recorded yet.</div>
        ) : (
          visibleItems.map(item => {
            const Icon = item.icon ?? CheckCircle2;
            return (
              <div key={item.id} className="p-activity-item">
                <div className={`p-activity-avatar p-activity-avatar--${item.tone ?? 'blue'}`}>
                  <Icon size={16} />
                </div>
                <div className="p-activity-info">
                  <div className="p-activity-text">{item.title}</div>
                  {item.subtitle && <div className="p-activity-sub">{item.subtitle}</div>}
                </div>
                <div className="p-activity-time">
                  <Clock size={11} className="inline mr-1 opacity-60" />
                  {item.time}
                </div>
              </div>
            );
          })
        )}
        {phone && items.length > 4 && (
          <button type="button" className="p-more p-more-wide" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
            {expanded ? 'Show fewer' : `Show all ${items.length}`}
          </button>
        )}
      </div>
    </div>
  );
}

/** Animated progress meter bar */
export function ProgressBar({
  value,
  max = 100,
  label,
  color,
}: {
  value: number;
  max?: number;
  label?: string;
  color?: string;
}) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  return (
    <div className="p-progress-wrap">
      {label && (
        <div className="p-progress-header">
          <span className="p-progress-label">{label}</span>
          <span className="p-progress-pct">{pct}%</span>
        </div>
      )}
      <div className="p-progress-track">
        <div
          className="p-progress-fill"
          style={{
            width: `${pct}%`,
            background:
              color ??
              'linear-gradient(90deg, var(--accent, #681C35), var(--side-accent, #A9C9DC))',
          }}
        />
      </div>
    </div>
  );
}

export function Card({
  title,
  children,
  actions,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
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

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="p-stat">
      <span className="p-stat-label">{label}</span>
      <strong className="p-stat-value">
        {value === null || value === undefined || value === '' ? '—' : value}
      </strong>
    </div>
  );
}

/** True on phones. Pages use this to switch to short, paged lists instead of long scrolling. */
export function useIsPhone(): boolean {
  const query = '(max-width: 640px)';
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setPhone(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return phone;
}

/** Previous / page x of y / Next. Renders nothing when there is only one page. */
export function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav className="p-pager" aria-label="Pages">
      <button type="button" className="p-btn p-btn-ghost p-btn-small" onClick={() => onChange(page - 1)} disabled={page <= 0}>Previous</button>
      <span className="p-pager-count">Page {page + 1} of {pages}</span>
      <button type="button" className="p-btn p-btn-small" onClick={() => onChange(page + 1)} disabled={page >= pages - 1}>Next</button>
    </nav>
  );
}

const PHONE_PAGE = 8;
const PHONE_VISIBLE_FIELDS = 3;

export function Table({ head, rows, empty = 'Nothing here yet.' }: { head: string[]; rows: ReactNode[][]; empty?: string }) {
  const phone = useIsPhone();
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  const pages = phone ? Math.ceil(rows.length / PHONE_PAGE) : 1;
  const current = Math.min(page, pages - 1);
  const offset = phone ? current * PHONE_PAGE : 0;
  const shown = phone ? rows.slice(offset, offset + PHONE_PAGE) : rows;
  const hasExtra = head.length > PHONE_VISIBLE_FIELDS;
  return (
    <>
    <div className="p-table-wrap">
      <table className="p-table">
        <thead>
          <tr>
            {head.map((h, index) => (
              <th key={`${index}-${h}`} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((cells, index) => {
            const rowIndex = offset + index;
            const expanded = Boolean(open[rowIndex]);
            return (
              <tr key={rowIndex} className={phone && expanded ? 'p-row-open' : undefined}>
                {cells.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    data-label={head[cellIndex]}
                    className={phone && hasExtra && cellIndex >= PHONE_VISIBLE_FIELDS ? 'p-cell-extra' : undefined}
                  >
                    {cell}
                  </td>
                ))}
                {phone && hasExtra && (
                  <td className="p-more-cell">
                    <button type="button" className="p-more" aria-expanded={expanded} onClick={() => setOpen(state => ({ ...state, [rowIndex]: !expanded }))}>
                      {expanded ? 'Hide details' : 'More details'}
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    <Pager page={current} pages={pages} onChange={setPage} />
    </>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="p-empty">{children}</p>;
}

export function Loading() {
  return (
    <div className="p-loading-box">
      <div className="p-loading-spinner" />
      <p className="p-muted">Loading dashboard…</p>
    </div>
  );
}

export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'success' | 'danger';
  children: ReactNode;
}) {
  return (
    <p className={`p-alert p-alert-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

export function ErrorNotice({ error }: { error: unknown }) {
  if (!error) return null;
  const apiError = error as ApiError;
  return <Notice tone="danger">{apiError.message ?? 'Something went wrong.'}</Notice>;
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="p-field">
      <label>{label}</label>
      {children}
      {hint && <p className="p-hint">{hint}</p>}
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function fieldErrors(error: unknown): Record<string, string> {
  const apiError = error as ApiError;
  return apiError?.fields ?? {};
}

export function StatusChip({
  text,
  tone = 'neutral',
}: {
  text: string;
  tone?: 'good' | 'warn' | 'bad' | 'neutral';
}) {
  return <span className={`p-chip p-chip-${tone}`}>{text}</span>;
}

/**
 * Modern drag-and-drop / click-to-upload file dropzone matching the design system
 */
export function FileUploadZone({
  file,
  onChange,
  accept = '.pdf,.zip,.docx,.txt,.py,.ipynb,image/*',
  maxSizeMb = 10,
  hint = 'PDF, ZIP, DOCX, text, code, notebook or image. Up to 10 MB.',
  disabled = false,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  maxSizeMb?: number;
  hint?: string;
  disabled?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) onChange(droppedFile);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div
      className={`p-dropzone ${dragOver ? 'p-dropzone--active' : ''} ${file ? 'p-dropzone--has-file' : ''}`}
      onDragOver={e => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={e => onChange(e.target.files?.[0] ?? null)}
        disabled={disabled}
      />

      {file ? (
        <div className="p-dropzone-file">
          <div className="p-dropzone-file-icon">
            <FileText size={22} />
          </div>
          <div className="p-dropzone-file-details">
            <span className="p-dropzone-filename">{file.name}</span>
            <span className="p-dropzone-filesize">{formatBytes(file.size)}</span>
          </div>
          <button
            type="button"
            className="p-dropzone-remove"
            onClick={e => {
              e.stopPropagation();
              onChange(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            title="Remove file"
            aria-label="Remove file"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <div className="p-dropzone-content">
          <div className="p-dropzone-icon">
            <UploadCloud size={24} />
          </div>
          <div className="p-dropzone-text">
            <p className="p-dropzone-title">
              <strong>Click to upload</strong> or drag and drop
            </p>
            <p className="p-dropzone-hint">{hint}</p>
          </div>
        </div>
      )}
    </div>
  );
}
