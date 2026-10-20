"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Settings, ShieldCheck, CheckCircle2, AlertCircle, Info } from "lucide-react";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [academyName, setAcademyName] = useState("Apex Global Academy");
  const [contactEmail, setContactEmail] = useState("admissions@apexacademy.edu");
  const [contactPhone, setContactPhone] = useState("+1 (555) 234-5678");
  const [address, setAddress] = useState("450 Innovation Way, Tech Campus, Suite 400");
  const [attendanceThresholdPercent, setAttendanceThresholdPercent] = useState(100);
  const [attendanceDenominatorPolicy, setAttendanceDenominatorPolicy] = useState<
    "HELD_TO_DATE" | "SCHEDULED"
  >("HELD_TO_DATE");
  const [leaveAffectsDenominator, setLeaveAffectsDenominator] = useState(false);
  const [allowManagerApprovals, setAllowManagerApprovals] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          const s = data.settings;
          if (s) {
            setAcademyName(s.academyName);
            setContactEmail(s.contactEmail);
            setContactPhone(s.contactPhone);
            setAddress(s.address);
            setAttendanceThresholdPercent(s.attendanceThresholdPercent);
            setAttendanceDenominatorPolicy(s.attendanceDenominatorPolicy);
            setLeaveAffectsDenominator(s.leaveAffectsDenominator);
            setAllowManagerApprovals(s.allowManagerApprovals);
          }
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedbackMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academyName,
          contactEmail,
          contactPhone,
          address,
          attendanceThresholdPercent: Number(attendanceThresholdPercent),
          attendanceDenominatorPolicy,
          leaveAffectsDenominator,
          allowManagerApprovals,
        }),
      });

      const data = await res.json();
      setSaving(false);

      if (res.ok) {
        setFeedbackMsg("Academy configuration settings updated successfully.");
      } else {
        setErrorMsg(data.error || "Failed to update settings.");
      }
    } catch {
      setSaving(false);
      setErrorMsg("Network communication error.");
    }
  };

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
          Configuration & Policies
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Academy System Settings
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Configure institutional contact metadata, attendance eligibility thresholds, denominator formulas, and manager delegation.
        </p>
      </div>

      {feedbackMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Academic Policies */}
        <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-4 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#2A0F16] border-b border-stone-100 pb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#6D1A2B]" />
            <span>Academic Attendance & Completion Policies</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#2A0F16] mb-1">
                Student Attendance Eligibility Threshold (%) *
              </label>
              <input
                type="number"
                min={50}
                max={100}
                required
                value={attendanceThresholdPercent}
                onChange={(e) => setAttendanceThresholdPercent(Number(e.target.value))}
                className="w-full p-2.5 sm:p-2 border border-stone-200 rounded-xl text-base sm:text-xs min-h-[44px] sm:min-h-0 font-bold focus:outline-none focus:ring-2 focus:ring-[#6D1A2B]"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Standard baseline requirement (default: 100% per institutional specification).
              </p>
            </div>

            <div>
              <label className="block font-semibold text-[#2A0F16] mb-1">
                Attendance Denominator Policy *
              </label>
              <select
                value={attendanceDenominatorPolicy}
                onChange={(e) => setAttendanceDenominatorPolicy(e.target.value as any)}
                className="w-full p-2.5 sm:p-2 border border-stone-200 rounded-xl text-base sm:text-xs min-h-[44px] sm:min-h-0 font-semibold focus:outline-none focus:ring-2 focus:ring-[#6D1A2B]"
              >
                <option value="HELD_TO_DATE">
                  Held-to-Date (Present / Eligible Held Sessions) [Recommended]
                </option>
                <option value="SCHEDULED">
                  Total Scheduled (Present / Total Scheduled Classes in Term)
                </option>
              </select>
              <p className="text-[11px] text-stone-500 mt-1">
                Governs denominator calculation in student dashboard and compliance reports.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <label htmlFor="mgrDel" className="min-h-[44px] flex items-center gap-2.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                id="mgrDel"
                checked={allowManagerApprovals}
                onChange={(e) => setAllowManagerApprovals(e.target.checked)}
                className="w-4 h-4 rounded text-[#6D1A2B] shrink-0"
              />
              <span className="font-semibold text-stone-800 leading-snug">
                Delegate Approval Permissions to Operations Managers (Leaves & Backdated Attendance)
              </span>
            </label>
          </div>
        </div>

        {/* Institutional Contact Information */}
        <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-4 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#2A0F16] border-b border-stone-100 pb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#6D1A2B]" />
            <span>Institutional Identity & Public Contact</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#2A0F16] mb-1">
                Academy Name *
              </label>
              <input
                type="text"
                required
                value={academyName}
                onChange={(e) => setAcademyName(e.target.value)}
                className="w-full p-2.5 sm:p-2 border border-stone-200 rounded-xl text-base sm:text-xs min-h-[44px] sm:min-h-0 focus:outline-none focus:ring-2 focus:ring-[#6D1A2B]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2A0F16] mb-1">
                Admissions Email *
              </label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full p-2.5 sm:p-2 border border-stone-200 rounded-xl text-base sm:text-xs min-h-[44px] sm:min-h-0 focus:outline-none focus:ring-2 focus:ring-[#6D1A2B]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2A0F16] mb-1">
                Contact Phone *
              </label>
              <input
                type="text"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full p-2.5 sm:p-2 border border-stone-200 rounded-xl text-base sm:text-xs min-h-[44px] sm:min-h-0 focus:outline-none focus:ring-2 focus:ring-[#6D1A2B]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2A0F16] mb-1">
                Campus Address *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 sm:p-2 border border-stone-200 rounded-xl text-base sm:text-xs min-h-[44px] sm:min-h-0 focus:outline-none focus:ring-2 focus:ring-[#6D1A2B]"
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#FFFBF5] rounded-2xl border border-[#2A0F16]/10 flex justify-end">
          <Button
            type="submit"
            isLoading={saving}
            className="min-h-[44px] w-full sm:w-auto py-2.5 px-8 bg-[#6D1A2B] hover:bg-[#4E0F1E] text-white font-bold text-xs shadow-md rounded-xl justify-center"
          >
            Save Configuration Changes
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
