"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, ShieldAlert, ArrowLeft } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [errorId, setErrorId] = useState("");

  useEffect(() => {
    // Generate traceable correlation error identifier
    const id = "ERR-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    setErrorId(id);
    console.error(`[Application Error ${id}]:`, error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-[#2A0F16] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 shadow-card p-8 md:p-10 space-y-6">
        {/* Warning Icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-700">
          <AlertTriangle className="w-8 h-8" />
        </div>

        {/* Header */}
        <div className="space-y-2">
          <span className="inline-block text-[11px] font-bold tracking-widest text-red-700 uppercase bg-red-50 px-3 py-1 rounded-full border border-red-100">
            System Fault Intercepted
          </span>
          <h1 className="text-2xl font-serif font-bold text-[#6D1A2B]">
            Service Interruption
          </h1>
          <p className="text-xs md:text-sm text-[#6B5E62] leading-relaxed">
            An unexpected runtime condition occurred. For your security, sensitive operation details have been quarantined and recorded in operational logs.
          </p>
        </div>

        {/* Traceable Reference Badge */}
        {errorId && (
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs font-mono text-[#6B5E62] flex items-center justify-between">
            <span className="text-[11px] text-stone-400">Incident Code:</span>
            <span className="font-bold text-[#6D1A2B]">{error.digest || errorId}</span>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#6D1A2B] text-white text-xs font-semibold hover:bg-[#4E0F1E] transition-all shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Attempt Recovery</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-stone-200 bg-white text-[#2A0F16] text-xs font-semibold hover:bg-stone-50 transition-all"
          >
            <Home className="w-4 h-4 text-stone-400" />
            <span>Return Home</span>
          </Link>
        </div>

        {/* Support Note */}
        <div className="pt-4 border-t border-stone-100 flex items-center justify-center gap-2 text-[11px] text-[#A4999D]">
          <ShieldAlert className="w-3.5 h-3.5 text-[#C9A24B]" />
          <span>If this persists, contact academic support with the incident code.</span>
        </div>
      </div>
    </div>
  );
}
