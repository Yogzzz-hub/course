import {
  Component,
  type ReactNode,
  type ButtonHTMLAttributes,
  useEffect,
  useRef,
} from "react";
import { AlertCircle, ArrowUpRight, LoaderCircle } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { friendlyError } from "./api";

export const inputClass =
  "w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 focus:border-indigo-600 disabled:bg-slate-100";
export function Button({
  children,
  secondary = false,
  busy,
  className = "",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  secondary?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={busy || disabled}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${secondary ? "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100" : "bg-indigo-700 text-white hover:bg-indigo-800"} ${className}`}
    >
      {busy && (
        <LoaderCircle
          className="animate-spin motion-reduce:animate-none"
          size={16}
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
      className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-bold tracking-[.15em] text-indigo-700 uppercase">
      {children}
    </p>
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
      className={`rounded-xl border p-4 text-sm leading-relaxed ${error ? "border-red-200 bg-red-50 text-red-800" : "border-indigo-200 bg-indigo-50 text-indigo-900"}`}
    >
      {error && (
        <AlertCircle className="mr-2 inline" size={16} aria-hidden="true" />
      )}
      {children}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <p className="text-sm leading-relaxed text-slate-600">{children}</p>
    </Card>
  );
}
export function Skeleton({
  label = "Loading your workspace",
}: {
  label?: string;
}) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div
            className="h-40 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none"
            key={item}
          />
        ))}
      </div>
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
        <Notice error>{friendlyError(query.error)}</Notice>
        <Button secondary onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    );
  return <>{children(query.data)}</>;
}
export function SecureLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("/") ? undefined : "_blank"}
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-indigo-700 underline underline-offset-4 ${className}`}
    >
      {children}
      <ArrowUpRight size={14} aria-hidden="true" />
    </a>
  );
}
export function Field({
  name,
  label,
  error,
  children,
}: {
  name: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={`student-${name}`}
        className="block text-sm font-semibold"
      >
        {label}
      </label>
      {children}
      {error && (
        <p id={`student-${name}-error`} className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
export function fieldProps(name: string, error?: string) {
  return {
    id: `student-${name}`,
    "aria-invalid": !!error,
    "aria-describedby": error ? `student-${name}-error` : undefined,
  };
}
export function ScreenTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [title]);
  return (
    <div className="mb-7">
      <h1
        ref={ref}
        tabIndex={-1}
        className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
      >
        {title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{subtitle}</p>
    </div>
  );
}
export class PanelErrorBoundary extends Component<
  { children: ReactNode; onReset?: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="space-y-4">
          <Notice error>
            This part of your workspace could not load. Please try again.
          </Notice>
          <Button
            onClick={() => {
              this.props.onReset?.();
              this.setState({ failed: false });
            }}
          >
            Reload this section
          </Button>
        </div>
      );
    return this.props.children;
  }
}
