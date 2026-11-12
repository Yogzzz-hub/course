"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  BookOpen,
  Download,
  ExternalLink,
  FileText,
} from "lucide-react";

export default function LessonViewPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;

  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    fetchLesson();
  }, [lessonId]);

  const fetchLesson = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/student/learning/lessons/${lessonId}`);
      const data = await res.json();
      if (data.success && data.lesson) {
        setLesson(data.lesson);
        const isDone =
          data.lesson.completions &&
          data.lesson.completions.length > 0 &&
          ["COMPLETED", "VERIFIED"].includes(data.lesson.completions[0].status);
        setCompleted(isDone);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompleted = async () => {
    try {
      setCompleting(true);
      const res = await fetch(`/api/student/learning/lessons/${lessonId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidence: "Completed reading online in workspace" }),
      });
      const data = await res.json();
      if (data.success) {
        setCompleted(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-[#2A0F16]/60 animate-pulse">
        Loading lesson content...
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <p className="text-lg font-serif text-[#2A0F16]">Lesson not found or unavailable.</p>
        <Link
          href="/student/learning"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#6D1A2B] text-white rounded-lg text-sm"
        >
          Return to Learning Workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Navigation Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#C9A24B]/20 pb-4">
        <Link
          href="/student/learning"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#6D1A2B] hover:text-[#4E0F1E] transition-colors min-h-[44px] sm:min-h-0"
        >
          <ChevronLeft className="w-4 h-4 text-[#C9A24B]" />
          Back to Course Curriculum
        </Link>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {completed ? (
            <span className="inline-flex items-center gap-1 text-xs px-3 py-2 sm:py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium min-h-[44px] sm:min-h-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed
            </span>
          ) : (
            <button
              onClick={handleMarkCompleted}
              disabled={completing}
              className="inline-flex items-center gap-1.5 text-xs px-3.5 py-2 sm:py-1.5 rounded-lg bg-[#6D1A2B] text-white hover:bg-[#4E0F1E] font-medium transition-all shadow-sm disabled:opacity-50 min-h-[44px] sm:min-h-0"
            >
              {completing ? "Saving..." : "Mark as Completed"}
            </button>
          )}
        </div>
      </div>

      {/* Lesson Header */}
      <div className="bg-white p-5 sm:p-8 rounded-2xl border border-[#C9A24B]/25 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[#2A0F16]/60">
          <span className="px-2.5 py-0.5 rounded bg-[#F6EBCF] text-[#6D1A2B] font-semibold">
            {lesson.learningUnit.title}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#C9A24B]" />
            {lesson.estimatedMinutes} minutes estimated
          </span>
          {lesson.subtopic && <span>• Linked Topic: {lesson.subtopic.title}</span>}
        </div>

        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#2A0F16]">{lesson.title}</h1>

        {lesson.description && (
          <p className="text-sm sm:text-base text-[#2A0F16]/75 leading-relaxed">{lesson.description}</p>
        )}

        {/* Learning Objectives */}
        {lesson.learningObjectives && (
          <div className="bg-[#FFFBF5] p-3.5 sm:p-4 rounded-xl border border-[#C9A24B]/20 space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#6D1A2B]">
              Learning Objectives
            </h4>
            <p className="text-xs sm:text-sm text-[#2A0F16]/80 leading-relaxed">
              {lesson.learningObjectives}
            </p>
          </div>
        )}
      </div>

      {/* Lesson Content Body */}
      <div className="bg-white p-5 sm:p-8 rounded-2xl border border-[#C9A24B]/20 shadow-sm space-y-6">
        <div className="prose max-w-none text-[#2A0F16] leading-relaxed whitespace-pre-wrap font-sans text-sm sm:text-base">
          {lesson.contentBody || (
            <p className="text-[#2A0F16]/60 italic text-xs sm:text-sm">
              No written text notes have been provided for this lesson yet. Please review the attached
              resources below.
            </p>
          )}
        </div>

        {/* Lesson Resources */}
        {lesson.resources && lesson.resources.length > 0 && (
          <div className="pt-6 border-t border-[#C9A24B]/15 space-y-3">
            <h4 className="text-sm font-serif font-bold text-[#2A0F16]">
              Attached Learning Resources
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {lesson.resources.map((res: any) => (
                <a
                  key={res.id}
                  href={res.urlOrContent}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-xl border border-[#C9A24B]/20 bg-[#FFFBF5] hover:bg-[#F6EBCF]/40 flex items-center justify-between group transition-all min-h-[52px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded bg-white text-[#6D1A2B] border border-[#C9A24B]/20 shrink-0">
                      <FileText className="w-4 h-4 text-[#C9A24B]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#2A0F16] group-hover:text-[#6D1A2B] truncate">
                        {res.title}
                      </p>
                      <span className="text-[10px] text-[#2A0F16]/60 uppercase tracking-wider block">
                        {res.resourceType}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#C9A24B] opacity-60 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation (Previous / Next) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-[#C9A24B]/20">
        {lesson.prevLesson ? (
          <Link
            href={`/student/learning/${courseId}/lessons/${lesson.prevLesson.id}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#C9A24B]/30 bg-white text-xs font-medium text-[#2A0F16] hover:bg-[#FFFBF5] transition-all min-h-[44px]"
          >
            <ChevronLeft className="w-4 h-4 text-[#C9A24B]" />
            Previous: {lesson.prevLesson.title}
          </Link>
        ) : (
          <div className="hidden sm:block" />
        )}

        {lesson.nextLesson ? (
          <Link
            href={`/student/learning/${courseId}/lessons/${lesson.nextLesson.id}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#6D1A2B] text-white text-xs font-medium hover:bg-[#4E0F1E] transition-all shadow-sm min-h-[44px]"
          >
            Next: {lesson.nextLesson.title}
            <ChevronRight className="w-4 h-4 text-[#C9A24B]" />
          </Link>
        ) : (
          <Link
            href="/student/learning"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#C9A24B] text-[#2A0F16] text-xs font-bold hover:bg-[#C9A24B]/80 transition-all min-h-[44px]"
          >
            Unit Complete! Back to Curriculum
          </Link>
        )}
      </div>
    </div>
  );
}
