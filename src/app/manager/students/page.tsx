import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { GraduationCap, Mail, Phone, Calendar, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ManagerStudentsPage() {
  let session;
  try {
    session = await requireAuth(["MANAGER", "ADMIN"]);
  } catch {
    redirect("/login");
  }

  const students = await prisma.studentProfile.findMany({
    include: {
      user: true,
      enrollments: {
        include: {
          batch: { include: { course: true } },
        },
      },
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
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
          Student Directory
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Enrolled Student Records
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Active roster, official registration numbers, and cohort enrollment history.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#2A0F16]/10 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#2A0F16]">Registered Students</h2>
          <span className="text-xs font-mono font-semibold text-stone-500">
            {students.length} Total Registered
          </span>
        </div>

        {students.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 italic">
            No students registered yet.
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-stone-100">
              {students.map((st) => {
                const activeEnrollment = st.enrollments.find((e) => e.status === "ACTIVE") || st.enrollments[0];

                return (
                  <div key={st.id} className="p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#2A0F16]">{st.user.name}</span>
                      <StatusBadge
                        status={st.user.isActive ? "ACTIVE" : "DISABLED"}
                        size="sm"
                      />
                    </div>

                    <div className="flex items-center justify-between text-stone-500">
                      <span className="font-mono font-bold text-[#6D1A2B]">
                        {st.registrationNumber}
                      </span>
                      <span>{formatDate(activeEnrollment?.effectiveStartDate || st.createdAt)}</span>
                    </div>

                    <div className="space-y-0.5 text-stone-600">
                      <div className="truncate">{st.user.email}</div>
                      {st.user.phone && <div className="font-mono">{st.user.phone}</div>}
                    </div>

                    <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between">
                      <span className="text-[11px] text-stone-400">Cohort:</span>
                      {activeEnrollment ? (
                        <span className="font-semibold text-stone-800">
                          {activeEnrollment.batch.code} ({activeEnrollment.batch.course.code})
                        </span>
                      ) : (
                        <span className="text-stone-400 italic">Unassigned</span>
                      )}
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
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Current Cohort</th>
                    <th className="py-3 px-4">Enrollment Date</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {students.map((st) => {
                    const activeEnrollment = st.enrollments.find((e) => e.status === "ACTIVE") || st.enrollments[0];

                    return (
                      <tr key={st.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#6D1A2B]">
                          {st.registrationNumber}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#2A0F16]">
                          {st.user.name}
                        </td>
                        <td className="py-3.5 px-4 text-stone-600">{st.user.email}</td>
                        <td className="py-3.5 px-4 font-mono text-stone-600">
                          {st.user.phone || "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          {activeEnrollment ? (
                            <span className="font-semibold text-stone-800">
                              {activeEnrollment.batch.code} ({activeEnrollment.batch.course.code})
                            </span>
                          ) : (
                            <span className="text-stone-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-stone-500">
                          {formatDate(activeEnrollment?.effectiveStartDate || st.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <StatusBadge
                            status={st.user.isActive ? "ACTIVE" : "DISABLED"}
                            size="sm"
                          />
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
