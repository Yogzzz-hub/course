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
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();

  // Mode: Primary credential sign-in vs optional student OTP fallback
  const [authMode, setAuthMode] = useState<"CREDENTIALS" | "STUDENT_OTP">("CREDENTIALS");

  // Universal Credential State (Admin, Trainer, Student, Manager, Financier)
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Student OTP Fallback State
  const [studentEmail, setStudentEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Prefetch target dashboards in background
  useEffect(() => {
    router.prefetch("/admin");
    router.prefetch("/trainer");
    router.prefetch("/student");
    router.prefetch("/manager");
    router.prefetch("/financier");
  }, [router]);

  // Quick-Select Auto-Fill for Testing & Demonstration
  const fillCredentials = (role: string) => {
    setSelectedRole(role);
    setError("");
    setAuthMode("CREDENTIALS");

    switch (role) {
      case "ADMIN":
        setIdentifier("admin@apexacademy.edu");
        setPassword("Admin@123456");
        break;
      case "TRAINER":
        setIdentifier("trainer@apexacademy.edu");
        setPassword("Trainer@123456");
        break;
      case "STUDENT":
        setIdentifier("student@apexacademy.edu");
        setPassword("Student@123456");
        break;
      case "MANAGER":
        setIdentifier("manager@apexacademy.edu");
        setPassword("Manager@123456");
        break;
      case "FINANCIER":
        setIdentifier("financier@apexacademy.edu");
        setPassword("Financier@123456");
        break;
    }
  };

  // Universal Credential Submission (All Roles)
  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Authentication failed. Please verify your credentials.");
        setLoading(false);
        return;
      }

      // Resolve redirect destination based on role and returnUrl
      const searchParams = new URLSearchParams(window.location.search);
      const returnUrl = searchParams.get("returnUrl");
      let defaultDashboard = "/student";

      switch (data.user.role) {
        case "ADMIN":
          defaultDashboard = "/admin";
          break;
        case "TRAINER":
          defaultDashboard = "/trainer";
          break;
        case "MANAGER":
          defaultDashboard = "/manager";
          break;
        case "FINANCIER":
          defaultDashboard = "/financier";
          break;
        case "STUDENT":
          defaultDashboard = "/student";
          break;
      }

      const destination =
        returnUrl &&
        (data.user.role === "ADMIN" || returnUrl.startsWith(defaultDashboard))
          ? returnUrl
          : defaultDashboard;

      // Full document navigation ensures session cookies are bound and SSR is hydrated cleanly
      window.location.href = destination;
    } catch {
      setError("Network communication error. Please try again.");
      setLoading(false);
    }
  };

  // Student OTP Request
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    setOtpMessage("");
    setOtpLoading(true);
    setDevOtpHint(null);

    try {
      const res = await fetch("/api/auth/student/otp-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: studentEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "Could not dispatch OTP. Verify your student email.");
        setOtpLoading(false);
        return;
      }

      setOtpSent(true);
      setOtpMessage(data.message || "A 6-digit verification code has been dispatched.");
      if (data.devOtp) {
        setDevOtpHint(data.devOtp);
      }
      setOtpLoading(false);

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
      setOtpLoading(false);
      setOtpError("Network error. Please verify your connection.");
    }
  };

  // Student OTP Verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setOtpError("Please enter the complete 6-digit OTP code.");
      return;
    }

    setOtpError("");
    setOtpLoading(true);

    try {
      const res = await fetch("/api/auth/student/otp-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: studentEmail, code: otpCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "Verification failed. Code may have expired.");
        setOtpLoading(false);
        return;
      }

      const searchParams = new URLSearchParams(window.location.search);
      const returnUrl = searchParams.get("returnUrl");
      window.location.href = returnUrl || "/student";
    } catch {
      setOtpError("Network communication error. Please try again.");
      setOtpLoading(false);
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
      {/* Top Navbar with Academy Return Link & 4-Theme Switcher */}
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
            Unified Institutional Sign-In Portal
          </p>
        </div>

        {/* 1-Click Role Auto-Fill Pills (All 5 Roles) */}
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
            <span className="text-[10px] opacity-60 font-medium hidden sm:inline">1-Click Credential Fill</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials("ADMIN")}
              className={cn(
                "px-2.5 py-2 min-h-[44px] rounded-xl text-[11px] font-semibold border flex items-center gap-2 transition-all hover:opacity-90 active:scale-98 text-left",
                selectedRole === "ADMIN" && "ring-2"
              )}
              style={{
                backgroundColor: "var(--surface-alt)",
                borderColor: selectedRole === "ADMIN" ? "var(--accent)" : "var(--border)",
                color: "var(--text)",
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
              <span className="truncate">Admin</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("TRAINER")}
              className={cn(
                "px-2.5 py-2 min-h-[44px] rounded-xl text-[11px] font-semibold border flex items-center gap-2 transition-all hover:opacity-90 active:scale-98 text-left",
                selectedRole === "TRAINER" && "ring-2"
              )}
              style={{
                backgroundColor: "var(--surface-alt)",
                borderColor: selectedRole === "TRAINER" ? "var(--accent)" : "var(--border)",
                color: "var(--text)",
              }}
            >
              <Presentation className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
              <span className="truncate">Trainer</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("STUDENT")}
              className={cn(
                "px-2.5 py-2 min-h-[44px] rounded-xl text-[11px] font-semibold border flex items-center gap-2 transition-all hover:opacity-90 active:scale-98 text-left",
                selectedRole === "STUDENT" && "ring-2"
              )}
              style={{
                backgroundColor: "var(--surface-alt)",
                borderColor: selectedRole === "STUDENT" ? "var(--accent)" : "var(--border)",
                color: "var(--text)",
              }}
            >
              <GraduationCap className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
              <span className="truncate">Student</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("MANAGER")}
              className={cn(
                "px-2.5 py-2 min-h-[44px] rounded-xl text-[11px] font-semibold border flex items-center gap-2 transition-all hover:opacity-90 active:scale-98 text-left",
                selectedRole === "MANAGER" && "ring-2"
              )}
              style={{
                backgroundColor: "var(--surface-alt)",
                borderColor: selectedRole === "MANAGER" ? "var(--accent)" : "var(--border)",
                color: "var(--text)",
              }}
            >
              <Briefcase className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
              <span className="truncate">Manager</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("FINANCIER")}
              className={cn(
                "px-2.5 py-2 min-h-[44px] rounded-xl text-[11px] font-semibold border flex items-center gap-2 transition-all hover:opacity-90 active:scale-98 text-left col-span-2 sm:col-span-1",
                selectedRole === "FINANCIER" && "ring-2"
              )}
              style={{
                backgroundColor: "var(--surface-alt)",
                borderColor: selectedRole === "FINANCIER" ? "var(--accent)" : "var(--border)",
                color: "var(--text)",
              }}
            >
              <Coins className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
              <span className="truncate">Financier</span>
            </button>
          </div>
        </div>

        {/* Universal Single Sign-In Card */}
        <div
          className="rounded-3xl border shadow-xl p-6 sm:p-8 space-y-5"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          {authMode === "CREDENTIALS" ? (
            <form onSubmit={handleCredentialSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="break-words leading-relaxed">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1.5 opacity-90">
                  Email or Institutional ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setSelectedRole(null);
                    }}
                    placeholder="e.g. admin@apexacademy.edu, student@apexacademy.edu"
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm min-h-[44px] transition-all"
                    style={{
                      backgroundColor: "var(--surface-alt)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold opacity-90">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] font-medium opacity-70 hover:opacity-100 flex items-center gap-1"
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>Show</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm min-h-[44px] transition-all"
                    style={{
                      backgroundColor: "var(--surface-alt)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md btn-luxury flex items-center justify-center gap-2 min-h-[44px]"
                style={{ backgroundColor: "var(--accent)" }}
              >
                <span>{loading ? "Authenticating..." : "Sign In to Academy"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-3 border-t text-center" style={{ borderColor: "var(--border)" }}>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("STUDENT_OTP");
                    setStudentEmail(identifier.includes("@") ? identifier : "");
                  }}
                  className="text-xs font-semibold hover:underline transition-colors"
                  style={{ color: "var(--accent)" }}
                >
                  Need passwordless access? Student sign-in via Email OTP →
                </button>
              </div>
            </form>
          ) : (
            /* Optional Passwordless Email OTP for Students */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  <span className="text-xs font-bold">Student Email OTP Sign-In</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthMode("CREDENTIALS")}
                  className="text-[11px] font-semibold hover:underline opacity-80"
                >
                  ← Back to Password Login
                </button>
              </div>

              {otpError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="break-words leading-relaxed">{otpError}</span>
                </div>
              )}
              {otpMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="break-words leading-relaxed">{otpMessage}</span>
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
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
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
                    disabled={otpLoading}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md btn-luxury flex items-center justify-center gap-2 min-h-[44px]"
                    style={{ backgroundColor: "var(--accent)" }}
                  >
                    <span>{otpLoading ? "Dispatching..." : "Send Verification Code"}</span>
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
                    disabled={otpLoading}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md btn-luxury flex items-center justify-center gap-2 min-h-[44px]"
                    style={{ backgroundColor: "var(--accent)" }}
                  >
                    <span>{otpLoading ? "Verifying..." : "Confirm & Enter Student Portal"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      disabled={cooldown > 0 || otpLoading}
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
        © {new Date().getFullYear()} Apex Global Academy. Unified institutional access gateway.
      </div>
    </div>
  );
}
