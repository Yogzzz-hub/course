"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Content sections"
      className={cn(
        "flex items-center gap-1.5 p-1 rounded-xl bg-[#F5F0E8] border border-[#E9E0D8] overflow-x-auto scrollbar-none",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 min-h-[38px] select-none",
              isActive
                ? "bg-white text-[#6D1A2B] shadow-xs border border-[#E9E0D8]/60"
                : "text-[#6B6268] hover:text-[#251923] hover:bg-white/50"
            )}
          >
            {tab.icon && (
              <span className={cn("shrink-0", isActive ? "text-[#6D1A2B]" : "text-[#6B6268]")}>
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums",
                  isActive
                    ? "bg-[#6D1A2B]/10 text-[#6D1A2B]"
                    : "bg-[#E9E0D8] text-[#6B6268]"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
