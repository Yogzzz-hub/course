import type { ReactNode } from "react";

export type MetricHintTone = "default" | "positive" | "danger" | "warning";

export interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  hintTone?: MetricHintTone;
  highlight?: boolean;
  icon?: ReactNode;
}

export function MetricCard({
  label,
  value,
  hint,
  hintTone = "default",
  highlight = false,
  icon,
}: MetricCardProps) {
  const hintClass =
    hintTone === "positive"
      ? "fin-metric-hint fin-metric-hint--positive"
      : hintTone === "danger"
        ? "fin-metric-hint fin-metric-hint--danger"
        : hintTone === "warning"
          ? "fin-metric-hint fin-metric-hint--warning"
          : "fin-metric-hint";

  return (
    <article
      className={
        highlight ? "fin-metric-card fin-metric-card--highlight" : "fin-metric-card"
      }
    >
      <div className="fin-metric-top">
        <span className="fin-metric-label">{label}</span>
        {icon && (
          <span className="fin-metric-icon" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div className="fin-metric-value">{value}</div>
      {hint && <div className={hintClass}>{hint}</div>}
    </article>
  );
}
