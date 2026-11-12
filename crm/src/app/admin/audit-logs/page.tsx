import React from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Shield, Clock, User, Filter } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage() {
  let session;
  try {
    session = await requireAuth(["ADMIN"]);
  } catch {
    redirect("/login");
  }

  const logs = await prisma.auditEvent.findMany({
    include: {
      user: { select: { name: true, email: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

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
          Compliance & Security
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          System Audit Event Logs
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Immutable audit record of all authentication, session locking, approvals, and data mutations.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#2A0F16]/10 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#2A0F16]">Recent Audit Events</h2>
          <span className="text-xs font-mono font-semibold text-stone-500">
            {logs.length} Logged Entries
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 italic">
            No audit events recorded yet.
          </div>
        ) : (
          <>
            {/* Mobile Card List (< md) */}
            <div className="block md:hidden divide-y divide-stone-100">
              {logs.map((log) => (
                <div key={log.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono font-bold text-[#6D1A2B] bg-[#FFFBF5] px-2 py-0.5 rounded border border-[#2A0F16]/10 text-xs">
                      {log.action}
                    </span>
                    <span className="font-mono text-[11px] text-stone-500 shrink-0">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-stone-600 pt-1">
                    <div>
                      <span className="text-[10px] text-stone-400 block font-semibold uppercase">Actor</span>
                      {log.user ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-stone-900">{log.user.name}</span>
                          <span className="text-[10px] text-[#C9A24B] font-bold px-1.5 py-0.2 bg-amber-50 rounded border border-amber-200/50">
                            {log.user.role}
                          </span>
                        </div>
                      ) : (
                        <span className="text-stone-400 italic">System / Public</span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 block font-semibold uppercase">Entity</span>
                      <span className="font-semibold text-stone-800">{log.entityType}</span>
                      {log.entityId && (
                        <span className="font-mono text-[10px] text-stone-400 block truncate max-w-[130px]">
                          {log.entityId}
                        </span>
                      )}
                    </div>
                  </div>

                  {log.detailsJson && (
                    <div className="bg-[#FFFBF5] p-2 rounded-lg border border-stone-200/60 font-mono text-[11px] text-stone-700 break-all">
                      <span className="text-[10px] text-stone-400 block uppercase font-sans font-semibold mb-0.5">Details</span>
                      {log.detailsJson}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 font-bold text-[#2A0F16]">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Entity Type</th>
                    <th className="py-3 px-4">Entity ID</th>
                    <th className="py-3 px-4">Event Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-stone-500 whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#6D1A2B] whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.user ? (
                          <div>
                            <span className="font-semibold text-stone-900 block">{log.user.name}</span>
                            <span className="text-[10px] text-[#C9A24B] font-bold">{log.user.role}</span>
                          </div>
                        ) : (
                          <span className="text-stone-400 italic">System / Public</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-stone-700">
                        {log.entityType}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-stone-500 text-[11px] max-w-[120px] truncate">
                        {log.entityId || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 font-mono text-[11px] max-w-xs truncate">
                        {log.detailsJson || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
