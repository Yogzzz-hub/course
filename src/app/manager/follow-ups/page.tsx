import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { Clock, AlertCircle, Phone, Mail, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ManagerFollowUpsPage() {
  let session;
  try {
    session = await requireAuth(["MANAGER", "ADMIN"]);
  } catch {
    redirect("/login");
  }

  const leadsWithFollowUp = await prisma.lead.findMany({
    where: {
      followUpDate: { not: null },
      status: { notIn: ["ADMITTED", "LOST"] },
    },
    include: {
      courseInterest: true,
      assignedManager: { include: { user: true } },
    },
    orderBy: { followUpDate: "asc" },
  });

  const now = new Date();

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
          CRM Task Management
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Scheduled Enquiry Follow-ups
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Review upcoming and overdue applicant consultations and counseling calls.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#2A0F16]/10 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#2A0F16]">Follow-up Tasks</h2>
          <span className="text-xs font-mono font-semibold text-stone-500">
            {leadsWithFollowUp.length} Pending Actions
          </span>
        </div>

        {leadsWithFollowUp.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 italic">
            No pending follow-ups scheduled. Great job keeping the pipeline clear!
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {leadsWithFollowUp.map((lead) => {
              const isOverdue = lead.followUpDate && new Date(lead.followUpDate) < now;

              return (
                <div
                  key={lead.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isOverdue ? "bg-rose-50/40" : "hover:bg-stone-50/60"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#2A0F16]">
                        {lead.fullName}
                      </span>
                      <StatusBadge status={lead.status} size="sm" />
                      {isOverdue && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          OVERDUE
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600">
                      <span>{lead.email}</span>
                      <span>•</span>
                      <span className="font-mono">{lead.phone}</span>
                      <span>•</span>
                      <span>Interest: {lead.courseInterest?.title || "General"}</span>
                    </div>

                    {lead.nextAction && (
                      <p className="text-xs text-stone-800 font-medium pt-1">
                        Action: <span className="font-normal text-stone-600">{lead.nextAction}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-stone-500 block uppercase font-medium">Due Date</span>
                      <span className={`text-xs font-bold ${isOverdue ? "text-rose-700" : "text-stone-800"}`}>
                        {formatDate(lead.followUpDate)}
                      </span>
                    </div>

                    <Link
                      href={`/manager/enquiries?id=${lead.id}`}
                      className="min-h-[44px] sm:min-h-0 px-4 py-2 sm:py-1.5 rounded-xl bg-[#6D1A2B] text-white text-xs font-semibold hover:bg-[#4E0F1E] transition-colors flex items-center justify-center"
                    >
                      Open Lead
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
