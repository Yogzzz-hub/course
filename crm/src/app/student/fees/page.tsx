"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MoneyDisplay } from "@/components/ui/MoneyDisplay";
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge";
import { InstallmentTimeline, InstallmentItem } from "@/components/ui/InstallmentTimeline";
import { formatDate } from "@/lib/utils";
import {
  DollarSign,
  Download,
  Receipt,
  FileText,
  CreditCard,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

export default function StudentFeesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payingInstallment, setPayingInstallment] = useState<InstallmentItem | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<any>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const loadData = async () => {
    try {
      const res = await fetch("/api/student/fees");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load student fees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePayInstallment = async (inst: InstallmentItem) => {
    setPayingInstallment(inst);
    setCheckoutResult(null);
    setFeedbackMsg("");
  };

  const handleProceedCheckout = async () => {
    if (!payingInstallment) return;
    setCheckoutLoading(true);
    setFeedbackMsg("");

    try {
      const res = await fetch("/api/student/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installmentId: payingInstallment.id,
          amount: payingInstallment.remainingBalance,
          currency: data?.summary?.currency || "INR",
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setCheckoutResult(resData.order);
      } else {
        setFeedbackMsg(resData.error || "Failed to initiate online checkout");
      }
    } catch (err: any) {
      setFeedbackMsg(err.message || "Network error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleSimulateSandboxPayment = async () => {
    if (!checkoutResult) return;
    setCheckoutLoading(true);

    try {
      const res = await fetch("/api/webhooks/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "SANDBOX",
          orderId: checkoutResult.orderId,
          eventType: "SANDBOX_PAYMENT_SUCCESS",
          amount: checkoutResult.amount,
        }),
      });

      if (res.ok) {
        setFeedbackMsg("Payment successfully processed! Receipt generated.");
        await loadData();
        setTimeout(() => {
          setPayingInstallment(null);
          setCheckoutResult(null);
        }, 1500);
      } else {
        const d = await res.json();
        setFeedbackMsg(d.error || "Sandbox settlement failed");
      }
    } catch (err: any) {
      setFeedbackMsg(err.message || "Network error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const summary = data?.summary;
  const currency = summary?.currency || "INR";

  return (
    <AppShell
      user={{
        name: "Student",
        email: "student@apexacademy.edu",
        role: "STUDENT",
      }}
    >
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
          Tuition & Billing Portal
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Student Financial Account
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Review your approved tuition schedule, installment obligations, verified payment receipts, and digital invoices.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-stone-500 animate-pulse bg-white rounded-2xl border border-stone-200">
          Loading financial statement...
        </div>
      ) : summary ? (
        <div className="space-y-6">
          {/* Financial Hold Alert */}
          {summary.financialHold && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block">Financial Status Hold Active</span>
                <span className="text-[11px] text-rose-700 block mt-0.5">
                  Your academic account is currently flagged with a financial status hold due to outstanding tuition dues. Please remit overdue installments or contact financial administration.
                </span>
              </div>
            </div>
          )}

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs">
              <span className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold block">
                Net Tuition Obligation
              </span>
              <div className="mt-2">
                <MoneyDisplay amount={summary.netPayable} currency={currency} size="xl" />
              </div>
              <span className="text-[10px] text-stone-400 block mt-1">
                Course: <MoneyDisplay amount={summary.courseFee} currency={currency} size="sm" variant="muted" />
                {summary.approvedDiscounts > 0 && ` (Disc: -${summary.approvedDiscounts})`}
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 p-5 shadow-2xs">
              <span className="text-[11px] text-emerald-800 uppercase tracking-wider font-semibold block">
                Total Confirmed Paid
              </span>
              <div className="mt-2">
                <MoneyDisplay amount={summary.confirmedPaid} currency={currency} size="xl" variant="success" />
              </div>
              <span className="text-[10px] text-emerald-700 block mt-1">
                Verified settlements on record
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs">
              <span className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold block">
                Outstanding Balance
              </span>
              <div className="mt-2">
                <MoneyDisplay
                  amount={summary.outstandingBalance}
                  currency={currency}
                  size="xl"
                  variant={summary.outstandingBalance > 0 ? "default" : "success"}
                />
              </div>
              <span className="text-[10px] text-stone-400 block mt-1">
                {summary.outstandingBalance === 0 ? "Account fully paid" : "Pending scheduled balance"}
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-rose-200 bg-rose-50/20 p-5 shadow-2xs">
              <span className="text-[11px] text-rose-800 uppercase tracking-wider font-semibold block">
                Overdue Amount
              </span>
              <div className="mt-2">
                <MoneyDisplay
                  amount={summary.overdueAmount}
                  currency={currency}
                  size="xl"
                  variant={summary.overdueAmount > 0 ? "danger" : "muted"}
                />
              </div>
              <span className="text-[10px] text-rose-700 block mt-1">
                {summary.overdueAmount > 0 ? "Requires immediate remittance" : "Zero overdue installments"}
              </span>
            </div>
          </div>

          {/* Installment Schedule & Pay Actions */}
          <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#2A0F16]">
                  Scheduled Payment Installments
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Deterministic chronological allocations applied automatically upon confirmed payment.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-[#6D1A2B] bg-[#FFFBF5] px-3 py-1 rounded-xl border border-[#2A0F16]/10">
                {summary.installments.length} Installments Total
              </span>
            </div>

            <InstallmentTimeline
              installments={summary.installments}
              currency={currency}
              showPayAction={true}
              onPayInstallment={handlePayInstallment}
            />
          </div>

          {/* Payment History & Downloadable Receipts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Receipts Card */}
            <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#6D1A2B]" />
                  <h3 className="text-sm font-bold text-[#2A0F16]">
                    Official Payment Receipts
                  </h3>
                </div>
                <span className="text-xs font-mono text-stone-400">
                  {data?.receipts?.length || 0} Records
                </span>
              </div>

              {!data?.receipts || data.receipts.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500 italic bg-stone-50 rounded-xl">
                  No confirmed payment receipts issued yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data.receipts.map((r: any) => (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-xl border border-stone-100 hover:border-[#6D1A2B]/30 bg-stone-50/50 flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <span className="font-mono font-bold text-[#6D1A2B] block">
                          {r.receiptNumber}
                        </span>
                        <span className="text-[11px] text-stone-500 block">
                          {formatDate(r.receiptDate)} • via {r.paymentMethod}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <MoneyDisplay amount={r.totalPaid} currency={r.currency} size="sm" variant="success" />
                        <a
                          href={r.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-[#6D1A2B] font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Download className="w-3 h-3" />
                          <span>PDF</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invoices Card */}
            <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#C9A24B]" />
                  <h3 className="text-sm font-bold text-[#2A0F16]">
                    Fee Statements & Invoices
                  </h3>
                </div>
                <span className="text-xs font-mono text-stone-400">
                  {data?.invoices?.length || 0} Records
                </span>
              </div>

              {!data?.invoices || data.invoices.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500 italic bg-stone-50 rounded-xl">
                  No invoices generated on file.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data.invoices.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-xl border border-stone-100 hover:border-[#6D1A2B]/30 bg-stone-50/50 flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <span className="font-mono font-bold text-[#2A0F16] block">
                          {inv.invoiceNumber}
                        </span>
                        <span className="text-[11px] text-stone-500 block">
                          Issued: {formatDate(inv.issueDate)} • Due: {formatDate(inv.dueDate)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <MoneyDisplay amount={inv.netTotal} currency={inv.currency} size="sm" />
                        <a
                          href={inv.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-[#2A0F16] font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Download className="w-3 h-3" />
                          <span>PDF</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-stone-300 text-xs text-stone-500">
          No confirmed admission agreement found on file.
        </div>
      )}

      {/* Online Payment Checkout Modal */}
      {payingInstallment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl border border-[#2A0F16]/20 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#6D1A2B]" />
                <h3 className="text-base font-bold text-[#2A0F16]">
                  Pay Installment Online
                </h3>
              </div>
              <button
                onClick={() => setPayingInstallment(null)}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {feedbackMsg && (
              <div
                className={`mt-4 p-3 rounded-xl text-xs font-semibold ${
                  feedbackMsg.includes("successfully")
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {feedbackMsg}
              </div>
            )}

            <div className="mt-4 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#FFFBF5] border border-stone-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-stone-600">Installment Number:</span>
                  <span className="font-bold text-[#2A0F16]">#{payingInstallment.installmentNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-600">Due Date:</span>
                  <span className="font-semibold text-stone-800">{formatDate(payingInstallment.dueDate)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                  <span className="font-bold text-[#2A0F16]">Remittance Payable:</span>
                  <MoneyDisplay amount={payingInstallment.remainingBalance} currency={currency} size="lg" />
                </div>
              </div>

              {!checkoutResult ? (
                <div>
                  <p className="text-[11px] text-stone-500 mb-4">
                    Click Proceed to initialize a secure payment gateway session. (Running in verified Sandbox environment).
                  </p>
                  <button
                    onClick={handleProceedCheckout}
                    disabled={checkoutLoading}
                    className="w-full py-3 rounded-xl bg-[#6D1A2B] hover:bg-[#4E0F1E] text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50 min-h-[44px] flex items-center justify-center"
                  >
                    {checkoutLoading ? "Initiating Gateway Order..." : "Proceed to Payment Gateway"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900">
                    <span className="font-bold block">Sandbox Payment Adapter</span>
                    <span>Order #{checkoutResult.orderId} generated. Live provider keys not configured in development environment.</span>
                  </div>

                  <button
                    onClick={handleSimulateSandboxPayment}
                    disabled={checkoutLoading}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{checkoutLoading ? "Confirming..." : "Simulate Successful Settlement"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
