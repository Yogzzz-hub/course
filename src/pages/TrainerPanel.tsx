import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Presentation,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  LogOut,
  Calendar,
  Users,
  Award,
  BookOpen,
  PlusCircle,
  FileCheck,
  TrendingUp,
} from "lucide-react";

export default function TrainerPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"batches" | "sessions" | "students">("batches");
  const [selectedBatch, setSelectedBatch] = useState("BATCH-PY-2026-A");

  const batches = [
    { id: "BATCH-PY-2026-A", name: "Python Full-Stack Cohort A", students: 24, progress: 68, nextSession: "Today, 10:00 AM", module: "Django REST Architecture" },
    { id: "BATCH-REACT-2026-B", name: "React Modern Frontend Track", students: 18, progress: 85, nextSession: "Tomorrow, 2:00 PM", module: "State & Query Architecture" },
    { id: "BATCH-DSA-2026-C", name: "DSA & System Design Mastery", students: 30, progress: 42, nextSession: "Thursday, 6:00 PM", module: "Dynamic Programming & Graphs" },
  ];

  const sessions = [
    { id: "SES-101", topic: "Authentication, JWT & Middleware Security", batch: "BATCH-PY-2026-A", date: "10 Nov 2026", status: "Completed", attendance: "23/24" },
    { id: "SES-102", topic: "Database Transactions & Idempotency", batch: "BATCH-PY-2026-A", date: "08 Nov 2026", status: "Completed", attendance: "24/24" },
    { id: "SES-103", topic: "Dockerizing Python Services & PostgreSQL", batch: "BATCH-PY-2026-A", date: "06 Nov 2026", status: "Completed", attendance: "22/24" },
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
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#60A5FA", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Presentation size={18} color="#0B0E14" />
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700 }}>Apex & Aintrix CRM — Trainer Portal</div>
            <div style={{ fontSize: "11px", color: "var(--muted, #94A3B8)" }}>Lead Faculty Workspace</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "12px", color: "var(--muted, #94A3B8)" }}>
            Logged in as <strong style={{ color: "#FFF" }}>Lead Trainer</strong>
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
        
        {/* Metric Overview */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          <div style={{ padding: "20px", borderRadius: "12px", background: "var(--surface, rgba(255,255,255,0.03))", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
            <div style={{ fontSize: "12px", color: "var(--muted, #94A3B8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Active Cohorts</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#60A5FA" }}>3 Batches</div>
            <div style={{ fontSize: "12px", color: "#1CE798", marginTop: "4px" }}>72 Total Students Enrolled</div>
          </div>
          <div style={{ padding: "20px", borderRadius: "12px", background: "var(--surface, rgba(255,255,255,0.03))", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
            <div style={{ fontSize: "12px", color: "var(--muted, #94A3B8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Average Attendance</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#1CE798" }}>96.4%</div>
            <div style={{ fontSize: "12px", color: "var(--muted, #94A3B8)", marginTop: "4px" }}>Across 34 Verified Sessions</div>
          </div>
          <div style={{ padding: "20px", borderRadius: "12px", background: "var(--surface, rgba(255,255,255,0.03))", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
            <div style={{ fontSize: "12px", color: "var(--muted, #94A3B8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Syllabus Coverage</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#FBBF24" }}>65% Complete</div>
            <div style={{ fontSize: "12px", color: "var(--muted, #94A3B8)", marginTop: "4px" }}>On Track for Graduation</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border, rgba(255,255,255,0.1))", paddingBottom: "12px", marginBottom: "24px" }}>
          <button
            onClick={() => setActiveTab("batches")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "13px",
              background: activeTab === "batches" ? "var(--accent, #1CE798)" : "transparent",
              color: activeTab === "batches" ? "#0B0E14" : "var(--muted, #94A3B8)"
            }}
          >
            My Allocated Batches
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "13px",
              background: activeTab === "sessions" ? "var(--accent, #1CE798)" : "transparent",
              color: activeTab === "sessions" ? "#0B0E14" : "var(--muted, #94A3B8)"
            }}
          >
            Completed Sessions Log
          </button>
        </div>

        {/* Batches View */}
        {activeTab === "batches" && (
          <div style={{ display: "grid", gap: "16px" }}>
            {batches.map((b) => (
              <div key={b.id} style={{
                padding: "20px",
                borderRadius: "12px",
                background: "var(--surface, rgba(255,255,255,0.02))",
                border: "1px solid var(--border, rgba(255,255,255,0.08))",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px"
              }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#FFF", marginBottom: "4px" }}>{b.name}</div>
                  <div style={{ fontSize: "12px", color: "var(--muted, #94A3B8)" }}>
                    Code: <strong style={{ color: "#E2E8F0" }}>{b.id}</strong> · {b.students} Enrolled Students
                  </div>
                  <div style={{ fontSize: "13px", color: "#60A5FA", marginTop: "8px" }}>
                    Current Module: <strong>{b.module}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "var(--muted, #94A3B8)", textTransform: "uppercase" }}>Next Session</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#FBBF24" }}>{b.nextSession}</div>
                    <div style={{ fontSize: "12px", color: "#1CE798", marginTop: "2px" }}>{b.progress}% Syllabus Completed</div>
                  </div>

                  <button
                    onClick={() => alert(`Attendance entry opened for ${b.name}`)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      background: "var(--accent, #1CE798)",
                      color: "#0B0E14",
                      fontWeight: 700,
                      fontSize: "13px",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <PlusCircle size={15} /> Enter Session
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sessions View */}
        {activeTab === "sessions" && (
          <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left", color: "var(--muted, #94A3B8)" }}>
                  <th style={{ padding: "14px 16px" }}>Session Topic</th>
                  <th style={{ padding: "14px 16px" }}>Batch</th>
                  <th style={{ padding: "14px 16px" }}>Date</th>
                  <th style={{ padding: "14px 16px" }}>Attendance</th>
                  <th style={{ padding: "14px 16px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} style={{ borderTop: "1px solid var(--border, rgba(255,255,255,0.05))" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: "#FFF" }}>{s.topic}</td>
                    <td style={{ padding: "14px 16px", color: "var(--muted, #94A3B8)" }}>{s.batch}</td>
                    <td style={{ padding: "14px 16px", color: "var(--muted, #94A3B8)" }}>{s.date}</td>
                    <td style={{ padding: "14px 16px", color: "#1CE798", fontWeight: 600 }}>{s.attendance}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ padding: "4px 8px", borderRadius: "4px", background: "rgba(28,231,152,0.1)", color: "#1CE798", fontSize: "11px", fontWeight: 600 }}>
                        {s.status}
                      </span>
                    </td>
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
