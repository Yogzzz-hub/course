import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
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
  LogOut,
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
  Menu,
  ChevronRight,
  Building,
  User,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Wallet,
  Receipt,
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
    try {
      localStorage.removeItem("crm_session");
    } catch {}
    navigate("/login");
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as FinancierTab) || "ledger";
  const selectedAccountCode = searchParams.get("account") || "BANK";
  const studentDetailId = searchParams.get("studentId");

  const [accounts, setAccounts] = useState<FinancierAccount[]>(initialAccounts);
  const [ledgerLines, setLedgerLines] = useState<LedgerLine[]>(initialBankLedger);
  const [students, setStudents] = useState<FinancierStudentDebt[]>(initialFinancierStudents);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // New Transaction Entry Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"tuition" | "expense" | "refund">("tuition");
  const [modalStudent, setModalStudent] = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [modalMethod, setModalMethod] = useState("UPI / Razorpay");
  const [modalDescription, setModalDescription] = useState("");

  const currentAccount =
    accounts.find((a) => a.code === selectedAccountCode) || accounts[0];

  const setTab = (tab: FinancierTab, accountCode = "BANK") => {
    setSearchParams({ tab, account: accountCode });
    setMobileSidebarOpen(false);
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

  return (
    <div className="manager-workspace min-h-screen bg-[var(--bg,#f6f6f8)] text-[var(--text,#1d1d24)] flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 h-16 border-b border-[var(--border,#e4e4ea)] bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#6D1A2B] hover:bg-slate-100 transition md:hidden"
            aria-label="Open side navigation menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex size-9 items-center justify-center rounded-xl bg-[#6D1A2B] text-white shrink-0 shadow-xs">
            <Coins size={18} />
          </div>
          <div>
            <div className="text-sm sm:text-base font-bold text-[#1d1d24] leading-tight truncate">
              Aintrix Academy — Financier Portal
            </div>
            <div className="text-[11px] text-[var(--muted,#5f5f6b)] hidden sm:block truncate">
              Treasury, Account Ledgers & Student Dues
            </div>
          </div>
        </div>

        {/* Desktop Header Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setTab("ledger", "BANK")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "ledger"
                ? "bg-[#6D1A2B] text-white shadow-xs"
                : "text-[var(--muted,#5f5f6b)] hover:text-[#1d1d24] hover:bg-slate-100"
            }`}
          >
            Operating Ledger
          </button>
          <button
            onClick={() => setTab("students")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "students"
                ? "bg-[#6D1A2B] text-white shadow-xs"
                : "text-[var(--muted,#5f5f6b)] hover:text-[#1d1d24] hover:bg-slate-100"
            }`}
          >
            Student Balances
          </button>
          <button
            onClick={() => setTab("accounts")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "accounts"
                ? "bg-[#6D1A2B] text-white shadow-xs"
                : "text-[var(--muted,#5f5f6b)] hover:text-[#1d1d24] hover:bg-slate-100"
            }`}
          >
            Treasury Accounts
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden lg:inline text-xs text-[var(--muted,#5f5f6b)]">
            Logged in as <strong className="text-[#1d1d24]">Lead Financier</strong>
          </span>
          <button
            onClick={handleLogout}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition active:scale-95"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-28 md:pb-12">
        {/* SUBVIEW 1: OPERATING BANK ACCOUNT LEDGER */}
        {activeTab === "ledger" && (
          <div className="space-y-6">
            {/* Header / Account Switcher Card */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C9A24B]">
                  Treasury Ledger Register
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-[#1d1d24] mt-0.5">
                  {currentAccount.name}
                </h1>
                <p className="text-xs sm:text-sm text-[var(--muted,#5f5f6b)] mt-1">
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
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D1A2B] text-white text-xs font-semibold shadow-xs hover:bg-[#521320] transition active:scale-95"
                >
                  <Plus size={16} /> Record Transaction
                </button>
                <button
                  type="button"
                  onClick={() => alert("Exporting verified ledger entries as CSV...")}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border,#e4e4ea)] bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition active:scale-95 shadow-2xs"
                >
                  <Download size={15} /> Export CSV
                </button>
              </div>
            </div>

            {/* Net Account Balance Card (Full-width on mobile & stacks nicely) */}
            <div className="w-full rounded-2xl border border-[var(--border,#e4e4ea)] bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border,#e4e4ea)]">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#5f5f6b)] block">
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
                  <p className="text-xs text-[var(--muted,#5f5f6b)] mt-1">
                    {currentAccount.netBalanceMinor < 0
                      ? "Operating deficit (Pending tuition settlement or scheduled debits)"
                      : "Positive operating liquidity"}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-900 border border-indigo-100">
                    <ShieldCheck size={14} className="text-indigo-600" />
                    Last Reconciled: {currentAccount.lastReconciledAt}
                  </span>
                </div>
              </div>

              {/* Sub-Metrics Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[var(--muted,#5f5f6b)] block uppercase text-[10px] font-semibold">Total Verified Inflows</span>
                  <span className="text-base font-bold text-emerald-700 mt-0.5 block">
                    {formatRupees(currentAccount.totalInflowMinor)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[var(--muted,#5f5f6b)] block uppercase text-[10px] font-semibold">Total Verified Outflows</span>
                  <span className="text-base font-bold text-rose-600 mt-0.5 block">
                    {formatRupees(currentAccount.totalOutflowMinor)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[var(--muted,#5f5f6b)] block uppercase text-[10px] font-semibold">Pending Match Variance</span>
                  <span className="text-base font-bold text-amber-700 mt-0.5 block">
                    {currentAccount.pendingReconciliationCount} Unreconciled
                  </span>
                </div>
              </div>
            </div>

            {/* Search and Category Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search operating bank account ledger lines, descriptions, or students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border,#e4e4ea)] bg-white text-base sm:text-xs text-[#1d1d24] placeholder:text-slate-400 focus:border-[#6D1A2B] focus:outline-none min-h-[44px] shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2.5 rounded-xl border border-[var(--border,#e4e4ea)] bg-white text-base sm:text-xs text-[#1d1d24] font-medium min-h-[44px] shadow-2xs focus:outline-none focus:border-[#6D1A2B]"
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
                  <div className="p-8 text-center bg-white rounded-2xl border border-[var(--border,#e4e4ea)]">
                    <AlertCircle size={28} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-[#1d1d24]">No matching ledger entries</p>
                    <p className="text-xs text-[var(--muted,#5f5f6b)] mt-1">Try clearing your search query or filter.</p>
                  </div>
                ) : (
                  filteredLedger.map((line) => (
                    <div
                      key={line.id}
                      className="w-full bg-white rounded-2xl border border-[var(--border,#e4e4ea)] p-4 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-[#6D1A2B]">
                            {line.transactionNumber}
                          </span>
                          <span className="text-[11px] text-[var(--muted,#5f5f6b)] block mt-0.5">
                            {line.date}
                          </span>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                          {line.status}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-medium text-[#1d1d24] leading-snug">
                        {line.description}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl">
                        <div>
                          <span className="text-[10px] text-[var(--muted,#5f5f6b)] uppercase font-semibold block">
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
                          <span className="text-[10px] text-[var(--muted,#5f5f6b)] uppercase font-semibold block">
                            Rolling Net Balance
                          </span>
                          <span
                            className={`font-extrabold text-sm ${
                              line.balanceMinor < 0 ? "text-rose-600" : "text-slate-900"
                            }`}
                          >
                            {formatRupees(line.balanceMinor)}
                          </span>
                        </div>

                        <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                          <span>{line.category}</span>
                          <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200">
                            {line.paymentMethod || "Direct Transfer"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* DESKTOP TABLE (Hidden on mobile < md) */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--border,#e4e4ea)] bg-white shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border,#e4e4ea)] bg-slate-50/70 text-[#1d1d24] font-semibold">
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
                  <tbody className="divide-y divide-[var(--border,#e4e4ea)]">
                    {filteredLedger.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[var(--muted,#5f5f6b)]">
                          No matching ledger entries found.
                        </td>
                      </tr>
                    ) : (
                      filteredLedger.map((line) => (
                        <tr key={line.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                            {line.date}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-[#6D1A2B] whitespace-nowrap">
                            {line.transactionNumber}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-[#1d1d24]">
                            <div>{line.description}</div>
                            {line.studentName && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Student: <strong className="text-slate-700">{line.studentName}</strong> ({line.paymentMethod})
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px]">
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
                              line.balanceMinor < 0 ? "text-rose-600" : "text-slate-900"
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
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C9A24B]">
                  Student Billing Register
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-[#1d1d24] mt-0.5">
                  Fee Agreements & Dues Roster
                </h1>
                <p className="text-xs sm:text-sm text-[var(--muted,#5f5f6b)] mt-1">
                  Review student tuition agreements, overdue installments, and payment receipts.
                </p>
              </div>

              {selectedStudent && (
                <button
                  type="button"
                  onClick={closeStudent}
                  className="flex min-h-[44px] items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border,#e4e4ea)] bg-white text-xs font-semibold hover:bg-slate-50 transition"
                >
                  <X size={15} /> Close Student Profile
                </button>
              )}
            </div>

            {/* Selected Student Detail View / Drawer */}
            {selectedStudent && (
              <div className="w-full bg-white rounded-2xl border-2 border-[#6D1A2B]/20 p-5 sm:p-6 shadow-md space-y-5 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[var(--border,#e4e4ea)]">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#6D1A2B]">
                      {selectedStudent.registrationNumber}
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-[#1d1d24] mt-0.5">
                      {selectedStudent.name}
                    </h2>
                    <p className="text-xs text-[var(--muted,#5f5f6b)] mt-1">
                      {selectedStudent.courseTitle} · Cohort: <strong className="text-slate-800">{selectedStudent.batchCode}</strong>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
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
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[var(--muted,#5f5f6b)] uppercase text-[10px] font-semibold block">Total Contracted</span>
                    <span className="text-base font-bold text-slate-900 mt-0.5 block">
                      {formatRupees(selectedStudent.contractedFeeMinor)}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[var(--muted,#5f5f6b)] uppercase text-[10px] font-semibold block">Total Paid to Date</span>
                    <span className="text-base font-bold text-[#10754A] mt-0.5 block">
                      {formatRupees(selectedStudent.paidAmountMinor)}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[var(--muted,#5f5f6b)] uppercase text-[10px] font-semibold block">Remaining Balance</span>
                    <span className="text-base font-bold text-slate-900 mt-0.5 block">
                      {formatRupees(selectedStudent.remainingDueMinor)}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[var(--muted,#5f5f6b)] uppercase text-[10px] font-semibold block">Overdue Balance</span>
                    <span className="text-base font-bold text-[#A72828] mt-0.5 block">
                      {formatRupees(selectedStudent.overdueMinor)}
                    </span>
                  </div>
                </div>

                {/* Installments Table */}
                <div>
                  <h3 className="text-sm font-bold text-[#1d1d24] mb-2">Agreed Installment Breakdown</h3>
                  <div className="overflow-x-auto rounded-xl border border-[var(--border,#e4e4ea)]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-[var(--border,#e4e4ea)] font-semibold text-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">Installment #</th>
                          <th className="py-2.5 px-3">Due Date</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border,#e4e4ea)]">
                        {selectedStudent.installments.map((inst) => (
                          <tr key={inst.number} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-semibold text-[#1d1d24]">Term {inst.number}</td>
                            <td className="py-2.5 px-3 text-slate-600">{inst.dueDate}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
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
                    className="w-full bg-white rounded-2xl border border-[var(--border,#e4e4ea)] p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-[#6D1A2B]">
                          {st.registrationNumber}
                        </span>
                        <h4 className="font-bold text-sm text-[#1d1d24] mt-0.5">{st.name}</h4>
                        <p className="text-xs text-[var(--muted,#5f5f6b)] mt-0.5">{st.courseTitle}</p>
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

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl">
                      <div>
                        <span className="text-[10px] text-[var(--muted,#5f5f6b)] uppercase font-semibold block">Total Fee</span>
                        <span className="font-bold text-slate-900">{formatRupees(st.contractedFeeMinor)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--muted,#5f5f6b)] uppercase font-semibold block">Remaining Due</span>
                        <span className={`font-bold ${st.remainingDueMinor > 0 ? "text-amber-800" : "text-emerald-700"}`}>
                          {formatRupees(st.remainingDueMinor)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openStudent(st.id)}
                      className="w-full min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl border border-[#6D1A2B] bg-white text-[#6D1A2B] text-xs font-semibold hover:bg-rose-50 transition active:scale-95"
                    >
                      View Student Ledger & Installments
                    </button>
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--border,#e4e4ea)] bg-white shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border,#e4e4ea)] bg-slate-50 font-semibold text-slate-700">
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
                  <tbody className="divide-y divide-[var(--border,#e4e4ea)]">
                    {students.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#6D1A2B]">{st.registrationNumber}</td>
                        <td className="py-3 px-4 font-semibold text-[#1d1d24]">{st.name}</td>
                        <td className="py-3 px-4 text-slate-600">{st.courseTitle} ({st.batchCode})</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
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
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D1A2B] hover:underline"
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
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C9A24B]">
                Treasury & Liquidity Management
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1d1d24] mt-0.5">
                Bank & Escrow Accounts
              </h1>
              <p className="text-xs sm:text-sm text-[var(--muted,#5f5f6b)] mt-1">
                Centralized balance reconciliation across Corporate Banking, Razorpay Escrow, and Campus Cash.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`w-full rounded-2xl border p-5 shadow-sm space-y-4 bg-white transition hover:shadow-md ${
                    acc.code === selectedAccountCode ? "border-[#6D1A2B] ring-2 ring-[#6D1A2B]/10" : "border-[var(--border,#e4e4ea)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted,#5f5f6b)]">
                        {acc.type}
                      </span>
                      <h3 className="text-base font-bold text-[#1d1d24] mt-0.5">{acc.name}</h3>
                      <p className="text-xs text-[var(--muted,#5f5f6b)] font-mono">{acc.accountNumber}</p>
                    </div>
                    <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
                      <Building size={18} />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-[var(--muted,#5f5f6b)] uppercase font-semibold block">Net Balance</span>
                    <div
                      className={`text-2xl font-extrabold mt-0.5 ${
                        acc.netBalanceMinor < 0 ? "text-rose-600" : "text-emerald-700"
                      }`}
                    >
                      {formatRupees(acc.netBalanceMinor)}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border,#e4e4ea)] flex items-center justify-between text-xs">
                    <span className="text-[var(--muted,#5f5f6b)]">
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
                      className="inline-flex min-h-[44px] items-center gap-1 text-xs font-bold text-[#6D1A2B] hover:underline"
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
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border border-[var(--border,#e4e4ea)]">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border,#e4e4ea)]">
              <h2 className="text-base font-bold text-[#1d1d24] flex items-center gap-2">
                <Plus size={18} className="text-[#6D1A2B]" />
                Record Ledger Transaction
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 min-h-[44px] min-w-[44px]"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Transaction Classification *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalType("tuition")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border min-h-[44px] transition ${
                      modalType === "tuition"
                        ? "border-[#6D1A2B] bg-rose-50 text-[#6D1A2B]"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Tuition Inflow
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalType("expense")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border min-h-[44px] transition ${
                      modalType === "expense"
                        ? "border-[#6D1A2B] bg-rose-50 text-[#6D1A2B]"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Operating Out
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalType("refund")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border min-h-[44px] transition ${
                      modalType === "refund"
                        ? "border-[#6D1A2B] bg-rose-50 text-[#6D1A2B]"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Refund
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount in Rupees (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="e.g. 45000"
                  value={modalAmount}
                  onChange={(e) => setModalAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base sm:text-xs text-slate-900 focus:outline-none focus:border-[#6D1A2B] min-h-[44px]"
                  required
                />
              </div>

              {modalType === "tuition" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Karthik Subramanian"
                    value={modalStudent}
                    onChange={(e) => setModalStudent(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base sm:text-xs text-slate-900 focus:outline-none focus:border-[#6D1A2B] min-h-[44px]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment / Transfer Method
                </label>
                <select
                  value={modalMethod}
                  onChange={(e) => setModalMethod(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base sm:text-xs text-slate-900 bg-white min-h-[44px] focus:outline-none focus:border-[#6D1A2B]"
                >
                  <option value="UPI / Razorpay">UPI / Razorpay</option>
                  <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
                  <option value="Credit Card (EMI)">Credit Card (EMI)</option>
                  <option value="Campus Cash">Campus Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction Notes / Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Description or reference number..."
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base sm:text-xs text-slate-900 focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[44px] min-w-[44px] px-5 py-2.5 rounded-xl bg-[#6D1A2B] text-white text-xs font-semibold hover:bg-[#521320] shadow-sm transition active:scale-95"
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
        className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden items-center justify-around border-t border-[#DFE5EC] bg-white/95 px-2 py-1 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <button
          type="button"
          onClick={() => setTab("ledger", "BANK")}
          aria-current={activeTab === "ledger" ? "page" : undefined}
          className={`flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition ${
            activeTab === "ledger" ? "text-[#681C35] font-bold" : "text-[#645A62] hover:text-[#241921]"
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
            activeTab === "students" ? "text-[#681C35] font-bold" : "text-[#645A62] hover:text-[#241921]"
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
            activeTab === "accounts" ? "text-[#681C35] font-bold" : "text-[#645A62] hover:text-[#241921]"
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
          className="flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition text-[#645A62] hover:text-[#241921]"
        >
          <Plus size={20} aria-hidden="true" />
          <span className="text-[10px] tracking-tight whitespace-nowrap">Record</span>
        </button>
      </nav>

      {/* Mobile Slide-over Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex md:hidden"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div
            className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-white text-slate-900 shadow-2xl animate-in slide-in-from-left duration-200 border-r border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex min-h-[64px] items-center justify-between border-b border-slate-100 px-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#6D1A2B] text-white">
                  <Coins size={16} />
                </div>
                <span className="font-bold text-sm tracking-tight text-slate-900 truncate">
                  Financier Portal
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                aria-label="Close navigation menu"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Financier mobile side navigation">
              <button
                type="button"
                onClick={() => setTab("ledger", "BANK")}
                className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                  activeTab === "ledger"
                    ? "bg-[#681C35] text-white shadow-sm font-bold !text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Receipt size={18} className={activeTab === "ledger" ? "!text-white" : "text-slate-500"} />
                <span>Operating Ledger</span>
              </button>

              <button
                type="button"
                onClick={() => setTab("students")}
                className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                  activeTab === "students"
                    ? "bg-[#681C35] text-white shadow-sm font-bold !text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <User size={18} className={activeTab === "students" ? "!text-white" : "text-slate-500"} />
                <span>Student Balances</span>
              </button>

              <button
                type="button"
                onClick={() => setTab("accounts")}
                className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                  activeTab === "accounts"
                    ? "bg-[#681C35] text-white shadow-sm font-bold !text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Building size={18} className={activeTab === "accounts" ? "!text-white" : "text-slate-500"} />
                <span>Treasury Accounts</span>
              </button>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalType("tuition");
                    setIsModalOpen(true);
                    setMobileSidebarOpen(false);
                  }}
                  className="flex min-h-[44px] w-full items-center gap-3 rounded-xl bg-[#681C35]/10 text-[#681C35] px-3 py-2.5 text-xs font-bold hover:bg-[#681C35]/15 transition"
                >
                  <Plus size={18} />
                  <span>Record Transaction</span>
                </button>
              </div>
            </nav>

            <div className="border-t border-slate-100 p-4 bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">Lead Financier</div>
                  <div className="text-[10px] text-slate-500">Finance Operations</div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:underline"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
