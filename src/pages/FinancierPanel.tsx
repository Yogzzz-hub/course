import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PaletteMenu } from "../components/PaletteMenu";
import { ProfileMenu } from "../components/ProfileMenu";
import { LogoMark } from "../components/LogoMark";
import {
  clearCrmSession,
  getRedirectPathForSession,
  isFinancierAuthorized,
  readCrmSession,
} from "../utils/authSession";
import {
  Coins,
  CreditCard,
  TrendingUp,
  FileText,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Search,
  Download,
  Filter,
  Plus,
  X,
  ChevronRight,
  Building,
  User,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Wallet,
  Receipt,
  LogOut,
  PanelLeftClose,
} from "lucide-react";
import {
  initialAccounts,
  initialBankLedger,
  initialFinancierStudents,
  type LedgerLine,
  type FinancierAccount,
  type FinancierStudentDebt,
} from "../data/financierMock";

export type FinancierTab = "ledger" | "students" | "reconciliation" | "accounts";

function formatRupees(amountMinor: number): string {
  const isNegative = amountMinor < 0;
  const absMajor = Math.abs(amountMinor) / 100;
  const formatted = absMajor.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? "-" : ""}₹${formatted}`;
}

export default function FinancierPanel() {
  const navigate = useNavigate();

  useEffect(() => {
    const session = readCrmSession();
    if (session && !isFinancierAuthorized(session)) {
      const target = getRedirectPathForSession(session);
      navigate(target, { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    clearCrmSession();
    fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    navigate("/login");
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as FinancierTab) || "ledger";
  const selectedAccountCode = searchParams.get("account") || "BANK";
  const studentDetailId = searchParams.get("studentId");

  const [accounts, setAccounts] = useState<FinancierAccount[]>(initialAccounts);
  const [ledgerLines, setLedgerLines] = useState<LedgerLine[]>(initialBankLedger);
  const [students, setStudents] = useState<FinancierStudentDebt[]>(initialFinancierStudents);
  const [syncStatus, setSyncStatus] = useState<
    "syncing" | "live" | "offline_preview" | "auth_required" | "error"
  >("syncing");
  const [syncMessage, setSyncMessage] = useState<string>("");
  const [syncNonce, setSyncNonce] = useState(0);
  const [operatorName, setOperatorName] = useState<string>("Lead Financier");

  useEffect(() => {
    let cancelled = false;

    const fetchWithWakeup = async (url: string): Promise<Response> => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 50000);
        try {
          const res = await fetch(url, {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
            headers: { Accept: "application/json" },
          });
          window.clearTimeout(timer);
          if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt === 0) {
            await new Promise((r) => window.setTimeout(r, 1500));
            continue;
          }
          return res;
        } catch (err) {
          window.clearTimeout(timer);
          if (attempt === 0) {
            await new Promise((r) => window.setTimeout(r, 1500));
            continue;
          }
          throw err;
        }
      }
      throw new Error("CRM backend unreachable");
    };

    const loadLiveFinancier = async () => {
      setSyncStatus("syncing");
      setSyncMessage("");
      try {
        const summaryRes = await fetchWithWakeup("/api/financier/summary");
        if (cancelled) return;
        const ct = summaryRes.headers.get("content-type") || "";
        const isJson = ct.includes("application/json");

        if (summaryRes.status === 404 && !isJson) {
          setSyncStatus("offline_preview");
          return;
        }
        if (summaryRes.status === 401 || summaryRes.status === 403) {
          const session = readCrmSession();
          if (session && isFinancierAuthorized(session)) {
            setSyncStatus("offline_preview");
            return;
          }
          setSyncStatus("auth_required");
          setSyncMessage(
            "Sign in with a Financier or Admin account to load live CRM treasury data."
          );
          return;
        }
        if (!summaryRes.ok || !isJson) {
          setSyncStatus("offline_preview");
          return;
        }

        const summaryData = (await summaryRes.json()) as {
          metrics?: {
            grossCollections?: number;
            totalRefunds?: number;
            netCollections?: number;
            pendingPaymentsCount?: number;
            totalApprovedExpenses?: number;
            totalTrainerPayouts?: number;
            netPosition?: number;
            discrepancyCount?: number;
          };
        };

        const [paymentsRes, installmentsRes] = await Promise.all([
          fetchWithWakeup("/api/financier/payments").catch(() => null),
          fetchWithWakeup("/api/financier/installments").catch(() => null),
        ]);
        if (cancelled) return;

        const m = summaryData.metrics || {};
        const inflowMinor = Math.round(Number(m.grossCollections || 0) * 100);
        const outflowMinor = Math.round(
          (Number(m.totalRefunds || 0) +
            Number(m.totalApprovedExpenses || 0) +
            Number(m.totalTrainerPayouts || 0)) *
            100
        );
        const netMinor = inflowMinor - outflowMinor;
        const pendingCount =
          Number(m.pendingPaymentsCount || 0) + Number(m.discrepancyCount || 0);

        setAccounts((prev) =>
          prev.map((acc) =>
            acc.code === "BANK"
              ? {
                  ...acc,
                  totalInflowMinor: inflowMinor,
                  totalOutflowMinor: outflowMinor,
                  netBalanceMinor: netMinor,
                  pendingReconciliationCount: pendingCount,
                  lastReconciledAt: new Date().toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                }
              : acc
          )
        );

        if (paymentsRes && paymentsRes.ok) {
          const pData = (await paymentsRes.json()) as {
            payments?: Array<{
              id: string;
              transactionNumber: string;
              amount: number;
              paymentMethod: string;
              paymentDate: string;
              externalReference?: string | null;
              verificationStatus: string;
              studentProfile?: { user?: { name?: string } };
              feeAgreement?: { admission?: { course?: { title?: string } } };
            }>;
          };
          const livePayments = Array.isArray(pData.payments) ? pData.payments : [];
          let runningMinor = 0;
          setLedgerLines(
            livePayments.map((p) => {
              const creditMinor = Math.round(Number(p.amount || 0) * 100);
              runningMinor += creditMinor;
              const status: LedgerLine["status"] =
                p.verificationStatus === "CONFIRMED"
                  ? "Verified"
                  : p.verificationStatus === "REVERSED" || p.verificationStatus === "FAILED"
                    ? "Pending Reconciliation"
                    : "Pending Reconciliation";
              return {
                id: p.id,
                date: new Date(p.paymentDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }),
                transactionNumber: p.transactionNumber,
                description:
                  p.feeAgreement?.admission?.course?.title
                    ? `Tuition collection — ${p.feeAgreement.admission.course.title}`
                    : "Student fee collection",
                category: "Tuition Collection",
                debitMinor: 0,
                creditMinor,
                balanceMinor: runningMinor,
                studentName: p.studentProfile?.user?.name || "Student",
                paymentMethod: p.paymentMethod,
                reference: p.externalReference || undefined,
                status,
              };
            })
          );
        }

        if (installmentsRes && installmentsRes.ok) {
          const iData = (await installmentsRes.json()) as {
            installments?: Array<{
              id: string;
              studentProfileId: string;
              installmentNumber?: number;
              dueDate: string;
              amountDue: number;
              amountPaid: number;
              remainingBalance: number;
              status: string;
              studentProfile?: {
                registrationNumber?: string;
                user?: { name?: string; email?: string; phone?: string | null };
              };
              feeAgreement?: {
                totalAgreedFee?: number;
                admission?: {
                  course?: { title?: string };
                  targetBatch?: { code?: string };
                };
              };
            }>;
          };
          const rows = Array.isArray(iData.installments) ? iData.installments : [];
          const byStudent = new Map<string, FinancierStudentDebt>();
          const now = new Date();
          for (const inst of rows) {
            const key = inst.studentProfileId || inst.id;
            const existing = byStudent.get(key);
            const amountDueMinor = Math.round(Number(inst.amountDue || 0) * 100);
            const paidMinor = Math.round(Number(inst.amountPaid || 0) * 100);
            const balanceMinor = Math.round(Number(inst.remainingBalance || 0) * 100);
            const totalMinor = Math.round(
              Number(inst.feeAgreement?.totalAgreedFee || inst.amountDue || 0) * 100
            );
            const overdue = balanceMinor > 0 && new Date(inst.dueDate) < now;
            const instStatus: "PAID" | "DUE" | "OVERDUE" =
              balanceMinor <= 0 ? "PAID" : overdue ? "OVERDUE" : "DUE";
            const instItem = {
              number: inst.installmentNumber || (existing?.installments.length || 0) + 1,
              amountMinor: amountDueMinor,
              dueDate: new Date(inst.dueDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }),
              status: instStatus,
            };
            if (!existing) {
              byStudent.set(key, {
                id: key,
                name: inst.studentProfile?.user?.name || "Enrolled Student",
                registrationNumber:
                  inst.studentProfile?.registrationNumber || key.slice(0, 8),
                email: inst.studentProfile?.user?.email || "",
                phone: inst.studentProfile?.user?.phone || "",
                courseTitle:
                  inst.feeAgreement?.admission?.course?.title || "Academy Cohort",
                batchCode:
                  inst.feeAgreement?.admission?.targetBatch?.code || "ACTIVE",
                contractedFeeMinor: totalMinor,
                paidAmountMinor: paidMinor,
                remainingDueMinor: balanceMinor,
                overdueMinor: overdue ? balanceMinor : 0,
                nextDueDate: instItem.dueDate,
                status:
                  balanceMinor <= 0 ? "PAID_IN_FULL" : overdue ? "OVERDUE" : "CURRENT",
                installments: [instItem],
              });
            } else {
              existing.paidAmountMinor += paidMinor;
              existing.remainingDueMinor += balanceMinor;
              if (overdue) existing.overdueMinor += balanceMinor;
              existing.installments.push(instItem);
              existing.status =
                existing.remainingDueMinor <= 0
                  ? "PAID_IN_FULL"
                  : existing.overdueMinor > 0
                    ? "OVERDUE"
                    : "CURRENT";
            }
          }
          if (byStudent.size > 0) {
            setStudents(Array.from(byStudent.values()));
          } else {
            setStudents([]);
          }
        }

        const sessionInfo = readCrmSession();
        if (sessionInfo?.name) setOperatorName(sessionInfo.name);
        setSyncStatus("live");
      } catch {
        if (cancelled) return;
        setSyncStatus("error");
        setSyncMessage(
          "Could not connect to Academy CRM finance service. Click Retry Connection once the server is awake."
        );
      }
    };

    void loadLiveFinancier();
    return () => {
      cancelled = true;
    };
  }, [syncNonce]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // New Transaction Entry Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarLogoutOpen, setSidebarLogoutOpen] = useState(false);
  const [modalType, setModalType] = useState<"tuition" | "expense" | "refund">("tuition");
  const [modalStudent, setModalStudent] = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [modalMethod, setModalMethod] = useState("UPI / Razorpay");
  const [modalDescription, setModalDescription] = useState("");

  const currentAccount =
    accounts.find((a) => a.code === selectedAccountCode) || accounts[0];

  const setTab = (tab: FinancierTab, accountCode = "BANK") => {
    setSearchParams({ tab, account: accountCode });
  };

  const openStudent = (id: string) => {
    setSearchParams({ tab: "students", studentId: id });
  };

  const closeStudent = () => {
    setSearchParams({ tab: "students" });
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAmount || Number(modalAmount) <= 0) return;

    const amountMinor = Math.round(parseFloat(modalAmount) * 100);
    const isCredit = modalType === "tuition";
    const debit = isCredit ? 0 : amountMinor;
    const credit = isCredit ? amountMinor : 0;
    const newNet = currentAccount.netBalanceMinor + credit - debit;

    const newLine: LedgerLine = {
      id: `led-${Date.now()}`,
      date: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      transactionNumber: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
      description: modalDescription || (isCredit ? `Tuition collection (${modalStudent || "Student"})` : "Operating expense disbursement"),
      category: isCredit ? "Tuition Collection" : modalType === "refund" ? "Refund Disbursement" : "Operating Expense",
      debitMinor: debit,
      creditMinor: credit,
      balanceMinor: newNet,
      studentName: modalStudent || undefined,
      paymentMethod: modalMethod,
      status: "Verified",
    };

    setLedgerLines([newLine, ...ledgerLines]);
    setAccounts(
      accounts.map((acc) =>
        acc.id === currentAccount.id
          ? {
              ...acc,
              netBalanceMinor: newNet,
              totalInflowMinor: acc.totalInflowMinor + credit,
              totalOutflowMinor: acc.totalOutflowMinor + debit,
            }
          : acc
      )
    );

    setIsModalOpen(false);
    setModalAmount("");
    setModalStudent("");
    setModalDescription("");
  };

  // Filtered Ledger
  const filteredLedger = ledgerLines.filter((line) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      line.description.toLowerCase().includes(q) ||
      line.transactionNumber.toLowerCase().includes(q) ||
      (line.studentName && line.studentName.toLowerCase().includes(q)) ||
      (line.reference && line.reference.toLowerCase().includes(q));

    const matchesCategory =
      selectedCategory === "ALL" || line.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const selectedStudent = students.find((s) => s.id === studentDetailId);

  const overdueStudentsCount = students.filter((s) => s.overdueMinor > 0).length;

  return (
    <div className="manager-workspace fin-portal min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans">
      {/* Desktop-only Fixed Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden h-dvh md:flex flex-col justify-between overflow-y-auto overflow-x-hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] select-none transition-[width] duration-200 ${
          sidebarCollapsed ? "w-20" : "w-60"
        }`}
        aria-label="Financier sidebar navigation"
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Sidebar Brand Header */}
          <div
            className={`h-16 border-b border-[var(--sidebar-border)] flex items-center gap-2 shrink-0 ${
              sidebarCollapsed ? "justify-center px-2" : "justify-between px-4"
            }`}
          >
            <a href="/" className="flex items-center gap-2.5 min-w-0 hover:opacity-90 transition">
              <LogoMark size={28} surface="dark" className="shrink-0" />
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-[15px] font-bold truncate leading-tight text-white">
                    Aintrix
                  </div>
                  <div className="text-[9px] font-medium tracking-[0.2em] uppercase leading-tight mt-0.5 text-[var(--accent-soft)]">
                    Academy · Financier
                  </div>
                </div>
              )}
            </a>
            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--sidebar-text)]/70 hover:bg-[var(--sidebar-hover)] hover:text-white transition cursor-pointer"
              >
                <PanelLeftClose size={16} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Sidebar Nav Items + Live Operating Accounts Quick-Jump */}
          <nav className="flex-1 flex flex-col justify-between gap-2 p-3 overflow-y-auto overflow-x-hidden" aria-label="Financier sections">
            <div className="flex-1 flex flex-col justify-between gap-1.5">
              <button
                type="button"
                title={sidebarCollapsed ? "Operating Ledger" : undefined}
                onClick={() => setTab("ledger", "BANK")}
                aria-current={activeTab === "ledger" ? "page" : undefined}
                className={`group flex flex-1 min-h-[44px] max-h-[64px] w-full items-center rounded-xl py-2 text-left text-xs transition ${
                  sidebarCollapsed ? "justify-center px-2" : "justify-between px-3"
                } ${
                  activeTab === "ledger"
                    ? "bg-[var(--btn-primary-bg)] text-white font-bold shadow-sm"
                    : "text-[var(--sidebar-text)]/80 hover:bg-[var(--sidebar-hover)] hover:text-white font-semibold"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Receipt
                    size={17}
                    className={`shrink-0 ${
                      activeTab === "ledger"
                        ? "text-[var(--accent-soft)]"
                        : "text-[var(--sidebar-text)]/70 group-hover:text-white"
                    }`}
                  />
                  <span className={sidebarCollapsed ? "sr-only" : "truncate"}>Operating Ledger</span>
                </div>
              </button>

              <button
                type="button"
                title={sidebarCollapsed ? "Student Balances" : undefined}
                onClick={() => setTab("students")}
                aria-current={activeTab === "students" ? "page" : undefined}
                className={`relative group flex flex-1 min-h-[44px] max-h-[64px] w-full items-center rounded-xl py-2 text-left text-xs transition ${
                  sidebarCollapsed ? "justify-center px-2" : "justify-between px-3"
                } ${
                  activeTab === "students"
                    ? "bg-[var(--btn-primary-bg)] text-white font-bold shadow-sm"
                    : "text-[var(--sidebar-text)]/80 hover:bg-[var(--sidebar-hover)] hover:text-white font-semibold"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <User
                    size={17}
                    className={`shrink-0 ${
                      activeTab === "students"
                        ? "text-[var(--accent-soft)]"
                        : "text-[var(--sidebar-text)]/70 group-hover:text-white"
                    }`}
                  />
                  <span className={sidebarCollapsed ? "sr-only" : "truncate"}>Student Balances</span>
                </div>
                {!sidebarCollapsed && overdueStudentsCount > 0 && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-1.5 ${
                      activeTab === "students"
                        ? "sidebar-badge bg-white text-[var(--accent)]"
                        : "bg-[var(--btn-primary-bg)] text-white border border-[var(--accent-soft)]/25"
                    }`}
                  >
                    {overdueStudentsCount}
                  </span>
                )}
                {sidebarCollapsed && overdueStudentsCount > 0 && (
                  <span
                    className="absolute right-2.5 top-2 size-2 rounded-full bg-[var(--accent-soft)]"
                    aria-hidden="true"
                  />
                )}
              </button>

              <button
                type="button"
                title={sidebarCollapsed ? "Treasury Accounts" : undefined}
                onClick={() => setTab("accounts")}
                aria-current={activeTab === "accounts" ? "page" : undefined}
                className={`group flex flex-1 min-h-[44px] max-h-[64px] w-full items-center rounded-xl py-2 text-left text-xs transition ${
                  sidebarCollapsed ? "justify-center px-2" : "justify-between px-3"
                } ${
                  activeTab === "accounts"
                    ? "bg-[var(--btn-primary-bg)] text-white font-bold shadow-sm"
                    : "text-[var(--sidebar-text)]/80 hover:bg-[var(--sidebar-hover)] hover:text-white font-semibold"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Building
                    size={17}
                    className={`shrink-0 ${
                      activeTab === "accounts"
                        ? "text-[var(--accent-soft)]"
                        : "text-[var(--sidebar-text)]/70 group-hover:text-white"
                    }`}
                  />
                  <span className={sidebarCollapsed ? "sr-only" : "truncate"}>Treasury Accounts</span>
                </div>
              </button>
            </div>

            {!sidebarCollapsed && accounts.length > 0 && (
              <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-surface)] p-2.5 space-y-1.5 shrink-0">
                <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-soft)]">
                  Accounts Snapshot
                </div>
                {accounts.map((acc) => {
                  const isAccActive = activeTab === "ledger" && selectedAccountCode === acc.code;
                  return (
                    <button
                      key={acc.code}
                      type="button"
                      onClick={() => setTab("ledger", acc.code)}
                      className={`w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] transition cursor-pointer ${
                        isAccActive
                          ? "bg-[var(--btn-primary-bg)] text-white font-semibold"
                          : "text-[var(--sidebar-text)]/80 hover:bg-[var(--sidebar-hover)] hover:text-white"
                      }`}
                    >
                      <span className="truncate">{acc.name}</span>
                      <span className="font-mono font-semibold shrink-0 text-[10px] text-[var(--accent-soft)]">
                        {formatRupees(acc.netBalanceMinor)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </nav>
        </div>

        {/* Sidebar Profile, Logout & Collapse Footer */}
        <div className="border-t border-[var(--sidebar-border)] bg-[var(--sidebar-surface)] p-3 space-y-2 shrink-0">
          <button
            type="button"
            title={sidebarCollapsed ? "Lead Financier" : undefined}
            onClick={() => setSidebarLogoutOpen((v) => !v)}
            aria-expanded={sidebarLogoutOpen}
            className={`w-full p-2 rounded-xl flex items-center gap-2.5 text-left cursor-pointer hover:bg-[var(--sidebar-hover)] transition ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 bg-[var(--btn-primary-bg)] text-white border border-[var(--accent-soft)]/30">
              LF
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold truncate leading-tight text-white">
                  Lead Financier
                </div>
                <div className="text-[10px] truncate leading-tight text-[var(--accent-soft)]">
                  Finance Operations
                </div>
              </div>
            )}
          </button>

          {sidebarLogoutOpen && (
            <button
              type="button"
              title={sidebarCollapsed ? "Log out" : undefined}
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors bg-[var(--btn-primary-bg)] text-white hover:bg-[var(--btn-primary-hover)] cursor-pointer min-h-[44px]"
            >
              <LogOut size={16} />
              {!sidebarCollapsed && <span>Log out</span>}
            </button>
          )}

          <button
            type="button"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-[var(--sidebar-text)]/80 hover:bg-[var(--sidebar-hover)] hover:text-white cursor-pointer min-h-[40px]"
          >
            {sidebarCollapsed ? (
              <ChevronRight size={17} aria-hidden="true" />
            ) : (
              <>
                <PanelLeftClose size={17} aria-hidden="true" />
                <span>Collapse sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-200 ${sidebarCollapsed ? "md:pl-20" : "md:pl-60"}`}>
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 h-16 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <a href="/" className="flex md:hidden items-center shrink-0" aria-label="Aintrix Academy Home">
              <LogoMark size={28} surface="light" />
            </a>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold text-[var(--text)] leading-tight truncate">
                Aintrix Academy — Financier Portal
              </div>
              <div className="text-[11px] text-[var(--muted)] hidden sm:block truncate">
                Treasury, Account Ledgers & Student Dues
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {syncStatus === "live" && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                Live CRM
              </span>
            )}
            {syncStatus === "syncing" && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                Syncing...
              </span>
            )}
            <PaletteMenu />
            <ProfileMenu
              initials="LF"
              name={operatorName || "Lead Financier"}
              subtitle="Finance Operations"
              onLogout={handleLogout}
            />
          </div>
        </header>

        {/* Main Workspace Body */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-28 md:pb-12">
          {(syncStatus === "error" || syncStatus === "auth_required") && (
            <div
              role="alert"
              className={`mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs ${
                syncStatus === "auth_required"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-rose-200 bg-rose-50 text-rose-900"
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle size={16} className="shrink-0" />
                <span>{syncMessage}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {syncStatus === "auth_required" ? (
                  <Link
                    to="/login?returnUrl=/financier"
                    className="inline-flex items-center justify-center rounded-xl bg-[#6D1A2B] px-3 py-2 font-semibold text-white hover:bg-[#521320]"
                  >
                    Sign In to CRM
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSyncNonce((n) => n + 1)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 px-3 py-2 font-semibold text-white hover:bg-rose-800"
                  >
                    <RotateCcw size={13} /> Retry Connection
                  </button>
                )}
              </div>
            </div>
          )}
        {/* SUBVIEW 1: OPERATING BANK ACCOUNT LEDGER */}
        {activeTab === "ledger" && (
          <div className="space-y-6">
            {/* Header / Account Switcher Card */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  Treasury Ledger Register
                </span>
                <h1 className="text-lg sm:text-xl font-bold text-[var(--text)] mt-0.5">
                  {currentAccount.name}
                </h1>
                <p className="text-xs sm:text-sm text-[var(--muted)] mt-1">
                  Account: <span className="font-mono font-semibold">{currentAccount.accountNumber}</span> · {currentAccount.bankName}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setModalType("tuition");
                    setIsModalOpen(true);
                  }}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--btn-primary-bg)] text-white text-xs font-semibold shadow-xs hover:bg-[var(--btn-primary-hover)] transition active:scale-95"
                >
                  <Plus size={16} /> Record Transaction
                </button>
                <button
                  type="button"
                  onClick={() => alert("Exporting verified ledger entries as CSV...")}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs font-semibold hover:bg-[var(--accent-tint)] transition active:scale-95 shadow-2xs"
                >
                  <Download size={15} /> Export CSV
                </button>
              </div>
            </div>

            {/* Net Account Balance Card (Full-width on mobile & stacks nicely) */}
            <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block">
                    Net Account Balance
                  </span>
                  <div
                    className={`text-2xl sm:text-4xl font-extrabold mt-1 tracking-tight ${
                      currentAccount.netBalanceMinor < 0
                        ? "text-rose-600"
                        : "text-emerald-700"
                    }`}
                  >
                    {formatRupees(currentAccount.netBalanceMinor)}
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    {currentAccount.netBalanceMinor < 0
                      ? "Operating deficit (Pending tuition settlement or scheduled debits)"
                      : "Positive operating liquidity"}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--accent-tint)] text-[var(--accent)] border border-[var(--accent-border)]">
                    <ShieldCheck size={14} className="text-[var(--accent)]" />
                    Last Reconciled: {currentAccount.lastReconciledAt}
                  </span>
                </div>
              </div>

              {/* Sub-Metrics Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
                <div className="p-3 bg-[var(--surface-alt)] rounded-xl border border-[var(--border)]">
                  <span className="text-[var(--muted)] block uppercase text-[10px] font-semibold">Total Verified Inflows</span>
                  <span className="text-base font-bold text-emerald-700 mt-0.5 block">
                    {formatRupees(currentAccount.totalInflowMinor)}
                  </span>
                </div>
                <div className="p-3 bg-[var(--surface-alt)] rounded-xl border border-[var(--border)]">
                  <span className="text-[var(--muted)] block uppercase text-[10px] font-semibold">Total Verified Outflows</span>
                  <span className="text-base font-bold text-rose-600 mt-0.5 block">
                    {formatRupees(currentAccount.totalOutflowMinor)}
                  </span>
                </div>
                <div className="p-3 bg-[var(--surface-alt)] rounded-xl border border-[var(--border)]">
                  <span className="text-[var(--muted)] block uppercase text-[10px] font-semibold">Pending Match Variance</span>
                  <span className="text-base font-bold text-amber-700 mt-0.5 block">
                    {currentAccount.pendingReconciliationCount} Unreconciled
                  </span>
                </div>
              </div>
            </div>

            {/* Search and Category Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder="Search operating bank account ledger lines, descriptions, or students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none min-h-[44px] shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text)] font-medium min-h-[44px] shadow-2xs focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Tuition Collection">Tuition Collection</option>
                  <option value="Trainer Payout">Trainer Payout</option>
                  <option value="Operating Expense">Operating Expense</option>
                  <option value="Refund Disbursement">Refund Disbursement</option>
                  <option value="Bank Charge">Bank Charge</option>
                </select>
              </div>
            </div>

            {/* Responsive Ledger Presentation: Mobile Stacked Cards (< 768px) & Desktop Table (>= 768px) */}
            <div className="w-full">
              {/* MOBILE CARDS (target width 360px up to 767px) */}
              <div className="block md:hidden space-y-3">
                {filteredLedger.length === 0 ? (
                  <div className="p-8 text-center bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                    <AlertCircle size={28} className="mx-auto text-[var(--muted)] mb-2" />
                    <p className="text-sm font-semibold text-[var(--text)]">No matching ledger entries</p>
                    <p className="text-xs text-[var(--muted)] mt-1">Try clearing your search query or filter.</p>
                  </div>
                ) : (
                  filteredLedger.map((line) => (
                    <div
                      key={line.id}
                      className="w-full bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-[var(--accent)]">
                            {line.transactionNumber}
                          </span>
                          <span className="text-[11px] text-[var(--muted)] block mt-0.5">
                            {line.date}
                          </span>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                          {line.status}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-medium text-[var(--text)] leading-snug">
                        {line.description}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-[var(--surface-alt)] p-3 rounded-xl border border-[var(--border)]">
                        <div>
                          <span className="text-[10px] text-[var(--muted)] uppercase font-semibold block">
                            Flow / Amount
                          </span>
                          {line.creditMinor > 0 ? (
                            <span className="font-bold text-emerald-700 text-sm">
                              +{formatRupees(line.creditMinor)}
                            </span>
                          ) : (
                            <span className="font-bold text-rose-600 text-sm">
                              -{formatRupees(line.debitMinor)}
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="text-[10px] text-[var(--muted)] uppercase font-semibold block">
                            Rolling Net Balance
                          </span>
                          <span
                            className={`font-extrabold text-sm ${
                              line.balanceMinor < 0 ? "text-rose-600" : "text-[var(--text)]"
                            }`}
                          >
                            {formatRupees(line.balanceMinor)}
                          </span>
                        </div>

                        <div className="col-span-2 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--muted)]">
                          <span>{line.category}</span>
                          <span className="font-mono text-[10px] bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--border)]">
                            {line.paymentMethod || "Direct Transfer"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* DESKTOP TABLE (Hidden on mobile < md) */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--accent-tint)] text-[var(--text)] font-semibold">
                      <th className="py-3.5 px-4 font-mono">Date</th>
                      <th className="py-3.5 px-4">Txn #</th>
                      <th className="py-3.5 px-4">Transaction / Description</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4 text-right">Debit (Out)</th>
                      <th className="py-3.5 px-4 text-right">Credit (In)</th>
                      <th className="py-3.5 px-4 text-right">Net Balance</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredLedger.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[var(--muted)]">
                          No matching ledger entries found.
                        </td>
                      </tr>
                    ) : (
                      filteredLedger.map((line) => (
                        <tr key={line.id} className="hover:bg-[var(--surface-alt)] transition-colors">
                          <td className="py-3.5 px-4 text-[var(--muted)] font-medium whitespace-nowrap">
                            {line.date}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-[var(--accent)] whitespace-nowrap">
                            {line.transactionNumber}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-[var(--text)]">
                            <div>{line.description}</div>
                            {line.studentName && (
                              <div className="text-[11px] text-[var(--muted)] mt-0.5">
                                Student: <strong className="text-[var(--text)]">{line.studentName}</strong> ({line.paymentMethod})
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-[var(--muted)] whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full bg-[var(--accent-tint)] text-[var(--text)] text-[11px]">
                              {line.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                            {line.debitMinor > 0 ? formatRupees(line.debitMinor) : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            {line.creditMinor > 0 ? `+${formatRupees(line.creditMinor)}` : "—"}
                          </td>
                          <td
                            className={`py-3.5 px-4 text-right font-mono font-extrabold whitespace-nowrap ${
                              line.balanceMinor < 0 ? "text-rose-600" : "text-[var(--text)]"
                            }`}
                          >
                            {formatRupees(line.balanceMinor)}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {line.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUBVIEW 2: STUDENTS DEBT & INSTALLMENTS ROSTER */}
        {activeTab === "students" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  Student Billing Register
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] mt-0.5">
                  Fee Agreements & Dues Roster
                </h1>
              </div>

              {selectedStudent && (
                <button
                  type="button"
                  onClick={closeStudent}
                  className="flex min-h-[44px] items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold text-[var(--text)] hover:bg-[var(--accent-tint)] transition"
                >
                  <X size={15} /> Close Student Profile
                </button>
              )}
            </div>

            {/* Selected Student Detail View / Drawer */}
            {selectedStudent && (
              <div className="w-full bg-[var(--surface)] rounded-2xl border-2 border-[var(--accent-border)] p-5 sm:p-6 shadow-md space-y-5 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[var(--border)]">
                  <div>
                    <span className="font-mono text-xs font-bold text-[var(--accent)]">
                      {selectedStudent.registrationNumber}
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-[var(--text)] mt-0.5">
                      {selectedStudent.name}
                    </h2>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      {selectedStudent.courseTitle} · Cohort: <strong className="text-[var(--text)]">{selectedStudent.batchCode}</strong>
                    </p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {selectedStudent.email} · {selectedStudent.phone}
                    </p>
                  </div>

                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider self-start ${
                      selectedStudent.status === "PAID_IN_FULL"
                        ? "bg-[#E8F6ED] text-[#10754A] border border-[#BBE5CB]"
                        : selectedStudent.status === "OVERDUE"
                        ? "bg-[#FDE8E8] text-[#A72828] border border-[#F8C0C0]"
                        : "bg-[#FEF6E7] text-[#9E6000] border border-[#F7E1B5]"
                    }`}
                  >
                    {selectedStudent.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-[var(--surface-alt)] rounded-xl border border-[var(--border)]">
                    <span className="text-[var(--muted)] uppercase text-[10px] font-semibold block">Total Contracted</span>
                    <span className="text-base font-bold text-[var(--text)] mt-0.5 block">
                      {formatRupees(selectedStudent.contractedFeeMinor)}
                    </span>
                  </div>
                  <div className="p-3 bg-[var(--surface-alt)] rounded-xl border border-[var(--border)]">
                    <span className="text-[var(--muted)] uppercase text-[10px] font-semibold block">Total Paid to Date</span>
                    <span className="text-base font-bold text-[#10754A] mt-0.5 block">
                      {formatRupees(selectedStudent.paidAmountMinor)}
                    </span>
                  </div>
                  <div className="p-3 bg-[var(--surface-alt)] rounded-xl border border-[var(--border)]">
                    <span className="text-[var(--muted)] uppercase text-[10px] font-semibold block">Remaining Balance</span>
                    <span className="text-base font-bold text-[var(--text)] mt-0.5 block">
                      {formatRupees(selectedStudent.remainingDueMinor)}
                    </span>
                  </div>
                  <div className="p-3 bg-[var(--surface-alt)] rounded-xl border border-[var(--border)]">
                    <span className="text-[var(--muted)] uppercase text-[10px] font-semibold block">Overdue Balance</span>
                    <span className="text-base font-bold text-[#A72828] mt-0.5 block">
                      {formatRupees(selectedStudent.overdueMinor)}
                    </span>
                  </div>
                </div>

                {/* Installments Table */}
                <div>
                  <h3 className="text-sm font-bold text-[var(--text)] mb-2">Agreed Installment Breakdown</h3>
                  <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[var(--accent-tint)] border-b border-[var(--border)] font-semibold text-[var(--text)]">
                        <tr>
                          <th className="py-2.5 px-3">Installment #</th>
                          <th className="py-2.5 px-3">Due Date</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {selectedStudent.installments.map((inst) => (
                          <tr key={inst.number} className="hover:bg-[var(--surface-alt)]">
                            <td className="py-2.5 px-3 font-semibold text-[var(--text)]">Term {inst.number}</td>
                            <td className="py-2.5 px-3 text-[var(--muted)]">{inst.dueDate}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-[var(--text)]">
                              {formatRupees(inst.amountMinor)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  inst.status === "PAID"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : inst.status === "OVERDUE"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {inst.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Students List: Mobile Cards (< 768px) and Desktop Table (>= 768px) */}
            <div className="w-full">
              {/* MOBILE CARDS */}
              <div className="block md:hidden space-y-3">
                {students.map((st) => (
                  <div
                    key={st.id}
                    className="w-full bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-[var(--accent)]">
                          {st.registrationNumber}
                        </span>
                        <h4 className="font-bold text-sm text-[var(--text)] mt-0.5">{st.name}</h4>
                        <p className="text-xs text-[var(--muted)] mt-0.5">{st.courseTitle}</p>
                      </div>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          st.status === "PAID_IN_FULL"
                            ? "bg-emerald-100 text-emerald-800"
                            : st.status === "OVERDUE"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {st.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-[var(--surface-alt)] p-2.5 rounded-xl border border-[var(--border)]">
                      <div>
                        <span className="text-[10px] text-[var(--muted)] uppercase font-semibold block">Total Fee</span>
                        <span className="font-bold text-[var(--text)]">{formatRupees(st.contractedFeeMinor)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--muted)] uppercase font-semibold block">Remaining Due</span>
                        <span className={`font-bold ${st.remainingDueMinor > 0 ? "text-amber-800" : "text-emerald-700"}`}>
                          {formatRupees(st.remainingDueMinor)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openStudent(st.id)}
                      className="w-full min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl border border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] text-xs font-semibold hover:bg-[var(--accent-tint)] transition active:scale-95"
                    >
                      View Student Ledger & Installments
                    </button>
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--accent-tint)] font-semibold text-[var(--text)]">
                      <th className="py-3 px-4">Registration #</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Program & Cohort</th>
                      <th className="py-3 px-4 text-right">Contracted Fee</th>
                      <th className="py-3 px-4 text-right">Total Paid</th>
                      <th className="py-3 px-4 text-right">Remaining Due</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {students.map((st) => (
                      <tr key={st.id} className="hover:bg-[var(--surface-alt)] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[var(--accent)]">{st.registrationNumber}</td>
                        <td className="py-3 px-4 font-semibold text-[var(--text)]">{st.name}</td>
                        <td className="py-3 px-4 text-[var(--muted)]">{st.courseTitle} ({st.batchCode})</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[var(--text)]">
                          {formatRupees(st.contractedFeeMinor)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {formatRupees(st.paidAmountMinor)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-800">
                          {formatRupees(st.remainingDueMinor)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              st.status === "PAID_IN_FULL"
                                ? "bg-emerald-100 text-emerald-800"
                                : st.status === "OVERDUE"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {st.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => openStudent(st.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
                          >
                            Details →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUBVIEW 3: TREASURY ACCOUNTS OVERVIEW */}
        {activeTab === "accounts" && (
          <div className="space-y-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                Treasury & Liquidity Management
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] mt-0.5">
                Bank & Escrow Accounts
              </h1>
              <p className="text-xs sm:text-sm text-[var(--muted)] mt-1">
                Centralized balance reconciliation across Corporate Banking, Razorpay Escrow, and Campus Cash.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`w-full rounded-2xl border p-5 shadow-sm space-y-4 bg-[var(--surface)] transition hover:shadow-md ${
                    acc.code === selectedAccountCode ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/15" : "border-[var(--border)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                        {acc.type}
                      </span>
                      <h3 className="text-base font-bold text-[var(--text)] mt-0.5">{acc.name}</h3>
                      <p className="text-xs text-[var(--muted)] font-mono">{acc.accountNumber}</p>
                    </div>
                    <div className="p-2 bg-[var(--accent-tint)] rounded-xl text-[var(--accent)]">
                      <Building size={18} />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-[var(--muted)] uppercase font-semibold block">Net Balance</span>
                    <div
                      className={`text-2xl font-extrabold mt-0.5 ${
                        acc.netBalanceMinor < 0 ? "text-rose-600" : "text-emerald-700"
                      }`}
                    >
                      {formatRupees(acc.netBalanceMinor)}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
                    <span className="text-[var(--muted)]">
                      {acc.pendingReconciliationCount > 0 ? (
                        <span className="text-amber-700 font-semibold">
                          ⚠ {acc.pendingReconciliationCount} pending match
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold">✓ 100% Reconciled</span>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() => setTab("ledger", acc.code)}
                      className="inline-flex min-h-[44px] items-center gap-1 text-xs font-bold text-[var(--accent)] hover:underline"
                    >
                      View Ledger →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Responsive Transaction Modal: Bottom-sheet on mobile & Centered dialog on desktop */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--surface)] rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border border-[var(--border)]">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <h2 className="text-base font-bold text-[var(--text)] flex items-center gap-2">
                <Plus size={18} className="text-[var(--accent)]" />
                Record Ledger Transaction
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex size-9 items-center justify-center rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--accent-tint)] min-h-[44px] min-w-[44px]"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                  Transaction Classification *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalType("tuition")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border min-h-[44px] transition ${
                      modalType === "tuition"
                        ? "border-[var(--accent)] bg-[var(--accent-tint)] text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-alt)]"
                    }`}
                  >
                    Tuition Inflow
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalType("expense")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border min-h-[44px] transition ${
                      modalType === "expense"
                        ? "border-[var(--accent)] bg-[var(--accent-tint)] text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-alt)]"
                    }`}
                  >
                    Operating Out
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalType("refund")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border min-h-[44px] transition ${
                      modalType === "refund"
                        ? "border-[var(--accent)] bg-[var(--accent-tint)] text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-alt)]"
                    }`}
                  >
                    Refund
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Amount in Rupees (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="e.g. 45000"
                  value={modalAmount}
                  onChange={(e) => setModalAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)] min-h-[44px]"
                  required
                />
              </div>

              {modalType === "tuition" && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Student Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Karthik Subramanian"
                    value={modalStudent}
                    onChange={(e) => setModalStudent(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)] min-h-[44px]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Payment / Transfer Method
                </label>
                <select
                  value={modalMethod}
                  onChange={(e) => setModalMethod(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] text-base sm:text-xs text-[var(--text)] bg-[var(--surface)] min-h-[44px] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="UPI / Razorpay">UPI / Razorpay</option>
                  <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
                  <option value="Credit Card (EMI)">Credit Card (EMI)</option>
                  <option value="Campus Cash">Campus Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Transaction Notes / Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Description or reference number..."
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)] text-xs font-semibold hover:bg-[var(--accent-tint)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[44px] min-w-[44px] px-5 py-2.5 rounded-xl bg-[var(--btn-primary-bg)] text-white text-xs font-semibold hover:bg-[var(--btn-primary-hover)] shadow-sm transition active:scale-95"
                >
                  Record Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Fixed Bottom Nav Bar (Matches Admin & Student Panel layout) */}
      <nav
        aria-label="Financier workspace mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden items-center justify-around border-t border-[var(--border)] bg-[var(--surface)]/95 px-2 py-1 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <button
          type="button"
          onClick={() => setTab("ledger", "BANK")}
          aria-current={activeTab === "ledger" ? "page" : undefined}
          className={`flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition ${
            activeTab === "ledger" ? "text-[var(--accent)] font-bold" : "text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          <Receipt size={20} aria-hidden="true" />
          <span className="text-[10px] tracking-tight whitespace-nowrap">Ledger</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("students")}
          aria-current={activeTab === "students" ? "page" : undefined}
          className={`flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition ${
            activeTab === "students" ? "text-[var(--accent)] font-bold" : "text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          <User size={20} aria-hidden="true" />
          <span className="text-[10px] tracking-tight whitespace-nowrap">Students</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("accounts")}
          aria-current={activeTab === "accounts" ? "page" : undefined}
          className={`flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition ${
            activeTab === "accounts" ? "text-[var(--accent)] font-bold" : "text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          <Building size={20} aria-hidden="true" />
          <span className="text-[10px] tracking-tight whitespace-nowrap">Accounts</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setModalType("tuition");
            setIsModalOpen(true);
          }}
          className="flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition text-[var(--muted)] hover:text-[var(--text)]"
        >
          <Plus size={20} aria-hidden="true" />
          <span className="text-[10px] tracking-tight whitespace-nowrap">Record</span>
        </button>
      </nav>
      </div>
    </div>
  );
}
