import React from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { User, Shield, Briefcase, Mail, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TrainerProfilePage() {
  let session;
  try {
    session = await requireAuth(["TRAINER", "ADMIN"]);
  } catch {
    redirect("/login");
  }

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.userId },
    include: { user: true },
  });

  if (!trainerProfile) redirect("/login");

  return (
    <AppShell
      user={{
        name: trainerProfile.user.name,
        email: trainerProfile.user.email,
        role: "TRAINER",
      }}
    >
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
          Faculty Credentials
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Trainer Profile
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Official academy faculty credentials and instructional specializations.
        </p>
      </div>

      <div className="max-w-2xl bg-white rounded-2xl border border-[#2A0F16]/10 p-4 sm:p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-stone-100 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#6D1A2B] text-white flex items-center justify-center font-bold text-2xl shadow-sm">
            {trainerProfile.user.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#2A0F16]">{trainerProfile.user.name}</h2>
            <p className="text-xs font-semibold text-[#C9A24B]">
              {trainerProfile.specialization || "Faculty Lead"}
            </p>
            <span className="font-mono text-xs text-stone-400 block mt-0.5">
              Employee Code: {trainerProfile.employeeCode}
            </span>
          </div>
        </div>

        <div className="space-y-4 text-xs text-stone-700">
          <div>
            <span className="text-[11px] font-semibold text-stone-500 uppercase block mb-1">
              Official Email
            </span>
            <div className="flex items-center gap-2 font-medium">
              <Mail className="w-4 h-4 text-[#6D1A2B]" />
              <span>{trainerProfile.user.email}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-stone-500 uppercase block mb-1">
              Registered Phone
            </span>
            <div className="flex items-center gap-2 font-medium">
              <Phone className="w-4 h-4 text-[#6D1A2B]" />
              <span>{trainerProfile.user.phone || "Not on file"}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-stone-500 uppercase block mb-1">
              Professional Biography
            </span>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed bg-[#FFFBF5] p-3 rounded-xl border border-stone-100">
              {trainerProfile.bio || "Senior engineering instructor at Apex Global Academy."}
            </p>
          </div>

          <div className="pt-2 flex items-center gap-2 text-[11px] text-stone-500">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Public Website Visibility: {trainerProfile.isPublic ? "Active" : "Hidden"}</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
