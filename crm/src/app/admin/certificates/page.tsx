"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge";
import {
  Award,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  Ban,
  RefreshCw,
  Search,
  X,
  FileCheck,
} from "lucide-react";

interface CertificateItem {
  id: string;
  certificateNumber: string;
  verificationToken: string;
  studentName: string;
  courseTitle: string;
  issueDate: string;
  status: string;
  revocationReason?: string;
  studentProfile: {
    user: { name: string; email: string };
  };
  course: { code: string; title: string };
  batch?: { code: string };
}

interface EligibleCompletion {
  id: string;
  attendancePercent: number;
  syllabusPercent: number;
  decidedAt: string;
  studentProfile: {
    id: string;
    user: { name: string; email: string };
  };
  batch: {
    code: string;
    course: { code: string; title: string };
  };
}

export default function AdminCertificatesPage() {
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [eligibleCompletions, setEligibleCompletions] = useState<EligibleCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/certificates");
      const data = await res.json();
      if (data.certificates) {
        setCertificates(data.certificates);
        setEligibleCompletions(data.eligibleCompletions || []);
      }
    } catch (e) {
      console.error("Failed to load certificates:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleIssueCertificate = async (completionDecisionId: string) => {
    setIssuingId(completionDecisionId);
    setActionMessage(null);
    try {
      const res = await fetch("/api/admin/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completionDecisionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to issue certificate");
      }
      setActionMessage({
        type: "success",
        text: `Certificate ${data.certificateNumber} successfully generated and issued.`,
      });
      loadData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setIssuingId(null);
    }
  };

  const handleRevokeCertificate = async (id: string) => {
    const reason = prompt("Enter the official reason for revoking this certificate:");
    if (!reason || reason.trim().length === 0) return;

    setRevokingId(id);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/certificates/${id}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to revoke certificate");
      }
      setActionMessage({
        type: "success",
        text: `Certificate revoked. It will now verify as REVOKED on the public lookup.`,
      });
      loadData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <AppShell
      user={{
        name: "Admin",
        email: "admin@apex.edu",
        role: "ADMIN",
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2A0F16]">Certificate Governance & Issuance</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Issue cryptographically verifiable graduation credentials strictly backed by approved Phase 1 academic completion records.
          </p>
        </div>
        <button
          onClick={loadData}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 active:scale-95 transition-transform"
          title="Refresh"
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-sm text-xs ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-rose-50 border-rose-300 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Eligible Awaiting Issuance Section */}
      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-4 bg-[#FFFBF5] border-b border-[#2A0F16]/10 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#2A0F16] flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#6D1A2B]" />
              <span>Eligible Students Awaiting Certificate ({eligibleCompletions.length})</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Students who satisfied 100% attendance and syllabus coverage with approved completion decisions.
            </p>
          </div>
        </div>

        {eligibleCompletions.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-400">
            No pending eligible students awaiting certificates. All approved graduates have been issued credentials.
          </div>
        ) : (
          <>
            {/* Mobile Card List (< md) */}
            <div className="block md:hidden divide-y divide-stone-100">
              {eligibleCompletions.map((c) => (
                <div key={c.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-[#2A0F16]">
                        {c.studentProfile?.user?.name || "Student"}
                      </h3>
                      <p className="text-[11px] text-stone-500">{c.batch?.course?.title}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] shrink-0">
                      {c.attendancePercent}% Attended
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span>Batch: <strong className="font-mono text-stone-800">{c.batch?.code}</strong></span>
                    <span>Approved: {new Date(c.decidedAt).toLocaleDateString()}</span>
                  </div>

                  <button
                    onClick={() => handleIssueCertificate(c.id)}
                    disabled={issuingId === c.id}
                    className="min-h-[44px] w-full rounded-xl bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] font-semibold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Award className="w-4 h-4" />
                    <span>{issuingId === c.id ? "Issuing..." : "Generate & Issue Certificate"}</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#2A0F16]/10 text-stone-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Batch</th>
                    <th className="py-3 px-4">Attendance</th>
                    <th className="py-3 px-4">Completion Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {eligibleCompletions.map((c) => (
                    <tr key={c.id} className="hover:bg-stone-50/60 transition">
                      <td className="py-3 px-4 font-semibold text-[#2A0F16]">
                        {c.studentProfile?.user?.name || "Student"}
                      </td>
                      <td className="py-3 px-4 text-stone-600">{c.batch?.course?.title}</td>
                      <td className="py-3 px-4 font-mono text-stone-500">{c.batch?.code}</td>
                      <td className="py-3 px-4 text-emerald-700 font-bold">
                        {c.attendancePercent}% Attended
                      </td>
                      <td className="py-3 px-4 text-stone-500">
                        {new Date(c.decidedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleIssueCertificate(c.id)}
                          disabled={issuingId === c.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] font-semibold text-xs shadow-xs transition"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>{issuingId === c.id ? "Issuing..." : "Generate & Issue"}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Issued Certificates Ledger */}
      {/* Issued Certificates Ledger */}
      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#2A0F16]/10 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#2A0F16] flex items-center gap-2">
            <Award className="w-4 h-4 text-[#6D1A2B]" />
            <span>Issued Certificates Ledger ({certificates.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-stone-500">Loading certificate registry...</div>
        ) : certificates.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">No certificates issued yet.</div>
        ) : (
          <>
            {/* Mobile Card List (< md) */}
            <div className="block md:hidden divide-y divide-stone-100">
              {certificates.map((cert) => (
                <div key={cert.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-xs text-[#6D1A2B]">
                        {cert.certificateNumber}
                      </span>
                      <h3 className="font-bold text-sm text-[#2A0F16] mt-0.5">
                        {cert.studentName || cert.studentProfile?.user?.name}
                      </h3>
                      <p className="text-[11px] text-stone-500">
                        {cert.courseTitle || cert.course?.title}
                      </p>
                    </div>
                    <PaymentStatusBadge status={cert.status} />
                  </div>

                  <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
                    <span>
                      Issued: {new Date(cert.issueDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <a
                      href={`/verify-certificate/${cert.verificationToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#6D1A2B] hover:underline"
                    >
                      <span>Public Lookup</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`/api/certificates/${cert.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] flex-1 rounded-xl bg-stone-100 text-[#6D1A2B] hover:bg-stone-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF</span>
                    </a>

                    {cert.status === "ISSUED" && (
                      <button
                        onClick={() => handleRevokeCertificate(cert.id)}
                        disabled={revokingId === cert.id}
                        className="min-h-[44px] px-4 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <Ban className="w-4 h-4" />
                        <span>Revoke</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 text-stone-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Certificate #</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Public Verification</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {certificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-stone-50/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#6D1A2B]">
                        {cert.certificateNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#2A0F16]">
                        {cert.studentName || cert.studentProfile?.user?.name}
                      </td>
                      <td className="py-3 px-4 text-stone-600">
                        {cert.courseTitle || cert.course?.title}
                      </td>
                      <td className="py-3 px-4 text-stone-500">
                        {new Date(cert.issueDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <PaymentStatusBadge status={cert.status} />
                      </td>
                      <td className="py-3 px-4">
                        <a
                          href={`/verify-certificate/${cert.verificationToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 hover:text-[#6D1A2B] hover:underline"
                        >
                          <span>Check Public Page</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/api/certificates/${cert.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6D1A2B] hover:underline"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </a>

                          {cert.status === "ISSUED" && (
                            <button
                              onClick={() => handleRevokeCertificate(cert.id)}
                              disabled={revokingId === cert.id}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:underline"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Revoke</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
