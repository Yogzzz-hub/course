import React from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { Check, X, Shield, Lock, Info } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPermissionsPage() {
  let session;
  try {
    session = await requireAuth(["ADMIN"]);
  } catch {
    redirect("/login");
  }

  const settings = await prisma.academySettings.findUnique({ where: { id: "default" } });

  const matrix = [
    {
      action: "View Own Academic / Teaching Records",
      student: true,
      trainer: true,
      manager: true,
      admin: true,
      financier: true,
    },
    {
      action: "View All Students & Batches",
      student: false,
      trainer: false, // Trainers can only view explicitly allocated batches
      manager: true,
      admin: true,
      financier: true,
    },
    {
      action: "Submit Daily Class Sessions (Atomic Form)",
      student: false,
      trainer: true, // Only for assigned batches
      manager: false,
      admin: true,
      financier: false,
    },
    {
      action: "Directly Edit Locked Class Sessions",
      student: false,
      trainer: false, // Strictly blocked! Must use Correction Request
      manager: false,
      admin: false, // Locked sessions require approved correction
      financier: false,
    },
    {
      action: "Request Attendance / Session Correction",
      student: false,
      trainer: true,
      manager: true,
      admin: true,
      financier: false,
    },
    {
      action: "Approve Attendance Correction Requests",
      student: false,
      trainer: false,
      manager: settings?.allowManagerApprovals || false,
      admin: true,
      financier: false,
    },
    {
      action: "Authorize Backdated Attendance Access",
      student: false,
      trainer: false,
      manager: settings?.allowManagerApprovals || false,
      admin: true,
      financier: false,
    },
    {
      action: "Submit Leave Requests",
      student: true,
      trainer: false,
      manager: false,
      admin: false,
      financier: false,
    },
    {
      action: "Approve Student Leave Requests",
      student: false,
      trainer: false,
      manager: settings?.allowManagerApprovals || false,
      admin: true,
      financier: false,
    },
    {
      action: "Author Courses & Versioned Syllabuses",
      student: false,
      trainer: false,
      manager: false,
      admin: true,
      financier: false,
    },
    {
      action: "Provision Batches & Generate Timetables",
      student: false,
      trainer: false,
      manager: true,
      admin: true,
      financier: false,
    },
    {
      action: "Manage Lead CRM & Create Admissions",
      student: false,
      trainer: false,
      manager: true,
      admin: true,
      financier: false,
    },
    {
      action: "User Provisioning & Account Deactivation",
      student: false,
      trainer: false,
      manager: false,
      admin: true,
      financier: false,
    },
    {
      action: "View Security Audit Log Stream",
      student: false,
      trainer: false,
      manager: false,
      admin: true,
      financier: false,
    },
    {
      action: "Read-Only Fee Agreement Ledger",
      student: false,
      trainer: false,
      manager: false,
      admin: true,
      financier: true,
    },
  ];

  return (
    <AppShell
      user={{
        name: "Administrator",
        email: "admin@apexacademy.edu",
        role: "ADMIN",
      }}
    >
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
          Access Control Architecture
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Role-Based Permissions Matrix
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Strict backend-enforced permissions governing record-level access and sensitive operational mutations.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#2A0F16]/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#6D1A2B]" />
            <h2 className="text-base font-bold text-[#2A0F16]">Five-Role Governance Matrix</h2>
          </div>
          <span className="text-xs text-stone-500 font-mono">Phase 1 Standard</span>
        </div>

        {/* Mobile Card List (< md) */}
        <div className="block md:hidden divide-y divide-stone-100">
          {matrix.map((row, idx) => (
            <div key={idx} className="p-4 space-y-2.5">
              <p className="font-bold text-xs text-[#2A0F16] leading-snug">{row.action}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 border ${
                    row.student
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-stone-50 text-stone-400 border-stone-200 line-through decoration-stone-300"
                  }`}
                >
                  {row.student ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-stone-300" />}
                  Student
                </span>

                <span
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 border ${
                    row.trainer
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-stone-50 text-stone-400 border-stone-200 line-through decoration-stone-300"
                  }`}
                >
                  {row.trainer ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-stone-300" />}
                  Trainer
                </span>

                <span
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 border ${
                    row.manager
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-stone-50 text-stone-400 border-stone-200 line-through decoration-stone-300"
                  }`}
                >
                  {row.manager ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-stone-300" />}
                  Manager
                </span>

                <span
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 border ${
                    row.admin
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-stone-50 text-stone-400 border-stone-200 line-through decoration-stone-300"
                  }`}
                >
                  {row.admin ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-stone-300" />}
                  Admin
                </span>

                <span
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 border ${
                    row.financier
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-stone-50 text-stone-400 border-stone-200 line-through decoration-stone-300"
                  }`}
                >
                  {row.financier ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-stone-300" />}
                  Financier
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 font-bold text-[#2A0F16]">
              <tr>
                <th className="py-3.5 px-4 w-1/3">Operation / Capability</th>
                <th className="py-3.5 px-4 text-center">Student</th>
                <th className="py-3.5 px-4 text-center">Trainer</th>
                <th className="py-3.5 px-4 text-center">Manager</th>
                <th className="py-3.5 px-4 text-center">Admin</th>
                <th className="py-3.5 px-4 text-center">Financier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {matrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-stone-50/70 transition-colors">
                  <td className="py-3 px-4 font-semibold text-stone-800">{row.action}</td>

                  <td className="py-3 px-4 text-center">
                    {row.student ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-stone-100 text-stone-300">
                        <X className="w-3 h-3" />
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-center">
                    {row.trainer ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-stone-100 text-stone-300">
                        <X className="w-3 h-3" />
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-center">
                    {row.manager ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-stone-100 text-stone-300">
                        <X className="w-3 h-3" />
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-center">
                    {row.admin ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-stone-100 text-stone-300">
                        <X className="w-3 h-3" />
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-center">
                    {row.financier ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-stone-100 text-stone-300">
                        <X className="w-3 h-3" />
                      </span>
                    )}
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
