import React from "react";
import Link from "next/link";
import { Award, ShieldCheck, Mail, MapPin, Phone } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-[#E9E0D8] bg-[#F5F0E8] text-[#251923]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3 group inline-flex">
              <div className="w-10 h-10 rounded-xl bg-[#6D1A2B] text-[#F6EBCF] flex items-center justify-center font-serif font-bold text-xl shadow-xs">
                A
              </div>
              <div>
                <span className="font-serif font-bold text-lg tracking-tight text-[#251923] block leading-tight">
                  Apex Global Academy
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-[#C9A24B]">
                  Academic Institution of Advanced Computing
                </span>
              </div>
            </Link>
            <p className="text-xs text-[#6B6268] max-w-md leading-relaxed">
              Apex Global Academy provides rigorous technical education across software architecture,
              distributed systems, cloud computing, and applied analytics. Governed by atomic syllabus
              tracking, expert faculty practitioners, and verifiable credentials.
            </p>
            <div className="flex items-center gap-4 pt-2 text-xs text-[#6B6268]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#19674B]" />
                <span>ISO & Educational Standards Compliant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#C9A24B]" />
                <span>SHA-256 Verified Certificates</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[#6D1A2B]">
              Academics & Portals
            </h4>
            <ul className="space-y-2 text-xs text-[#6B6268]">
              <li>
                <Link href="/courses" className="hover:text-[#6D1A2B] transition-colors">
                  Course Catalog & Curriculum
                </Link>
              </li>
              <li>
                <Link href="/verify-certificate" className="hover:text-[#6D1A2B] transition-colors">
                  Public Certificate Verification
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#6D1A2B] transition-colors">
                  Academic Mission & Governance
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#6D1A2B] transition-colors">
                  Student & Faculty Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[#6D1A2B]">
              Admissions Office
            </h4>
            <ul className="space-y-2.5 text-xs text-[#6B6268]">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#6D1A2B] shrink-0 mt-0.5" />
                <span>Apex Global Academy Campus, Tech Innovation Corridor</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#6D1A2B] shrink-0" />
                <a href="mailto:admissions@apexacademy.edu" className="hover:text-[#6D1A2B]">
                  admissions@apexacademy.edu
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#6D1A2B] shrink-0" />
                <span>+1 (800) 555-APEX</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[#E9E0D8] flex flex-col sm:flex-row items-center justify-between text-xs text-[#6B6268] gap-4">
          <p>© {new Date().getFullYear()} Apex Global Academy. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/about" className="hover:text-[#6D1A2B] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/about" className="hover:text-[#6D1A2B] transition-colors">
              Terms of Enrollment
            </Link>
            <Link href="/verify-certificate" className="hover:text-[#6D1A2B] transition-colors">
              Registry Verification
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
