import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { canonicalizeDemoUser, writeCrmSession, type CrmSession } from "../utils/authSession";
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
        navigate(resolveTarget(verifiedSession.role));
        return;
      }
    } catch {
      // Fall through to local preview fallback when CRM API is unavailable (e.g., vite preview)
    }

    setStaffLoading(false);
    const session = canonicalizeDemoUser(staffEmail);
    writeCrmSession(session);
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
      return "/student-panel";
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
        navigate(resolveStudentTarget());
        return;
      }
    } catch {
      // Fall through to local preview fallback when CRM API is unavailable
    }

    setStudentLoading(false);
    const session = canonicalizeDemoUser(studentId || "student@apexacademy.edu", "STUDENT");
    writeCrmSession(session);
    navigate(resolveStudentTarget());
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg, #0B0E14)" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
        <div style={{ width: "100%", maxWidth: "480px" }}>
          
          {/* Header Brand */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--accent, #1CE798)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <KeyRound size={20} color="#0B0E14" />
              </div>
              <span style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text, #FFF)" }}>
                Academy CRM Portal
              </span>
            </div>
            <p style={{ fontSize: "14px", color: "var(--muted, #94A3B8)", margin: 0 }}>
              Sign in to manage courses, students, batches, and operations.
            </p>
          </div>

          {/* Card Container */}
          <div style={{
            background: "var(--surface, rgba(255, 255, 255, 0.03))",
            border: "1px solid var(--border, rgba(255, 255, 255, 0.1))",
            borderRadius: "16px",
            padding: "32px",
            backdropFilter: "blur(12px)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
          }}>
            
            {/* Tabs */}
            <div style={{
              display: "flex",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.05)",
              padding: "4px",
              marginBottom: "24px"
            }}>
              <button
                type="button"
                onClick={() => { setActiveTab("STAFF"); setStaffError(""); setStudentError(""); }}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: "pointer",
                  border: "none",
                  transition: "all 0.2s",
                  background: activeTab === "STAFF" ? "var(--accent, #1CE798)" : "transparent",
                  color: activeTab === "STAFF" ? "#0B0E14" : "var(--muted, #94A3B8)"
                }}
              >
                <Users size={16} /> Staff & Trainer
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("STUDENT"); setStaffError(""); setStudentError(""); }}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: "pointer",
                  border: "none",
                  transition: "all 0.2s",
                  background: activeTab === "STUDENT" ? "var(--accent, #1CE798)" : "transparent",
                  color: activeTab === "STUDENT" ? "#0B0E14" : "var(--muted, #94A3B8)"
                }}
              >
                <GraduationCap size={16} /> Student OTP
              </button>
            </div>

            {/* Staff Login Form */}
            {activeTab === "STAFF" ? (
              <form onSubmit={handleStaffLogin} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {staffError && (
                  <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", display: "flex", alignItems: "center", gap: "10px", color: "#F87171", fontSize: "13px" }}>
                    <AlertCircle size={16} />
                    <span>{staffError}</span>
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--muted, #94A3B8)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Staff Email
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted, #64748B)" }} />
                    <input
                      type="email"
                      required
                      placeholder="trainer@apexacademy.edu"
                      value={staffEmail}
                      onChange={(e) => setStaffEmail(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 14px 12px 40px",
                        borderRadius: "8px",
                        border: "1px solid var(--border, rgba(255,255,255,0.15))",
                        background: "rgba(0,0,0,0.25)",
                        color: "var(--text, #FFF)",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--muted, #94A3B8)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted, #64748B)" }} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 14px 12px 40px",
                        borderRadius: "8px",
                        border: "1px solid var(--border, rgba(255,255,255,0.15))",
                        background: "rgba(0,0,0,0.25)",
                        color: "var(--text, #FFF)",
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
                    borderRadius: "8px",
                    background: "var(--accent, #1CE798)",
                    color: "#0B0E14",
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
                  <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", display: "flex", alignItems: "center", gap: "10px", color: "#F87171", fontSize: "13px" }}>
                    <AlertCircle size={16} />
                    <span>{studentError}</span>
                  </div>
                )}
                {studentMessage && (
                  <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(28, 231, 152, 0.1)", border: "1px solid rgba(28, 231, 152, 0.2)", display: "flex", alignItems: "center", gap: "10px", color: "#1CE798", fontSize: "13px" }}>
                    <CheckCircle size={16} />
                    <span>{studentMessage}</span>
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--muted, #94A3B8)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Student Email
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted, #64748B)" }} />
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
                        borderRadius: "8px",
                        border: "1px solid var(--border, rgba(255,255,255,0.15))",
                        background: "rgba(0,0,0,0.25)",
                        color: "var(--text, #FFF)",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>

                {otpSent && (
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--muted, #94A3B8)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
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
                        borderRadius: "8px",
                        border: "1px solid var(--accent, #1CE798)",
                        background: "rgba(0,0,0,0.25)",
                        color: "var(--text, #FFF)",
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
                    borderRadius: "8px",
                    background: "var(--accent, #1CE798)",
                    color: "#0B0E14",
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
            <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid var(--border, rgba(255,255,255,0.1))" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                <ShieldCheck size={14} color="var(--accent, #1CE798)" />
                <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted, #94A3B8)" }}>
                  Quick Role Access (1-Click Fill)
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => fillCredentials("ADMIN")}
                  style={{
                    padding: "8px 6px",
                    borderRadius: "6px",
                    border: "1px solid var(--border, rgba(255,255,255,0.1))",
                    background: "rgba(255,255,255,0.02)",
                    color: "var(--text, #FFF)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px"
                  }}
                >
                  <KeyRound size={12} color="#1CE798" /> Admin
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("TRAINER")}
                  style={{
                    padding: "8px 6px",
                    borderRadius: "6px",
                    border: "1px solid var(--border, rgba(255,255,255,0.1))",
                    background: "rgba(255,255,255,0.02)",
                    color: "var(--text, #FFF)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px"
                  }}
                >
                  <Presentation size={12} color="#60A5FA" /> Trainer
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("STUDENT")}
                  style={{
                    padding: "8px 6px",
                    borderRadius: "6px",
                    border: "1px solid var(--border, rgba(255,255,255,0.1))",
                    background: "rgba(255,255,255,0.02)",
                    color: "var(--text, #FFF)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px"
                  }}
                >
                  <GraduationCap size={12} color="#FBBF24" /> Student
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("MANAGER")}
                  style={{
                    padding: "8px 6px",
                    borderRadius: "6px",
                    border: "1px solid var(--border, rgba(255,255,255,0.1))",
                    background: "rgba(255,255,255,0.02)",
                    color: "var(--text, #FFF)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px"
                  }}
                >
                  <Briefcase size={12} color="#A78BFA" /> Manager
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("FINANCIER")}
                  style={{
                    padding: "8px 6px",
                    borderRadius: "6px",
                    border: "1px solid var(--border, rgba(255,255,255,0.1))",
                    background: "rgba(255,255,255,0.02)",
                    color: "var(--text, #FFF)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px"
                  }}
                >
                  <Coins size={12} color="#F472B6" /> Financier
                </button>
                <Link
                  to="/"
                  style={{
                    padding: "8px 6px",
                    borderRadius: "6px",
                    border: "1px solid var(--border, rgba(255,255,255,0.1))",
                    background: "rgba(255,255,255,0.02)",
                    color: "var(--muted, #94A3B8)",
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
