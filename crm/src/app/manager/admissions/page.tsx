import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { FileText, Plus, UserCheck, DollarSign, Calendar, Layers } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ManagerAdmissionsPage() {
  let session;
  try {
    session = await requireAuth(["MANAGER", "ADMIN"]);
  } catch {
    redirect("/login");
  }

  const admissions = await prisma.admission.findMany({
    include: {
      course: true,
      targetBatch: true,
      studentProfile: { include: { user: true } },
      lead: true,
      feeAgreements: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell
      user={{
        name: "Operations Manager",
        email: "manager@apexacademy.edu",
        role: "MANAGER",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
            Enrollment Lifecycle
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
            Admissions Management
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Review draft admissions, verify agreed tuition fees, and allocate approved cohorts.
          </p>
        </div>

        <Link
          href="/manager/enquiries"
          className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-[#6D1A2B] text-white text-xs font-semibold hover:bg-[#4E0F1E] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Convert Lead to Admission</span>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#2A0F16]/10 flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-[#2A0F16]">Registered Student Admissions</h2>
          <span className="text-xs font-mono font-semibold text-stone-500">
            {admissions.length} Records Total
          </span>
        </div>

        {admissions.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 italic">
            No admissions records on file yet.
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-stone-100">
              {admissions.map((adm) => {
                const studentName =
                  adm.studentProfile?.user?.name || adm.lead?.fullName || "Applicant";
                const netFee = Math.max(0, adm.agreedFee - adm.discountAmount);

                return (
                  <div key={adm.id} className="p-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#2A0F16]">{studentName}</span>
                      <StatusBadge status={adm.status} size="sm" />
                    </div>

                    <div className="flex items-center justify-between text-stone-500">
                      <span className="font-mono font-bold text-[#6D1A2B]">
                        {adm.registrationNumber}
                      </span>
                      <span>{formatDate(adm.createdAt)}</span>
                    </div>

                    <p className="text-stone-700 font-medium">
                      {adm.course.code} - {adm.course.title}
                    </p>

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-stone-400 block">Net Fee:</span>
                        <span className="font-bold text-[#2A0F16]">{formatCurrency(netFee)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-stone-400 block">Target Cohort:</span>
                        <span className="font-mono font-semibold text-stone-800">
                          {adm.targetBatch?.code || "Unassigned"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 font-bold text-[#2A0F16]">
                  <tr>
                    <th className="py-3 px-4">Registration #</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Enrolled Course</th>
                    <th className="py-3 px-4">Target Batch</th>
                    <th className="py-3 px-4">Net Agreed Fee</th>
                    <th className="py-3 px-4">Admission Date</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {admissions.map((adm) => {
                    const studentName =
                      adm.studentProfile?.user?.name || adm.lead?.fullName || "Applicant";
                    const netFee = Math.max(0, adm.agreedFee - adm.discountAmount);

                    return (
                      <tr key={adm.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#6D1A2B]">
                          {adm.registrationNumber}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#2A0F16]">
                          {studentName}
                        </td>
                        <td className="py-3.5 px-4 text-stone-700">
                          {adm.course.code} - {adm.course.title}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-stone-600">
                          {adm.targetBatch?.code || (
                            <span className="text-stone-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#2A0F16]">
                          {formatCurrency(netFee)}
                          {adm.discountAmount > 0 && (
                            <span className="block text-[10px] text-emerald-700 font-normal">
                              Discount: {formatCurrency(adm.discountAmount)}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-stone-500">
                          {formatDate(adm.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <StatusBadge status={adm.status} size="sm" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
