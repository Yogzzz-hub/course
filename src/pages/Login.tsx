import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { canonicalizeDemoUser, writeCrmSession, type CrmSession } from "../utils/authSession";
import { PaletteMenu } from "../components/PaletteMenu";
import { LogoMark } from "../components/LogoMark";
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
  Lock,
} from "lucide-react";

function getSafeReturnUrl(params: URLSearchParams): string | null {
  const raw = params.get("returnUrl") || params.get("returnTo");
  if (!raw || !/^\/(?!\/)/.test(raw) || raw.includes("\\")) return null;
  return raw;
}

function defaultPathForRole(role: CrmSession["role"]): string {
  switch (role) {
    case "TRAINER":
      return "/trainer";
    case "MANAGER":
      return "/manager";
    case "FINANCIER":
      return "/financier";
    case "STUDENT":
      return "/student-panel";
    default:
      return "/admin-panel";
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"STAFF" | "STUDENT">("STAFF");

  // Staff State
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");

  // Student OTP State
  const [studentId, setStudentId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState("");
  const [studentMessage, setStudentMessage] = useState("");
  const [studentModePrompt, setStudentModePrompt] = useState(false);
  const [verifiedStudentSession, setVerifiedStudentSession] = useState<CrmSession | null>(null);

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
      case "ADMIN":
        setActiveTab("STAFF");
        setStaffEmail("admin@apexacademy.edu");
        setStaffPassword("Admin@123456");
        break;
      case "MANAGER":
        setActiveTab("STAFF");
        setStaffEmail("manager@apexacademy.edu");
        setStaffPassword("Manager@123456");
        break;
      case "FINANCIER":
        setActiveTab("STAFF");
        setStaffEmail("financier@apexacademy.edu");
        setStaffPassword("Financier@123456");
        break;
    }
    setStaffError("");
    setStudentError("");
    setStudentModePrompt(false);
  };

  const enterStudentWorkspace = (mode: "prospect" | "enrolled") => {
    const emailInput = activeTab === "STUDENT" ? studentId : staffEmail;
    const session =
      verifiedStudentSession ??
      canonicalizeDemoUser(emailInput || "student@apexacademy.edu", "STUDENT");
    writeCrmSession(session);
    navigate(`/student-panel?mode=${mode}`);
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffLoading(true);
    setStaffError("");

    const resolveTarget = (role: CrmSession["role"]) => {
      const returnUrl = getSafeReturnUrl(searchParams);
      const fallback = defaultPathForRole(role);
      if (!returnUrl) return fallback;
      if (role === "ADMIN" || returnUrl.startsWith(fallback) || returnUrl.startsWith("/student")) {
        return returnUrl;
      }
      return fallback;
    };

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ identifier: staffEmail, password: staffPassword }),
      });

      const isJson = (res.headers.get("content-type") || "").includes("application/json");
      if (isJson && res.status !== 404 && res.status < 500) {
        const data = (await res.json()) as {
          error?: string;
          user?: { id: string; name: string; email: string; role: CrmSession["role"] };
        };
        setStaffLoading(false);
        if (!res.ok || !data.user) {
          setStaffError(data.error || "Invalid credentials.");
          return;
        }
        const verifiedSession: CrmSession = {
          userId: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          authenticated: true,
        };
        writeCrmSession(verifiedSession);
        if (verifiedSession.role === "STUDENT" && !getSafeReturnUrl(searchParams)) {
          setVerifiedStudentSession(verifiedSession);
          setStudentModePrompt(true);
          return;
        }
        navigate(resolveTarget(verifiedSession.role));
        return;
      }
    } catch {
      // Fall through to local preview fallback when CRM API is unavailable (e.g., vite preview)
    }

    setStaffLoading(false);
    const session = canonicalizeDemoUser(staffEmail);
    writeCrmSession(session);
    if (session.role === "STUDENT" && !getSafeReturnUrl(searchParams)) {
      setVerifiedStudentSession(null);
      setStudentModePrompt(true);
      return;
    }
    navigate(resolveTarget(session.role));
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      setStudentError("Please enter your registered student email.");
      return;
    }
    setStudentLoading(true);
    setStudentError("");

    try {
      const res = await fetch("/api/auth/student/otp-request", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ identifier: studentId }),
      });

      const isJson = (res.headers.get("content-type") || "").includes("application/json");
      if (isJson && res.status !== 404 && res.status < 500) {
        const data = (await res.json()) as {
          error?: string;
          message?: string;
          devOtp?: string;
        };
        setStudentLoading(false);
        if (!res.ok) {
          setStudentError(data.error || "Could not dispatch OTP.");
          return;
        }
        setOtpSent(true);
        if (data.devOtp) setOtpCode(data.devOtp);
        setStudentMessage(data.message || "A 6-digit verification code was sent to your email.");
        return;
      }
    } catch {
      // Fall through to local preview fallback when CRM API is unavailable
    }

    setStudentLoading(false);
    setOtpSent(true);
    setOtpCode("123456");
    setStudentMessage("A 6-digit verification code was sent to your email.");
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentLoading(true);
    setStudentError("");

    const resolveStudentTarget = () => {
      const returnUrl = getSafeReturnUrl(searchParams);
      if (returnUrl && returnUrl.startsWith("/student")) return returnUrl;
      return null;
    };

    try {
      const res = await fetch("/api/auth/student/otp-verify", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ identifier: studentId, code: otpCode }),
      });

      const isJson = (res.headers.get("content-type") || "").includes("application/json");
      if (isJson && res.status !== 404 && res.status < 500) {
        const data = (await res.json()) as {
          error?: string;
          user?: { userId?: string; id?: string; name: string; email: string; role: CrmSession["role"] };
        };
        setStudentLoading(false);
        if (!res.ok || !data.user) {
          setStudentError(data.error || "Verification failed. Please check your code.");
          return;
        }
        const verifiedSession: CrmSession = {
          userId: data.user.userId || data.user.id || "std-001",
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          authenticated: true,
        };
        writeCrmSession(verifiedSession);
        const returnTarget = resolveStudentTarget();
        if (returnTarget) {
          navigate(returnTarget);
        } else {
          setVerifiedStudentSession(verifiedSession);
          setStudentModePrompt(true);
        }
        return;
      }
    } catch {
      // Fall through to local preview fallback when CRM API is unavailable
    }

    setStudentLoading(false);
    const session = canonicalizeDemoUser(studentId || "student@apexacademy.edu", "STUDENT");
    writeCrmSession(session);
    const returnTarget = resolveStudentTarget();
    if (returnTarget) {
      navigate(returnTarget);
    } else {
      setVerifiedStudentSession(null);
      setStudentModePrompt(true);
    }
  };

  return (
    <div
      className="ss-admin relative overflow-x-hidden"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(960px 620px at 92% -8%, color-mix(in srgb, var(--accent-soft) 52%, transparent), transparent 62%), radial-gradient(780px 560px at -8% 85%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 60%), radial-gradient(620px 440px at 50% 105%, color-mix(in srgb, var(--accent-soft-dark) 20%, transparent), transparent 65%), var(--bg)",
        color: "var(--text)",
      }}
    >
      {/* Ambient architectural grid & floating aurora orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
        style={{ zIndex: 0 }}
      >
        {/* Subtle technical grid fading cleanly toward edges */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right, color-mix(in srgb, var(--accent) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--accent) 8%, transparent) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse 75% 65% at 50% 48%, rgba(0,0,0,0.9), transparent 82%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 65% at 50% 48%, rgba(0,0,0,0.9), transparent 82%)",
          }}
        />

        {/* Soft blurred theme-reactive gradient blobs */}
        <div
          style={{
            position: "absolute",
            top: "-12%",
            right: "-6%",
            width: "520px",
            height: "520px",
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--accent-soft) 68%, transparent) 0%, transparent 70%)",
            filter: "blur(56px)",
            opacity: 0.75,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-14%",
            left: "-8%",
            width: "480px",
            height: "480px",
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--accent) 26%, transparent) 0%, transparent 72%)",
            filter: "blur(64px)",
            opacity: 0.85,
          }}
        />

        {/* Concentric Aintrix Eclipse orbital rings behind the sign-in stage */}
        <svg
          viewBox="0 0 900 900"
          fill="none"
          style={{
            position: "absolute",
            left: "50%",
            top: "52%",
            width: "min(960px, 125vw)",
            height: "min(960px, 125vw)",
            transform: "translate(-50%, -50%)",
            opacity: 0.9,
          }}
        >
          <g className="login-orbit-cw">
            <circle
              cx="450"
              cy="450"
              r="380"
              stroke="color-mix(in srgb, var(--accent) 14%, transparent)"
              strokeWidth="1"
              strokeDasharray="6 10"
            />
            <circle
              cx="450"
              cy="70"
              r="5"
              fill="color-mix(in srgb, var(--accent) 42%, transparent)"
            />
            <circle
              cx="830"
              cy="450"
              r="3.5"
              fill="color-mix(in srgb, var(--accent-soft-dark) 55%, transparent)"
            />
          </g>
          <g className="login-orbit-ccw">
            <circle
              cx="450"
              cy="450"
              r="290"
              stroke="color-mix(in srgb, var(--accent) 18%, transparent)"
              strokeWidth="1.2"
            />
            <circle
              cx="160"
              cy="450"
              r="4.5"
              fill="var(--accent)"
              opacity="0.35"
            />
            <circle
              cx="655"
              cy="245"
              r="6"
              fill="var(--accent-soft)"
              opacity="0.8"
            />
          </g>
          <circle
            cx="450"
            cy="450"
            r="210"
            stroke="color-mix(in srgb, var(--accent) 10%, transparent)"
            strokeWidth="1"
          />
        </svg>
      </div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px" }}>
        <Link to="/" className="logo flex flex-row items-center flex-nowrap gap-3 shrink-0" style={{ textDecoration: "none" }} aria-label="Aintrix Academy home">
          <span className="logo-mark"><LogoMark size={32} surface="light" /></span>
          <span className="logo-wordmark flex flex-col justify-center leading-tight">
            <span className="logo-name whitespace-nowrap">Aintrix</span>
            <span className="logo-subtitle whitespace-nowrap">Academy</span>
          </span>
        </Link>
        <PaletteMenu />
      </div>

      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px 40px" }}>
        <div style={{ width: "100%", maxWidth: "480px" }}>
          
          {/* Portal Heading */}
          <div style={{ textAlign: "center", marginBottom: "22px" }}>
            <h1 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)", margin: "0 0 6px" }}>
              CRM Portal
            </h1>
            <p style={{ fontSize: "13.5px", color: "var(--muted)", margin: 0 }}>
              Sign in to manage courses, students, batches, and operations.
            </p>
          </div>

          {/* Card Container */}
          <div style={{
            background: "color-mix(in srgb, var(--surface) 90%, transparent)",
            backdropFilter: "blur(18px) saturate(1.3)",
            WebkitBackdropFilter: "blur(18px) saturate(1.3)",
            border: "1px solid color-mix(in srgb, var(--border-strong) 85%, transparent)",
            borderRadius: "22px",
            padding: "32px",
            boxShadow: "0 1px 0 rgb(255 255 255 / 0.85) inset, 0 28px 64px -26px color-mix(in srgb, var(--accent) 32%, transparent)"
          }}>
            
            {/* Tabs */}
            <div style={{
              display: "flex",
              borderRadius: "12px",
              background: "var(--surface-alt)",
              border: "1px solid var(--border)",
              padding: "4px",
              marginBottom: "24px"
            }}>
              <button
                type="button"
                onClick={() => { setActiveTab("STAFF"); setStaffError(""); setStudentError(""); setStudentModePrompt(false); }}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: "9px",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: "pointer",
                  border: "none",
                  transition: "all 0.2s",
                  background: activeTab === "STAFF" ? "var(--btn-primary-bg)" : "transparent",
                  color: activeTab === "STAFF" ? "var(--btn-primary-text)" : "var(--muted)"
                }}
              >
                <Users size={16} /> Staff & Trainer
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("STUDENT"); setStaffError(""); setStudentError(""); setStudentModePrompt(false); }}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: "9px",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: "pointer",
                  border: "none",
                  transition: "all 0.2s",
                  background: activeTab === "STUDENT" ? "var(--btn-primary-bg)" : "transparent",
                  color: activeTab === "STUDENT" ? "var(--btn-primary-text)" : "var(--muted)"
                }}
              >
                <GraduationCap size={16} /> Student OTP
              </button>
            </div>

            {studentModePrompt ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
                    Choose Student Access
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
                    Select whether to open the portal as a prospect or as a demo student.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => enterStudentWorkspace("prospect")}
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px solid var(--border-strong)",
                    background: "var(--surface-alt)",
                    color: "var(--text)",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent)", marginBottom: "3px" }}>
                      Prospect
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                      Explore programmes, recommended learning plan &amp; counselling sessions
                    </div>
                  </div>
                  <ArrowRight size={18} color="var(--accent)" />
                </button>

                <button
                  type="button"
                  onClick={() => enterStudentWorkspace("enrolled")}
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px solid transparent",
                    background: "var(--btn-primary-bg)",
                    color: "var(--btn-primary-text)",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "3px" }}>
                      Demo
                    </div>
                    <div style={{ fontSize: "12px", opacity: 0.88 }}>
                      Enter the enrolled student workspace with classes, tasks &amp; mentorship
                    </div>
                  </div>
                  <ArrowRight size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => setStudentModePrompt(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: "6px 0",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--muted)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  ← Back to sign in
                </button>
              </div>
            ) : activeTab === "STAFF" ? (
              <form onSubmit={handleStaffLogin} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {staffError && (
                  <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(185, 28, 28, 0.08)", border: "1px solid rgba(185, 28, 28, 0.2)", display: "flex", alignItems: "center", gap: "10px", color: "#B91C1C", fontSize: "13px" }}>
                    <AlertCircle size={16} />
                    <span>{staffError}</span>
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Staff Email
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input
                      type="email"
                      required
                      placeholder="trainer@apexacademy.edu"
                      value={staffEmail}
                      onChange={(e) => setStaffEmail(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 14px 12px 40px",
                        borderRadius: "10px",
                        border: "1px solid var(--border-strong)",
                        background: "var(--bg)",
                        color: "var(--text)",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 14px 12px 40px",
                        borderRadius: "10px",
                        border: "1px solid var(--border-strong)",
                        background: "var(--bg)",
                        color: "var(--text)",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={staffLoading}
                  style={{
                    marginTop: "6px",
                    width: "100%",
                    padding: "12px",
                    borderRadius: "10px",
                    background: "var(--btn-primary-bg)",
                    color: "var(--btn-primary-text)",
                    fontWeight: 700,
                    fontSize: "14px",
                    border: "none",
                    cursor: staffLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  {staffLoading ? "Signing In..." : "Sign In to Portal"} <ArrowRight size={16} />
                </button>
              </form>
            ) : (
              /* Student OTP Form */
              <form onSubmit={otpSent ? handleVerifyOtp : handleRequestOtp} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {studentError && (
                  <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(185, 28, 28, 0.08)", border: "1px solid rgba(185, 28, 28, 0.2)", display: "flex", alignItems: "center", gap: "10px", color: "#B91C1C", fontSize: "13px" }}>
                    <AlertCircle size={16} />
                    <span>{studentError}</span>
                  </div>
                )}
                {studentMessage && (
                  <div style={{ padding: "12px", borderRadius: "8px", background: "var(--accent-tint)", border: "1px solid var(--accent-border)", display: "flex", alignItems: "center", gap: "10px", color: "var(--accent)", fontSize: "13px" }}>
                    <CheckCircle size={16} />
                    <span>{studentMessage}</span>
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Student Email
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input
                      type="email"
                      required
                      placeholder="student@apexacademy.edu"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      disabled={otpSent}
                      style={{
                        width: "100%",
                        padding: "12px 14px 12px 40px",
                        borderRadius: "10px",
                        border: "1px solid var(--border-strong)",
                        background: "var(--bg)",
                        color: "var(--text)",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>

                {otpSent && (
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Verification Code (OTP)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: "10px",
                        border: "1px solid var(--accent)",
                        background: "var(--bg)",
                        color: "var(--text)",
                        fontSize: "18px",
                        letterSpacing: "4px",
                        textAlign: "center",
                        fontWeight: 700,
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={studentLoading}
                  style={{
                    marginTop: "6px",
                    width: "100%",
                    padding: "12px",
                    borderRadius: "10px",
                    background: "var(--btn-primary-bg)",
                    color: "var(--btn-primary-text)",
                    fontWeight: 700,
                    fontSize: "14px",
                    border: "none",
                    cursor: studentLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  {studentLoading ? "Processing..." : otpSent ? "Verify & Enter Workspace" : "Send Login Code"} <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* Quick Demo Switcher */}
            <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                <ShieldCheck size={14} color="var(--accent)" />
                <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
                  Quick Role Access (1-Click Fill)
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => fillCredentials("ADMIN")}
                  style={{
                    padding: "8px 6px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--surface-alt)",
                    color: "var(--text)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px"
                  }}
                >
                  <KeyRound size={12} color="var(--accent)" /> Admin
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("TRAINER")}
                  style={{
                    padding: "8px 6px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--surface-alt)",
                    color: "var(--text)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px"
                  }}
                >
                  <Presentation size={12} color="var(--accent)" /> Trainer
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("STUDENT")}
                  style={{
                    padding: "8px 6px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--surface-alt)",
                    color: "var(--text)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px"
                  }}
                >
                  <GraduationCap size={12} color="var(--accent)" /> Student
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("MANAGER")}
                  style={{
                    padding: "8px 6px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--surface-alt)",
                    color: "var(--text)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px"
                  }}
                >
                  <Briefcase size={12} color="var(--accent)" /> Manager
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("FINANCIER")}
                  style={{
                    padding: "8px 6px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--surface-alt)",
                    color: "var(--text)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px"
                  }}
                >
                  <Coins size={12} color="var(--accent)" /> Financier
                </button>
                <Link
                  to="/"
                  style={{
                    padding: "8px 6px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--surface-alt)",
                    color: "var(--muted)",
                    fontSize: "11px",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  ← Home
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
