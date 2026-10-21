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
  Layers,
  Sparkles,
  Award,
  TrendingUp,
  CheckCircle2,
  Calendar,
  RotateCcw,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { BrandLogo, AintrixLogoMark } from "@/components/ui/BrandLogo";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();

  // Mode: Primary credential sign-in vs forgot password vs optional student OTP fallback
  const [authMode, setAuthMode] = useState<"CREDENTIALS" | "FORGOT_PASSWORD" | "STUDENT_OTP">("CREDENTIALS");

  // Universal Credential State (Admin, Trainer, Student, Manager, Financier)
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Forgot Password / Password Reset State (Non-refresh inline flow)
  const [resetStep, setResetStep] = useState<"REQUEST" | "VERIFY_AND_RESET" | "SUCCESS">("REQUEST");
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetOtpCode, setResetOtpCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccessMsg, setResetSuccessMsg] = useState("");
  const [resetMaskedEmail, setResetMaskedEmail] = useState("");
  const [devResetOtp, setDevResetOtp] = useState<string | null>(null);
  const [resetCooldown, setResetCooldown] = useState(0);

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

      // Full document navigation ensures session cookies are bound cleanly
      window.location.href = destination;
    } catch {
      setError("Network communication error. Please try again.");
      setLoading(false);
    }
  };

  // Forgot Password: Request OTP Handler (Non-refresh inline transition)
  const handleRequestResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetSuccessMsg("");
    setResetLoading(true);
    setDevResetOtp(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: resetIdentifier }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResetError(data.error || "Could not dispatch reset code. Please check your identifier.");
        setResetLoading(false);
        return;
      }

      setResetSuccessMsg(data.message || "A 6-digit verification code has been dispatched.");
      if (data.maskedEmail) setResetMaskedEmail(data.maskedEmail);
      if (data.devOtp) setDevResetOtp(data.devOtp);
      setResetLoading(false);
      setResetStep("VERIFY_AND_RESET");

      setResetCooldown(60);
      const timer = setInterval(() => {
        setResetCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setResetLoading(false);
      setResetError("Network communication error. Please try again.");
    }
  };

  // Forgot Password: Submit OTP and New Password Handler (Non-refresh)
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");

    if (resetOtpCode.length !== 6) {
      setResetError("Please enter the complete 6-digit verification code.");
      return;
    }

    if (resetNewPassword.length < 6) {
      setResetError("New password must be at least 6 characters in length.");
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("Passwords do not match. Please verify both entries.");
      return;
    }

    setResetLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: resetIdentifier,
          code: resetOtpCode,
          newPassword: resetNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResetError(data.error || "Password reset failed. Code may have expired or is invalid.");
        setResetLoading(false);
        return;
      }

      setResetLoading(false);
      setResetStep("SUCCESS");
      setResetSuccessMsg(data.message || "Your password has been successfully updated!");
    } catch {
      setResetLoading(false);
      setResetError("Network error during password reset. Please try again.");
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
      className="min-h-screen relative flex flex-col justify-between transition-colors duration-300 overflow-x-hidden"
      style={{
        backgroundColor: "var(--bg)",
        color: "var(--text)",
      }}
    >
      {/* Background Decorative Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full blur-3xl opacity-20 transition-all duration-700"
          style={{ backgroundColor: "var(--accent)" }}
        />
        <div
          className="absolute -bottom-[20%] -right-[10%] w-[50vw] h-[50vw] rounded-full blur-3xl opacity-15 transition-all duration-700"
          style={{ backgroundColor: "#1CE798" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(#00000008_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Top Navbar: Return Link, Live Telemetry & Theme Switcher */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all hover:-translate-x-0.5 opacity-85 hover:opacity-100 shadow-2xs"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
            color: "var(--text)",
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Academy</span>
        </Link>

        <div
          className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-semibold border shadow-2xs"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
            color: "var(--text)",
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="opacity-90">Systems Operational</span>
          <span className="opacity-40">•</span>
          <span className="opacity-70 text-[10px] tracking-wider uppercase font-mono">Term 2026-Q4</span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeSwitcher />
        </div>
      </header>

      {/* Main Content: Split Grid with Progression Showcase (Left) and Sign-In Card (Right) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Academic Progression & Institutional Excellence */}
          <div className="lg:col-span-6 space-y-6 lg:pr-6">
            <div className="space-y-4">
              {/* Brand Capsule directly matching Image 2 */}
              <div className="inline-block">
                <BrandLogo variant="capsule" markSize={36} />
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold tracking-tight leading-[1.15]">
                Engineering Rigor & <br className="hidden sm:inline" />
                <span
                  className="bg-clip-text text-transparent bg-gradient-to-r"
                  style={{
                    backgroundImage: "linear-gradient(135deg, var(--text) 0%, var(--accent) 100%)",
                  }}
                >
                  Academic Progression
                </span>
              </h1>

              <p className="text-sm sm:text-base opacity-75 max-w-xl leading-relaxed">
                A unified institutional governance portal connecting students, faculty instructors, admissions, and leadership through verified real-time progression.
              </p>
            </div>

            {/* Progression Pillars */}
            <div className="space-y-3 pt-2">
              <div
                className="p-4 rounded-2xl border transition-all duration-300 hover:shadow-md space-y-2.5"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                    style={{ backgroundColor: "var(--surface-alt)" }}
                  >
                    <TrendingUp className="w-4 h-4 text-[#10B981]" />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <h2 className="text-xs font-bold font-display tracking-wide uppercase">
                        Curriculum Progression
                      </h2>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        100% Verified
                      </span>
                    </div>
                    <p className="text-xs opacity-70 leading-relaxed">
                      Granular subtopic coverage, multi-version syllabus timetables, and automated module milestone tracking.
                    </p>
                  </div>
                </div>

                <div className="pt-1 space-y-1">
                  <div className="flex justify-between text-[11px] opacity-75 font-medium">
                    <span>Active Engineering Track</span>
                    <span className="font-bold text-emerald-600">88/88 Subtopics (100%)</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-stone-200/60 dark:bg-stone-800/60 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full w-full" />
                  </div>
                </div>
              </div>

              <div
                className="p-4 rounded-2xl border transition-all duration-300 hover:shadow-md space-y-2.5"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                    style={{ backgroundColor: "var(--surface-alt)" }}
                  >
                    <CheckCircle2 className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <h2 className="text-xs font-bold font-display tracking-wide uppercase">
                        Attendance & Class Integrity
                      </h2>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                        Live Audit
                      </span>
                    </div>
                    <p className="text-xs opacity-70 leading-relaxed">
                      Deterministic session occurrence generation, tamper-proof student attendance logs, and formal backdate governance.
                    </p>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 opacity-75">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>0-Latency Telemetry Sync</span>
                  </span>
                  <span className="font-mono text-blue-600 font-semibold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px]">
                    SHA-256 Audit Trail
                  </span>
                </div>
              </div>

              <div
                className="p-4 rounded-2xl border transition-all duration-300 hover:shadow-md space-y-2.5"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                    style={{ backgroundColor: "var(--surface-alt)" }}
                  >
                    <Award className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <h2 className="text-xs font-bold font-display tracking-wide uppercase">
                        Credential Certification
                      </h2>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        Cryptographic
                      </span>
                    </div>
                    <p className="text-xs opacity-70 leading-relaxed">
                      Instant public verification badges, verifiable diploma tokens, and executive academic completion certificates.
                    </p>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <span className="opacity-75">Instant Public QR Verification</span>
                  <span className="font-mono text-amber-600 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px]">
                    Cryptographically Sealed
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-3 pt-1 text-center">
              <div
                className="p-3 rounded-xl border"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <span className="block text-lg font-bold font-display leading-tight" style={{ color: "var(--accent)" }}>
                  5 Portals
                </span>
                <span className="text-[10px] opacity-60 font-medium">Unified Sign-In</span>
              </div>
              <div
                className="p-3 rounded-xl border"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <span className="block text-lg font-bold font-display leading-tight text-emerald-600">
                  100%
                </span>
                <span className="text-[10px] opacity-60 font-medium">Audit Compliance</span>
              </div>
              <div
                className="p-3 rounded-xl border"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <span className="block text-lg font-bold font-display leading-tight text-amber-600">
                  Live
                </span>
                <span className="text-[10px] opacity-60 font-medium">Session Sync</span>
              </div>
            </div>
          </div>

          {/* Right Column: Creative, Professionally Aligned Sign-In Card */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md space-y-4">
              
              {/* The Sign-In Luxury Card */}
              <div
                className="rounded-3xl border shadow-xl p-6 sm:p-8 space-y-5 backdrop-blur-xl relative"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                {/* Header within Card */}
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight">
                      {authMode === "FORGOT_PASSWORD"
                        ? "Account Recovery"
                        : authMode === "STUDENT_OTP"
                        ? "Student Sign-In"
                        : "Institutional Sign-In"}
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-wide uppercase opacity-75">
                      {authMode === "FORGOT_PASSWORD" ? "Password Reset" : "Single Gateway"}
                    </span>
                  </div>
                  <p className="text-xs opacity-70">
                    {authMode === "FORGOT_PASSWORD"
                      ? "Reset your password securely via email verification code."
                      : "Enter your academic credentials or select your authorized profile below."}
                  </p>
                </div>

                {/* Sleek, Integrated 1-Click Role Switcher (Visible in Credentials Mode) */}
                {authMode === "CREDENTIALS" && (
                  <div className="space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between text-[11px] font-semibold opacity-75">
                      <span className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                        <span>Authorized Role Profiles</span>
                      </span>
                      <span className="text-[10px] opacity-60">1-Click Auto-Fill</span>
                    </div>

                    <div
                      className="grid grid-cols-5 gap-1.5 p-1.5 rounded-2xl border shadow-2xs"
                      style={{
                        backgroundColor: "var(--surface-alt)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => fillCredentials("ADMIN")}
                        className={cn(
                          "py-2 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 text-center min-h-[46px] border",
                          selectedRole === "ADMIN"
                            ? "shadow-sm ring-1 ring-[#6D1A2B]/30"
                            : "hover:opacity-100 hover:bg-white/40 dark:hover:bg-white/5 opacity-80"
                        )}
                        style={{
                          backgroundColor: selectedRole === "ADMIN" ? "var(--surface)" : "transparent",
                          borderColor: selectedRole === "ADMIN" ? "#6D1A2B" : "transparent",
                          color: "var(--text)",
                        }}
                        title="Admin: admin@apexacademy.edu"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#E11D48]" />
                        <span className="leading-none truncate max-w-full font-semibold">Admin</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fillCredentials("TRAINER")}
                        className={cn(
                          "py-2 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 text-center min-h-[46px] border",
                          selectedRole === "TRAINER"
                            ? "shadow-sm ring-1 ring-[#10B981]/30"
                            : "hover:opacity-100 hover:bg-white/40 dark:hover:bg-white/5 opacity-80"
                        )}
                        style={{
                          backgroundColor: selectedRole === "TRAINER" ? "var(--surface)" : "transparent",
                          borderColor: selectedRole === "TRAINER" ? "#10B981" : "transparent",
                          color: "var(--text)",
                        }}
                        title="Trainer: trainer@apexacademy.edu"
                      >
                        <Presentation className="w-3.5 h-3.5 text-[#10B981]" />
                        <span className="leading-none truncate max-w-full font-semibold">Trainer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fillCredentials("STUDENT")}
                        className={cn(
                          "py-2 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 text-center min-h-[46px] border",
                          selectedRole === "STUDENT"
                            ? "shadow-sm ring-1 ring-blue-500/30"
                            : "hover:opacity-100 hover:bg-white/40 dark:hover:bg-white/5 opacity-80"
                        )}
                        style={{
                          backgroundColor: selectedRole === "STUDENT" ? "var(--surface)" : "transparent",
                          borderColor: selectedRole === "STUDENT" ? "#2563EB" : "transparent",
                          color: "var(--text)",
                        }}
                        title="Student: student@apexacademy.edu"
                      >
                        <GraduationCap className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span className="leading-none truncate max-w-full font-semibold">Student</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fillCredentials("MANAGER")}
                        className={cn(
                          "py-2 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 text-center min-h-[46px] border",
                          selectedRole === "MANAGER"
                            ? "shadow-sm ring-1 ring-purple-500/30"
                            : "hover:opacity-100 hover:bg-white/40 dark:hover:bg-white/5 opacity-80"
                        )}
                        style={{
                          backgroundColor: selectedRole === "MANAGER" ? "var(--surface)" : "transparent",
                          borderColor: selectedRole === "MANAGER" ? "#9333EA" : "transparent",
                          color: "var(--text)",
                        }}
                        title="Manager: manager@apexacademy.edu"
                      >
                        <Briefcase className="w-3.5 h-3.5 text-[#9333EA]" />
                        <span className="leading-none truncate max-w-full font-semibold">Manager</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fillCredentials("FINANCIER")}
                        className={cn(
                          "py-2 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 text-center min-h-[46px] border",
                          selectedRole === "FINANCIER"
                            ? "shadow-sm ring-1 ring-amber-500/30"
                            : "hover:opacity-100 hover:bg-white/40 dark:hover:bg-white/5 opacity-80"
                        )}
                        style={{
                          backgroundColor: selectedRole === "FINANCIER" ? "var(--surface)" : "transparent",
                          borderColor: selectedRole === "FINANCIER" ? "#D97706" : "transparent",
                          color: "var(--text)",
                        }}
                        title="Financier: financier@apexacademy.edu"
                      >
                        <Coins className="w-3.5 h-3.5 text-[#D97706]" />
                        <span className="leading-none truncate max-w-full font-semibold">Financier</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* VIEW 1: Primary Credential Sign-In Form */}
                {authMode === "CREDENTIALS" ? (
                  <form onSubmit={handleCredentialSubmit} className="space-y-4 animate-in fade-in">
                    {error && (
                      <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="break-words leading-relaxed">{error}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold opacity-90">
                        Email or Institutional ID
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none opacity-40">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          autoComplete="username"
                          value={identifier}
                          onChange={(e) => {
                            setIdentifier(e.target.value);
                            setSelectedRole(null);
                          }}
                          placeholder="e.g. admin@apexacademy.edu, STU-2026-0001"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm min-h-[44px] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          style={{
                            backgroundColor: "var(--surface-alt)",
                            borderColor: "var(--border)",
                            color: "var(--text)",
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold opacity-90">
                          Password
                        </label>
                        <div className="flex items-center gap-3">
                          {/* Forgot Password Inline Trigger */}
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode("FORGOT_PASSWORD");
                              setResetStep("REQUEST");
                              setResetIdentifier(identifier || "");
                              setResetError("");
                              setResetSuccessMsg("");
                            }}
                            className="text-[11px] font-semibold hover:underline transition-colors opacity-75 hover:opacity-100"
                            style={{ color: "var(--accent)" }}
                          >
                            Forgot password?
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-[11px] font-medium opacity-70 hover:opacity-100 flex items-center gap-1 p-0.5"
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
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none opacity-40">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm min-h-[44px] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
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
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 min-h-[44px] transition-all duration-200 active:scale-[0.99] hover:opacity-95"
                      style={{ backgroundColor: "var(--accent)" }}
                    >
                      <span>{loading ? "Authenticating..." : "Sign In to Aintrix Portal"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="pt-2 border-t text-center" style={{ borderColor: "var(--border)" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("STUDENT_OTP");
                          setStudentEmail(identifier.includes("@") ? identifier : "");
                        }}
                        className="text-xs font-semibold hover:underline transition-colors opacity-80 hover:opacity-100"
                        style={{ color: "var(--accent)" }}
                      >
                        Student passwordless access via Email OTP &rarr;
                      </button>
                    </div>
                  </form>
                ) : authMode === "FORGOT_PASSWORD" ? (
                  /* VIEW 2: Non-Refresh Inline Forgot Password & Reset Flow */
                  <div className="space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--border)" }}>
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4" style={{ color: "var(--accent)" }} />
                        <span className="text-xs font-bold">Reset Account Password</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("CREDENTIALS");
                          if (resetIdentifier && !identifier) setIdentifier(resetIdentifier);
                        }}
                        className="text-[11px] font-semibold hover:underline opacity-80"
                      >
                        &larr; Back to Sign In
                      </button>
                    </div>

                    {resetError && (
                      <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="break-words leading-relaxed">{resetError}</span>
                      </div>
                    )}

                    {resetSuccessMsg && resetStep !== "SUCCESS" && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in">
                        <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="break-words leading-relaxed">{resetSuccessMsg}</span>
                      </div>
                    )}

                    {/* Step A: Request OTP */}
                    {resetStep === "REQUEST" ? (
                      <form onSubmit={handleRequestResetOtp} className="space-y-4">
                        <p className="text-xs opacity-75 leading-relaxed">
                          Enter your registered email address or institutional ID. We will dispatch a 6-digit verification code to securely reset your password.
                        </p>

                        <div className="space-y-1">
                          <label className="block text-xs font-semibold opacity-90">
                            Email or Institutional ID
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none opacity-40">
                              <Mail className="w-4 h-4" />
                            </div>
                            <input
                              type="text"
                              required
                              value={resetIdentifier}
                              onChange={(e) => setResetIdentifier(e.target.value)}
                              placeholder="e.g. admin@apexacademy.edu, STU-2026-0001"
                              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm min-h-[44px] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
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
                          disabled={resetLoading}
                          className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 min-h-[44px] transition-all active:scale-[0.99] hover:opacity-95"
                          style={{ backgroundColor: "var(--accent)" }}
                        >
                          <span>{resetLoading ? "Dispatching Reset Code..." : "Send Verification Code"}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </form>
                    ) : resetStep === "VERIFY_AND_RESET" ? (
                      /* Step B: Verify OTP & Enter New Password */
                      <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                        <div className="flex items-center justify-between text-xs pb-1">
                          <span className="opacity-75 text-[11px] truncate max-w-[220px]">
                            Code sent to: <strong className="font-semibold">{resetMaskedEmail || resetIdentifier}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setResetStep("REQUEST");
                              setResetError("");
                            }}
                            className="text-[11px] font-semibold hover:underline shrink-0"
                            style={{ color: "var(--accent)" }}
                          >
                            Change Email/ID
                          </button>
                        </div>

                        {/* OTP Input */}
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold opacity-90">
                            6-Digit Verification Code
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            required
                            value={resetOtpCode}
                            onChange={(e) => setResetOtpCode(e.target.value.replace(/\D/g, ""))}
                            placeholder="123456"
                            className="w-full px-3.5 py-2.5 rounded-xl border text-center text-xl font-mono tracking-widest min-h-[48px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                            style={{
                              backgroundColor: "var(--surface-alt)",
                              borderColor: "var(--border)",
                              color: "var(--text)",
                            }}
                          />
                          {devResetOtp && (
                            <p className="mt-1 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                              Dev Test Reset OTP: <strong>{devResetOtp}</strong>
                            </p>
                          )}
                        </div>

                        {/* New Password */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold opacity-90">
                              New Password
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowResetPassword(!showResetPassword)}
                              className="text-[11px] font-medium opacity-70 hover:opacity-100 flex items-center gap-1 p-0.5"
                            >
                              {showResetPassword ? (
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
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none opacity-40">
                              <Lock className="w-4 h-4" />
                            </div>
                            <input
                              type={showResetPassword ? "text" : "password"}
                              required
                              minLength={6}
                              value={resetNewPassword}
                              onChange={(e) => setResetNewPassword(e.target.value)}
                              placeholder="Minimum 6 characters"
                              className="w-full pl-10 pr-3.5 py-2 rounded-xl border text-sm min-h-[42px] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                              style={{
                                backgroundColor: "var(--surface-alt)",
                                borderColor: "var(--border)",
                                color: "var(--text)",
                              }}
                            />
                          </div>
                        </div>

                        {/* Confirm New Password */}
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold opacity-90">
                            Confirm New Password
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none opacity-40">
                              <Lock className="w-4 h-4" />
                            </div>
                            <input
                              type={showResetPassword ? "text" : "password"}
                              required
                              minLength={6}
                              value={resetConfirmPassword}
                              onChange={(e) => setResetConfirmPassword(e.target.value)}
                              placeholder="Repeat new password"
                              className="w-full pl-10 pr-3.5 py-2 rounded-xl border text-sm min-h-[42px] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
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
                          disabled={resetLoading}
                          className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 min-h-[44px] transition-all active:scale-[0.99] hover:opacity-95"
                          style={{ backgroundColor: "var(--accent)" }}
                        >
                          <span>{resetLoading ? "Updating Password..." : "Confirm & Reset Password"}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>

                        <div className="text-center pt-1">
                          <button
                            type="button"
                            disabled={resetCooldown > 0 || resetLoading}
                            onClick={handleRequestResetOtp}
                            className="text-xs opacity-70 hover:opacity-100 disabled:opacity-40"
                          >
                            {resetCooldown > 0 ? `Resend code in ${resetCooldown}s` : "Resend Verification Code"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* Step C: Success Screen */
                      <div className="space-y-4 text-center py-2 animate-in zoom-in-95">
                        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shadow-sm">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-base font-bold font-display">Password Reset Successful</h3>
                          <p className="text-xs opacity-75 max-w-xs mx-auto leading-relaxed">
                            Your account password has been updated securely. You can now sign in with your new password.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode("CREDENTIALS");
                            if (resetIdentifier) setIdentifier(resetIdentifier);
                            setPassword("");
                            setResetStep("REQUEST");
                            setResetOtpCode("");
                            setResetNewPassword("");
                            setResetConfirmPassword("");
                            setResetError("");
                            setResetSuccessMsg("");
                          }}
                          className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 min-h-[44px] transition-all active:scale-[0.99] hover:opacity-95"
                          style={{ backgroundColor: "var(--accent)" }}
                        >
                          <span>Proceed to Sign In</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* VIEW 3: Optional Passwordless Email OTP for Students */
                  <div className="space-y-4 animate-in fade-in">
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
                        &larr; Back to Password Login
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
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold opacity-90">
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
                          <p className="text-[11px] opacity-60">
                            A 6-digit one-time code will be dispatched to your student inbox.
                          </p>
                        </div>

                        <button
                          type="submit"
                          disabled={otpLoading}
                          className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 min-h-[44px] transition-all"
                          style={{ backgroundColor: "var(--accent)" }}
                        >
                          <span>{otpLoading ? "Dispatching..." : "Send Verification Code"}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
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
                            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                              Dev Test OTP: <strong>{devOtpHint}</strong>
                            </p>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={otpLoading}
                          className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 min-h-[44px] transition-all"
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

              {/* Security & Verification Footer */}
              <div className="flex items-center justify-center gap-3 text-[11px] opacity-60">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>256-Bit Encrypted</span>
                </span>
                <span>•</span>
                <span>Role-Based Access</span>
                <span>•</span>
                <span>Tamper-Proof Audit</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs opacity-60">
        &copy; {new Date().getFullYear()} Aintrix Academy. Unified institutional governance & academic progression.
      </footer>
    </div>
  );
}
