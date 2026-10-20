import React from "react";
import Link from "next/link";
import { Clock, BookOpen, Award, ArrowRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CourseCardProps {
  id: string;
  code: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  durationWeeks?: number;
  durationHours?: number;
  deliveryMode?: string;
  enrolledCount?: number;
  syllabusModuleCount?: number;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}

export function CourseCard({
  code,
  title,
  slug,
  description,
  category,
  durationWeeks,
  durationHours,
  deliveryMode,
  enrolledCount,
  syllabusModuleCount,
  actionHref,
  actionLabel = "View Curriculum",
  className,
}: CourseCardProps) {
  const targetHref = actionHref || `/courses/${slug}`;

  return (
    <div
      className={cn(
        "bg-white border border-[#E9E0D8] rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 brand-card-hover flex flex-col justify-between group",
        className
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FAF6EC] text-[#997324] border border-[#DEC278]/60">
            {category}
          </span>
          <span className="text-[11px] font-mono font-medium text-[#6B6268]">
            {code}
          </span>
        </div>

        <div>
          <h3 className="font-serif font-bold text-base sm:text-lg text-[#251923] group-hover:text-[#6D1A2B] transition-colors line-clamp-2">
            {title}
          </h3>
          <p className="text-xs text-[#6B6268] mt-1.5 line-clamp-3 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Course Meta Pills */}
        <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-[#6B6268] border-t border-[#E9E0D8]/60">
          {durationWeeks && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#C9A24B]" />
              <span>{durationWeeks} Weeks</span>
            </div>
          )}
          {syllabusModuleCount !== undefined && (
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#315F70]" />
              <span>{syllabusModuleCount} Modules</span>
            </div>
          )}
          {deliveryMode && (
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#6D1A2B]" />
              <span className="truncate max-w-[120px]">{deliveryMode}</span>
            </div>
          )}
          {enrolledCount !== undefined && (
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#19674B]" />
              <span>{enrolledCount} Students</span>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 mt-2">
        <Link
          href={targetHref}
          className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-[#F5F0E8] text-[#6D1A2B] font-semibold text-xs hover:bg-[#6D1A2B] hover:text-white transition-all duration-150 group/btn min-h-[44px]"
        >
          <span>{actionLabel}</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
