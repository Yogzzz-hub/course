import React from "react";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  accent?: "burgundy" | "gold" | "teal" | "forest" | "default";
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  accent = "default",
  className,
}: MetricCardProps) {
  const accentStyles = {
    default: "border-[#E9E0D8]",
    burgundy: "border-[#6D1A2B]/20 bg-gradient-to-br from-white to-[#FDF5F6]/40",
    gold: "border-[#C9A24B]/30 bg-gradient-to-br from-white to-[#FAF6EC]/40",
    teal: "border-[#315F70]/25 bg-gradient-to-br from-white to-[#EAF2F5]/30",
    forest: "border-[#19674B]/25 bg-gradient-to-br from-white to-[#E7F3EE]/30",
  };

  const iconContainerStyles = {
    default: "bg-[#F5F0E8] text-[#6D1A2B]",
    burgundy: "bg-[#6D1A2B]/10 text-[#6D1A2B]",
    gold: "bg-[#C9A24B]/15 text-[#997324]",
    teal: "bg-[#315F70]/10 text-[#315F70]",
    forest: "bg-[#19674B]/10 text-[#19674B]",
  };

  return (
    <div
      className={cn(
        "bg-white border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 brand-card-hover relative overflow-hidden",
        accentStyles[accent],
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#6B6268] truncate">
            {title}
          </p>
          <div className="mt-1 sm:mt-2 flex flex-wrap items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[#251923] tabular-nums truncate">
              {value}
            </span>
            {trend && (
              <span
                className={cn(
                  "text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-0.5",
                  trend.isPositive
                    ? "bg-[#E7F3EE] text-[#19674B] border border-[#A7D6C3]"
                    : "bg-[#FEECEB] text-[#B42318] border border-[#FDA29B]"
                )}
              >
                {trend.isPositive ? "↑ " : "↓ "}
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-[#6B6268] mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {icon && (
          <div
            className={cn(
              "p-2.5 rounded-xl shrink-0 flex items-center justify-center transition-transform",
              iconContainerStyles[accent]
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
