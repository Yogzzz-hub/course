"use client";

import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary" | "gold";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm Action",
  cancelLabel = "Cancel",
  variant = "primary",
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center p-2 space-y-4">
        <div
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
            variant === "danger"
              ? "bg-[#FEECEB] text-[#B42318] border border-[#FDA29B]"
              : "bg-[#F5F0E8] text-[#6D1A2B] border border-[#E9E0D8]"
          )}
        >
          {variant === "danger" ? (
            <AlertCircle className="w-6 h-6" />
          ) : (
            <ShieldAlert className="w-6 h-6" />
          )}
        </div>

        <div>
          <h3 className="font-serif font-bold text-base text-[#251923]">{title}</h3>
          <p className="text-xs text-[#6B6268] mt-1.5 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-2.5 w-full pt-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto flex-1"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "danger" : "primary"}
            size="md"
            onClick={onConfirm}
            isLoading={isLoading}
            className="w-full sm:w-auto flex-1"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
