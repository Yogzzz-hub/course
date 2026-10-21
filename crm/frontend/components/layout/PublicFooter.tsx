import React from "react";
import Link from "next/link";
import { Award, ShieldCheck, Mail } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-[#E9E0D8] bg-[#F5F0E8] text-[#251923]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand Info */}
          <div className="space-y-2 text-center md:text-left">
            <Link href="/" className="flex items-center gap-3 inline-flex">
              <div className="w-9 h-9 rounded-xl bg-[#6D1A2B] text-[#F6EBCF] flex items-center justify-center font-serif font-bold text-lg shadow-xs">
                A
              </div>
              <span className="font-serif font-bold text-base tracking-tight text-[#251923]">
                Apex Global Academy
              </span>
            </Link>
            <p className="text-xs text-[#6B6268] max-w-md">
              Institutional Certificate Registry & Verifiable Credentials
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#6B6268]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#19674B]" />
              <span>Compliant Registry</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#C9A24B]" />
              <span>Cryptographically Verified</span>
            </div>
            <Link href="/login" className="hover:text-[#6D1A2B] font-semibold">
              Portal Sign In
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#E9E0D8] text-center text-xs text-[#6B6268]">
          © {new Date().getFullYear()} Apex Global Academy. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
