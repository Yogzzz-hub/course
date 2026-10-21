import React from "react";

export interface AintrixLogoMarkProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

/**
 * Aintrix Academy geometric logo mark.
 * Exact Cyber-Apex emblem with dual ascending blades, precision matrix channels,
 * and central neural core node. Defaults to brand mint green (#1CE798).
 */
export function AintrixLogoMark({
  size = 32,
  color = "#1CE798",
  className = "",
  ...props
}: AintrixLogoMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill={color}
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Left Wing & Matrix Bridge */}
      <path d="M16 84L48 16H52L38 54H46V62H34L24 84H16Z" />
      {/* Right Wing & Precision Channel */}
      <path d="M84 84L56 24L52 28L62 54H54V62H66L76 84H84Z" />
      {/* Central Matrix Core Node */}
      <path d="M50 36L58 46L50 56L42 46Z" />
    </svg>
  );
}

export interface BrandLogoProps {
  variant?: "capsule" | "inline" | "sidebar";
  markSize?: number;
  className?: string;
}

export function BrandLogo({
  variant = "capsule",
  markSize = 34,
  className = "",
}: BrandLogoProps) {
  if (variant === "capsule") {
    return (
      <div
        className={`inline-flex items-center gap-3.5 px-5 py-2.5 rounded-full bg-[#1A0E15]/95 border border-white/12 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-white/25 ${className}`}
      >
        <AintrixLogoMark
          size={markSize}
          className="shrink-0 drop-shadow-[0_0_12px_rgba(28,231,152,0.5)]"
        />
        <div className="flex flex-col text-left select-none">
          <span className="font-display font-extrabold text-xl text-white tracking-tight leading-none">
            Aintrix
          </span>
          <span className="text-[9px] font-bold tracking-[0.28em] text-[#D4C7B5] uppercase leading-tight mt-1">
            ACADEMY
          </span>
        </div>
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className={`flex items-center gap-3 select-none ${className}`}>
        <div className="w-10 h-10 rounded-xl bg-[#1A0E15] border border-white/10 flex items-center justify-center p-2 shadow-md shrink-0">
          <AintrixLogoMark
            size={markSize || 24}
            className="drop-shadow-[0_0_8px_rgba(28,231,152,0.45)]"
          />
        </div>
        <div className="flex flex-col text-left min-w-0">
          <span className="font-display font-extrabold text-sm tracking-tight text-white leading-tight truncate">
            Aintrix
          </span>
          <span className="text-[9px] font-bold tracking-[0.24em] text-[#D4C7B5] uppercase leading-tight mt-0.5">
            ACADEMY
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <div className="w-10 h-10 rounded-2xl bg-[#1A0E15] border border-white/10 flex items-center justify-center p-2 shadow-md shrink-0">
        <AintrixLogoMark
          size={markSize}
          className="drop-shadow-[0_0_10px_rgba(28,231,152,0.45)]"
        />
      </div>
      <div className="flex flex-col text-left">
        <span className="font-display font-extrabold text-lg tracking-tight leading-none text-current">
          Aintrix
        </span>
        <span className="text-[9px] font-bold tracking-[0.24em] text-current opacity-70 uppercase leading-tight mt-1">
          ACADEMY
        </span>
      </div>
    </div>
  );
}

export default BrandLogo;
