import React from "react";
import { cn } from "@/lib/utils";

export interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, className, size = "md" }: StatusBadgeProps) {
  const norm = status?.toUpperCase() || "";

  let colorClasses = "bg-[#F5F0E8] text-[#251923] border-[#E9E0D8]";

  switch (norm) {
    case "PRESENT":
    case "ACTIVE":
    case "APPROVED":
    case "GRADUATED":
    case "HELD":
    case "PAID":
    case "CONFIRMED":
    case "PUBLISHED":
    case "COMPLETED":
    case "SUCCESS":
    case "EVALUATED":
      colorClasses = "bg-[#E7F3EE] text-[#19674B] border-[#A7D6C3]";
      break;

    case "ABSENT":
    case "LOST":
    case "REJECTED":
    case "WITHDRAWN":
    case "CANCELLED":
    case "FAILED":
    case "OVERDUE":
    case "REVOKED":
      colorClasses = "bg-[#FEECEB] text-[#B42318] border-[#FDA29B]";
      break;

    case "LEAVE":
    case "COUNSELLING_SCHEDULED":
    case "INTERESTED":
    case "PENDING":
    case "PENDING_APPROVAL":
    case "PENDING_VERIFICATION":
    case "POSTPONED":
    case "PARTIALLY_PAID":
    case "UPCOMING":
      colorClasses = "bg-[#FAF6EC] text-[#997324] border-[#DEC278]";
      break;

    case "NEW":
    case "CONTACTED":
    case "SCHEDULED":
    case "IN_PROGRESS":
    case "OPEN":
      colorClasses = "bg-[#EAF2F5] text-[#315F70] border-[#97B8C4]";
      break;

    case "TEACHING_COMPLETE":
    case "APPLIED":
    case "ADMITTED":
      colorClasses = "bg-[#FDF5F6] text-[#6D1A2B] border-[#F7D1D7] font-semibold";
      break;

    case "NOT_SUBMITTED":
    case "PENDING_DOCS":
    case "FINANCIAL_HOLD":
      colorClasses = "bg-[#FFF4ED] text-[#B44C18] border-[#FDBA8C]";
      break;

    default:
      colorClasses = "bg-[#F5F0E8] text-[#6B6268] border-[#E9E0D8]";
  }

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5 font-medium leading-none",
    md: "text-xs px-2.5 py-1 font-semibold leading-tight",
  };

  const label = status
    ? status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    : "Unknown";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border tracking-wide uppercase font-sans select-none",
        colorClasses,
        sizeClasses[size],
        className
      )}
    >
      {label}
    </span>
  );
}
