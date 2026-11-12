"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge";
import { MoneyDisplay } from "@/components/ui/MoneyDisplay";
import {
  FileText,
  Plus,
  AlertCircle,
  CheckCircle2,
  Filter,
  Search,
  X,
  RefreshCw,
} from "lucide-react";

interface ExpenseItem {
  id: string;
  expenseNumber: string;
  amount: number;
  currency: string;
  description: string;
  expenseDate: string;
  paidTo?: string;
  paymentMethod: string;
  status: string;
  category: { id: string; name: string };
  recorder: { name: string };
}

interface CategoryOption {
  id: string;
  name: string;
  description?: string;
}

export default function FinancierExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/financier/expenses");
      const data = await res.json();
      if (data.expenses) {
        setExpenses(data.expenses);
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error("Failed to load expenses:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId || !description) {
      setActionMessage({ type: "error", text: "Please complete required fields." });
      return;
    }

    setSubmitting(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/financier/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          categoryId,
          description,
          paidTo: paidTo || null,
          paymentMethod,
          reference: reference || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record expense");
      }
      setActionMessage({
        type: "success",
        text: `Expense ${data.expense.expenseNumber} recorded successfully.`,
      });
      setIsModalOpen(false);
      setAmount("");
      setDescription("");
      setPaidTo("");
      setReference("");
      loadData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = expenses.filter((e) => {
    const q = searchTerm.toLowerCase();
    return (
      e.description.toLowerCase().includes(q) ||
      e.expenseNumber.toLowerCase().includes(q) ||
      e.category.name.toLowerCase().includes(q) ||
      (e.paidTo && e.paidTo.toLowerCase().includes(q))
    );
  });

  const totalExpenseSum = expenses
    .filter((e) => e.status === "APPROVED")
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <AppShell
      user={{
        name: "Financier",
        email: "financier@apex.edu",
        role: "FINANCIER",
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#2A0F16]">Operational Expenses</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Track authorized operational disbursements, utilities, equipment, software, and administrative overheads.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] font-semibold text-xs shadow-sm transition active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div
          className={`p-3.5 sm:p-4 rounded-xl border flex items-center justify-between shadow-sm text-xs ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-rose-50 border-rose-300 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="p-2 -mr-1 rounded hover:bg-stone-100 text-stone-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Banner */}
      <div className="p-4 rounded-xl bg-white border border-[#2A0F16]/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Total Approved Expenses
          </span>
          <p className="text-xl font-bold text-[#2A0F16] mt-0.5">
            <MoneyDisplay amount={totalExpenseSum} />
          </p>
        </div>
        <div className="sm:text-right">
          <span className="text-xs font-semibold text-stone-600">
            {expenses.length} Records Incurred
          </span>
          <p className="text-[11px] text-stone-400">Excludes trainer payroll disbursements</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-[#2A0F16]/10 shadow-sm flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search description, vendor, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
          />
        </div>

        <button
          onClick={loadData}
          className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 shrink-0"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Expenses Content: Dual-Mode Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-stone-500">Loading expense ledger...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No expenses found. Click &quot;Record Expense&quot; to add a new disbursement.
          </div>
        ) : (
          <>
            {/* Mobile Cards (block md:hidden) */}
            <div className="block md:hidden divide-y divide-stone-100">
              {filtered.map((e) => (
                <div key={e.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-semibold text-[#2A0F16]">
                        {e.expenseNumber}
                      </span>
                      <h4 className="font-semibold text-sm text-stone-800 mt-1">
                        {e.description}
                      </h4>
                    </div>
                    <PaymentStatusBadge status={e.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50/70 p-2.5 rounded-lg">
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Category</span>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-[#F6EBCF] text-[#4E0F1E] font-medium text-[11px]">
                        {e.category.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Amount</span>
                      <span className="font-bold text-[#6D1A2B] text-sm">
                        <MoneyDisplay amount={e.amount} currency={e.currency} />
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Paid To</span>
                      <span className="text-stone-700 font-medium truncate block">
                        {e.paidTo || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Date</span>
                      <span className="text-stone-600">
                        {new Date(e.expenseDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500 pt-0.5">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-stone-100">
                      {e.paymentMethod}
                    </span>
                    <span>Recorded by {e.recorder?.name || "Staff"}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 text-stone-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Expense #</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Paid To</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-stone-50/60 transition">
                      <td className="py-3 px-4 font-mono font-medium text-[#2A0F16]">
                        {e.expenseNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-[#F6EBCF] text-[#4E0F1E] font-medium text-[11px]">
                          {e.category.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-700 font-medium">{e.description}</td>
                      <td className="py-3 px-4 font-bold text-[#6D1A2B]">
                        <MoneyDisplay amount={e.amount} currency={e.currency} />
                      </td>
                      <td className="py-3 px-4 text-stone-600">{e.paidTo || "—"}</td>
                      <td className="py-3 px-4 text-stone-500 font-mono text-[11px]">
                        {e.paymentMethod}
                      </td>
                      <td className="py-3 px-4 text-stone-500">
                        {new Date(e.expenseDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <PaymentStatusBadge status={e.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal: Record Expense */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-xl border border-[#2A0F16]/10 relative my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A0F16]/10">
              <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#6D1A2B]" />
                <span>Record Operational Expense</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 -mr-1 rounded-md text-stone-400 hover:text-stone-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordExpense} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Category *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B] bg-white"
                  required
                >
                  <option value="">Select category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Amount (INR) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="e.g. 4500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Description / Purpose *
                </label>
                <input
                  type="text"
                  placeholder="e.g. High-speed fiber internet subscription for Lab 1"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Paid To / Vendor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Airtel Business"
                    value={paidTo}
                    onChange={(e) => setPaidTo(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B] bg-white"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Corporate Card</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Reference / Bill No
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-99021"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 font-mono border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] text-xs font-semibold shadow-sm transition active:scale-[0.98]"
                >
                  {submitting ? "Saving..." : "Record Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
