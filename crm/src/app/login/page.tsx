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
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"STUDENT" | "STAFF">("STAFF");

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

      // Route immediately based on user role
      switch (data.user.role) {
        case "ADMIN":
          router.push("/admin");
          break;
        case "TRAINER":
          router.push("/trainer");
          break;
        case "MANAGER":
          router.push("/manager");
          break;
        case "FINANCIER":
          router.push("/financier");
          break;
        case "STUDENT":
          router.push("/student");
          break;
        default:
          router.push("/student");
      }
    } catch {
      setStaffError("Network communication error. Please try again.");
      setStaffLoading(false);
    }
  };

  // Student Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError("");
    setStudentMessage("");
    setStudentLoading(true);
    setDevOtpHint(null);

    try {
      const res = await fetch("/api/auth/student/otp-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: studentId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStudentError(data.error || "Could not dispatch OTP. Verify your student email.");
        setStudentLoading(false);
        return;
      }

      setOtpSent(true);
      setStudentMessage(data.message || "A 6-digit verification code has been dispatched.");
      if (data.devOtp) {
        setDevOtpHint(data.devOtp);
      }
      setStudentLoading(false);

      // Start 60s cooldown
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
    <div
      className="min-h-screen flex flex-col justify-between py-6 sm:py-10 px-3 sm:px-6 lg:px-8 transition-colors duration-300"
      style={{
        backgroundColor: "var(--bg)",
        color: "var(--text)",
      }}
    >
      {/* Top Navbar with Academy Link & Theme Switcher */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between mb-4">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: "var(--text)" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Academy</span>
        </Link>
        <ThemeSwitcher />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div
              className="w-12 h-12 rounded-2xl text-white flex items-center justify-center font-bold text-2xl shadow-md transition-all duration-300"
              style={{ backgroundColor: "var(--accent)" }}
            >
              A
            </div>
          </Link>
          <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
            Apex Global Academy
          </h2>
          <p className="text-xs sm:text-sm opacity-70 max-w-sm mx-auto leading-relaxed">
            Institutional Management Portal & Unified Operations
          </p>
        </div>

        {/* Quick Testing Accounts Helper Banner */}
        <div
          className="p-4 rounded-2xl border shadow-xs text-xs space-y-3"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold" style={{ color: "var(--accent)" }}>
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ backgroundColor: "var(--surface-alt)" }}
              >
                <KeyRound className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
              </div>
              <span className="text-xs">Quick-Select Role Accounts</span>
            </div>
            <span className="text-[10px] opacity-60 font-medium hidden sm:inline">1-Click Auto-Fill</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials("TRAINER")}
              className="px-2.5 py-2 min-h-[44px] rounded-xl text-[11px] font-semibold border flex items-center gap-2 transition-all hover:opacity-90 active:scale-98 text-left"
              style={{
                backgroundColor: "var(--surface-alt)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            >
              <Presentation className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
              <span className="truncate">Trainer</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("ADMIN")}
              className="px-2.5 py-2 min-h-[44px] rounded-xl text-[11px] font-semibold border flex items-center gap-2 transition-all hover:opacity-90 active:scale-98 text-left"
              style={{
                backgroundColor: "var(--surface-alt)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
              <span className="truncate">Admin</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("STUDENT")}
              className="px-2.5 py-2 min-h-[44px] rounded-xl text-[11px] font-semibold border flex items-center gap-2 transition-all hover:opacity-90 active:scale-98 text-left"
              style={{
                backgroundColor: "var(--surface-alt)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            >
              <GraduationCap className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
              <span className="truncate">Student</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("MANAGER")}
              className="px-2.5 py-2 min-h-[44px] rounded-xl text-[11px] font-semibold border flex items-center gap-2 transition-all hover:opacity-90 active:scale-98 text-left"
              style={{
                backgroundColor: "var(--surface-alt)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            >
              <Briefcase className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
              <span className="truncate">Manager</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("FINANCIER")}
              className="px-2.5 py-2 min-h-[44px] rounded-xl text-[11px] font-semibold border flex items-center gap-2 transition-all hover:opacity-90 active:scale-98 text-left col-span-2 sm:col-span-1"
              style={{
                backgroundColor: "var(--surface-alt)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            >
              <Coins className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
              <span className="truncate">Financier</span>
            </button>
          </div>
        </div>

        {/* Capsule Tabs Switcher */}
        <div className="flex justify-center">
          <div className="nav-capsule">
            <button
              type="button"
              onClick={() => setActiveTab("STAFF")}
              className={cn("nav-capsule-item", activeTab === "STAFF" && "active")}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Staff & Faculty</span>
              {activeTab === "STAFF" && <span className="pulse-dot" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("STUDENT")}
              className={cn("nav-capsule-item", activeTab === "STUDENT" && "active")}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Student (Email OTP)</span>
              {activeTab === "STUDENT" && <span className="pulse-dot" />}
            </button>
          </div>
        </div>

        {/* Main Auth Form Card */}
        <div
          className="rounded-3xl border shadow-xl p-6 sm:p-8 space-y-5"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          {/* Staff Login View */}
          {activeTab === "STAFF" && (
            <form onSubmit={handleStaffSubmit} className="space-y-4">
              {staffError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="break-words leading-relaxed">{staffError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1.5 opacity-90">
                  Official Staff Email
                </label>
                <input
                  type="email"
                  required
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="faculty@apexacademy.edu"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm min-h-[44px] transition-all"
                  style={{
                    backgroundColor: "var(--surface-alt)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 opacity-90">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm min-h-[44px] transition-all"
                  style={{
                    backgroundColor: "var(--surface-alt)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={staffLoading}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md btn-luxury flex items-center justify-center gap-2 min-h-[44px]"
                style={{ backgroundColor: "var(--accent)" }}
              >
                <span>{staffLoading ? "Authenticating..." : "Sign In to Management Portal"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Student OTP View */}
          {activeTab === "STUDENT" && (
            <div className="space-y-4">
              {studentError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="break-words leading-relaxed">{studentError}</span>
                </div>
              )}
              {studentMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="break-words leading-relaxed">{studentMessage}</span>
                </div>
              )}

              {!otpSent ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 opacity-90">
                      Registered Student Email
                    </label>
                    <input
                      type="email"
                      required
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="student@apexacademy.edu"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-sm min-h-[44px] transition-all"
                      style={{
                        backgroundColor: "var(--surface-alt)",
                        borderColor: "var(--border)",
                        color: "var(--text)",
                      }}
                    />
                    <p className="mt-1.5 text-[11px] opacity-60">
                      A 6-digit one-time code will be dispatched to your registered student inbox.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={studentLoading}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md btn-luxury flex items-center justify-center gap-2 min-h-[44px]"
                    style={{ backgroundColor: "var(--accent)" }}
                  >
                    <span>{studentLoading ? "Dispatching..." : "Send Verification Code"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-semibold opacity-90">
                        Enter 6-Digit OTP Code
                      </label>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-[11px] font-semibold hover:underline"
                        style={{ color: "var(--accent)" }}
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
                      className="w-full px-3.5 py-2.5 rounded-xl border text-center text-xl font-mono tracking-widest min-h-[48px]"
                      style={{
                        backgroundColor: "var(--surface-alt)",
                        borderColor: "var(--border)",
                        color: "var(--text)",
                      }}
                    />
                    {devOtpHint && (
                      <p className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        Dev Test OTP: <strong>{devOtpHint}</strong>
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={studentLoading}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md btn-luxury flex items-center justify-center gap-2 min-h-[44px]"
                    style={{ backgroundColor: "var(--accent)" }}
                  >
                    <span>{studentLoading ? "Verifying..." : "Confirm & Enter Student Portal"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      disabled={cooldown > 0 || studentLoading}
                      onClick={handleRequestOtp}
                      className="text-xs opacity-70 hover:opacity-100 disabled:opacity-40"
                    >
                      {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend Code"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs opacity-60 mt-8">
        © {new Date().getFullYear()} Apex Global Academy. Cryptographically secured institutional portal.
      </div>
    </div>
  );
}
