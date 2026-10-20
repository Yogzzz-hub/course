"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Button } from "@/components/ui/Button";
import { Award, ShieldCheck, Search, ArrowRight, CheckCircle2 } from "lucide-react";

export default function VerifyCertificateIndexPage() {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState("");
  const [error, setError] = useState("");

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = tokenInput.trim();
    if (!cleaned) {
      setError("Please enter a valid verification token or certificate UUID.");
      return;
    }
    router.push(`/verify-certificate/${encodeURIComponent(cleaned)}`);
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-between text-[#251923]">
      <PublicNavbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-10 w-full flex flex-col justify-center">
        {/* Verification Box Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF6EC] border border-[#DEC278] text-[#997324] flex items-center justify-center mx-auto shadow-xs">
            <Award className="w-7 h-7 text-[#C9A24B]" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#251923]">
            Institutional Certificate Verification
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6268] max-w-lg mx-auto leading-relaxed">
            Verify the authentic graduation credential of an Apex Global Academy alumnus. Enter the cryptographic token printed on the certificate or encoded in its QR code.
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-white rounded-3xl border border-[#E9E0D8] p-6 sm:p-10 shadow-sm space-y-6">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#251923] mb-2">
                Certificate Verification Token or Identifier
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={tokenInput}
                  onChange={(e) => {
                    setTokenInput(e.target.value);
                    setError("");
                  }}
                  placeholder="e.g. 90ee3b2c-23c8-4a1e-8622-06f42c473b46"
                  className="w-full pl-4 pr-12 py-3 rounded-xl border border-[#E9E0D8] focus:outline-none focus:border-[#6D1A2B] text-xs sm:text-sm font-mono bg-white min-h-[48px]"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6268]" />
              </div>
              {error && (
                <p className="mt-1.5 text-xs text-[#B42318] font-medium">
                  {error}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
            >
              <span>Verify Credential Against Registry</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Trust Guarantees */}
          <div className="pt-6 border-t border-[#E9E0D8] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#6B6268]">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#19674B] shrink-0 mt-0.5" />
              <span>Cryptographically signed with SHA-256 digest validation</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#19674B] shrink-0 mt-0.5" />
              <span>Immutable registry timestamps and revocation tracking</span>
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link href="/" className="text-xs font-semibold text-[#6D1A2B] hover:underline">
            ← Return to Academy Homepage
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
