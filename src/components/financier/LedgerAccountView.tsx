import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import type { LedgerAccountCode } from "../../../backend/services/financier/types";
import { DataTable, MetricCard, useToast, type SharedTableColumn } from "../shared";
import { financierApi, type FinancierLedgerAccountResponse } from "./api";
import { formatMoney, formatShortDate, statusBadgeClass } from "./formatters";

export interface LedgerAccountViewProps {
  accountCode: LedgerAccountCode;
}

export function LedgerAccountView({ accountCode }: LedgerAccountViewProps) {
  const { showToast } = useToast();
  const [detail, setDetail] = useState<FinancierLedgerAccountResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMsg(null);
    financierApi
      .getLedgerAccountDetail(accountCode)
      .then((res) => {
        if (active) setDetail(res);
      })
      .catch((err) => {
        if (active) {
          setErrorMsg(
            err instanceof Error ? err.message : "Failed to load ledger account."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accountCode]);

  const columns: SharedTableColumn<FinancierLedgerAccountResponse["lines"][number]>[] = [
    {
      id: "entryNumber",
      label: "Entry #",
      sortValue: (r) => r.entryNumber,
      searchValue: (r) => `${r.entryNumber} ${r.notes || ""} ${r.studentName || ""}`,
      render: (r) => (
        <div>
          <strong className="fin-mono">{r.entryNumber}</strong>
          <div className="fin-sub-text">{formatShortDate(r.entryDate)}</div>
        </div>
      ),
    },
    {
      id: "type",
      label: "Transaction",
      sortValue: (r) => r.transactionType,
      render: (r) => (
        <div>
          <span className={statusBadgeClass(r.transactionType)}>{r.transactionType}</span>
          <div className="fin-sub-text">{r.notes || r.referenceId}</div>
        </div>
      ),
    },
    {
      id: "student",
      label: "Student / Counterparty",
      sortValue: (r) => r.studentName || "",
      render: (r) =>
        r.studentProfileId && r.studentName ? (
          <Link to={`/financier/students/${r.studentProfileId}`} className="fin-link">
            {r.studentName}
          </Link>
        ) : (
          <span className="fin-sub-text">Institutional</span>
        ),
    },
    {
      id: "debit",
      label: "Debit",
      numeric: true,
      sortValue: (r) => (r.direction === "DEBIT" ? r.amountPaise : 0),
      render: (r) =>
        r.direction === "DEBIT" ? (
          <strong className="fin-mono">{formatMoney(r.amountPaise)}</strong>
        ) : (
          "—"
        ),
    },
    {
      id: "credit",
      label: "Credit",
      numeric: true,
      sortValue: (r) => (r.direction === "CREDIT" ? r.amountPaise : 0),
      render: (r) =>
        r.direction === "CREDIT" ? (
          <strong className="fin-mono">{formatMoney(r.amountPaise)}</strong>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div className="fin-stack-lg">
      <nav className="fin-breadcrumb" aria-label="Breadcrumb">
        <Link to="/financier/ledger" className="fin-link">
          <ArrowLeft size={14} style={{ display: "inline", verticalAlign: "text-bottom" }} />{" "}
          General Ledger
        </Link>
        <span aria-hidden="true">/</span>
        <span>{accountCode}</span>
      </nav>

      {loading ? (
        <div className="fin-empty-state">Loading account ledger lines...</div>
      ) : errorMsg || !detail ? (
        <div className="fin-alert fin-alert--danger" role="alert">
          <span>{errorMsg || `Account ${accountCode} not found.`}</span>
        </div>
      ) : (
        <>
          <div className="fin-page-header">
            <div>
              <h1>
                {detail.account.name} ({detail.account.code})
              </h1>
              <p>
                Account Classification: {detail.account.type} · All postings immutable in integer
                paise.
              </p>
            </div>
            <button
              type="button"
              className="fin-btn fin-btn-secondary"
              onClick={() => {
                void financierApi.downloadLedgerCsv({ accountCode }).then(() => {
                  showToast({ title: `Exported ${accountCode} ledger CSV`, tone: "success" });
                });
              }}
            >
              <Download size={15} aria-hidden="true" />
              <span>Export Account CSV</span>
            </button>
          </div>

          <div className="fin-metrics-grid">
            <MetricCard
              label="Account Classification"
              value={detail.account.type}
              hint={`${detail.lines.length} journal lines`}
            />
            <MetricCard
              label="Total Debits"
              value={formatMoney(detail.summary.totalDebitsPaise)}
            />
            <MetricCard
              label="Total Credits"
              value={formatMoney(detail.summary.totalCreditsPaise)}
            />
            <MetricCard
              label="Net Account Balance"
              value={formatMoney(detail.summary.netBalancePaise)}
              highlight
              hint="Per accounting normal balance"
            />
          </div>

          <section className="fin-card" aria-label={`${detail.account.name} postings`}>
            <DataTable
              rows={detail.lines}
              columns={columns}
              getRowId={(r) => r.id}
              label={`${detail.account.name} ledger lines`}
            />
          </section>
        </>
      )}
    </div>
  );
}
