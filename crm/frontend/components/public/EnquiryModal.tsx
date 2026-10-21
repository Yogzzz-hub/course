"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, AlertCircle } from "lucide-react";

export interface EnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCourseId?: string;
  defaultCourseTitle?: string;
}

export function EnquiryModal({
  isOpen,
  onClose,
  defaultCourseId,
  defaultCourseTitle,
}: EnquiryModalProps) {
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
      setError("Please grant consent to be contacted regarding your academic enquiry.");
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
          courseInterestId: defaultCourseId || null,
          schedulePreference,
          message: message.trim() || undefined,
          source: "Website Landing Enquiry",
          consentGiven: true,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Failed to submit enquiry. Please try again.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFullName("");
        setEmail("");
        setPhone("");
        setMessage("");
        setConsentGiven(false);
      }, 3000);
    } catch {
      setLoading(false);
      setError("Network communication error. Please try again.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Academic Prospectus & Consultation"
      description={
        defaultCourseTitle
          ? `Inquiring for: ${defaultCourseTitle}`
          : "Connect with our admissions committee regarding curriculum, schedules, and tuition agreements."
      }
      size="md"
    >
      {success ? (
        <div className="p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#E7F3EE] text-[#19674B] border border-[#A7D6C3] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-lg text-[#251923]">Enquiry Received</h3>
          <p className="text-xs text-[#6B6268] max-w-sm mx-auto leading-relaxed">
            Thank you! Your enquiry has been registered with the admissions office. An advisor will contact you within one business day.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-[#FEECEB] border border-[#FDA29B] text-xs text-[#B42318] flex items-start gap-2">
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
              placeholder="e.g. Dr. Jane Doe"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E0D8] text-xs bg-white min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#251923] mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane.doe@example.com"
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
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E0D8] text-xs bg-white min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#251923] mb-1">
              Schedule Preference
            </label>
            <select
              value={schedulePreference}
              onChange={(e) => setSchedulePreference(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E0D8] text-xs bg-white min-h-[44px]"
            >
              <option value="FLEXIBLE">Flexible (Any Cohort Schedule)</option>
              <option value="WEEKDAYS">Weekdays (Evening Masterclasses)</option>
              <option value="WEEKENDS">Weekends (Intensive Saturday/Sunday)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#251923] mb-1">
              Academic Background / Questions
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us about your educational background or technical aspirations..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E0D8] text-xs bg-white"
            />
          </div>

          <div className="flex items-start gap-2.5 pt-1">
            <input
              type="checkbox"
              id="consent"
              required
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-0.5 rounded border-[#E9E0D8] text-[#6D1A2B] focus:ring-[#6D1A2B]"
            />
            <label htmlFor="consent" className="text-[11px] text-[#6B6268] leading-snug">
              I consent to Apex Global Academy processing my information to contact me regarding admissions and prospectus details.
            </label>
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={loading}
              className="w-full sm:w-auto"
            >
              Submit Admissions Enquiry
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
