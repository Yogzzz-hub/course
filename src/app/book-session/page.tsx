"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import {
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Briefcase,
  Target,
  KeyRound,
  Loader2,
} from "lucide-react";

interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
  available: boolean;
}

export default function BookSessionPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  // Form states
  const [selectedProgramme, setSelectedProgramme] = useState("Full Stack Web & Mobile App Development");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [background, setBackground] = useState("");
  const [goals, setGoals] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // Async action states
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [bookingResult, setBookingResult] = useState<{ bookingId: string } | null>(null);

  useEffect(() => {
    fetch("/api/booking/slots")
      .then((res) => res.json())
      .then((data) => {
        if (data.slots && Array.isArray(data.slots)) {
          setSlots(data.slots);
          if (data.slots.length > 0) {
            setSelectedSlot(data.slots[0]);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSlots(false));
  }, []);

  const handleSendOtp = async () => {
    if (!fullName || !email || !phone) {
      setErrorMessage("Please complete all required contact fields.");
      return;
    }
    setErrorMessage("");
    setSendingOtp(true);

    try {
      const res = await fetch("/api/booking/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          about: { fullName, email, phone },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStep(4);
      } else {
        setErrorMessage(data.error || "Failed to dispatch verification code. Please check your email.");
      }
    } catch {
      setErrorMessage("Network error connecting to booking service.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyAndConfirm = async () => {
    if (!otpCode || otpCode.length < 6) {
      setErrorMessage("Please enter the 6-digit verification code sent to your email.");
      return;
    }
    setErrorMessage("");
    setVerifyingOtp(true);

    try {
      // 1. Verify OTP
      const otpRes = await fetch("/api/booking/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode }),
      });
      const otpData = await otpRes.json();

      if (!otpRes.ok || !otpData.verified) {
        setErrorMessage(otpData.error || "Invalid or expired verification code.");
        setVerifyingOtp(false);
        return;
      }

      // 2. Finalize Booking
      const bookRes = await fetch("/api/booking/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programmeId: selectedProgramme.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          programmeTitle: selectedProgramme,
          slot: selectedSlot,
          about: { fullName, email, phone },
          brief: { background, goals },
        }),
      });
      const bookData = await bookRes.json();

      if (bookRes.ok && bookData.success) {
        setBookingResult({ bookingId: bookData.bookingId });
      } else {
        setErrorMessage(bookData.error || "Failed to finalize booking confirmation.");
      }
    } catch {
      setErrorMessage("An unexpected error occurred during confirmation.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const programmes = [
    "Python Full Stack Engineering",
    "Full Stack Web & Mobile App Development",
    "Modern Django Backend Architecture",
    "Professional React & Frontend Engineering",
    "Advanced Python, Concurrency & Systems",
    "Cloud Native DevOps, Docker & CI/CD",
    "Data Structures, Algorithms & Problem Solving",
    "Programming Foundation with Python",
    "Core Frontend: HTML5, Modern CSS & JavaScript",
    "Relational Database Design with SQL & PostgreSQL",
    "Software Engineering, Architecture & Testing",
    "Practical AI Engineering & Modern Tooling",
  ];

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-between text-[#251923]">
      <PublicNavbar />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6D1A2B]/10 text-[#6D1A2B] text-xs font-semibold tracking-wide uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#C9A24B]" />
            Admissions &amp; Academic Strategy
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#251923] tracking-tight">
            Schedule Your 1-on-1 Consultation
          </h1>
          <p className="mt-2 text-base text-[#64748B]">
            Meet with our Senior Academic Advisor to evaluate your technical background, career goals, and syllabus fit.
          </p>
        </div>

        {/* Success Screen */}
        {bookingResult ? (
          <div className="bg-white rounded-2xl border border-emerald-200 p-8 sm:p-12 text-center shadow-sm max-w-xl mx-auto">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-[#251923] mb-2">Strategy Session Confirmed!</h2>
            <p className="text-[#64748B] text-sm mb-6">
              We have reserved your slot and dispatched a calendar invite to <strong className="text-[#251923]">{email}</strong>.
            </p>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 mb-8 text-left text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Reference ID:</span>
                <span className="font-mono font-bold text-[#6D1A2B]">{bookingResult.bookingId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Programme:</span>
                <span className="font-semibold text-[#251923]">{selectedProgramme}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Candidate:</span>
                <span className="font-semibold text-[#251923]">{fullName}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/courses"
                className="px-6 py-2.5 bg-[#6D1A2B] text-white rounded-lg font-semibold text-sm hover:bg-[#5B1423] transition-colors"
              >
                Browse Syllabus Catalog
              </Link>
              <Link
                href="/"
                className="px-6 py-2.5 bg-gray-100 text-[#251923] rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        ) : (
          /* Wizard Form */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Step Indicators */}
            <div className="border-b border-gray-100 bg-[#FBF9F5]/50 px-6 py-4 flex items-center justify-between text-xs font-semibold text-[#64748B]">
              <div className={`flex items-center gap-2 ${step >= 1 ? "text-[#6D1A2B]" : ""}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 1 ? "bg-[#6D1A2B] text-white" : "bg-gray-200"}`}>1</span>
                <span>Programme</span>
              </div>
              <span className="text-gray-300">→</span>
              <div className={`flex items-center gap-2 ${step >= 2 ? "text-[#6D1A2B]" : ""}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 2 ? "bg-[#6D1A2B] text-white" : "bg-gray-200"}`}>2</span>
                <span>Slot</span>
              </div>
              <span className="text-gray-300">→</span>
              <div className={`flex items-center gap-2 ${step >= 3 ? "text-[#6D1A2B]" : ""}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 3 ? "bg-[#6D1A2B] text-white" : "bg-gray-200"}`}>3</span>
                <span>Intake</span>
              </div>
              <span className="text-gray-300">→</span>
              <div className={`flex items-center gap-2 ${step >= 4 ? "text-[#6D1A2B]" : ""}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 4 ? "bg-[#6D1A2B] text-white" : "bg-gray-200"}`}>4</span>
                <span>Verify</span>
              </div>
            </div>

            <div className="p-6 sm:p-10">
              {errorMessage && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {errorMessage}
                </div>
              )}

              {/* STEP 1: Select Programme */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#251923] mb-1">Select Academic Programme</h2>
                    <p className="text-sm text-[#64748B]">Choose the curriculum you want to explore during your consultation.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {programmes.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSelectedProgramme(p)}
                        className={`p-4 rounded-xl text-left border text-sm font-semibold transition-all ${
                          selectedProgramme === p
                            ? "border-[#6D1A2B] bg-[#6D1A2B]/5 text-[#6D1A2B] shadow-sm"
                            : "border-gray-200 hover:border-gray-300 text-[#251923]"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-6 py-2.5 bg-[#6D1A2B] text-white rounded-lg font-semibold text-sm hover:bg-[#5B1423] inline-flex items-center gap-2"
                    >
                      <span>Choose Preferred Slot</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Choose Slot */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#251923] mb-1">Select Date &amp; Time Slot</h2>
                    <p className="text-sm text-[#64748B]">All sessions are conducted 1-on-1 via Google Meet in Indian Standard Time (IST).</p>
                  </div>
                  {loadingSlots ? (
                    <div className="py-12 flex justify-center items-center gap-2 text-sm text-[#64748B]">
                      <Loader2 className="w-5 h-5 animate-spin text-[#6D1A2B]" />
                      <span>Loading available advisors...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {slots.map((s) => {
                        const dateObj = new Date(s.startsAt);
                        const dayStr = dateObj.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
                        const timeStr = dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSelectedSlot(s)}
                            className={`p-4 rounded-xl border text-left transition-all ${
                              selectedSlot?.id === s.id
                                ? "border-[#6D1A2B] bg-[#6D1A2B]/5 shadow-sm"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-center gap-2 text-[#6D1A2B] font-bold text-sm mb-1">
                              <Calendar className="w-4 h-4" />
                              <span>{dayStr}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[#64748B]">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{timeStr} IST (45 mins)</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="pt-4 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-50 inline-flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      disabled={!selectedSlot}
                      className="px-6 py-2.5 bg-[#6D1A2B] text-white rounded-lg font-semibold text-sm hover:bg-[#5B1423] inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      <span>Continue to Intake</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Candidate Intake & Contact Details */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#251923] mb-1">Candidate Profile &amp; Objectives</h2>
                    <p className="text-sm text-[#64748B]">Help your academic advisor prepare personalized syllabus guidance.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">
                        Full Name *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6D1A2B]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. john@example.com"
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6D1A2B]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">
                        Phone / WhatsApp *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6D1A2B]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">
                      Current Background &amp; Technical Experience
                    </label>
                    <textarea
                      rows={3}
                      value={background}
                      onChange={(e) => setBackground(e.target.value)}
                      placeholder="e.g. Final-year CS undergraduate with basic Python knowledge, looking to transition into full-stack architecture."
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6D1A2B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">
                      Target Career Objectives &amp; Desired Timeline
                    </label>
                    <textarea
                      rows={3}
                      value={goals}
                      onChange={(e) => setGoals(e.target.value)}
                      placeholder="e.g. Aiming for SDE-1 backend roles within 6 months, need structured mock interviews and production deployment experience."
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6D1A2B]"
                    />
                  </div>

                  <div className="pt-4 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-50 inline-flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp}
                      className="px-6 py-2.5 bg-[#6D1A2B] text-white rounded-lg font-semibold text-sm hover:bg-[#5B1423] inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      {sendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      <span>{sendingOtp ? "Sending Code..." : "Verify & Reserve"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: OTP Verification */}
              {step === 4 && (
                <div className="space-y-6 max-w-md mx-auto text-center py-4">
                  <div className="w-12 h-12 bg-[#6D1A2B]/10 text-[#6D1A2B] rounded-full flex items-center justify-center mx-auto mb-2">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#251923] mb-1">Enter Verification Code</h2>
                    <p className="text-sm text-[#64748B]">
                      We sent a 6-digit confirmation code to <strong className="text-[#251923]">{email}</strong>.
                    </p>
                  </div>
                  <div>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="w-48 text-center text-2xl font-mono font-bold tracking-widest py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D1A2B]"
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={handleVerifyAndConfirm}
                      disabled={verifyingOtp || otpCode.length < 6}
                      className="w-full py-3 bg-[#6D1A2B] text-white rounded-xl font-bold text-sm hover:bg-[#5B1423] inline-flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                    >
                      {verifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>{verifyingOtp ? "Confirming Session..." : "Confirm & Dispatch Invite"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp}
                      className="text-xs text-[#64748B] hover:text-[#6D1A2B] font-semibold"
                    >
                      Didn&apos;t receive code? Resend email
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      ← Change contact details
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
