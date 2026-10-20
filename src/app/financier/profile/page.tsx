import React from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { DollarSign, Shield, Mail, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FinancierProfilePage() {
  let session;
  try {
    session = await requireAuth(["FINANCIER", "ADMIN"]);
  } catch {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { financierProfile: true },
  });

  if (!user) redirect("/login");

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: "FINANCIER",
      }}
    >
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
          Department Profile
        </span>
        <h1 className="text-xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Financier Staff Profile
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Authorized billing & tuition oversight credentials.
        </p>
      </div>

      <div className="max-w-xl bg-white rounded-2xl border border-[#2A0F16]/10 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-4 border-b border-stone-100 pb-4">
          <div className="w-14 h-14 rounded-2xl bg-[#6D1A2B] text-white flex items-center justify-center font-bold text-xl">
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-base font-bold text-[#2A0F16]">{user.name}</h2>
            <p className="text-xs text-[#C9A24B] font-semibold">
              {user.financierProfile?.department || "Finance & Student Accounts"}
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-stone-700">
          <div>
            <span className="text-[11px] font-semibold text-stone-400 uppercase block">
              Staff Email
            </span>
            <span className="font-semibold text-stone-900">{user.email}</span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-stone-400 uppercase block">
              Phone Number
            </span>
            <span className="font-mono text-stone-900">{user.phone || "Not on file"}</span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-stone-400 uppercase block">
              Authorization Role
            </span>
            <span className="font-bold text-[#6D1A2B]">FINANCIER (Phase 1 Read-Only Ledger)</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
