"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { User, ShieldCheck, CheckCircle2, AlertCircle, Lock } from "lucide-react";

export default function StudentProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Editable fields
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/student/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setPhone(data.student.phone || "");
        setAddress(data.student.address || "");
        setEmergencyContact(data.student.emergencyContact || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, address, emergencyContact }),
      });

      const data = await res.json();
      setSaving(false);

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to update profile.");
        return;
      }

      setMessage("Contact information updated successfully.");
      fetchProfile();
    } catch {
      setSaving(false);
      setErrorMsg("Network error.");
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-xs text-stone-500 animate-pulse">
        <div className="w-8 h-8 rounded-full border-2 border-[#6D1A2B] border-t-transparent animate-spin mb-3" />
        Loading profile...
      </div>
    );
  }

  return (
    <AppShell
      user={{
        name: user?.student?.name || "Student",
        email: user?.student?.email || "",
        role: "STUDENT",
        registrationNumber: user?.student?.registrationNumber,
      }}
    >
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
          Identity & Contact
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Student Profile
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Review official academic identity and manage your emergency contact details.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Protected Academic Credentials (Read-only) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-4">
          <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#6D1A2B]" />
              <span>Protected Academic Record</span>
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-600">
              Read-Only
            </span>
          </div>

          <div className="space-y-3 text-xs text-stone-700">
            <div>
              <span className="text-[10px] uppercase font-semibold text-stone-400 block">
                Official Name
              </span>
              <span className="font-bold text-sm text-[#2A0F16]">{user?.student?.name}</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-stone-400 block">
                Registration Number
              </span>
              <span className="font-mono font-bold text-sm text-[#6D1A2B]">
                {user?.student?.registrationNumber}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-stone-400 block">
                Registered Email
              </span>
              <span className="font-medium text-stone-800">{user?.student?.email}</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-stone-400 block">
                Enrolled Cohort
              </span>
              <span className="font-bold text-stone-900">
                {user?.enrollment?.batchCode || "Pending"} ({user?.enrollment?.courseCode})
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#FFFBF5] border border-stone-200/60 text-[11px] text-stone-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#C9A24B] shrink-0 mt-0.5" />
            <span>
              Official registration numbers, course allocations, and batch assignments can only be modified by academy administrators.
            </span>
          </div>
        </div>

        {/* Right: Editable Contact Info */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-base font-bold text-[#2A0F16]">
              Permitted Contact Updates
            </h2>
            <p className="text-xs text-stone-500">
              Ensure your phone number and emergency contact are always up to date.
            </p>
          </div>

          {message && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#2A0F16] mb-1">
                Contact Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#6D1A2B] bg-white min-h-[44px]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2A0F16] mb-1">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="+1 (555) 999-9999"
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#6D1A2B] bg-white min-h-[44px]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2A0F16] mb-1">
                Current Residential Address
              </label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address, City, State, Postal Code..."
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#6D1A2B] bg-white"
              />
            </div>

            <Button
              type="submit"
              isLoading={saving}
              className="w-full sm:w-auto py-3 px-6 bg-[#6D1A2B] hover:bg-[#4E0F1E] text-white font-semibold text-xs min-h-[44px] flex items-center justify-center"
            >
              Save Profile Changes
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
