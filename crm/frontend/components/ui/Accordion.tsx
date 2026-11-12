"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AccordionItemData {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  content: React.ReactNode;
  defaultOpen?: boolean;
}

export interface AccordionProps {
  items: AccordionItemData[];
  allowMultiple?: boolean;
  className?: string;
}

export function Accordion({ items, allowMultiple = false, className }: AccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    items.forEach((item) => {
      if (item.defaultOpen) initial.add(item.id);
    });
    return initial;
  });

  const toggleItem = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultiple) {
          next.clear();
        }
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={cn("space-y-2.5", className)}>
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        return (
          <div
            key={item.id}
            className="border border-[#E9E0D8] rounded-xl bg-white overflow-hidden shadow-2xs transition-colors"
          >
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-[#FBF9F5] transition-colors focus:outline-none focus:bg-[#FBF9F5] min-h-[48px]"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                {item.icon && (
                  <div className="p-2 rounded-lg bg-[#F5F0E8] text-[#6D1A2B] shrink-0">
                    {item.icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="font-semibold text-xs sm:text-sm text-[#251923] truncate">
                    {item.title}
                  </h4>
                  {item.subtitle && (
                    <p className="text-[11px] text-[#6B6268] mt-0.5 truncate">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {item.badge}
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-[#6B6268] transition-transform duration-200",
                    isOpen && "rotate-180 text-[#6D1A2B]"
                  )}
                />
              </div>
            </button>

            {isOpen && (
              <div className="px-3.5 sm:px-4 pb-4 pt-1 border-t border-[#E9E0D8]/60 text-xs text-[#251923] animate-fade-in">
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
