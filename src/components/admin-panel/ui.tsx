import { Component, type ReactNode, type ButtonHTMLAttributes } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { adminError } from "./api";
export const inputClass =
  "min-w-0 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 disabled:bg-slate-100";
export function Button({
  children,
  busy,
  secondary = false,
  disabled,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  secondary?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={disabled || busy}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${secondary ? "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100" : "bg-indigo-700 text-white hover:bg-indigo-800"} ${className}`}
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
      className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </section>
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
      className={`rounded-xl border p-4 text-sm leading-6 ${error ? "border-red-200 bg-red-50 text-red-800" : "border-indigo-200 bg-indigo-50 text-indigo-900"}`}
    >
      {error && (
        <AlertCircle size={16} className="mr-2 inline" aria-hidden="true" />
      )}
      {children}
    </div>
  );
}
export function Skeleton() {
  return (
    <div role="status">
      <span className="sr-only">Loading admin information</span>
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-36 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none"
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
        <Notice error>{adminError(query.error)}</Notice>
        <Button secondary onClick={() => void query.refetch()}>
          Refresh information
        </Button>
      </div>
    );
  return <>{children(query.data)}</>;
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm leading-6 text-slate-600">
      {children}
    </p>
  );
}
export function SecureLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("/") ? undefined : "_blank"}
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700 underline underline-offset-4"
    >
      {children}
    </a>
  );
}
export function Label({ id, children }: { id: string; children: ReactNode }) {
  return (
    <label htmlFor={id} className="mb-2 block text-sm font-semibold">
      {children}
    </label>
  );
}
export class AdminErrorBoundary extends Component<
  { children: ReactNode; reset: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="space-y-4">
        <Notice error>
          This section could not be displayed. Refresh it to try again.
        </Notice>
        <Button
          onClick={() => {
            this.props.reset();
            this.setState({ failed: false });
          }}
        >
          Reload section
        </Button>
      </div>
    ) : (
      this.props.children
    );
  }
}
