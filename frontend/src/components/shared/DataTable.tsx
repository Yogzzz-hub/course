import { useId, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";

export interface SharedTableColumn<T> {
  id: string;
  label: string;
  sortValue?: (row: T) => string | number;
  searchValue?: (row: T) => string;
  render: (row: T) => ReactNode;
  numeric?: boolean;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: SharedTableColumn<T>[];
  getRowId: (row: T) => string;
  label: string;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: string;
  onRowOpen?: (row: T) => void;
  toolbarExtra?: ReactNode;
}

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  label,
  searchPlaceholder,
  pageSize = 10,
  emptyMessage = "No records found.",
  onRowOpen,
  toolbarExtra,
}: DataTableProps<T>) {
  const searchInputId = useId();
  const [query, setQuery] = useState("");
  const [sortColId, setSortColId] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      columns.some((col) => {
        if (col.searchValue) {
          return col.searchValue(row).toLowerCase().includes(q);
        }
        if (col.sortValue) {
          return String(col.sortValue(row)).toLowerCase().includes(q);
        }
        return false;
      })
    );
  }, [rows, columns, query]);

  const sorted = useMemo(() => {
    if (!sortColId) return filtered;
    const col = columns.find((c) => c.id === sortColId);
    if (!col || !col.sortValue) return filtered;
    const getVal = col.sortValue;
    return [...filtered].sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, columns, sortColId, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const visibleRows = useMemo(
    () => sorted.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [sorted, safePage, pageSize]
  );

  const toggleSort = (colId: string) => {
    if (sortColId === colId) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColId(colId);
      setSortDir("asc");
    }
    setPage(0);
  };

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (!onRowOpen) return;
    const target = event.target as HTMLElement;
    // Let native interactive children handle their own clicks/Enter
    if (
      target !== event.currentTarget &&
      target.closest("button, a, input, select, textarea")
    ) {
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      onRowOpen(row);
    }
  };

  const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>, row: T) => {
    if (!onRowOpen) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea")) {
      return;
    }
    onRowOpen(row);
  };

  return (
    <div className="fin-table-wrapper">
      <div className="fin-table-controls" style={{ marginBottom: 12 }}>
        <div className="fin-search-field">
          <label htmlFor={searchInputId} className="sr-only">
            Filter {label}
          </label>
          <Search size={15} className="fin-search-icon" aria-hidden="true" />
          <input
            id={searchInputId}
            type="search"
            className="fin-input fin-search-input"
            placeholder={searchPlaceholder || `Search ${label.toLowerCase()}...`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </div>
        {toolbarExtra && <div>{toolbarExtra}</div>}
      </div>

      {visibleRows.length === 0 ? (
        <div className="fin-empty-state">{emptyMessage}</div>
      ) : (
        <>
          <div
            className="fin-table-scroll"
            role="region"
            aria-label={`${label} table`}
            tabIndex={0}
          >
            <table className="fin-table">
              <caption className="sr-only">{label}</caption>
              <thead>
                <tr>
                  {columns.map((col) => {
                    const isSorted = sortColId === col.id;
                    const ariaSort = !col.sortValue
                      ? undefined
                      : isSorted
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none";
                    return (
                      <th
                        key={col.id}
                        scope="col"
                        className={col.numeric ? "fin-cell-numeric" : undefined}
                        aria-sort={ariaSort}
                      >
                        {col.sortValue ? (
                          <button
                            type="button"
                            className="fin-table-sort-btn"
                            onClick={() => toggleSort(col.id)}
                          >
                            <span>{col.label}</span>
                            {isSorted && sortDir === "asc" ? (
                              <ArrowUp size={13} aria-hidden="true" />
                            ) : isSorted && sortDir === "desc" ? (
                              <ArrowDown size={13} aria-hidden="true" />
                            ) : (
                              <ChevronsUpDown size={13} aria-hidden="true" />
                            )}
                          </button>
                        ) : (
                          col.label
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const id = getRowId(row);
                  return (
                    <tr
                      key={id}
                      className={onRowOpen ? "fin-table-row-clickable" : undefined}
                      tabIndex={onRowOpen ? 0 : undefined}
                      onClick={onRowOpen ? (e) => handleRowClick(e, row) : undefined}
                      onKeyDown={onRowOpen ? (e) => handleRowKeyDown(e, row) : undefined}
                    >
                      {columns.map((col) => (
                        <td
                          key={`${id}-${col.id}`}
                          className={col.numeric ? "fin-cell-numeric" : undefined}
                        >
                          {col.render(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="fin-table-pagination" style={{ marginTop: 10 }}>
            <span>
              {sorted.length} {sorted.length === 1 ? "record" : "records"} · Page {safePage + 1}{" "}
              of {totalPages}
              {onRowOpen ? " · Press Enter on a focused row to open" : ""}
            </span>
            <div className="fin-pagination-actions">
              <button
                type="button"
                className="fin-btn fin-btn-secondary fin-btn-sm"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="fin-btn fin-btn-secondary fin-btn-sm"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
