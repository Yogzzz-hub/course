import { Component, type ReactNode, type ButtonHTMLAttributes } from "react";
import { AlertCircle, LoaderCircle, type LucideIcon } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { adminError } from "./api";

export const inputClass =
  "min-w-0 w-full min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-base sm:text-sm text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 disabled:bg-[var(--bg-secondary)] transition";

export function Button({
  children,
  busy,
  secondary = false,
  danger = false,
  success = false,
  disabled,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  secondary?: boolean;
  danger?: boolean;
  success?: boolean;
}) {
  let styleClasses =
    "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] !text-white hover:bg-[var(--btn-primary-hover)] shadow-sm";
  if (secondary) {
    styleClasses =
      "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--accent-tint)] hover:border-[var(--accent-border)]";
  } else if (danger) {
    styleClasses =
      "border border-[#F8C0C0] bg-[#FDE8E8] text-[#9E2A2B] hover:bg-[#FBD5D5] hover:border-[#F5ABAB]";
  } else if (success) {
    styleClasses =
      "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] !text-white hover:bg-[var(--btn-primary-hover)] shadow-sm";
  }

  return (
    <button
      {...props}
      disabled={disabled || busy}
      className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${styleClasses} ${className}`}
    >
      {busy && (
        <LoaderCircle
          size={16}
          className="animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] transition-shadow duration-200 ${className}`}
    >
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 text-[11px] font-bold tracking-[.15em] text-[var(--accent)] uppercase">
      {children}
    </p>
  );
}

export function ScreenTitle({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}

export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`rounded-xl border p-4 text-sm leading-6 ${
        error
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-[var(--accent-border)] bg-[var(--accent-tint)] text-[var(--text)]"
      }`}
    >
      {error && (
        <AlertCircle size={16} className="mr-2 inline text-red-700" aria-hidden="true" />
      )}
      {children}
    </div>
  );
}

export function Empty({
  title = "No information found",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <Card className="text-center py-10">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-tint)] text-[var(--accent)] mb-3">
        <AlertCircle size={22} />
      </div>
      <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
      {children && (
        <p className="mt-1 text-sm text-[var(--muted)] max-w-sm mx-auto">{children}</p>
      )}
    </Card>
  );
}

export type StatusVariant =
  | "new"
  | "paid"
  | "pending"
  | "overdue"
  | "active"
  | "lost"
  | "neutral";

export function StatusPill({
  status,
  variant,
}: {
  status: string;
  variant?: StatusVariant;
}) {
  let resolvedVariant = variant;
  if (!resolvedVariant) {
    const s = status.toLowerCase();
    if (s.includes("paid") || s.includes("captured") || s.includes("enrolled") || s.includes("approved")) {
      resolvedVariant = "paid";
    } else if (s.includes("overdue") || s.includes("lost") || s.includes("rejected")) {
      resolvedVariant = "overdue";
    } else if (s.includes("pending") || s.includes("due") || s.includes("scheduled") || s.includes("review")) {
      resolvedVariant = "pending";
    } else if (s.includes("new") || s.includes("contacted")) {
      resolvedVariant = "new";
    } else {
      resolvedVariant = "neutral";
    }
  }

  const styles: Record<StatusVariant, string> = {
    new: "bg-[#EBF4F9] text-[#2C6E91] border-[#C4DFEE]",
    paid: "bg-[#E8F6ED] text-[#10754A] border-[#BBE5CB]",
    pending: "bg-[#FEF6E7] text-[#9E6000] border-[#F7E1B5]",
    overdue: "bg-[#FDE8E8] text-[#A72828] border-[#F8C0C0]",
    active: "bg-[#E8F6ED] text-[#10754A] border-[#BBE5CB]",
    lost: "bg-slate-100 text-slate-700 border-slate-200",
    neutral: "bg-slate-100 text-slate-800 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${styles[resolvedVariant]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          resolvedVariant === "paid"
            ? "bg-[#10754A]"
            : resolvedVariant === "overdue"
              ? "bg-[#A72828]"
              : resolvedVariant === "pending"
                ? "bg-[#9E6000]"
                : resolvedVariant === "new"
                  ? "bg-[#2C6E91]"
                  : "bg-slate-500"
        }`}
      />
      {status}
    </span>
  );
}

export function KpiCard({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  trend?: { value: string; positive?: boolean };
}) {
  return (
    <div className="min-w-0 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] transition-all">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-[var(--muted)] truncate">
          {title}
        </span>
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-tint)] text-[var(--accent)]">
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
        {value}
      </div>
      {(subtext || trend) && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
          {trend && (
            <span
              className={`font-semibold ${
                trend.positive ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {trend.value}
            </span>
          )}
          {subtext && <span className="truncate">{subtext}</span>}
        </div>
      )}
    </div>
  );
}

export function Skeleton() {
  return (
    <div role="status" className="space-y-4">
      <span className="sr-only">Loading admin workspace information</span>
      <div aria-hidden="true" className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-2xl bg-[var(--bg-secondary)] motion-reduce:animate-none"
          />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="h-64 animate-pulse rounded-2xl bg-[var(--bg-secondary)] motion-reduce:animate-none"
      />
    </div>
  );
}

export function QueryView<T>({
  query,
  children,
}: {
  query: UseQueryResult<T, Error>;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <Skeleton />;
  if (query.isError)
    return (
      <div className="space-y-3">
        <Notice error>{adminError(query.error)}</Notice>
        <Button secondary onClick={() => void query.refetch()}>
          Refresh information
        </Button>
      </div>
    );
  if (!query.data) return <Empty title="Information unavailable" />;
  return <>{children(query.data)}</>;
}

export function Label({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  return (
    <label
      htmlFor={id}
      className="mb-1.5 block text-xs font-semibold text-[var(--text)]"
    >
      {children}
    </label>
  );
}

export function SecureLink({
  href,
  children,
}: {
  href?: string;
  children: ReactNode;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      className="inline-flex min-h-[44px] items-center font-semibold text-[var(--accent)] hover:text-[var(--btn-primary-hover)] hover:underline"
    >
      {children}
    </a>
  );
}

export class AdminErrorBoundary extends Component<
  { children: ReactNode; reset: () => void },
  { failed: boolean; error: Error | null }
> {
  state: { failed: boolean; error: Error | null } = {
    failed: false,
    error: null,
  };
  static getDerivedStateFromError(error: Error) {
    return { failed: true, error };
  }
  render() {
    if (this.state.failed) {
      return (
        <Card className="my-6">
          <Notice error>
            An error occurred while loading this section:{" "}
            {this.state.error?.message || "Unknown error"}
          </Notice>
          <div className="mt-4">
            <Button
              secondary
              onClick={() => {
                this.setState({ failed: false, error: null });
                this.props.reset();
              }}
            >
              Try again
            </Button>
          </div>
        </Card>
      );
    }
    return this.props.children;
  }
}
