import React from "react";
import { formatCurrency } from "@/lib/utils";

interface MoneyDisplayProps {
  amount: number | null | undefined;
  currency?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "success" | "danger" | "gold" | "muted";
  className?: string;
  showSign?: boolean;
}

export function MoneyDisplay({
  amount = 0,
  currency = "INR",
  size = "md",
  variant = "default",
  className = "",
  showSign = false,
}: MoneyDisplayProps) {
  const safeAmount = amount ?? 0;
  const isNegative = safeAmount < 0;
  const formatted = formatCurrency(Math.abs(safeAmount), currency);

  const sizeClasses = {
    sm: "text-xs font-semibold",
    md: "text-sm font-bold",
    lg: "text-lg font-extrabold",
    xl: "text-2xl font-black",
  };

  const variantClasses = {
    default: "text-[#2A0F16]",
    success: "text-emerald-700",
    danger: "text-rose-700",
    gold: "text-[#C9A24B]",
    muted: "text-stone-500 font-medium",
  };

  const sign = isNegative ? "- " : showSign && safeAmount > 0 ? "+ " : "";

  return (
    <span
      className={`font-mono inline-flex items-center tracking-tight ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {sign}
      {formatted}
    </span>
  );
}
