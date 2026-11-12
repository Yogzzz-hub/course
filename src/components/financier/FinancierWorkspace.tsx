import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  BookOpenCheck,
  ClockAlert,
  Coins,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Users,
} from "lucide-react";
import { LEDGER_ACCOUNT_META } from "../../../backend/services/financier/ledger";
import type {
  DiscountRequestRecord,
  InvoiceRecord,
  LedgerAccountCode,
  PaymentRecord,
  PayrollRunRecord,
  RefundRecord,
} from "../../../backend/services/financier/types";
import { DashboardShell, Sidebar, useToast, type SidebarNavItem } from "../shared";
import {
  clearCrmSession,
  getRedirectPathForSession,
  readCrmSession,
} from "../../utils/authSession";
import {
  financierApi,
  FinancierApiError,
  type FinancierCollectionsResponse,
  type FinancierReportsResponse,
  type FinancierSummaryResponse,
} from "./api";
import { AuditView } from "./AuditView";
import { CollectionsView } from "./CollectionsView";
import { DashboardView } from "./DashboardView";
import { FeesInvoicesView } from "./FeesInvoicesView";
import { InvoiceDetailView } from "./InvoiceDetailView";
import { LedgerAccountView } from "./LedgerAccountView";
import { LedgerView } from "./LedgerView";
import { PaymentDrawer } from "./PaymentDrawer";
import { PaymentsView } from "./PaymentsView";
import { PayrollRunDetailView } from "./PayrollRunDetailView";
import { PayrollView } from "./PayrollView";
import { ReportsView } from "./ReportsView";
import { StudentStatementView } from "./StudentStatementView";
import "./financier.css";

interface WorkspaceBundle {
  summary: FinancierSummaryResponse;
  invoices: InvoiceRecord[];
  discounts: DiscountRequestRecord[];
  payments: PaymentRecord[];
  refunds: RefundRecord[];
  payrollRuns: PayrollRunRecord[];
  batchCosts: FinancierReportsResponse["revenueByBatch"];
  collections: FinancierCollectionsResponse;
  reports: FinancierReportsResponse;
}

export function FinancierWorkspace() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [bundle, setBundle] = useState<WorkspaceBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Payment drawer state & focus restoration trigger ref
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStudentId, setDrawerStudentId] = useState<string | undefined>(undefined);
  const [drawerInvoiceId, setDrawerInvoiceId] = useState<string | undefined>(undefined);
  const drawerTriggerRef = useRef<HTMLElement | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [summary, invRes, payRes, payrollRes, collections, reports] =
        await Promise.all([
          financierApi.getSummary(),
          financierApi.listInvoices(),
          financierApi.listPayments(),
          financierApi.listPayroll(),
          financierApi.getCollections(),
          financierApi.getReports(),
        ]);

      setBundle({
        summary,
        invoices: invRes.invoices,
        discounts: invRes.discounts,
        payments: payRes.payments,
        refunds: payRes.refunds,
        payrollRuns: payrollRes.runs,
        batchCosts: payrollRes.batchCosts,
        collections,
        reports,
      });
      setFatalError(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof FinancierApiError && (err.status === 401 || err.status === 403)) {
        const fallbackTarget = getRedirectPathForSession(readCrmSession());
        navigate(err.redirectTo || fallbackTarget, { replace: true });
        return;
      }
      setFatalError(
        err instanceof Error ? err.message : "Failed to load Financier workspace data."
      );
      showToast({
        title: "Workspace refresh error",
        description: err instanceof Error ? err.message : "API request failed.",
        tone: "danger",
      });
    } finally {
      setLoading(false);
    }
  }, [navigate, showToast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const openPaymentDrawer = (opts?: {
    triggerEl?: HTMLElement | null;
    studentId?: string;
    invoiceId?: string;
  }) => {
    drawerTriggerRef.current = opts?.triggerEl ?? (document.activeElement as HTMLElement | null);
    setDrawerStudentId(opts?.studentId);
    setDrawerInvoiceId(opts?.invoiceId);
    setDrawerOpen(true);
  };

  const handleLogout = () => {
    clearCrmSession();
    navigate("/login");
  };

  const cleanSubPath = pathname.replace(/\/+$/, "").slice("/financier".length) || "/";

  const navItems: SidebarNavItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      to: "/financier",
      icon: <LayoutDashboard size={16} />,
      active: cleanSubPath === "/",
    },
    {
      id: "fees",
      label: "Fees & Invoices",
      to: "/financier/fees",
      icon: <FileText size={16} />,
      active:
        cleanSubPath === "/fees" ||
        cleanSubPath.startsWith("/invoices/") ||
        cleanSubPath.startsWith("/students/"),
    },
    {
      id: "payments",
      label: "Payments & Refunds",
      to: "/financier/payments",
      icon: <CreditCard size={16} />,
      active: cleanSubPath === "/payments",
    },
    {
      id: "ledger",
      label: "General Ledger",
      to: "/financier/ledger",
      icon: <BookOpenCheck size={16} />,
      active: cleanSubPath === "/ledger" || cleanSubPath.startsWith("/ledger/"),
    },
    {
      id: "payroll",
      label: "Trainer Payroll",
      to: "/financier/payroll",
      icon: <Users size={16} />,
      active: cleanSubPath === "/payroll" || cleanSubPath.startsWith("/payroll/"),
    },
    {
      id: "collections",
      label: "Collections & Ageing",
      to: "/financier/collections",
      icon: <ClockAlert size={16} />,
      active: cleanSubPath === "/collections",
      badge:
        bundle && bundle.summary.dashboard.overdueInvoiceCount > 0
          ? bundle.summary.dashboard.overdueInvoiceCount
          : undefined,
    },
    {
      id: "reports",
      label: "Financial Reports",
      to: "/financier/reports",
      icon: <BarChart3 size={16} />,
      active: cleanSubPath === "/reports",
    },
    {
      id: "audit",
      label: "Audit Log",
      to: "/financier/audit",
      icon: <ShieldCheck size={16} />,
      active: cleanSubPath === "/audit",
    },
  ];

  const actor = bundle?.summary.actor ?? {
    id: "usr-financier",
    name: "Finance Officer",
    email: "financier@apexacademy.edu",
    role: "FINANCIER" as const,
  };

  const renderRouteView = () => {
    if (loading && !bundle) {
      return (
        <div className="fin-stack-md" role="status">
          <h1>Financier Operations Portal</h1>
          <div className="fin-empty-state">Loading reconciled general ledger and fee records...</div>
        </div>
      );
    }

    if (fatalError && !bundle) {
      return (
        <div className="fin-stack-md">
          <h1>Financier Operations Portal</h1>
          <div className="fin-alert fin-alert--danger" role="alert">
            <span>{fatalError}</span>
          </div>
          <div>
            <button type="button" className="fin-btn fin-btn-primary" onClick={() => void loadAll()}>
              Retry Load
            </button>
          </div>
        </div>
      );
    }

    if (!bundle) return null;

    if (cleanSubPath === "/") {
      return (
        <DashboardView
          summary={bundle.summary}
          onOpenPaymentDrawer={(triggerEl) => openPaymentDrawer({ triggerEl })}
        />
      );
    }

    if (cleanSubPath === "/fees") {
      return (
        <FeesInvoicesView
          actor={bundle.summary.actor}
          students={bundle.summary.students}
          batches={bundle.summary.batches}
          invoices={bundle.invoices}
          discounts={bundle.discounts}
          onRefresh={loadAll}
        />
      );
    }

    if (cleanSubPath === "/payments") {
      return (
        <PaymentsView
          actor={bundle.summary.actor}
          payments={bundle.payments}
          refunds={bundle.refunds}
          onOpenPaymentDrawer={(triggerEl) => openPaymentDrawer({ triggerEl })}
          onRefresh={loadAll}
        />
      );
    }

    if (cleanSubPath === "/ledger") {
      return <LedgerView students={bundle.summary.students} onSummaryRefresh={loadAll} />;
    }

    if (cleanSubPath.startsWith("/ledger/")) {
      const accountParam = decodeURIComponent(cleanSubPath.slice("/ledger/".length));
      if (!(accountParam in LEDGER_ACCOUNT_META)) {
        return (
          <div className="fin-stack-md">
            <h1>Unknown Ledger Account</h1>
            <div className="fin-alert fin-alert--danger">
              <span>Account code "{accountParam}" does not exist in the chart of accounts.</span>
            </div>
            <Link to="/financier/ledger" className="fin-btn fin-btn-secondary">
              Back to General Ledger
            </Link>
          </div>
        );
      }
      return <LedgerAccountView accountCode={accountParam as LedgerAccountCode} />;
    }

    if (cleanSubPath === "/payroll") {
      return (
        <PayrollView
          runs={bundle.payrollRuns}
          batchCosts={bundle.batchCosts}
          onRefresh={loadAll}
        />
      );
    }

    if (cleanSubPath.startsWith("/payroll/")) {
      const runId = decodeURIComponent(cleanSubPath.slice("/payroll/".length));
      return (
        <PayrollRunDetailView
          runId={runId}
          actor={bundle.summary.actor}
          onSummaryRefresh={loadAll}
        />
      );
    }

    if (cleanSubPath === "/collections") {
      return <CollectionsView data={bundle.collections} onRefresh={loadAll} />;
    }

    if (cleanSubPath === "/reports") {
      return <ReportsView reports={bundle.reports} />;
    }

    if (cleanSubPath === "/audit") {
      return <AuditView />;
    }

    if (cleanSubPath.startsWith("/invoices/")) {
      const invoiceId = decodeURIComponent(cleanSubPath.slice("/invoices/".length));
      return (
        <InvoiceDetailView
          invoiceId={invoiceId}
          refreshKey={refreshKey}
          onOpenPaymentDrawer={(opts) => openPaymentDrawer(opts)}
          onSummaryRefresh={loadAll}
        />
      );
    }

    if (cleanSubPath.startsWith("/students/")) {
      const studentId = decodeURIComponent(cleanSubPath.slice("/students/".length));
      return (
        <StudentStatementView
          studentId={studentId}
          refreshKey={refreshKey}
          onOpenPaymentDrawer={(opts) => openPaymentDrawer(opts)}
          onSummaryRefresh={loadAll}
        />
      );
    }

    return (
      <div className="fin-stack-md">
        <h1>Section Not Found</h1>
        <p>The requested financier route "{cleanSubPath}" does not exist.</p>
        <div>
          <Link to="/financier" className="fin-btn fin-btn-primary">
            Return to Finance Overview
          </Link>
        </div>
      </div>
    );
  };

  return (
    <DashboardShell
      brandTitle="Apex & Aintrix — Financier Portal"
      brandSubtitle="Double-Entry General Ledger, Tuition Collections & Faculty Payroll"
      brandEmblem={<Coins size={20} />}
      userDisplayName={actor.name}
      userRoleLabel={actor.role}
      headerActions={
        <button type="button" className="fin-btn fin-btn-secondary fin-btn-sm" onClick={handleLogout}>
          <LogOut size={14} aria-hidden="true" />
          <span>Sign Out</span>
        </button>
      }
      sidebar={
        <Sidebar
          heading="Finance Workspace"
          items={navItems}
          ariaLabel="Financier portal navigation"
        />
      }
    >
      {renderRouteView()}

      {bundle && (
        <PaymentDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          returnFocusTo={drawerTriggerRef}
          students={bundle.summary.students}
          invoices={bundle.invoices}
          initialStudentId={drawerStudentId}
          initialInvoiceId={drawerInvoiceId}
          onPaymentRecorded={loadAll}
        />
      )}
    </DashboardShell>
  );
}
