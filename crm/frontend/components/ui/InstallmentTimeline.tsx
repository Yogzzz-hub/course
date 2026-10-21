import React from "react";
import { formatDate } from "@/lib/utils";
import { MoneyDisplay } from "./MoneyDisplay";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { Calendar, CheckCircle2, AlertCircle } from "lucide-react";

export interface InstallmentItem {
  id: string;
  installmentNumber: number;
  dueDate: Date | string;
  amountDue: number;
  amountPaid: number;
  remainingBalance: number;
  status: string;
  lastPaymentDate?: Date | string | null;
}

interface InstallmentTimelineProps {
  installments: InstallmentItem[];
  currency?: string;
  onPayInstallment?: (installment: InstallmentItem) => void;
  showPayAction?: boolean;
}

export function InstallmentTimeline({
  installments,
  currency = "INR",
  onPayInstallment,
  showPayAction = false,
}: InstallmentTimelineProps) {
  if (!installments || installments.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-stone-500 italic bg-stone-50 rounded-2xl border border-stone-200">
        No payment installments configured for this fee agreement.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {installments.map((inst, index) => {
        const percentPaid =
          inst.amountDue > 0
            ? Math.min(100, Math.round((inst.amountPaid / inst.amountDue) * 100))
            : 100;
        const isPaid = inst.remainingBalance <= 0.01;

        return (
          <div
            key={inst.id}
            className={`p-4 rounded-2xl border transition-all ${
              isPaid
                ? "bg-emerald-50/40 border-emerald-100"
                : inst.status === "OVERDUE"
                ? "bg-rose-50/40 border-rose-200 shadow-2xs"
                : "bg-white border-stone-200 shadow-2xs hover:border-[#6D1A2B]/30"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold font-mono ${
                    isPaid
                      ? "bg-emerald-600 text-white"
                      : inst.status === "OVERDUE"
                      ? "bg-rose-600 text-white"
                      : "bg-[#6D1A2B] text-white"
                  }`}
                >
                  #{inst.installmentNumber}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#2A0F16]">
                    Installment #{inst.installmentNumber}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                    <Calendar className="w-3 h-3 text-stone-400" />
                    <span>Due on {formatDate(inst.dueDate)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <PaymentStatusBadge status={inst.status} size="sm" />
                {showPayAction && !isPaid && onPayInstallment && (
                  <button
                    onClick={() => onPayInstallment(inst)}
                    className="px-3 py-1.5 sm:py-1 rounded-xl bg-[#6D1A2B] hover:bg-[#4E0F1E] text-white text-xs sm:text-[11px] font-bold transition-colors shadow-2xs min-h-[44px] sm:min-h-0 flex items-center justify-center"
                  >
                    Pay Now
                  </button>
                )}
              </div>
            </div>

            {/* Financial breakdown */}
            <div className="grid grid-cols-3 gap-2 pt-3 text-xs">
              <div>
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-semibold">
                  Amount Due
                </span>
                <MoneyDisplay amount={inst.amountDue} currency={currency} size="sm" />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-semibold">
                  Amount Paid
                </span>
                <MoneyDisplay
                  amount={inst.amountPaid}
                  currency={currency}
                  size="sm"
                  variant={isPaid ? "success" : "default"}
                />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-semibold">
                  Remaining
                </span>
                <MoneyDisplay
                  amount={inst.remainingBalance}
                  currency={currency}
                  size="sm"
                  variant={isPaid ? "muted" : inst.status === "OVERDUE" ? "danger" : "default"}
                />
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isPaid ? "bg-emerald-600" : inst.status === "OVERDUE" ? "bg-rose-600" : "bg-[#6D1A2B]"
                  }`}
                  style={{ width: `${percentPaid}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
