import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Download, RefreshCw, RotateCcw, Scale } from "lucide-react";
import { LEDGER_ACCOUNT_META } from "../../../backend/services/financier/ledger";
import type {
  BalancedJournalEntry,
  LedgerAccountCode,
} from "../../../backend/services/financier/types";
import { DataTable, Modal, useToast, type SharedTableColumn } from "../shared";
import {
  financierApi,
  type FinancierLedgerResponse,
  type FinancierSummaryResponse,
} from "./api";
import { formatMoney, formatShortDate, statusBadgeClass } from "./formatters";

export interface LedgerViewProps {
  students: FinancierSummaryResponse["students"];
  onSummaryRefresh: () => Promise<void>;
}

const ALL_ACCOUNTS = Object.keys(LEDGER_ACCOUNT_META) as LedgerAccountCode[];

export function LedgerView({ students, onSummaryRefresh }: LedgerViewProps) {
  const { showToast } = useToast();
  const baseId = useId();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [accountCode, setAccountCode] = useState<"" | LedgerAccountCode>("");
  const [studentProfileId, setStudentProfileId] = useState("");
  const [ledgerData, setLedgerData] = useState<FinancierLedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [revTarget, setRevTarget] = useState<BalancedJournalEntry | null>(null);
  const [revReason, setRevReason] = useState("");
  const [revBusy, setRevBusy] = useState(false);

  const loadLedger = useCallback(async () => {
    setLoading(true);
    try {
      const data = await financierApi.getLedger({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        accountCode: accountCode || undefined,
        studentProfileId: studentProfileId || undefined,
      });
      setLedgerData(data);
    } catch (err) {
      showToast({
        title: "Failed to load General Ledger",
        description: err instanceof Error ? err.message : "Could not read ledger entries.",
        tone: "danger",
      });
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, accountCode, studentProfileId, showToast]);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  const handleExportCsv = async () => {
    try {
      await financierApi.downloadLedgerCsv({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        accountCode: accountCode || undefined,
        studentProfileId: studentProfileId || undefined,
      });
      showToast({ title: "General Ledger CSV exported", tone: "success" });
    } catch (err) {
      showToast({
        title: "CSV export failed",
        description: err instanceof Error ? err.message : "Unable to export ledger CSV.",
        tone: "danger",
      });
    }
  };

  const handleReverseEntry = async (e: FormEvent) => {
    e.preventDefault();
    if (!revTarget) return;
    if (revReason.trim().length < 5) {
      showToast({
        title: "Reason required",
        description: "Provide at least 5 characters explaining the counter-entry reversal.",
        tone: "warning",
      });
      return;
    }

    setRevBusy(true);
    try {
      const res = await financierApi.reverseJournalEntry(revTarget.id, revReason.trim());
      showToast({
        title: `Counter-entry ${res.counterEntry.entryNumber} posted`,
        description: `Original entry ${revTarget.entryNumber} preserved immutably.`,
        tone: "success",
      });
      setRevTarget(null);
      setRevReason("");
      await loadLedger();
      await onSummaryRefresh();
    } catch (err) {
      showToast({
        title: "Reversal failed",
        description: err instanceof Error ? err.message : "Could not post counter-entry.",
        tone: "danger",
      });
    } finally {
      setRevBusy(false);
    }
  };

  const journalColumns: SharedTableColumn<BalancedJournalEntry>[] = [
    {
      id: "entryNumber",
      label: "Journal # & Date",
      sortValue: (r) => r.entryNumber,
      searchValue: (r) => `${r.entryNumber} ${r.transactionType} ${r.notes || ""}`,
      render: (r) => (
        <div>
          <strong className="fin-mono">{r.entryNumber}</strong>
          <div className="fin-sub-text">{formatShortDate(r.entryDate)}</div>
        </div>
      ),
    },
    {
      id: "type",
      label: "Type & Reference",
      sortValue: (r) => r.transactionType,
      render: (r) => (
        <div>
          <span className={statusBadgeClass(r.transactionType === "REVERSAL" ? "OVERDUE" : "SENT")}>
            {r.transactionType}
          </span>
          <div className="fin-sub-text">
            {r.referenceType}: {r.referenceId}
          </div>
        </div>
      ),
    },
    {
      id: "legs",
      label: "Balanced Double-Entry Legs",
      searchValue: (r) =>
        r.lines.map((l) => `${l.accountCode} ${l.direction}`).join(" "),
      render: (r) => (
        <div className="fin-stack-sm">
          {r.lines.map((line) => (
            <div key={line.id} className="fin-row-between" style={{ gap: 12 }}>
              <Link to={`/financier/ledger/${line.accountCode}`} className="fin-link">
                {line.direction === "DEBIT" ? "Dr " : "Cr "}
                {line.accountCode}
              </Link>
              <strong className="fin-mono">{formatMoney(line.amountPaise)}</strong>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "notes",
      label: "Narrative",
      searchValue: (r) => r.notes || "",
      render: (r) => (
        <div>
          <div>{r.notes || "—"}</div>
          {r.reversesEntryId && (
            <div className="fin-sub-text">Reverses entry {r.reversesEntryId}</div>
          )}
          {r.reversedByEntryId && (
            <div className="fin-sub-text">Reversed by {r.reversedByEntryId}</div>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      label: "Counter-Entry",
      render: (r) => {
        if (r.reversedByEntryId) {
          return <span className="fin-badge fin-badge-neutral">Already Reversed</span>;
        }
        return (
          <button
            type="button"
            className="fin-btn fin-btn-secondary fin-btn-sm"
            onClick={() => {
              setRevReason("");
              setRevTarget(r);
            }}
          >
            <RotateCcw size={13} aria-hidden="true" />
            <span>Reverse</span>
          </button>
        );
      },
    },
  ];

  const tb = ledgerData?.trialBalance;

  return (
    <div className="fin-stack-lg">
      <div className="fin-page-header">
        <div>
          <h1>Double-Entry General Ledger</h1>
          <p>
            Append-only financial journal enforcing Debits = Credits on every posting.
            Corrections post counter-entries; ledger rows are never deleted.
          </p>
        </div>
        <div className="fin-page-header-actions">
          <button
            type="button"
            className="fin-btn fin-btn-secondary"
            onClick={() => void loadLedger()}
          >
            <RefreshCw size={15} aria-hidden="true" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="fin-btn fin-btn-primary"
            onClick={handleExportCsv}
          >
            <Download size={15} aria-hidden="true" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Trial Balance Check Banner */}
      {tb && (
        <div
          className={
            tb.balanced ? "fin-alert fin-alert--success" : "fin-alert fin-alert--danger"
          }
          role="status"
        >
          <Scale size={18} aria-hidden="true" />
          <div className="fin-row-between" style={{ flex: 1 }}>
            <div>
              <strong>
                Trial Balance Verification:{" "}
                {tb.balanced ? "BALANCED (Debits = Credits)" : "UNBALANCED"}
              </strong>
              <div>
                {tb.entryCount} journal entries · Variance {formatMoney(tb.differencePaise)}
              </div>
            </div>
            <div className="fin-row-wrap">
              <span className="fin-badge fin-badge-neutral">
                Total Debits: {formatMoney(tb.totalDebitsPaise)}
              </span>
              <span className="fin-badge fin-badge-neutral">
                Total Credits: {formatMoney(tb.totalCreditsPaise)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Account Balances Cards */}
      {ledgerData && (
        <section className="fin-card fin-card--gold-accent" aria-labelledby="led-accts-heading">
          <div className="fin-card-header">
            <div>
              <h2 id="led-accts-heading">Chart of Accounts Balances</h2>
              <p>Select any account code to inspect its full filtered T-account view</p>
            </div>
          </div>
          <div className="fin-kv-grid">
            {ledgerData.accountBalances.map((acct) => (
              <Link
                key={acct.accountCode}
                to={`/financier/ledger/${acct.accountCode}`}
                className="fin-kv-box"
              >
                <span className="fin-kv-label">
                  {acct.accountName} ({acct.accountType})
                </span>
                <span className="fin-kv-value">{formatMoney(acct.netBalancePaise)}</span>
                <span className="fin-sub-text">
                  Dr {formatMoney(acct.totalDebitsPaise)} · Cr {formatMoney(acct.totalCreditsPaise)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Filters + Entries Table */}
      <section className="fin-card" aria-labelledby="led-journal-heading">
        <div className="fin-card-header">
          <h2 id="led-journal-heading">Journal Entries Register</h2>
        </div>

        <div className="fin-form-grid">
          <div className="fin-form-field">
            <label htmlFor={`${baseId}-from`} className="fin-label">
              From Date
            </label>
            <input
              id={`${baseId}-from`}
              type="date"
              className="fin-input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="fin-form-field">
            <label htmlFor={`${baseId}-to`} className="fin-label">
              To Date
            </label>
            <input
              id={`${baseId}-to`}
              type="date"
              className="fin-input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="fin-form-field">
            <label htmlFor={`${baseId}-acct`} className="fin-label">
              Ledger Account
            </label>
            <select
              id={`${baseId}-acct`}
              className="fin-select"
              value={accountCode}
              onChange={(e) => setAccountCode(e.target.value as "" | LedgerAccountCode)}
            >
              <option value="">All Accounts</option>
              {ALL_ACCOUNTS.map((code) => (
                <option key={code} value={code}>
                  {LEDGER_ACCOUNT_META[code].name} ({code})
                </option>
              ))}
            </select>
          </div>
          <div className="fin-form-field">
            <label htmlFor={`${baseId}-stu`} className="fin-label">
              Student Scope
            </label>
            <select
              id={`${baseId}-stu`}
              className="fin-select"
              value={studentProfileId}
              onChange={(e) => setStudentProfileId(e.target.value)}
            >
              <option value="">All Students & Institutional Entries</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.registrationNumber})
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && !ledgerData ? (
          <div className="fin-empty-state">Loading general ledger journal...</div>
        ) : (
          <DataTable
            rows={ledgerData?.entries ?? []}
            columns={journalColumns}
            getRowId={(r) => r.id}
            label="Journal entries"
            emptyMessage="No journal entries match the selected filters."
          />
        )}
      </section>

      {/* Counter-Entry Reversal Modal */}
      <Modal
        open={Boolean(revTarget)}
        onClose={() => setRevTarget(null)}
        title="Post Counter-Entry Reversal"
        subtitle="Creates an opposing balanced journal entry; original record remains intact"
      >
        {revTarget && (
          <form onSubmit={handleReverseEntry} className="fin-stack-md">
            <div className="fin-alert fin-alert--warning">
              <span>
                You are reversing <strong>{revTarget.entryNumber}</strong> (
                {revTarget.transactionType}). Debits and Credits will be inverted in a new
                immutable entry.
              </span>
            </div>

            <div className="fin-form-field">
              <label htmlFor={`${baseId}-rev-reason`} className="fin-label">
                Reversal Reason (Mandatory)
              </label>
              <textarea
                id={`${baseId}-rev-reason`}
                className="fin-textarea"
                placeholder="State accounting error or superseding invoice number..."
                value={revReason}
                onChange={(e) => setRevReason(e.target.value)}
                required
              />
            </div>

            <div className="fin-row-between">
              <button
                type="button"
                className="fin-btn fin-btn-secondary"
                onClick={() => setRevTarget(null)}
              >
                Cancel
              </button>
              <button type="submit" className="fin-btn fin-btn-primary" disabled={revBusy}>
                {revBusy ? "Posting Reversal..." : "Post Balanced Counter-Entry"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
