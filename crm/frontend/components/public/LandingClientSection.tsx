"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, FileCheck2, ShieldCheck, Award } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EnquiryModal } from "@/components/public/EnquiryModal";

export function LandingClientHero() {
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
        <Link href="/courses">
          <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-sm">
            <span>Explore Academic Programs</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => setEnquiryOpen(true)}
          className="w-full sm:w-auto"
        >
          <span>Request Prospectus & Advisory</span>
        </Button>
      </div>

      <EnquiryModal
        isOpen={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
      />
    </>
  );
}

export function LandingEnquiryBanner() {
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  return (
    <>
      <section className="py-16 sm:py-20 bg-gradient-to-br from-[#6D1A2B] to-[#4E0F1E] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF6EC]/15 border border-[#C9A24B]/40 text-[#F6EBCF] text-xs font-semibold">
            <Award className="w-4 h-4 text-[#C9A24B]" />
            <span>Admissions Committee Consultations</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-white max-w-2xl mx-auto">
            Take Your Engineering Acumen to Institutional Heights
          </h2>

          <p className="text-xs sm:text-sm text-stone-200 max-w-xl mx-auto leading-relaxed">
            Our admissions committee reviews technical background, motivation, and cohort placement to ensure exceptional peer-group depth. Connect with an advisor today.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="gold"
              size="lg"
              onClick={() => setEnquiryOpen(true)}
              className="w-full sm:w-auto"
            >
              <span>Submit Admissions Enquiry</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Link href="/verify-certificate">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-white/40 text-white hover:bg-white/10"
              >
                <span>Verify Credential Token</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <EnquiryModal
        isOpen={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
      />
    </>
  );
}
