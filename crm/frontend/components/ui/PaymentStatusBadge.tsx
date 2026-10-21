import React from "react";
import { CheckCircle2, Clock, AlertTriangle, XCircle, RotateCcw } from "lucide-react";

interface PaymentStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function PaymentStatusBadge({ status, size = "md" }: PaymentStatusBadgeProps) {
  const norm = status?.toUpperCase() || "UNKNOWN";

  let bg = "bg-stone-100 text-stone-700 border-stone-200";
  let icon = <Clock className="w-3 h-3" />;
  let label = norm.replace(/_/g, " ");

  switch (norm) {
    case "CONFIRMED":
    case "PAID":
    case "CONFIRMED_PAID":
      bg = "bg-emerald-50 text-emerald-800 border-emerald-200";
      icon = <CheckCircle2 className="w-3 h-3 text-emerald-600" />;
      break;
    case "PENDING_VERIFICATION":
    case "PROCESSING":
    case "PENDING_EXECUTION":
    case "UNDER_REVIEW":
    case "REQUESTED":
      bg = "bg-amber-50 text-amber-800 border-amber-200";
      icon = <Clock className="w-3 h-3 text-amber-600" />;
      label = norm === "PENDING_VERIFICATION" ? "Pending Verification" : label;
      break;
    case "PARTIALLY_PAID":
      bg = "bg-blue-50 text-blue-800 border-blue-200";
      icon = <Clock className="w-3 h-3 text-blue-600" />;
      label = "Partially Paid";
      break;
    case "UPCOMING":
    case "ISSUED":
    case "CREATED":
    case "DRAFT":
      bg = "bg-stone-50 text-stone-700 border-stone-200";
      icon = <Clock className="w-3 h-3 text-stone-400" />;
      break;
    case "OVERDUE":
    case "FAILED":
    case "REJECTED":
    case "VOID":
    case "REVOKED":
      bg = "bg-rose-50 text-rose-800 border-rose-200";
      icon = <AlertTriangle className="w-3 h-3 text-rose-600" />;
      break;
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
    case "REVERSED":
      bg = "bg-purple-50 text-purple-800 border-purple-200";
      icon = <RotateCcw className="w-3 h-3 text-purple-600" />;
      label = norm === "PARTIALLY_REFUNDED" ? "Partially Refunded" : label;
      break;
  }

  const sizeClasses =
    size === "sm" ? "text-[10px] px-2 py-0.5 gap-1" : "text-xs px-2.5 py-1 gap-1.5";

  return (
    <span
      className={`inline-flex items-center font-bold tracking-tight rounded-full border shadow-2xs ${sizeClasses} ${bg}`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}
