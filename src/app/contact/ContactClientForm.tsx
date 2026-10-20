"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, AlertCircle } from "lucide-react";

export function ContactClientForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [schedulePreference, setSchedulePreference] = useState<"WEEKDAYS" | "WEEKENDS" | "FLEXIBLE">("FLEXIBLE");
  const [message, setMessage] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!consentGiven) {
      setError("Please check the consent box to proceed.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          schedulePreference,
          message: message.trim() || undefined,
          source: "Contact Page Form",
          consentGiven: true,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Failed to submit message. Please try again.");
        return;
      }

      setSuccess(true);
      setFullName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setConsentGiven(false);
    } catch {
      setLoading(false);
      setError("Network communication error. Please try again.");
    }
  };

  if (success) {
    return (
      <div className="p-8 text-center space-y-3 bg-[#E7F3EE] rounded-2xl border border-[#A7D6C3]">
        <div className="w-12 h-12 rounded-2xl bg-white text-[#19674B] flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="font-serif font-bold text-lg text-[#251923]">Inquiry Submitted Successfully</h3>
        <p className="text-xs text-[#6B6268] max-w-sm mx-auto leading-relaxed">
          Thank you. An admissions counselor has been notified and will contact you via email or phone within one business day.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="text-xs font-semibold text-[#6D1A2B] hover:underline pt-2"
        >
          Send another inquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3.5 rounded-xl bg-[#FEECEB] border border-[#FDA29B] text-xs text-[#B42318] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-[#251923] mb-1">
          Full Legal Name *
        </label>
        <input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Michael Scott"
          className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E0D8] text-xs bg-white min-h-[44px]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#251923] mb-1">
            Email Address *
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="michael@example.com"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E0D8] text-xs bg-white min-h-[44px]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#251923] mb-1">
            Phone Number *
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 234-5678"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E0D8] text-xs bg-white min-h-[44px]"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#251923] mb-1">
          Preferred Cohort Schedule
        </label>
        <select
          value={schedulePreference}
          onChange={(e) => setSchedulePreference(e.target.value as any)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E0D8] text-xs bg-white min-h-[44px]"
        >
          <option value="FLEXIBLE">Flexible (Any Cohort Schedule)</option>
          <option value="WEEKDAYS">Weekday Evenings</option>
          <option value="WEEKENDS">Weekend Intensives</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#251923] mb-1">
          Your Message or Technical Aspirations
        </label>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Specify programs of interest, prerequisite questions, or scheduling constraints..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E0D8] text-xs bg-white"
        />
      </div>

      <div className="flex items-start gap-2.5 pt-1">
        <input
          type="checkbox"
          id="consent-contact"
          required
          checked={consentGiven}
          onChange={(e) => setConsentGiven(e.target.checked)}
          className="mt-0.5 rounded border-[#E9E0D8] text-[#6D1A2B] focus:ring-[#6D1A2B]"
        />
        <label htmlFor="consent-contact" className="text-[11px] text-[#6B6268] leading-snug">
          I consent to Apex Global Academy contacting me regarding admissions and prospectus details.
        </label>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={loading}
          className="w-full sm:w-auto min-w-[200px]"
        >
          Send Inquiry
        </Button>
      </div>
    </form>
  );
}
