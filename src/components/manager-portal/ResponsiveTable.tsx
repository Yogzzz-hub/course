import React, { useEffect, useRef, type TableHTMLAttributes } from "react";

export interface ResponsiveTableProps extends TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export function ResponsiveTable({
  children,
  className = "",
  style,
  ...props
}: ResponsiveTableProps) {
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    const assignLabels = () => {
      const thElements = Array.from(table.querySelectorAll("thead th"));
      const headers = thElements.map((th) => th.textContent?.trim() || "");

      const rows = table.querySelectorAll("tbody tr");
      rows.forEach((row) => {
        const tds = row.querySelectorAll("td");
        // If single full-width row (e.g. empty state), do not label
        if (tds.length === 1 && (tds[0].hasAttribute("colspan") || tds[0].getAttribute("colSpan"))) {
          return;
        }
        tds.forEach((td, i) => {
          if (headers[i] && headers[i].length > 0) {
            td.setAttribute("data-label", headers[i]);
          }
        });
      });
    };

    assignLabels();

    const observer = new MutationObserver(assignLabels);
    observer.observe(table, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return (
    <table
      ref={tableRef}
      className={`responsive-table ${className}`}
      style={style}
      {...props}
    >
      {children}
    </table>
  );
}

