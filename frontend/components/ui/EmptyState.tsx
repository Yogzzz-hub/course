import React from "react";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-stone-300 bg-white/60",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-[#F6EBCF]/60 border border-[#C9A24B]/30 flex items-center justify-center text-[#6D1A2B] mb-3">
        {icon || <FolderOpen className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-semibold text-[#2A0F16]">{title}</h3>
      <p className="mt-1 text-xs sm:text-sm text-stone-500 max-w-sm">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
