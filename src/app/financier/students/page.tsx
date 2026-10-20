import React from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FinancierStudentsPage() {
  let session;
  try {
    session = await requireAuth(["FINANCIER", "ADMIN"]);
  } catch {
    redirect("/login");
  }

  const students = await prisma.studentProfile.findMany({
    include: {
      user: true,
      enrollments: {
        include: { batch: { include: { course: true } } },
      },
      feeAgreements: {
        where: { isApproved: true },
      },
      admissions: true,
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
          Billing Roster
        </span>
        <h1 className="text-xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Students with Approved Agreements
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Enrolled students with official signed fee terms on record.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#2A0F16]/10 flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-[#2A0F16]">Enrolled Students Roster</h2>
          <span className="text-xs font-mono font-semibold text-stone-500">
            {students.length} Total Students
          </span>
        </div>

        {/* Mobile Cards (block md:hidden) */}
        <div className="block md:hidden divide-y divide-stone-100">
          {students.map((st) => {
            const enr = st.enrollments[0];
            const feeAgr = st.feeAgreements[0];

            return (
              <div key={st.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#6D1A2B]">
                      {st.registrationNumber}
                    </span>
                    <h4 className="font-bold text-sm text-[#2A0F16] mt-0.5">
                      {st.user.name}
                    </h4>
                    <p className="text-xs text-stone-600 mt-0.5">
                      {enr ? `${enr.batch.code} (${enr.batch.course.code})` : "Unassigned Cohort"}
                    </p>
                  </div>
                  <StatusBadge status={enr?.status || "PENDING"} size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50/70 p-2.5 rounded-lg">
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase font-medium">Contracted Tuition</span>
                    <span className="font-bold text-[#2A0F16]">
                      {feeAgr ? formatCurrency(feeAgr.totalAgreedFee) : "Pending Agreement"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase font-medium">Enrolled</span>
                    <span className="text-stone-600">
                      {formatDate(enr?.effectiveStartDate || st.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 font-bold text-[#2A0F16]">
              <tr>
                <th className="py-3 px-4">Registration #</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Cohort & Program</th>
                <th className="py-3 px-4">Contracted Tuition</th>
                <th className="py-3 px-4">Enrollment Date</th>
                <th className="py-3 px-4 text-right">Academic Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {students.map((st) => {
                const enr = st.enrollments[0];
                const feeAgr = st.feeAgreements[0];

                return (
                  <tr key={st.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#6D1A2B]">
                      {st.registrationNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#2A0F16]">
                      {st.user.name}
                    </td>
                    <td className="py-3.5 px-4 text-stone-700">
                      {enr ? `${enr.batch.code} (${enr.batch.course.code})` : "Unassigned"}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#2A0F16]">
                      {feeAgr ? formatCurrency(feeAgr.totalAgreedFee) : "Pending Agreement"}
                    </td>
                    <td className="py-3.5 px-4 text-stone-500">
                      {formatDate(enr?.effectiveStartDate || st.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <StatusBadge status={enr?.status || "PENDING"} size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
