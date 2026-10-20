"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { formatDate } from "@/lib/utils";
import {
  Award,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
  ShieldCheck,
} from "lucide-react";

export default function StudentCertificatesPage() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [completedDecisions, setCompletedDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/student/certificates")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((d) => {
        setCertificates(d.certificates || []);
        setCompletedDecisions(d.completedDecisions || []);
      })
      .catch((err) => console.error("Failed to load certificates:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleCopyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/verify-certificate/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AppShell
      user={{
        name: "Student",
        email: "student@apexacademy.edu",
        role: "STUDENT",
      }}
    >
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
          Credentials & Awards
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Academic Certificates & Diplomas
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Cryptographically verifiable institutional credentials awarded upon confirmed academic completion.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-stone-500 animate-pulse bg-white rounded-2xl border border-stone-200">
          Loading credentials ledger...
        </div>
      ) : certificates.length === 0 && completedDecisions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#2A0F16]/10 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[#FFFBF5] text-[#C9A24B] flex items-center justify-center mx-auto mb-4 border border-[#C9A24B]/30">
            <Award className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#2A0F16]">
            No Certificates Issued Yet
          </h2>
          <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
            Certificates of Professional Competency are awarded upon achieving course syllabus completion and passing the mandatory attendance eligibility threshold.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-2.5 sm:gap-3">
            <Link
              href="/student/progress"
              className="px-4 py-2.5 rounded-xl bg-[#6D1A2B] text-white text-xs font-bold hover:bg-[#4E0F1E] transition-colors min-h-[44px] flex items-center justify-center"
            >
              View Syllabus Progress
            </Link>
            <Link
              href="/student/attendance"
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-[#2A0F16] text-xs font-semibold hover:bg-stone-50 transition-colors min-h-[44px] flex items-center justify-center"
            >
              Check Attendance Health
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Issued Certificates */}
          {certificates.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-[#2A0F16] uppercase tracking-wider text-stone-500">
                Official Issued Credentials ({certificates.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {certificates.map((cert) => {
                  const isRevoked = cert.status === "REVOKED";

                  return (
                    <div
                      key={cert.id}
                      className={`bg-white rounded-3xl border p-5 sm:p-6 shadow-sm space-y-4 relative overflow-hidden transition-all ${
                        isRevoked ? "border-rose-200 bg-rose-50/20" : "border-[#2A0F16]/15 hover:border-[#6D1A2B]/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                            isRevoked ? "bg-rose-100 text-rose-700" : "bg-[#FFFBF5] text-[#6D1A2B] border border-[#6D1A2B]/20"
                          }`}>
                            <Award className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold text-[#C9A24B] uppercase tracking-wider block">
                              {cert.certificateNumber}
                            </span>
                            <h3 className="text-base font-extrabold text-[#2A0F16] line-clamp-1">
                              {cert.courseTitle}
                            </h3>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isRevoked
                              ? "bg-rose-100 text-rose-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {cert.status}
                        </span>
                      </div>

                      <div className="text-xs text-stone-600 space-y-1 pt-2 border-t border-stone-100">
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400">Awarded To:</span>
                          <span className="font-semibold text-[#2A0F16]">{cert.studentName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400">Issue Date:</span>
                          <span className="font-medium text-stone-700">{formatDate(cert.issueDate)}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <a
                          href={cert.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-2.5 px-3 rounded-xl bg-[#6D1A2B] hover:bg-[#4E0F1E] text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 shadow-2xs min-h-[44px]"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </a>

                        <button
                          onClick={() => handleCopyLink(cert.verificationToken, cert.id)}
                          className="py-2.5 px-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-[#2A0F16] inline-flex items-center justify-center gap-1 transition-colors min-h-[44px]"
                        >
                          {copiedId === cert.id ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-stone-500" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completions Awaiting Issuance */}
          {completedDecisions.some((d) => !d.hasCertificate) && (
            <div className="bg-white rounded-3xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C9A24B]" />
                <h3 className="text-sm font-bold text-[#2A0F16]">
                  Academic Completions Approved (Pending Document Issuance)
                </h3>
              </div>
              <p className="text-xs text-stone-500">
                The academic director has approved your course completion. Digital certificate credentials are being stamped by administrative governance.
              </p>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
