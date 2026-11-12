"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Moon,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

export default function StudentCommunicationPreferencesPage() {
  const [prefs, setPrefs] = useState({
    emailMarketing: false,
    whatsappNotifications: true,
    smsNotifications: true,
    quietHoursStart: "21:00",
    quietHoursEnd: "08:00",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetch("/api/student/communication-preferences")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((d) => {
        if (d.preferences) {
          setPrefs({
            emailMarketing: d.preferences.emailMarketing,
            whatsappNotifications: d.preferences.whatsappNotifications,
            smsNotifications: d.preferences.smsNotifications,
            quietHoursStart: d.preferences.quietHoursStart || "21:00",
            quietHoursEnd: d.preferences.quietHoursEnd || "08:00",
          });
        }
      })
      .catch((err) => console.error("Failed to load preferences:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");

    try {
      const res = await fetch("/api/student/communication-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });

      if (res.ok) {
        setSuccessMsg("Communication preferences successfully updated.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      user={{
        name: "Student",
        email: "student@apexacademy.edu",
        role: "STUDENT",
      }}
    >
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
          Notifications & Privacy
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Communication Preferences
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Customize your channel preferences, quiet hour windows, and messaging opt-ins.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-stone-500 animate-pulse bg-white rounded-2xl border border-stone-200">
          Loading preferences...
        </div>
      ) : (
        <form onSubmit={handleSave} className="max-w-2xl space-y-6">
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Essential Transactional Notice */}
          <div className="bg-white rounded-3xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-[#2A0F16]">
                  Essential Transactional Notices
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Critical academic alerts (schedule updates, class cancellations, payment receipts, password resets) are legally necessary and always dispatched to your registered email.
                </p>
              </div>
            </div>
          </div>

          {/* Optional Messaging Channels */}
          <div className="bg-white rounded-3xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-[#2A0F16] border-b border-stone-100 pb-3">
              Messaging Channels & Alerts
            </h3>

            {/* WhatsApp */}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-[#2A0F16] block">
                    WhatsApp Timetable & Fee Reminders
                  </span>
                  <span className="text-[11px] text-stone-500 block">
                    Receive official verified session reminders and payment notices on WhatsApp.
                  </span>
                </div>
              </div>

              <input
                type="checkbox"
                checked={prefs.whatsappNotifications}
                onChange={(e) =>
                  setPrefs({ ...prefs, whatsappNotifications: e.target.checked })
                }
                className="w-4 h-4 text-[#6D1A2B] rounded border-stone-300 focus:ring-[#6D1A2B]"
              />
            </div>

            {/* SMS */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100">
              <div className="flex items-start gap-3">
                <Smartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-[#2A0F16] block">
                    SMS Emergency Announcements
                  </span>
                  <span className="text-[11px] text-stone-500 block">
                    Immediate SMS text alerts for same-day weather holidays or urgent timetable shifts.
                  </span>
                </div>
              </div>

              <input
                type="checkbox"
                checked={prefs.smsNotifications}
                onChange={(e) =>
                  setPrefs({ ...prefs, smsNotifications: e.target.checked })
                }
                className="w-4 h-4 text-[#6D1A2B] rounded border-stone-300 focus:ring-[#6D1A2B]"
              />
            </div>

            {/* Marketing / Newsletter */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-[#C9A24B] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-[#2A0F16] block">
                    Academy Newsletter & Event Invitations
                  </span>
                  <span className="text-[11px] text-stone-500 block">
                    Guest lectures, hackathons, alumni webinars, and career fair updates.
                  </span>
                </div>
              </div>

              <input
                type="checkbox"
                checked={prefs.emailMarketing}
                onChange={(e) =>
                  setPrefs({ ...prefs, emailMarketing: e.target.checked })
                }
                className="w-4 h-4 text-[#6D1A2B] rounded border-stone-300 focus:ring-[#6D1A2B]"
              />
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="bg-white rounded-3xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <Moon className="w-4 h-4 text-[#6D1A2B]" />
              <h3 className="text-sm font-bold text-[#2A0F16]">
                Quiet Hours Window
              </h3>
            </div>

            <p className="text-xs text-stone-500">
              Non-urgent automated notifications will be deferred and queued during these hours.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#2A0F16] mb-1">
                  Quiet Hours Start
                </label>
                <input
                  type="time"
                  value={prefs.quietHoursStart}
                  onChange={(e) => setPrefs({ ...prefs, quietHoursStart: e.target.value })}
                  className="w-full text-xs border border-stone-200 rounded-xl p-2.5 bg-white text-[#2A0F16] focus:outline-none focus:ring-2 focus:ring-[#6D1A2B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2A0F16] mb-1">
                  Quiet Hours End
                </label>
                <input
                  type="time"
                  value={prefs.quietHoursEnd}
                  onChange={(e) => setPrefs({ ...prefs, quietHoursEnd: e.target.value })}
                  className="w-full text-xs border border-stone-200 rounded-xl p-2.5 bg-white text-[#2A0F16] focus:outline-none focus:ring-2 focus:ring-[#6D1A2B]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={saving} className="py-2.5 px-6 font-bold text-xs">
              Save Preferences
            </Button>
          </div>
        </form>
      )}
    </AppShell>
  );
}
