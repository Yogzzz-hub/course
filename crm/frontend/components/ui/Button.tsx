import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "gold" | "teal" | "forest";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  loading?: boolean;
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const isButtonLoading = isLoading || loading;
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none";

  const variantStyles = {
    primary:
      "bg-[#6D1A2B] text-white hover:bg-[#4E0F1E] focus:ring-[#6D1A2B] shadow-sm hover:shadow",
    secondary:
      "bg-[#F5F0E8] text-[#251923] hover:bg-[#E9E0D8] focus:ring-[#C9A24B] border border-[#E9E0D8]",
    gold:
      "bg-[#C9A24B] text-white hover:bg-[#B38C37] focus:ring-[#C9A24B] shadow-sm hover:shadow",
    teal:
      "bg-[#315F70] text-white hover:bg-[#254B59] focus:ring-[#315F70] shadow-sm hover:shadow",
    forest:
      "bg-[#19674B] text-white hover:bg-[#134D38] focus:ring-[#19674B] shadow-sm",
    outline:
      "border border-[#6D1A2B]/30 text-[#6D1A2B] hover:bg-[#6D1A2B]/5 focus:ring-[#6D1A2B]",
    ghost:
      "text-[#251923] hover:bg-[#F5F0E8] focus:ring-stone-400",
    danger:
      "bg-[#B42318] text-white hover:bg-[#911B12] focus:ring-[#B42318] shadow-sm",
  };

  const sizeStyles = {
    sm: "text-xs px-3 py-1.5 min-h-[36px] sm:min-h-0 gap-1.5",
    md: "text-sm px-4 py-2 min-h-[44px] gap-2",
    lg: "text-base px-6 py-2.5 min-h-[48px] gap-2.5",
  };

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled || isButtonLoading}
      {...props}
    >
      {isButtonLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
