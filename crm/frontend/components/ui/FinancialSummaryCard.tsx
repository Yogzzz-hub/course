import React from "react";
import { MoneyDisplay } from "./MoneyDisplay";

interface FinancialSummaryCardProps {
  title: string;
  amount: number;
  currency?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "danger" | "gold";
  trend?: string;
}

export function FinancialSummaryCard({
  title,
  amount,
  currency = "INR",
  subtitle,
  icon,
  variant = "default",
  trend,
}: FinancialSummaryCardProps) {
  const borderStyles = {
    default: "border-stone-200 hover:border-[#6D1A2B]/40",
    success: "border-emerald-200 bg-emerald-50/20",
    danger: "border-rose-200 bg-rose-50/20",
    gold: "border-[#C9A24B]/30 bg-[#F6EBCF]/20",
  };

  return (
    <div
      className={`bg-white rounded-2xl border p-5 shadow-2xs transition-all duration-200 ${borderStyles[variant]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
          {title}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-xl bg-stone-50 flex items-center justify-center shrink-0 border border-stone-100">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-2.5">
        <MoneyDisplay amount={amount} currency={currency} size="xl" variant={variant} />
      </div>

      {(subtitle || trend) && (
        <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
          <span>{subtitle}</span>
          {trend && <span className="font-semibold text-emerald-700">{trend}</span>}
        </div>
      )}
    </div>
  );
}
