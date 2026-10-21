"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function PublicNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { title: "Home", href: "/" },
    { title: "Verify Certificate", href: "/verify-certificate" },
    { title: "Portal Sign In", href: "/login" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E9E0D8] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#6D1A2B] text-[#F6EBCF] flex items-center justify-center font-serif font-bold text-xl shadow-xs group-hover:bg-[#4E0F1E] transition-colors border border-[#C9A24B]/30">
            A
          </div>
          <div>
            <span className="font-serif font-bold text-base sm:text-lg tracking-tight text-[#251923] block leading-tight">
              Apex Global Academy
            </span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-[#C9A24B]">
              Institutional Registry
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 min-h-[40px] flex items-center",
                  isActive
                    ? "text-[#6D1A2B] bg-[#FAF6EC] font-bold"
                    : "text-[#6B6268] hover:text-[#251923] hover:bg-[#F5F0E8]"
                )}
              >
                {link.title}
              </Link>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div className="hidden sm:flex items-center gap-3">
          <Link href="/login">
            <Button variant="primary" size="sm" className="font-semibold shadow-xs">
              <span>Portal Sign In</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-[#251923] hover:bg-[#F5F0E8] min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E9E0D8] bg-white px-4 py-5 space-y-2 shadow-lg animate-fade-in">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px] flex items-center",
                  isActive
                    ? "bg-[#FAF6EC] text-[#6D1A2B] font-bold"
                    : "text-[#251923] hover:bg-[#F5F0E8]"
                )}
              >
                {link.title}
              </Link>
            );
          })}
          <div className="pt-3 border-t border-[#E9E0D8] space-y-2">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#6D1A2B] text-white text-xs font-semibold min-h-[44px]"
            >
              <span>Portal Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
