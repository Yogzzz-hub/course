import { useState, useEffect } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Filter,
  Printer,
  Receipt,
  Search,
  Wallet,
  X,
} from "lucide-react";
import type { LedgerEntry } from "./contracts";
import { useAdminAuthority, useAdminResource } from "./hooks";
import { Button, Card, Empty, inputClass, KpiCard, ScreenTitle, StatusPill } from "./ui";
import { dateTime, money } from "./utils";
import { exportToCsv } from "../../utils/csvExport";

export function PaymentsSection() {
  const { can } = useAdminAuthority();
  const financeQuery = useAdminResource("finance", {});
  const reportsQuery = useAdminResource("reports", {});

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [receiptEntry, setReceiptEntry] = useState<LedgerEntry | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && receiptEntry) {
        setReceiptEntry(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [receiptEntry]);

  const revenue = reportsQuery.data?.revenue || {
    capturedMinor: 48500000,
    refundedMinor: 1500000,
    dueMinor: 8500000,
    overdueMinor: 3000000,
  };

  const entries: LedgerEntry[] = financeQuery.data?.entries || [];

  const filteredEntries = entries.filter((entry) => {
    if (statusFilter !== "all" && entry.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        entry.student.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        (entry.providerReference && entry.providerReference.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleExportLedger = () => {
    const listToExport = filteredEntries.length > 0 ? filteredEntries : entries;
    exportToCsv(
      `aintrix-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
      listToExport,
      [
        { header: "Entry ID", accessor: (e) => e.id },
        { header: "Student", accessor: (e) => e.student },
        { header: "Description", accessor: (e) => e.description },
        { header: "Reference", accessor: (e) => e.providerReference || "" },
        { header: "Amount", accessor: (e) => money(e.amountMinor, e.currency) },
        { header: "Status", accessor: (e) => e.status },
        { header: "Due Date", accessor: (e) => (e.dueAt ? dateTime(e.dueAt) : "") },
      ]
    );
  };

  return (
    <div className="space-y-6">
      <ScreenTitle
        eyebrow="Financial Operations"
        title="Payments & Invoices"
        actions={
          <Button secondary onClick={handleExportLedger}>
            <Download size={16} /> Export ledger
          </Button>
        }
      />

      {/* 4 KPI cards */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Collected MTD"
          value={money(revenue.capturedMinor, "INR")}
          subtext="Net fees captured"
          icon={Wallet}
          trend={{ value: "+12.4%", positive: true }}
        />
        <KpiCard
          title="Outstanding Due"
          value={money(revenue.dueMinor, "INR")}
          subtext="Upcoming scheduled instalments"
          icon={Clock}
          trend={{ value: "Next 14 days", positive: true }}
        />
        <KpiCard
          title="Approved Refunds"
          value={money(revenue.refundedMinor, "INR")}
          subtext="3 processed refunds"
          icon={ArrowDownLeft}
          trend={{ value: "Policy compliant", positive: true }}
        />
        <KpiCard
          title="Overdue Balance"
          value={money(revenue.overdueMinor, "INR")}
          subtext="Requires counsellor attention"
          icon={AlertTriangle}
          trend={{ value: "2 accounts", positive: false }}
        />
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {["all", "captured", "due", "overdue"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`inline-flex min-h-[44px] items-center rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold capitalize transition ${
                statusFilter === status
                  ? "bg-[var(--btn-primary-bg)] text-white shadow-sm"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--accent-tint)]"
              }`}
            >
              {status === "captured" ? "Paid / Captured" : status}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            size={16}
            aria-hidden="true"
            className="absolute left-3.5 top-3.5 text-[var(--muted)]"
          />
          <input
            type="search"
            placeholder="Search student or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>
      </div>

      {/* Invoice / Ledger Table */}
      <Card className="p-0 overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center">
            <Empty
              title="No invoice lines found"
              children="No ledger transactions match your search filter."
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-[var(--text)]">
                <thead className="bg-[var(--accent-tint)] border-b border-[var(--border)] text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">
                      Student
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Reference / Due Date
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right">
                      Receipt
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredEntries.map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--surface-alt)] transition">
                      <td className="px-6 py-4 font-semibold text-[var(--text)]">
                        {item.student}
                      </td>
                      <td className="px-6 py-4 text-xs sm:text-sm text-[var(--muted)]">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 text-xs text-[var(--muted)]">
                        {item.providerReference ? (
                          <span className="font-mono bg-[var(--accent-tint)] px-2 py-1 rounded border border-[var(--border)]">
                            {item.providerReference}
                          </span>
                        ) : item.dueAt ? (
                          <span>Due: {dateTime(item.dueAt)}</span>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-[var(--text)]">
                        {money(item.amountMinor, item.currency)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill status={item.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setReceiptEntry(item)}
                          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-tint)] hover:border-[var(--accent)] transition cursor-pointer"
                        >
                          <Receipt size={14} /> Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="divide-y divide-[var(--border)] md:hidden">
              {filteredEntries.map((item) => (
                <article key={item.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base text-[var(--text)]">
                        {item.student}
                      </h3>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        {item.description}
                      </p>
                    </div>
                    <StatusPill status={item.status} />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                    <div>
                      <span className="text-xs text-[var(--muted)] block">Amount</span>
                      <span className="text-lg font-bold text-[var(--text)]">
                        {money(item.amountMinor, item.currency)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReceiptEntry(item)}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[var(--border)] px-3.5 text-xs font-bold text-[var(--accent)] hover:bg-[var(--accent-tint)] cursor-pointer"
                    >
                      <Receipt size={15} /> Download Receipt
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Receipt Modal */}
      {receiptEntry && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-[var(--border)] pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                  Payment Receipt
                </span>
                <h3 className="text-lg font-bold text-[var(--text)] mt-0.5">
                  Aintrix Academy
                </h3>
                <p className="text-xs text-[var(--muted)]">Tax Invoice & Proof of Enrolment</p>
              </div>
              <button
                type="button"
                onClick={() => setReceiptEntry(null)}
                className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)] transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-[var(--surface-alt)] p-4 rounded-xl border border-[var(--border)]">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Receipt Ref:</span>
                <span className="font-mono font-bold text-[var(--text)]">
                  {receiptEntry.providerReference || receiptEntry.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Billed To Learner:</span>
                <span className="font-semibold text-[var(--text)]">{receiptEntry.student}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Description:</span>
                <span className="text-[var(--text)]">{receiptEntry.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Payment Kind:</span>
                <span className="capitalize text-[var(--text)]">{receiptEntry.kind}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Status:</span>
                <StatusPill status={receiptEntry.status} />
              </div>
              <div className="flex justify-between items-center border-t border-[var(--border)] pt-2.5">
                <span className="font-bold text-sm text-[var(--text)]">Total Captured:</span>
                <span className="font-extrabold text-base text-[var(--accent)]">
                  {money(receiptEntry.amountMinor, receiptEntry.currency)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button secondary onClick={() => setReceiptEntry(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  window.print();
                }}
              >
                <Printer size={15} /> Print Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

