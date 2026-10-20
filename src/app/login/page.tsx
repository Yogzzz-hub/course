"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  KeyRound,
  GraduationCap,
  Users,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Presentation,
  Briefcase,
  ShieldCheck,
  Coins,
  Mail,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"STUDENT" | "STAFF">("STUDENT");

  // Staff State
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");

  // Student OTP State
  const [studentId, setStudentId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState("");
  const [studentMessage, setStudentMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Prefetch target dashboards in background
  useEffect(() => {
    router.prefetch("/student");
    router.prefetch("/trainer");
    router.prefetch("/admin");
    router.prefetch("/manager");
    router.prefetch("/financier");
  }, [router]);

  // Quick filler for testing accounts
  const fillCredentials = (role: string) => {
    switch (role) {
      case "STUDENT":
        setActiveTab("STUDENT");
        setStudentId("student@apexacademy.edu");
        setOtpSent(false);
        setOtpCode("");
        break;
      case "TRAINER":
        setActiveTab("STAFF");
        setStaffEmail("trainer@apexacademy.edu");
        setStaffPassword("Trainer@123456");
        break;
      case "MANAGER":
        setActiveTab("STAFF");
        setStaffEmail("manager@apexacademy.edu");
        setStaffPassword("Manager@123456");
        break;
      case "ADMIN":
        setActiveTab("STAFF");
        setStaffEmail("admin@apexacademy.edu");
        setStaffPassword("Admin@123456");
        break;
      case "FINANCIER":
        setActiveTab("STAFF");
        setStaffEmail("financier@apexacademy.edu");
        setStaffPassword("Financier@123456");
        break;
    }
  };

  // Staff login submission
  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError("");
    setStaffLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: staffEmail, password: staffPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStaffError(data.error || "Authentication failed. Please verify your credentials.");
        setStaffLoading(false);
        return;
      }

      // Role-based routing
      const role = data.user.role;
      if (role === "ADMIN") router.push("/admin");
      else if (role === "MANAGER") router.push("/manager");
      else if (role === "TRAINER") router.push("/trainer");
      else if (role === "FINANCIER") router.push("/financier");
      else router.push("/student");
    } catch {
      setStaffError("Network communication error. Please try again.");
      setStaffLoading(false);
    }
  };

  // Student Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) {
      setStudentError("Please enter your registered student email address.");
      return;
    }

    setStudentError("");
    setStudentMessage("");
    setStudentLoading(true);

    try {
      const res = await fetch("/api/auth/student/otp-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: studentId }),
      });

      const data = await res.json();
      setStudentLoading(false);

      if (!res.ok) {
        setStudentError(data.error || "Failed to request OTP code.");
        return;
      }

      setOtpSent(true);
      setStudentMessage(data.message);
      if (data.devOtp) {
        setDevOtpHint(data.devOtp);
        setOtpCode(data.devOtp); // Auto-populate for test convenience
      }

      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setStudentLoading(false);
      setStudentError("Network error. Please verify your connection.");
    }
  };

  // Student Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setStudentError("Please enter the complete 6-digit OTP code.");
      return;
    }

    setStudentError("");
    setStudentLoading(true);

    try {
      const res = await fetch("/api/auth/student/otp-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: studentId, code: otpCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStudentError(data.error || "Verification failed. Code may have expired.");
        setStudentLoading(false);
        return;
      }

      router.push("/student");
    } catch {
      setStudentError("Network communication error. Please try again.");
      setStudentLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-center py-8 sm:py-12 px-3 sm:px-6 lg:px-8">
      {/* Academy Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-11 h-11 rounded-2xl bg-[#6D1A2B] text-[#F6EBCF] flex items-center justify-center font-serif font-bold text-2xl shadow-sm border border-[#C9A24B]/40 group-hover:bg-[#4E0F1E] transition-colors">
            A
          </div>
        </Link>
        <h2 className="mt-3 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#251923]">
          Apex Global Academy
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-[#6B6268] max-w-sm mx-auto">
          Secure, authenticated portal for enrolled students, faculty, and administrators.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-4">
        {/* Quick Testing Accounts Helper Banner */}
        <div className="p-4 rounded-2xl bg-white border border-[#E9E0D8] shadow-xs text-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-bold text-[#6D1A2B]">
              <div className="w-5 h-5 rounded-md bg-[#FAF6EC] flex items-center justify-center">
                <KeyRound className="w-3.5 h-3.5 text-[#C9A24B]" />
              </div>
              <span className="text-xs">Quick-Select Role Accounts</span>
            </div>
            <span className="text-[10px] text-[#6B6268] font-medium hidden sm:inline">1-Click Auto-Fill</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials("STUDENT")}
              className="px-2.5 py-2 min-h-[44px] bg-[#FBF9F5] border border-[#E9E0D8] hover:border-[#6D1A2B] rounded-xl text-[11px] font-semibold text-[#251923] hover:text-[#6D1A2B] flex items-center gap-2 transition-all group active:scale-98 text-left"
            >
              <div className="w-6 h-6 rounded-lg bg-[#E7F3EE] border border-[#A7D6C3] flex items-center justify-center shrink-0">
                <GraduationCap className="w-3.5 h-3.5 text-[#19674B]" />
              </div>
              <span className="truncate">Student</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("TRAINER")}
              className="px-2.5 py-2 min-h-[44px] bg-[#FBF9F5] border border-[#E9E0D8] hover:border-[#6D1A2B] rounded-xl text-[11px] font-semibold text-[#251923] hover:text-[#6D1A2B] flex items-center gap-2 transition-all group active:scale-98 text-left"
            >
              <div className="w-6 h-6 rounded-lg bg-[#FAF6EC] border border-[#DEC278] flex items-center justify-center shrink-0">
                <Presentation className="w-3.5 h-3.5 text-[#997324]" />
              </div>
              <span className="truncate">Trainer</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("MANAGER")}
              className="px-2.5 py-2 min-h-[44px] bg-[#FBF9F5] border border-[#E9E0D8] hover:border-[#6D1A2B] rounded-xl text-[11px] font-semibold text-[#251923] hover:text-[#6D1A2B] flex items-center gap-2 transition-all group active:scale-98 text-left"
            >
              <div className="w-6 h-6 rounded-lg bg-[#EAF2F5] border border-[#97B8C4] flex items-center justify-center shrink-0">
                <Briefcase className="w-3.5 h-3.5 text-[#315F70]" />
              </div>
              <span className="truncate">Manager</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("ADMIN")}
              className="px-2.5 py-2 min-h-[44px] bg-[#FBF9F5] border border-[#E9E0D8] hover:border-[#6D1A2B] rounded-xl text-[11px] font-semibold text-[#251923] hover:text-[#6D1A2B] flex items-center gap-2 transition-all group active:scale-98 text-left"
            >
              <div className="w-6 h-6 rounded-lg bg-[#FDF5F6] border border-[#F7D1D7] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-[#6D1A2B]" />
              </div>
              <span className="truncate">Admin</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("FINANCIER")}
              className="px-2.5 py-2 min-h-[44px] bg-[#FBF9F5] border border-[#E9E0D8] hover:border-[#6D1A2B] rounded-xl text-[11px] font-semibold text-[#251923] hover:text-[#6D1A2B] flex items-center gap-2 transition-all group active:scale-98 text-left col-span-2 sm:col-span-1"
            >
              <div className="w-6 h-6 rounded-lg bg-[#FAF6EC] border border-[#DEC278] flex items-center justify-center shrink-0">
                <Coins className="w-3.5 h-3.5 text-[#997324]" />
              </div>
              <span className="truncate">Financier</span>
            </button>
          </div>
        </div>

        {/* Auth Box */}
        <div className="bg-white rounded-2xl shadow-card border border-[#E9E0D8] overflow-hidden">
          <div className="flex border-b border-[#E9E0D8] bg-[#F5F0E8]/50">
            <button
              onClick={() => setActiveTab("STUDENT")}
              className={`flex-1 py-3.5 px-4 min-h-[48px] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeTab === "STUDENT"
                  ? "border-[#6D1A2B] text-[#6D1A2B] bg-white"
                  : "border-transparent text-[#6B6268] hover:text-[#251923]"
              }`}
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span>Student (Email OTP)</span>
            </button>
            <button
              onClick={() => setActiveTab("STAFF")}
              className={`flex-1 py-3.5 px-4 min-h-[48px] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeTab === "STAFF"
                  ? "border-[#6D1A2B] text-[#6D1A2B] bg-white"
                  : "border-transparent text-[#6B6268] hover:text-[#251923]"
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Staff & Faculty</span>
            </button>
          </div>

          <div className="p-5 sm:p-7">
            {/* Student OTP View */}
            {activeTab === "STUDENT" && (
              <div className="space-y-4">
                {studentError && (
                  <div className="p-3 rounded-xl bg-[#FEECEB] border border-[#FDA29B] text-xs text-[#B42318] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="break-words leading-relaxed">{studentError}</span>
                  </div>
                )}
                {studentMessage && (
                  <div className="p-3 rounded-xl bg-[#E7F3EE] border border-[#A7D6C3] text-xs text-[#19674B] flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="break-words leading-relaxed">{studentMessage}</span>
                  </div>
                )}

                {!otpSent ? (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-[#251923]">
                          Registered Student Email
                        </label>
                        <span className="text-[10px] text-[#C9A24B] font-bold uppercase tracking-wider">
                          Passwordless OTP
                        </span>
                      </div>
                      <input
                        type="email"
                        required
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        placeholder="student@apexacademy.edu"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E0D8] focus:outline-none focus:border-[#6D1A2B] text-sm bg-white min-h-[44px]"
                      />
                      <p className="mt-1.5 text-[11px] text-[#6B6268]">
                        A 6-digit one-time code will be dispatched to your registered student inbox.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      isLoading={studentLoading}
                      className="w-full"
                    >
                      <span>Send Verification Code</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-semibold text-[#251923]">
                          Enter 6-Digit OTP Code
                        </label>
                        <button
                          type="button"
                          onClick={() => setOtpSent(false)}
                          className="text-[11px] text-[#6D1A2B] hover:underline font-semibold min-h-[36px] flex items-center"
                        >
                          Change Email
                        </button>
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E0D8] focus:outline-none focus:border-[#6D1A2B] text-center text-xl tracking-widest font-mono font-bold bg-white min-h-[48px]"
                      />
                      {devOtpHint && (
                        <p className="mt-2 text-xs font-semibold text-[#6D1A2B] bg-[#FAF6EC] p-2.5 rounded-xl border border-[#DEC278] text-center break-words">
                          Development OTP Detected: <span className="font-mono">{devOtpHint}</span>
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      isLoading={studentLoading}
                      className="w-full"
                    >
                      Verify & Access Student Portal
                    </Button>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={cooldown > 0 || studentLoading}
                        className="text-xs text-[#6B6268] hover:text-[#6D1A2B] disabled:opacity-50 py-1 min-h-[36px] inline-flex items-center justify-center font-medium"
                      >
                        {cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't receive code? Resend"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Staff Password View */}
            {activeTab === "STAFF" && (
              <form onSubmit={handleStaffSubmit} className="space-y-4">
                {staffError && (
                  <div className="p-3 rounded-xl bg-[#FEECEB] border border-[#FDA29B] text-xs text-[#B42318] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="break-words leading-relaxed">{staffError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#251923] mb-1.5">
                    Official Staff Email
                  </label>
                  <input
                    type="email"
                    required
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="name@apexacademy.edu"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E0D8] focus:outline-none focus:border-[#6D1A2B] text-sm bg-white min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#251923] mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E0D8] focus:outline-none focus:border-[#6D1A2B] text-sm bg-white min-h-[44px]"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={staffLoading}
                  className="w-full"
                >
                  <span>Sign In to Management Portal</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Public Links Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-[#6B6268] pt-2 px-1 gap-2">
          <Link href="/" className="hover:text-[#6D1A2B] transition-colors font-medium">
            ← Return to Academy Homepage
          </Link>
          <Link
            href="/verify-certificate"
            className="flex items-center gap-1.5 text-[#315F70] hover:text-[#6D1A2B] transition-colors font-semibold"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Public Certificate Verification</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
