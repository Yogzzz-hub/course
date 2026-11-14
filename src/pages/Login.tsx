import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { canonicalizeDemoUser, writeCrmSession, type CrmSession } from "../utils/authSession";
import { PaletteMenu } from "../components/PaletteMenu";
import { LogoMark } from "../components/LogoMark";
import { Eclipse, EclipseRing } from "../components/Eclipse";
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
  Eye,
  EyeOff,
} from "lucide-react";
import "../styles/login.css";

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

  const initialTab =
    searchParams.get("role") === "staff" ||
    searchParams.get("role") === "trainer" ||
    searchParams.get("role") === "manager" ||
    searchParams.get("role") === "admin" ||
    searchParams.get("role") === "financier" ||
    searchParams.get("tab") === "staff"
      ? "STAFF"
      : "STUDENT";

  const [activeTab, setActiveTab] = useState<"STAFF" | "STUDENT">(initialTab);
  const [showPassword, setShowPassword] = useState(false);

  // Staff State
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");

  // Student State (supports Password or 6-Digit Email OTP)
  const [studentAuthMode, setStudentAuthMode] = useState<"PASSWORD" | "OTP">("PASSWORD");
  const [studentId, setStudentId] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState("");
  const [studentMessage, setStudentMessage] = useState("");
  const [studentModePrompt, setStudentModePrompt] = useState(false);
  const [verifiedStudentSession, setVerifiedStudentSession] = useState<CrmSession | null>(null);

  const postAuthWithRetry = async (
    url: string,
    payload: unknown
  ): Promise<
    | { kind: "json"; status: number; ok: boolean; data: Record<string, unknown> }
    | { kind: "offline_preview" }
    | { kind: "unavailable"; message: string }
  > => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 50000);
      try {
        const res = await fetch(url, {
          method: "POST",
          credentials: "include",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });
        window.clearTimeout(timer);
        const contentType = res.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");
        if (res.status === 404 && !isJson) {
          return { kind: "offline_preview" };
        }
        if (res.status === 503 && isJson) {
          try {
            const peek = (await res.clone().json()) as { available?: boolean };
            if (peek && peek.available === false) {
              return { kind: "offline_preview" };
            }
          } catch {}
        }
        if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt === 0) {
          await new Promise((r) => window.setTimeout(r, 1500));
          continue;
        }
        if (isJson && res.status < 500) {
          const data = (await res.json()) as Record<string, unknown>;
          return { kind: "json", status: res.status, ok: res.ok, data };
        }
        if (isJson) {
          const data = (await res.json()) as { error?: string };
          return {
            kind: "unavailable",
            message:
              data.error ||
              "Academy CRM server is starting up or temporarily unavailable. Please try again in a few seconds.",
          };
        }
        return {
          kind: "unavailable",
          message:
            "Academy CRM server is starting up or temporarily unavailable. Please try again in a few seconds.",
        };
      } catch {
        window.clearTimeout(timer);
        if (attempt === 0) {
          await new Promise((r) => window.setTimeout(r, 1500));
          continue;
        }
        return {
          kind: "unavailable",
          message:
            "Could not reach Academy CRM server (it may still be waking up). Please wait a few seconds and try again.",
        };
      }
    }
    return {
      kind: "unavailable",
      message: "Academy CRM server is temporarily unavailable. Please try again.",
    };
  };

  // Quick filler for testing accounts
  const fillCredentials = (role: string) => {
    switch (role) {
      case "STUDENT":
        setActiveTab("STUDENT");
        setStudentId("student@aintrixacademy.edu");
        setStudentPassword("Student@123456");
        setOtpSent(false);
        setOtpCode("");
        break;
      case "TRAINER":
        setActiveTab("STAFF");
        setStaffEmail("trainer@aintrixacademy.edu");
        setStaffPassword("Trainer@123456");
        break;
      case "ADMIN":
        setActiveTab("STAFF");
        setStaffEmail("admin@aintrixacademy.edu");
        setStaffPassword("Admin@123456");
        break;
      case "MANAGER":
        setActiveTab("STAFF");
        setStaffEmail("manager@aintrixacademy.edu");
        setStaffPassword("Manager@123456");
        break;
      case "FINANCIER":
        setActiveTab("STAFF");
        setStaffEmail("financier@aintrixacademy.edu");
        setStaffPassword("Financier@123456");
        break;
    }
    setStaffError("");
    setStudentError("");
    setStudentMessage("");
    setStudentModePrompt(false);
  };

  const enterStudentWorkspace = (mode: "prospect" | "enrolled") => {
    const emailInput = activeTab === "STUDENT" ? studentId : staffEmail;
    const session =
      verifiedStudentSession ??
      canonicalizeDemoUser(emailInput || "student@aintrixacademy.edu", "STUDENT");
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

    const result = await postAuthWithRetry("/api/auth/login", {
      identifier: staffEmail,
      password: staffPassword,
    });

    if (result.kind === "json") {
      const data = result.data as {
        error?: string;
        user?: { id: string; name: string; email: string; role: CrmSession["role"] };
      };
      setStaffLoading(false);
      if (!result.ok || !data.user) {
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

    if (result.kind === "unavailable" && !import.meta.env.DEV) {
      setStaffLoading(false);
      setStaffError(result.message);
      return;
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

  const resolveStudentTarget = () => {
    const returnUrl = getSafeReturnUrl(searchParams);
    if (returnUrl && returnUrl.startsWith("/student")) return returnUrl;
    return "/student-panel";
  };

  const handleStudentPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentLoading(true);
    setStudentError("");
    setStudentMessage("");

    const result = await postAuthWithRetry("/api/auth/login", {
      identifier: studentId,
      password: studentPassword,
    });

    if (result.kind === "json") {
      const data = result.data as {
        error?: string;
        user?: { id: string; name: string; email: string; role: CrmSession["role"] };
      };
      setStudentLoading(false);
      if (!result.ok || !data.user) {
        setStudentError(data.error || "Invalid student credentials.");
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
      navigate(
        verifiedSession.role === "STUDENT"
          ? resolveStudentTarget()
          : defaultPathForRole(verifiedSession.role)
      );
      return;
    }

    if (result.kind === "unavailable" && !import.meta.env.DEV) {
      setStudentLoading(false);
      setStudentError(result.message);
      return;
    }

    setStudentLoading(false);
    const session = canonicalizeDemoUser(studentId || "student@aintrixacademy.edu", "STUDENT");
    writeCrmSession(session);
    navigate(resolveStudentTarget());
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      setStudentError("Please enter your registered student email.");
      return;
    }
    setStudentLoading(true);
    setStudentError("");

    const result = await postAuthWithRetry("/api/auth/student/otp-request", {
      identifier: studentId,
    });

    if (result.kind === "json") {
      const data = result.data as {
        error?: string;
        message?: string;
        devOtp?: string;
      };
      setStudentLoading(false);
      if (!result.ok) {
        setStudentError(data.error || "Could not dispatch OTP.");
        return;
      }
      setOtpSent(true);
      if (data.devOtp) setOtpCode(data.devOtp);
      setStudentMessage(data.message || "A 6-digit verification code was sent to your email.");
      return;
    }

    if (result.kind === "unavailable" && !import.meta.env.DEV) {
      setStudentLoading(false);
      setStudentError(result.message);
      return;
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

    const resolveStudentModeTarget = () => {
      const returnUrl = getSafeReturnUrl(searchParams);
      if (returnUrl && returnUrl.startsWith("/student")) return returnUrl;
      return null;
    };

    const result = await postAuthWithRetry("/api/auth/student/otp-verify", {
      identifier: studentId,
      code: otpCode,
    });

    if (result.kind === "json") {
      const data = result.data as {
        error?: string;
        user?: { userId?: string; id?: string; name: string; email: string; role: CrmSession["role"] };
      };
      setStudentLoading(false);
      if (!result.ok || !data.user) {
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
      const returnTarget = resolveStudentModeTarget();
      if (returnTarget) {
        navigate(returnTarget);
      } else {
        setVerifiedStudentSession(verifiedSession);
        setStudentModePrompt(true);
      }
      return;
    }

    if (result.kind === "unavailable" && !import.meta.env.DEV) {
      setStudentLoading(false);
      setStudentError(result.message);
      return;
    }

    setStudentLoading(false);
    const session = canonicalizeDemoUser(studentId || "student@aintrixacademy.edu", "STUDENT");
    writeCrmSession(session);
    const returnTarget = resolveStudentModeTarget();
    if (returnTarget) {
      navigate(returnTarget);
    } else {
      setVerifiedStudentSession(null);
      setStudentModePrompt(true);
    }
  };

  return (
    <div className={`login-page-root ${activeTab === "STUDENT" ? "mode-student" : "mode-staff"}`}>
      {/* ===================================================================
          HERO PANE: Atmospheric Total Eclipse Stage with Pointer Tracing
          - Student Login: Sits on the LEFT (0%)
          - Staff / Trainer / Admin Login: Morphs & slides to the RIGHT (100%)
          =================================================================== */}
      <section className="login-hero-pane" aria-label="Visual Hero Stage">
        <div className="login-sky" aria-hidden="true" />
        <div className="login-aurora" aria-hidden="true" />

        {/* Prominent, Big & Perfectly Placed Logo */}
        <Link to="/" className="login-hero-brand" aria-label="Aintrix Academy home">
          <div className="login-brand-logo">
            <LogoMark size={36} surface="light" />
          </div>
          <div className="login-brand-meta">
            <span className="login-brand-title">Aintrix Academy</span>
            <span className="login-brand-tag">Engineering Career Ecosystem</span>
          </div>
        </Link>

        {/* Center Content: Headline & Live Interactive Eclipse with Mouse Tracing */}
        <div className="login-hero-content">
          <h2 className="login-hero-headline">
            Discover your skills,<br />
            identify your gaps,<br />
            and build your <span className="hero-highlight">personalized career roadmap.</span>
          </h2>

          <div className="login-eclipse-stage">
            <div className="login-eclipse-frame">
              <EclipseRing half="back" />
              <Eclipse className="login-hero-eclipse" live={true} />
              <EclipseRing half="front" />
            </div>
          </div>
        </div>

        {/* Bottom Stage Footer */}
        <div className="login-hero-footer">
          <span className="login-pointer-hint">Total Eclipse · Move cursor to trace flare</span>
          <span>© 2026 Aintrix Academy</span>
        </div>
      </section>

      {/* ===================================================================
          FORM PANE: Sweeping Curved Auth Card with Animated Morph
          - Student Login: Sits on the RIGHT (curved left edge)
          - Staff / Trainer / Admin Login: Morphs & slides to the LEFT (curved right edge)
          =================================================================== */}
      <main className="login-form-pane">
        {/* Top Bar: Return Link + Theme Palette Switcher */}
        <header className="login-form-topbar">
          <Link to="/" className="login-nav-link" aria-label="Return to home page">
            ← Return to Home
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <PaletteMenu />
          </div>
        </header>

        {/* Main Form Box */}
        <div className="login-card-inner">
          <div className="login-header-group">
            <h1 className="login-title">
              {activeTab === "STUDENT" ? "Student Sign In" : "Staff & Operations Sign In"}
            </h1>
            <p className="login-subtitle">
              {activeTab === "STUDENT"
                ? "Access your learning track, assignments, and mentorship portal."
                : "Manage faculty sessions, candidate admissions, and institutional operations."}
            </p>
          </div>

          {/* Mode Switcher Pills: Toggling triggers the smooth morphing slide */}
          <div className="login-tabs-pills" role="tablist" aria-label="Authentication portal category">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "STUDENT"}
              className={`login-tab-pill ${activeTab === "STUDENT" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("STUDENT");
                setStaffError("");
                setStudentError("");
                setStudentModePrompt(false);
              }}
            >
              <GraduationCap size={16} /> Student Portal
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "STAFF"}
              className={`login-tab-pill ${activeTab === "STAFF" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("STAFF");
                setStaffError("");
                setStudentError("");
                setStudentModePrompt(false);
              }}
            >
              <Users size={16} /> Staff &amp; Faculty
            </button>
          </div>

          <div className="login-divider" aria-hidden="true">
            <span>or sign in below</span>
          </div>

          {studentModePrompt ? (
            /* Student Mode Selection (Prospect vs Enrolled) */
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
                  borderRadius: "14px",
                  border: "1px solid var(--border-strong)",
                  background: "var(--surface-alt)",
                  color: "var(--text)",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  transition: "all 0.18s ease",
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
                  borderRadius: "14px",
                  border: "1px solid transparent",
                  background: "var(--btn-primary-bg)",
                  color: "var(--btn-primary-text)",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  boxShadow: "0 4px 16px color-mix(in srgb, var(--accent) 30%, transparent)",
                }}
              >
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "3px" }}>
                    Demo Student
                  </div>
                  <div style={{ fontSize: "12px", opacity: 0.9 }}>
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
                ← Back to credentials
              </button>
            </div>
          ) : activeTab === "STAFF" ? (
            /* Staff & Trainer Sign-In Form */
            <form onSubmit={handleStaffLogin} className="login-form">
              {staffError && (
                <div className="login-alert-error" role="alert">
                  <AlertCircle size={16} />
                  <span>{staffError}</span>
                </div>
              )}

              <div className="login-field-group">
                <label htmlFor="staff-email-input" className="login-field-label">
                  Staff Email
                </label>
                <div className="login-input-wrap">
                  <Mail size={16} className="login-input-icon" aria-hidden="true" />
                  <input
                    id="staff-email-input"
                    type="email"
                    required
                    autoComplete="username"
                    placeholder="name@aintrixacademy.edu"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className="login-input"
                  />
                </div>
              </div>

              <div className="login-field-group">
                <label htmlFor="staff-password-input" className="login-field-label">
                  Password
                </label>
                <div className="login-input-wrap">
                  <Lock size={16} className="login-input-icon" aria-hidden="true" />
                  <input
                    id="staff-password-input"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="login-input"
                    style={{ paddingRight: "44px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      background: "none",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={staffLoading} className="login-submit-btn">
                {staffLoading ? "Signing In..." : "Sign In to Portal"} <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            /* Student Sign-In Form (Password or 6-Digit Email OTP) */
            <form
              onSubmit={
                studentAuthMode === "PASSWORD"
                  ? handleStudentPasswordLogin
                  : otpSent
                    ? handleVerifyOtp
                    : handleRequestOtp
              }
              className="login-form"
            >
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setStudentAuthMode("PASSWORD");
                    setStudentError("");
                    setStudentMessage("");
                  }}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: studentAuthMode === "PASSWORD" ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: studentAuthMode === "PASSWORD" ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--surface-alt)",
                    color: studentAuthMode === "PASSWORD" ? "var(--accent)" : "var(--muted)",
                    transition: "all 0.15s ease",
                  }}
                >
                  Password Sign-In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStudentAuthMode("OTP");
                    setStudentError("");
                    setStudentMessage("");
                  }}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: studentAuthMode === "OTP" ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: studentAuthMode === "OTP" ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--surface-alt)",
                    color: studentAuthMode === "OTP" ? "var(--accent)" : "var(--muted)",
                    transition: "all 0.15s ease",
                  }}
                >
                  6-Digit OTP
                </button>
              </div>

              {studentError && (
                <div className="login-alert-error" role="alert">
                  <AlertCircle size={16} />
                  <span>{studentError}</span>
                </div>
              )}
              {studentMessage && (
                <div className="login-alert-success" role="status">
                  <CheckCircle size={16} />
                  <span>{studentMessage}</span>
                </div>
              )}

              <div className="login-field-group">
                <label htmlFor="student-id-input" className="login-field-label">
                  Student Email
                </label>
                <div className="login-input-wrap">
                  <Mail size={16} className="login-input-icon" aria-hidden="true" />
                  <input
                    id="student-id-input"
                    type="email"
                    required
                    autoComplete="username"
                    placeholder="student@aintrixacademy.edu"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    disabled={studentAuthMode === "OTP" && otpSent}
                    className="login-input"
                  />
                </div>
              </div>

              {studentAuthMode === "PASSWORD" ? (
                <div className="login-field-group">
                  <label htmlFor="student-password-input" className="login-field-label">
                    Password
                  </label>
                  <div className="login-input-wrap">
                    <Lock size={16} className="login-input-icon" aria-hidden="true" />
                    <input
                      id="student-password-input"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                      className="login-input"
                      style={{ paddingRight: "44px" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        background: "none",
                        border: "none",
                        color: "var(--muted)",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ) : (
                otpSent && (
                  <div className="login-field-group">
                    <label htmlFor="student-otp-input" className="login-field-label">
                      Verification Code (OTP)
                    </label>
                    <input
                      id="student-otp-input"
                      type="text"
                      required
                      maxLength={6}
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="login-input"
                      style={{
                        fontSize: "20px",
                        letterSpacing: "6px",
                        textAlign: "center",
                        fontWeight: 700,
                        paddingLeft: "16px",
                      }}
                    />
                  </div>
                )
              )}

              <button type="submit" disabled={studentLoading} className="login-submit-btn">
                {studentLoading
                  ? "Signing In..."
                  : studentAuthMode === "PASSWORD"
                    ? "Sign In to Student Portal"
                    : otpSent
                      ? "Verify & Enter Workspace"
                      : "Send Login Code"} <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* Quick Demo Role Fillers (Required for 1-click test flows & fast review) */}
          <div className="login-quick-roles">
            <div className="login-quick-roles-title">
              <ShieldCheck size={14} color="var(--accent)" />
              <span>Quick Role Access (1-Click Fill)</span>
            </div>
            <div className="login-roles-grid">
              <button
                type="button"
                onClick={() => fillCredentials("ADMIN")}
                className="login-role-btn"
              >
                <KeyRound size={12} color="var(--accent)" /> Admin
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("TRAINER")}
                className="login-role-btn"
              >
                <Presentation size={12} color="var(--accent)" /> Trainer
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("STUDENT")}
                className="login-role-btn"
              >
                <GraduationCap size={12} color="var(--accent)" /> Student
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("MANAGER")}
                className="login-role-btn"
              >
                <Briefcase size={12} color="var(--accent)" /> Manager
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("FINANCIER")}
                className="login-role-btn"
              >
                <Coins size={12} color="var(--accent)" /> Financier
              </button>
            </div>
          </div>
        </div>

        {/* Form Pane Footer */}
        <footer className="login-form-footer">
          <span>Secure AES/TLS Authentication</span>
          <Link to="/" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
            Aintrix Academy
          </Link>
        </footer>
      </main>
    </div>
  );
}
