import { useState, type ReactNode } from 'react';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronDown,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
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

/** Animated Course / Engagement Bar Chart matching Lurni design */
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
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [range, setRange] = useState('This Month');

  return (
    <div className="p-chart-card">
      <div className="p-chart-header">
        <h2 className="p-chart-title">{title}</h2>
        <div className="p-chart-dropdown">
          <span>{range}</span>
          <ChevronDown size={14} />
        </div>
      </div>

      <div className="p-chart-body">
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart
              data={data}
              margin={{ top: 20, right: 10, left: -20, bottom: 20 }}
              onMouseMove={state => {
                if (state && state.activeTooltipIndex !== undefined) {
                  const idx = typeof state.activeTooltipIndex === 'number' ? state.activeTooltipIndex : Number(state.activeTooltipIndex);
                  if (!Number.isNaN(idx)) {
                    setHoverIndex(idx);
                  }
                }
              }}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--muted)', fontSize: 12, fontWeight: 500 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="p-custom-tooltip">
                        <div className="p-tooltip-title">{item.name}</div>
                        <div className="p-tooltip-val">
                          Metric: <strong>{item.value}</strong>
                          {item.secondary && <span> ({item.secondary})</span>}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive={true}>
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      hoverIndex === index
                        ? 'var(--accent, #681C35)'
                        : 'color-mix(in srgb, var(--accent, #681C35) 28%, var(--surface-alt, #EEF3F7))'
                    }
                    className="transition-colors duration-200"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
          items.map(item => {
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

export function Table({ head, rows, empty }: { head: string[]; rows: ReactNode[][]; empty: string }) {
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  return (
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
          {rows.map((cells, rowIndex) => (
            <tr key={rowIndex}>
              {cells.map((cell, cellIndex) => (
                <td key={cellIndex} data-label={head[cellIndex]}>
                  {cell}
                </td>
              ))}
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
