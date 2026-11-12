import React from "react";
import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  value: number; // 0 to 100
  label?: string;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  color?: "primary" | "gold" | "emerald";
}

export function ProgressIndicator({
  value,
  label,
  showPercentage = true,
  size = "md",
  className,
  color = "primary",
}: ProgressIndicatorProps) {
  const clamped = Math.min(100, Math.max(0, isNaN(value) ? 0 : value));

  const sizeHeights = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  const fillColors = {
    primary: "bg-gradient-to-r from-[#6D1A2B] to-[#8D283E]",
    gold: "bg-gradient-to-r from-[#C9A24B] to-[#E5BE64]",
    emerald: "bg-gradient-to-r from-emerald-600 to-emerald-500",
  };

  return (
    <div className={cn("w-full", className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-xs font-medium mb-1.5">
          {label && <span className="text-stone-600 truncate">{label}</span>}
          {showPercentage && (
            <span className="text-[#2A0F16] font-semibold ml-auto">{clamped}%</span>
          )}
        </div>
      )}
      <div className={cn("w-full bg-stone-200/70 rounded-full overflow-hidden", sizeHeights[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", fillColors[color])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
