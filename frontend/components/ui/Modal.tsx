"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  className,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
    full: "max-w-4xl",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className={cn(
          "bg-white rounded-2xl w-full border border-[#E9E0D8] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-pop-in",
          sizeClasses[size],
          className
        )}
      >
        {/* Modal Header */}
        {(title || description) && (
          <div className="p-4 sm:p-5 border-b border-[#E9E0D8] bg-[#FBF9F5] flex items-start justify-between gap-3 shrink-0">
            <div>
              {title && (
                <h2
                  id="modal-title"
                  className="font-serif font-bold text-base sm:text-lg text-[#251923]"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs text-[#6B6268] mt-0.5 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#6B6268] hover:text-[#251923] hover:bg-[#E9E0D8]/50 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
