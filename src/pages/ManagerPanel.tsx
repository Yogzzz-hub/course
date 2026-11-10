import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Briefcase,
  Users,
  AlertCircle,
  CheckCircle2,
  Calendar,
  LogOut,
  TrendingUp,
  Mail,
  UserCheck,
  Search,
  Filter,
} from "lucide-react";

export default function ManagerPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"enquiries" | "admissions" | "attendance">("enquiries");

  const enquiries = [
    { id: "ENQ-801", name: "Rahul Sharma", email: "rahul.s@example.com", phone: "+91 98765 43210", track: "Python Full-Stack", date: "10 Nov 2026", status: "New Lead" },
    { id: "ENQ-802", name: "Priya Nair", email: "priya.nair@example.com", phone: "+91 98765 12345", track: "React Frontend Mastery", date: "09 Nov 2026", status: "Counselling Scheduled" },
    { id: "ENQ-803", name: "Anand Verma", email: "anand.v@example.com", phone: "+91 91234 56789", track: "DSA & System Design", date: "08 Nov 2026", status: "Offer Extended" },
  ];

  const admissions = [
    { id: "ADM-501", student: "Karthik Subramanian", batch: "BATCH-PY-2026-A", feeStatus: "1st Installment Paid", agreementSigned: true, enrolledDate: "05 Nov 2026" },
    { id: "ADM-502", student: "Sneha Patel", batch: "BATCH-REACT-2026-B", feeStatus: "Full Payment Verified", agreementSigned: true, enrolledDate: "06 Nov 2026" },
  ];

  const handleLogout = () => {
    try {
      localStorage.removeItem("crm_session");
    } catch {}
    navigate("/login");
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #0B0E14)", color: "var(--text, #FFF)", display: "flex", flexDirection: "column" }}>
      {/* Top Navbar */}
      <header style={{
        height: "64px",
        borderBottom: "1px solid var(--border, rgba(255,255,255,0.1))",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "rgba(11, 14, 20, 0.9)",
        backdropFilter: "blur(10px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#A78BFA", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Briefcase size={18} color="#0B0E14" />
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700 }}>Apex & Aintrix CRM — Manager Portal</div>
            <div style={{ fontSize: "11px", color: "var(--muted, #94A3B8)" }}>Admissions & Cohort Operations</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "12px", color: "var(--muted, #94A3B8)" }}>
            Logged in as <strong style={{ color: "#FFF" }}>Operations Manager</strong>
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#F87171",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "32px 24px", maxWidth: "1200px", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        
        {/* Metric Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          <div style={{ padding: "20px", borderRadius: "12px", background: "var(--surface, rgba(255,255,255,0.03))", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
            <div style={{ fontSize: "12px", color: "var(--muted, #94A3B8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Active Enquiries</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#A78BFA" }}>28 Leads</div>
            <div style={{ fontSize: "12px", color: "#1CE798", marginTop: "4px" }}>+6 New This Week</div>
          </div>
          <div style={{ padding: "20px", borderRadius: "12px", background: "var(--surface, rgba(255,255,255,0.03))", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
            <div style={{ fontSize: "12px", color: "var(--muted, #94A3B8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Confirmed Admissions</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#1CE798" }}>19 Students</div>
            <div style={{ fontSize: "12px", color: "var(--muted, #94A3B8)", marginTop: "4px" }}>For Upcoming Cohorts</div>
          </div>
          <div style={{ padding: "20px", borderRadius: "12px", background: "var(--surface, rgba(255,255,255,0.03))", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
            <div style={{ fontSize: "12px", color: "var(--muted, #94A3B8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Attendance Alerts</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#FBBF24" }}>2 Flags</div>
            <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>Requires Outreach</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border, rgba(255,255,255,0.1))", paddingBottom: "12px", marginBottom: "24px" }}>
          <button
            onClick={() => setActiveTab("enquiries")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "13px",
              background: activeTab === "enquiries" ? "var(--accent, #1CE798)" : "transparent",
              color: activeTab === "enquiries" ? "#0B0E14" : "var(--muted, #94A3B8)"
            }}
          >
            Leads & Enquiries
          </button>
          <button
            onClick={() => setActiveTab("admissions")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "13px",
              background: activeTab === "admissions" ? "var(--accent, #1CE798)" : "transparent",
              color: activeTab === "admissions" ? "#0B0E14" : "var(--muted, #94A3B8)"
            }}
          >
            Recent Admissions
          </button>
        </div>

        {/* Content View */}
        {activeTab === "enquiries" && (
          <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left", color: "var(--muted, #94A3B8)" }}>
                  <th style={{ padding: "14px 16px" }}>Lead Name</th>
                  <th style={{ padding: "14px 16px" }}>Contact</th>
                  <th style={{ padding: "14px 16px" }}>Interested Track</th>
                  <th style={{ padding: "14px 16px" }}>Date</th>
                  <th style={{ padding: "14px 16px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((e) => (
                  <tr key={e.id} style={{ borderTop: "1px solid var(--border, rgba(255,255,255,0.05))" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: "#FFF" }}>{e.name}</td>
                    <td style={{ padding: "14px 16px", color: "var(--muted, #94A3B8)" }}>{e.email}<br/><span style={{ fontSize: "11px" }}>{e.phone}</span></td>
                    <td style={{ padding: "14px 16px", color: "#A78BFA", fontWeight: 600 }}>{e.track}</td>
                    <td style={{ padding: "14px 16px", color: "var(--muted, #94A3B8)" }}>{e.date}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ padding: "4px 8px", borderRadius: "4px", background: "rgba(167, 139, 250, 0.1)", color: "#A78BFA", fontSize: "11px", fontWeight: 600 }}>
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "admissions" && (
          <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left", color: "var(--muted, #94A3B8)" }}>
                  <th style={{ padding: "14px 16px" }}>Student</th>
                  <th style={{ padding: "14px 16px" }}>Allocated Batch</th>
                  <th style={{ padding: "14px 16px" }}>Fee Status</th>
                  <th style={{ padding: "14px 16px" }}>Enrolled Date</th>
                </tr>
              </thead>
              <tbody>
                {admissions.map((a) => (
                  <tr key={a.id} style={{ borderTop: "1px solid var(--border, rgba(255,255,255,0.05))" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: "#FFF" }}>{a.student}</td>
                    <td style={{ padding: "14px 16px", color: "#60A5FA" }}>{a.batch}</td>
                    <td style={{ padding: "14px 16px", color: "#1CE798" }}>{a.feeStatus}</td>
                    <td style={{ padding: "14px 16px", color: "var(--muted, #94A3B8)" }}>{a.enrolledDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </div>
  );
}
