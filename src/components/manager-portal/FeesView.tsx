import React, { useState } from "react";
import { Download, Search, CheckCircle2, AlertCircle } from "lucide-react";
import type { FeePayment } from "../../data/managerMock";

export function FeesView({
  payments,
  onAddToast,
}: {
  payments: FeePayment[];
  onAddToast: (toast: { type: "success" | "info" | "warning"; title: string; message: string }) => void;
}) {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const filteredPayments = payments.filter((p) => {
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    const matchesSearch =
      p.studentName.toLowerCase().includes(search.toLowerCase()) ||
      p.invoiceId.toLowerCase().includes(search.toLowerCase()) ||
      p.course.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleExportCSV = () => {
    // TODO: Connect to backend API: GET /api/financier/payments/export-csv
    const header = "Invoice ID,Student,Course,Amount,Due Date,Status\n";
    const rows = filteredPayments
      .map((p) => `${p.invoiceId},"${p.studentName}","${p.course}",${p.amount},${p.dueDate},${p.status}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    onAddToast({
      type: "success",
      title: "Ledger Exported",
      message: "Payment records downloaded as CSV.",
    });
  };

  return (
    <div className="space-y-3">
      {/* Filter and search toolbar - NO headings or subheadings */}
      <div
        className="p-3.5 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-sm"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: "var(--muted)" }}
          />
          <input
            type="text"
            placeholder="Search invoice, student, or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 rounded-lg border outline-none text-sm"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 rounded-lg border text-sm outline-none cursor-pointer"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          >
            <option value="ALL">All Payment States</option>
            <option value="PAID">Paid Only</option>
            <option value="PENDING">Pending Dues</option>
            <option value="OVERDUE">Overdue Only</option>
          </select>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-lg border text-sm font-medium flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            style={{
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          >
            <Download size={15} />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div
        className="rounded-xl border overflow-hidden shadow-2xs w-full"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr
                className="border-b"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                  color: "var(--muted)",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                <th className="py-3 px-4">Invoice ID & Student</th>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {filteredPayments.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-black/2 dark:hover:bg-white/2 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs font-semibold block" style={{ color: "var(--accent)" }}>
                      {p.invoiceId}
                    </span>
                    <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                      {p.studentName}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium" style={{ color: "var(--text)" }}>
                    {p.course}
                  </td>
                  <td className="py-3 px-4 font-bold text-sm" style={{ color: "var(--text)" }}>
                    {p.amount}
                  </td>
                  <td className="py-3 px-4 text-xs" style={{ color: "var(--muted)" }}>
                    {p.dueDate}
                  </td>
                  <td className="py-3 px-4 text-xs" style={{ color: "var(--muted)" }}>
                    {p.method || "Awaiting Gateway"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
                      style={{
                        backgroundColor:
                          p.status === "PAID"
                            ? "#D1FAE5"
                            : p.status === "PENDING"
                            ? "#FEF3C7"
                            : "#FEE2E2",
                        color:
                          p.status === "PAID"
                            ? "#047857"
                            : p.status === "PENDING"
                            ? "#B45309"
                            : "#B91C1C",
                      }}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm" style={{ color: "var(--muted)" }}>
                    No payment records matching your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
