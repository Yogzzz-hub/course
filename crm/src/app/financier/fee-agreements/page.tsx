import React from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DollarSign, FileText, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FinancierFeeAgreementsPage() {
  let session;
  try {
    session = await requireAuth(["FINANCIER", "ADMIN"]);
  } catch {
    redirect("/login");
  }

  const feeAgreements = await prisma.feeAgreement.findMany({
    include: {
      studentProfile: { include: { user: true } },
      admission: {
        include: { course: true, targetBatch: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell
      user={{
        name: "Financier",
        email: "financier@apexacademy.edu",
        role: "FINANCIER",
      }}
    >
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
          Tuition Agreements
        </span>
        <h1 className="text-xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Approved Fee Agreements
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Full register of contracted fees, approved installments, and admission terms.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#2A0F16]/10 flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-[#2A0F16]">Agreed Fee Ledger</h2>
          <span className="text-xs font-mono font-semibold text-stone-500">
            {feeAgreements.length} Records
          </span>
        </div>

        {/* Mobile Cards (block md:hidden) */}
        <div className="block md:hidden divide-y divide-stone-100">
          {feeAgreements.map((fa: any) => (
            <div key={fa.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-[#6D1A2B]">
                    {fa.studentProfile.registrationNumber}
                  </span>
                  <h4 className="font-bold text-sm text-[#2A0F16] mt-0.5">
                    {fa.studentProfile.user.name}
                  </h4>
                  <p className="text-xs text-stone-600 mt-0.5">
                    {fa.admission.course.title}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50/70 p-2.5 rounded-lg">
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase font-medium">Batch</span>
                  <span className="font-mono text-stone-700">
                    {fa.admission.targetBatch?.code || "Unassigned"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase font-medium">Contracted Fee</span>
                  <span className="font-bold text-[#2A0F16]">
                    {formatCurrency(fa.totalAgreedFee)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase font-medium">Schedule</span>
                  <span className="text-stone-700 font-medium">
                    {fa.installmentsCount} Term{fa.installmentsCount > 1 ? "s" : ""}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase font-medium">Terms</span>
                  <span className="text-stone-500 truncate block">
                    {fa.agreedTerms || "Standard terms apply"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 font-bold text-[#2A0F16]">
              <tr>
                <th className="py-3 px-4">Registration #</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Course Program</th>
                <th className="py-3 px-4">Allocated Cohort</th>
                <th className="py-3 px-4">Total Contracted Fee</th>
                <th className="py-3 px-4">Installment Schedule</th>
                <th className="py-3 px-4">Agreed Terms</th>
                <th className="py-3 px-4 text-right">Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {feeAgreements.map((fa: any) => (
                <tr key={fa.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#6D1A2B]">
                    {fa.studentProfile.registrationNumber}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#2A0F16]">
                    {fa.studentProfile.user.name}
                  </td>
                  <td className="py-3.5 px-4 text-stone-700">
                    {fa.admission.course.title}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-stone-600">
                    {fa.admission.targetBatch?.code || "Unassigned"}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#2A0F16]">
                    {formatCurrency(fa.totalAgreedFee)}
                  </td>
                  <td className="py-3.5 px-4 text-stone-600">
                    {fa.installmentsCount} Term{fa.installmentsCount > 1 ? "s" : ""}
                  </td>
                  <td className="py-3.5 px-4 text-stone-500 max-w-xs truncate">
                    {fa.agreedTerms || "Standard terms apply"}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
