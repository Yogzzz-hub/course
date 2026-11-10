import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Coins,
  CreditCard,
  TrendingUp,
  FileText,
  DollarSign,
  LogOut,
  CheckCircle2,
  AlertCircle,
  ArrowDownLeft,
  RotateCcw,
} from "lucide-react";

export default function FinancierPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"payments" | "reconciliation">("payments");

  const payments = [
    { id: "TXN-9021", student: "Karthik Subramanian", amount: "₹45,000", method: "UPI / Razorpay", status: "Verified", date: "10 Nov 2026", invoice: "INV-2026-001" },
    { id: "TXN-9022", student: "Sneha Patel", amount: "₹95,000", method: "Bank Transfer (NEFT)", status: "Verified", date: "09 Nov 2026", invoice: "INV-2026-002" },
    { id: "TXN-9023", student: "Aravind Kumar", amount: "₹30,000", method: "Credit Card (EMI)", status: "Verified", date: "08 Nov 2026", invoice: "INV-2026-003" },
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
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#F472B6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Coins size={18} color="#0B0E14" />
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700 }}>Apex & Aintrix CRM — Financier Portal</div>
            <div style={{ fontSize: "11px", color: "var(--muted, #94A3B8)" }}>Revenue, Collections & Invoicing</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "12px", color: "var(--muted, #94A3B8)" }}>
            Logged in as <strong style={{ color: "#FFF" }}>Lead Financier</strong>
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
            <div style={{ fontSize: "12px", color: "var(--muted, #94A3B8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Monthly Collections</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#1CE798" }}>₹14,85,000</div>
            <div style={{ fontSize: "12px", color: "#60A5FA", marginTop: "4px" }}>+18% Compared to Last Month</div>
          </div>
          <div style={{ padding: "20px", borderRadius: "12px", background: "var(--surface, rgba(255,255,255,0.03))", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
            <div style={{ fontSize: "12px", color: "var(--muted, #94A3B8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Pending Installments</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#FBBF24" }}>₹2,40,000</div>
            <div style={{ fontSize: "12px", color: "var(--muted, #94A3B8)", marginTop: "4px" }}>5 Installments Due This Week</div>
          </div>
          <div style={{ padding: "20px", borderRadius: "12px", background: "var(--surface, rgba(255,255,255,0.03))", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
            <div style={{ fontSize: "12px", color: "var(--muted, #94A3B8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Reconciliation Status</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#F472B6" }}>100% Matched</div>
            <div style={{ fontSize: "12px", color: "#1CE798", marginTop: "4px" }}>Zero Unmatched Gateway Diffs</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border, rgba(255,255,255,0.1))", paddingBottom: "12px", marginBottom: "24px" }}>
          <button
            onClick={() => setActiveTab("payments")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "13px",
              background: activeTab === "payments" ? "var(--accent, #1CE798)" : "transparent",
              color: activeTab === "payments" ? "#0B0E14" : "var(--muted, #94A3B8)"
            }}
          >
            Verified Fee Transactions
          </button>
        </div>

        {/* Transactions Table */}
        <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left", color: "var(--muted, #94A3B8)" }}>
                <th style={{ padding: "14px 16px" }}>Transaction ID</th>
                <th style={{ padding: "14px 16px" }}>Student</th>
                <th style={{ padding: "14px 16px" }}>Amount</th>
                <th style={{ padding: "14px 16px" }}>Payment Method</th>
                <th style={{ padding: "14px 16px" }}>Date</th>
                <th style={{ padding: "14px 16px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid var(--border, rgba(255,255,255,0.05))" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 600, color: "#60A5FA" }}>{p.id}</td>
                  <td style={{ padding: "14px 16px", color: "#FFF", fontWeight: 600 }}>{p.student}</td>
                  <td style={{ padding: "14px 16px", color: "#1CE798", fontWeight: 700 }}>{p.amount}</td>
                  <td style={{ padding: "14px 16px", color: "var(--muted, #94A3B8)" }}>{p.method}</td>
                  <td style={{ padding: "14px 16px", color: "var(--muted, #94A3B8)" }}>{p.date}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ padding: "4px 8px", borderRadius: "4px", background: "rgba(28,231,152,0.1)", color: "#1CE798", fontSize: "11px", fontWeight: 600 }}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}
