"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  Calendar,
  User,
  BookOpen,
  ArrowLeft,
  XCircle,
} from "lucide-react";

export default function PublicVerifyCertificatePage() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    fetch(`/api/verify-certificate/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (res.ok) {
          setData(json);
        } else {
          setError(json.message || "Invalid certificate token");
        }
      })
      .catch(() => {
        setError("Verification registry unreachable. Please check connection and try again.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#251923] flex flex-col justify-between">
      <PublicNavbar />

      {/* Main Container */}
      <main className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16 flex-1 flex flex-col justify-center">
        <div className="mb-4">
          <Link
            href="/verify-certificate"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B6268] hover:text-[#6D1A2B] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Verify Another Token</span>
          </Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl border border-[#E9E0D8] p-8 sm:p-12 text-center shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF6EC] animate-spin mx-auto flex items-center justify-center text-[#C9A24B]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-lg font-bold text-[#251923]">
              Verifying Institutional Credential...
            </h2>
            <p className="text-xs text-[#6B6268] font-mono">
              Querying cryptographic registry token...
            </p>
          </div>
        ) : error || !data?.isValid ? (
          <div className="bg-white rounded-3xl border border-[#FDA29B] p-6 sm:p-10 shadow-xs text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FEECEB] flex items-center justify-center text-[#B42318] mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#B42318]">
              {data?.status === "REVOKED" ? "Credential Formally Revoked" : "Unverified Academic Credential"}
            </h1>
            <p className="text-xs text-[#6B6268] max-w-md mx-auto leading-relaxed">
              {data?.status === "REVOKED"
                ? `This certificate was revoked on official institutional grounds. Reason: ${data?.revocationReason || "Administrative governance decision"}.`
                : "No authentic graduation credential matches this verification token. The certificate may have expired, been altered, or does not exist in the institutional registry."}
            </p>

            <div className="pt-4 border-t border-[#E9E0D8] text-[11px] text-[#6B6268] font-mono break-all">
              Token checked: {token}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#E9E0D8] p-6 sm:p-10 shadow-sm space-y-6">
            {/* Header banner badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E7F3EE] text-[#19674B] border border-[#A7D6C3]">
              <CheckCircle2 className="w-4 h-4 text-[#19674B] shrink-0" />
              <span>OFFICIALLY VERIFIED CREDENTIAL</span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B] block">
                  {data.academyName || "Apex Global Academy"}
                </span>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#251923] mt-0.5">
                  Verified Academic Credential
                </h1>
                <p className="text-xs text-[#6B6268] mt-1">
                  Issued under the authority of the Academic Director and Governing Faculty Board.
                </p>
              </div>

              {/* Credential Data Card */}
              <div className="bg-[#FBF9F5] rounded-2xl border border-[#E9E0D8] p-5 space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-[#6D1A2B] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-[11px] text-[#6B6268] block">Recipient Graduate</span>
                    <span className="text-sm sm:text-base font-bold text-[#251923] block break-words">
                      {data.studentName}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-3 border-t border-[#E9E0D8]">
                  <BookOpen className="w-4 h-4 text-[#315F70] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-[11px] text-[#6B6268] block">Academic Program</span>
                    <span className="text-xs sm:text-sm font-bold text-[#251923] block break-words">
                      {data.courseTitle}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#E9E0D8]">
                  <div>
                    <span className="text-[11px] text-[#6B6268] block">Certificate Serial</span>
                    <span className="font-mono font-bold text-[#6D1A2B] text-xs break-all">
                      {data.certificateNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#6B6268] block">Conferral Date</span>
                    <span className="font-semibold text-[#251923] text-xs">
                      {formatDate(data.issueDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="p-3.5 rounded-xl bg-[#F5F0E8] border border-[#E9E0D8] text-[11px] text-[#6B6268] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#19674B] shrink-0 mt-0.5" />
                <span>
                  Privacy Protection: For student protection, private contact details, tuition records, and detailed quiz breakdowns are withheld from public display.
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
