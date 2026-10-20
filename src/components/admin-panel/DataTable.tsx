import { useId, useMemo, useState, type ReactNode } from "react";
import {
  useTable,
  tableFeatures,
  rowPaginationFeature,
  rowSortingFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  sortFns,
  type ColumnDef,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Button, Empty, inputClass, Label } from "./ui";

const features = tableFeatures({
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns,
});
export interface TableColumn<T> {
  id: string;
  label: string;
  value: (row: T) => string | number;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
}
export function DataTable<T extends { id: string }>({
  data,
  columns,
  label,
}: {
  data: T[];
  columns: TableColumn<T>[];
  label: string;
}) {
  const inputId = useId();
  const [filter, setFilter] = useState("");
  const filtered = useMemo(
    () =>
      data.filter((row) =>
        columns.some((column) =>
          String(column.value(row))
            .toLocaleLowerCase()
            .includes(filter.toLocaleLowerCase()),
        ),
      ),
    [data, columns, filter],
  );
  const definitions = useMemo<ColumnDef<typeof features, T>[]>(
    () =>
      columns.map((column) => ({
        id: column.id,
        header: column.label,
        accessorFn: column.value,
        enableSorting: column.sortable !== false,
        cell: ({ row }) =>
          column.render
            ? column.render(row.original)
            : column.value(row.original),
      })),
    [columns],
  );
  const table = useTable({
    features,
    sortDescFirst: false,
    columns: definitions,
    data: filtered,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  });
  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <Label id={inputId}>Filter {label.toLowerCase()}</Label>
        <input
          id={inputId}
          className={inputClass}
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value);
            table.setPageIndex(0);
          }}
        />
      </div>
      {!filtered.length ? (
        <Empty>No matching {label.toLowerCase()}.</Empty>
      ) : (
        <>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 lg:hidden">
            <span aria-hidden="true">↔</span>
            <span>Swipe horizontally to view all columns.</span>
          </div>
          <div
            tabIndex={0}
            role="region"
            aria-label={`${label} table`}
            className="overflow-x-auto rounded-xl border border-slate-200 touch-pan-x overscroll-x-contain focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <table className="min-w-[900px] w-full text-left text-sm">
              <caption className="sr-only">{label}</caption>
              <thead className="bg-slate-50">
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => (
                      <th
                        key={header.id}
                        scope="col"
                        className="whitespace-nowrap px-4 py-3"
                        aria-sort={
                          header.column.getIsSorted() === "asc"
                            ? "ascending"
                            : header.column.getIsSorted() === "desc"
                              ? "descending"
                              : "none"
                        }
                      >
                        {header.column.getCanSort() ? (
                          <button
                            type="button"
                            className="inline-flex min-h-11 items-center gap-2 font-semibold"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <table.FlexRender header={header} />
                            {header.column.getIsSorted() === "asc" ? (
                              <ArrowUp size={14} />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <ArrowDown size={14} />
                            ) : (
                              <ChevronsUpDown size={14} />
                            )}
                          </button>
                        ) : (
                          <table.FlexRender header={header} />
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    {row.getAllCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-4 align-top">
                        <table.FlexRender cell={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>
              {filtered.length} records · Page{" "}
              {table.state.pagination.pageIndex + 1} of{" "}
              {Math.max(1, table.getPageCount())}
            </span>
            <div className="flex gap-2">
              <Button
                secondary
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                Previous
              </Button>
              <Button
                secondary
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
