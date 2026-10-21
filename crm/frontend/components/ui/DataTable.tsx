"use client";

import React, { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  className?: string;
  /** Whether to show this field on mobile card view */
  mobilePrimary?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  searchableKey?: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  actions?: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  searchableKey,
  searchPlaceholder = "Search records...",
  pageSize = 10,
  emptyTitle = "No records found",
  emptyDescription = "There are no entries matching your current view or query.",
  actions,
  className,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data by search query
  const filteredData = useMemo(() => {
    if (!searchableKey || !searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();
    return data.filter((item) => {
      const val = searchableKey(item);
      return val ? val.toLowerCase().includes(q) : false;
    });
  }, [data, searchableKey, searchQuery]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a: any, b: any) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [filteredData, sortKey, sortDirection]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortKey(null);
        setSortDirection("asc");
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Top Filter Bar */}
      {searchableKey && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6268]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E9E0D8] bg-white text-[#251923] placeholder-[#6B6268]/60 focus:outline-none focus:border-[#6D1A2B] min-h-[44px] sm:min-h-0"
            />
          </div>
          <div className="text-xs text-[#6B6268] text-right self-center">
            Showing <span className="font-semibold text-[#251923]">{sortedData.length}</span> results
          </div>
        </div>
      )}

      {/* Desktop Table View (Hidden on mobile < md) */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#E9E0D8] bg-white shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E9E0D8] bg-[#F5F0E8]/60 text-[#251923]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={cn(
                    "px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-[#6B6268]",
                    col.sortable && "cursor-pointer select-none hover:text-[#6D1A2B]",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right",
                    col.className
                  )}
                >
                  <div
                    className={cn(
                      "inline-flex items-center gap-1.5",
                      col.align === "right" && "justify-end",
                      col.align === "center" && "justify-center"
                    )}
                  >
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-[#6B6268]">
                        {sortKey === col.key ? (
                          sortDirection === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-[#6D1A2B]" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-[#6D1A2B]" />
                          )
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 opacity-30" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-[#6B6268] text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E9E0D8]">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-6 py-12 text-center text-[#6B6268]"
                >
                  <Inbox className="w-8 h-8 text-[#C9A24B] mx-auto mb-2 opacity-60" />
                  <p className="font-semibold text-sm text-[#251923]">{emptyTitle}</p>
                  <p className="text-xs text-[#6B6268] mt-1">{emptyDescription}</p>
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className="hover:bg-[#FBF9F5] transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 text-[#251923]",
                        col.align === "center" && "text-center",
                        col.align === "right" && "text-right",
                        col.className
                      )}
                    >
                      {col.render ? col.render(row) : (row as any)[col.key] ?? "—"}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-right">
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View (Shown on screens < md) */}
      <div className="md:hidden space-y-2.5">
        {paginatedData.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-[#E9E0D8]">
            <Inbox className="w-8 h-8 text-[#C9A24B] mx-auto mb-2 opacity-60" />
            <p className="font-semibold text-sm text-[#251923]">{emptyTitle}</p>
            <p className="text-xs text-[#6B6268] mt-1">{emptyDescription}</p>
          </div>
        ) : (
          paginatedData.map((row) => (
            <div
              key={keyExtractor(row)}
              className="bg-white border border-[#E9E0D8] rounded-xl p-3.5 shadow-xs space-y-2.5"
            >
              {columns.map((col) => (
                <div key={col.key} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-[#6B6268] font-medium text-[11px]">{col.header}:</span>
                  <span className="font-medium text-[#251923] text-right">
                    {col.render ? col.render(row) : (row as any)[col.key] ?? "—"}
                  </span>
                </div>
              ))}
              {actions && (
                <div className="pt-2 border-t border-[#E9E0D8] flex justify-end gap-2">
                  {actions(row)}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 px-1 text-xs text-[#6B6268]">
          <span>
            Page <span className="font-semibold text-[#251923]">{validCurrentPage}</span> of{" "}
            <span className="font-semibold text-[#251923]">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage <= 1}
              className="p-1.5 rounded-lg border border-[#E9E0D8] bg-white text-[#251923] hover:bg-[#F5F0E8] disabled:opacity-40 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage >= totalPages}
              className="p-1.5 rounded-lg border border-[#E9E0D8] bg-white text-[#251923] hover:bg-[#F5F0E8] disabled:opacity-40 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
