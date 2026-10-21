import React from "react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { ContactClientForm } from "./ContactClientForm";
import { MapPin, Mail, Phone, Clock, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Contact Admissions | Apex Global Academy",
  description: "Get in touch with the admissions committee and academic administration at Apex Global Academy.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-between text-[#251923]">
      <PublicNavbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10 w-full">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
            Admissions Office
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#251923]">
            Connect with Academic Admissions
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6268] leading-relaxed">
            Have questions regarding curriculum requirements, cohort schedules, tuition financing, or enrollment procedures? Our advisors are here to assist.
          </p>
        </div>

        {/* Contact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Info Card */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-[#E9E0D8] p-6 shadow-xs space-y-5">
              <h3 className="font-serif font-bold text-base text-[#251923] border-b border-[#E9E0D8] pb-3">
                Academy Headquarters
              </h3>

              <div className="space-y-4 text-xs text-[#6B6268]">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#6D1A2B] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#251923] block">Campus Address</strong>
                    <span>Apex Global Academy Campus, Tech Innovation Corridor</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#6D1A2B] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#251923] block">Admissions Email</strong>
                    <a href="mailto:admissions@apexacademy.edu" className="hover:text-[#6D1A2B]">
                      admissions@apexacademy.edu
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#6D1A2B] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#251923] block">Admissions Line</strong>
                    <span>+1 (800) 555-APEX</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#6D1A2B] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#251923] block">Office Hours</strong>
                    <span>Monday – Friday: 09:00 – 18:00 IST</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#FAF6EC] rounded-2xl border border-[#DEC278] p-5 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-[#997324]">
                <ShieldCheck className="w-4 h-4 text-[#C9A24B]" />
                <span>Admissions Policy</span>
              </div>
              <p className="text-[#6B6268] leading-relaxed">
                Inquiries are routed directly to assigned admissions counselors. Responses are guaranteed within 24 operational hours.
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-3xl border border-[#E9E0D8] p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif font-bold text-lg text-[#251923] mb-4">
                Submit an Admissions Consultation Request
              </h2>
              <ContactClientForm />
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
