"use client";

import React, { useState, useEffect, useRef } from "react";
import { Palette, Check } from "lucide-react";

export interface ThemeOption {
  id: string;
  name: string;
  tagline: string;
  primary: string;
  accent: string;
  bg: string;
}

export const themes: ThemeOption[] = [
  {
    id: "theme-1",
    name: "Burgundy + Ice Blue",
    tagline: "Modern luxury · Clean",
    primary: "#681C35",
    accent: "#A9C9DC",
    bg: "#F7F9FB",
  },
  {
    id: "theme-2",
    name: "Burgundy + Soft Copper",
    tagline: "Warm luxury · Welcoming",
    primary: "#701F38",
    accent: "#DAA17B",
    bg: "#FFF9F5",
  },
  {
    id: "theme-3",
    name: "Burgundy + Dusty Lavender",
    tagline: "Creative · Contemporary",
    primary: "#681B37",
    accent: "#C2ACD8",
    bg: "#FAF8FC",
  },
  {
    id: "theme-4",
    name: "Burgundy + Rose Blush",
    tagline: "Modern luxury · Poised",
    primary: "#581F32",
    accent: "#D7A7B5",
    bg: "#FAF5F7",
  },
];

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const [currentTheme, setCurrentTheme] = useState("theme-1");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial read from document or localStorage
    const saved = localStorage.getItem("academy-theme");
    const active = saved || document.documentElement.dataset.theme || "theme-1";
    setCurrentTheme(active);
    document.documentElement.dataset.theme = active;

    const handleThemeChange = () => {
      const updated = localStorage.getItem("academy-theme") || "theme-1";
      setCurrentTheme(updated);
    };

    window.addEventListener("academy-theme-change", handleThemeChange);
    return () => window.removeEventListener("academy-theme-change", handleThemeChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    document.documentElement.dataset.theme = themeId;
    document.documentElement.dataset.themeTransitioning = "true";
    try {
      localStorage.setItem("academy-theme", themeId);
    } catch {}
    window.dispatchEvent(new Event("academy-theme-change"));
    setTimeout(() => {
      delete document.documentElement.dataset.themeTransitioning;
    }, 400);
    setOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 shadow-2xs hover:opacity-90"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
        aria-label="Change theme"
        title="Change theme palette"
      >
        <Palette className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
        {!compact && <span className="font-medium">Theme</span>}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-72 rounded-2xl border shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="text-[11px] font-bold tracking-wider uppercase opacity-60 mb-2 px-2" style={{ color: "var(--muted)" }}>
            Select Color Palette
          </div>
          <div className="space-y-1">
            {themes.map((t) => {
              const isSelected = currentTheme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => selectTheme(t.id)}
                  className="w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors text-xs hover:opacity-85"
                  style={{
                    backgroundColor: isSelected ? "var(--surface-alt)" : "transparent",
                    color: "var(--text)",
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center -space-x-1.5">
                      <span
                        className="w-4 h-4 rounded-full border border-white shadow-xs"
                        style={{ backgroundColor: t.primary }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-white shadow-xs"
                        style={{ backgroundColor: t.accent }}
                      />
                    </div>
                    <div>
                      <div className="font-semibold leading-tight">{t.name}</div>
                      <div className="text-[10px] opacity-60">{t.tagline}</div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
