"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Award,
  BookOpen,
  Calendar,
  Layers,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

export default function StudentPerformancePage() {
  const [performance, setPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/performance");
      const data = await res.json();
      if (data.success) {
        setPerformance(data.performance);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-[#C9A24B]/20 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-[#2A0F16] font-bold">
            Academic Performance & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-[#2A0F16]/70 mt-1">
            Authoritative breakdown of syllabus coverage, personal learning activity, and evaluated assessment mastery.
          </p>
        </div>
        <Link
          href="/student/certificates"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-[#C9A24B] text-[#6D1A2B] text-xs font-semibold rounded-lg hover:bg-[#F6EBCF]/30 transition-all min-h-[44px]"
        >
          <Award className="w-4 h-4 text-[#C9A24B]" />
          View Certificate Status
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#2A0F16]/60 bg-white rounded-xl border border-[#C9A24B]/20 animate-pulse">
          Computing academic analytics and score distributions...
        </div>
      ) : performance.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-[#C9A24B]/20 space-y-3">
          <TrendingUp className="w-12 h-12 text-[#C9A24B] mx-auto opacity-60" />
          <h3 className="text-lg font-serif font-bold text-[#2A0F16]">No Performance Records</h3>
          <p className="text-sm text-[#2A0F16]/70 max-w-md mx-auto">
            You do not currently have active enrollments with recorded academic assessments.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {performance.map((item) => {
            const m = item.metrics;
            const p = item.policy;

            return (
              <div key={item.batch.id} className="space-y-6">
                {/* Course Header Banner */}
                <div className="bg-[#6D1A2B] text-white p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-[#C9A24B] uppercase tracking-wider font-semibold block">
                      Enrolled Academic Program
                    </span>
                    <h2 className="text-xl sm:text-2xl font-serif font-bold mt-0.5">
                      {item.course.title}
                    </h2>
                    <span className="text-xs text-white/70">Batch Identifier: {item.batch.code}</span>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`text-xs px-3 py-1.5 rounded-full font-bold border ${
                        m.isAcademicallyEligible
                          ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/50"
                          : "bg-amber-950/60 text-amber-300 border-amber-500/50"
                      }`}
                    >
                      {m.isAcademicallyEligible
                        ? "Academically Eligible for Certification"
                        : "Academic Requirements In Progress"}
                    </span>
                  </div>
                </div>

                {/* 4 Distinct Core Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* 1. Overall Academic Mastery */}
                  <div className="bg-white p-5 rounded-xl border border-[#C9A24B]/20 shadow-xs space-y-2">
                    <span className="text-xs text-[#2A0F16]/60 font-medium block">
                      Overall Academic Score
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-serif font-bold text-[#6D1A2B]">
                        {m.overallAcademicScore}%
                      </span>
                      <span className="text-xs text-[#2A0F16]/60">Pass: {p.minPassScorePercent}%</span>
                    </div>
                    <div className="w-full bg-[#FFFBF5] rounded-full h-1.5 overflow-hidden border border-[#C9A24B]/20">
                      <div
                        className="bg-[#6D1A2B] h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, m.overallAcademicScore)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#2A0F16]/60 block pt-1">
                      Weighted assessments score
                    </span>
                  </div>

                  {/* 2. Student Learning Progress */}
                  <div className="bg-white p-5 rounded-xl border border-[#C9A24B]/20 shadow-xs space-y-2">
                    <span className="text-xs text-[#2A0F16]/60 font-medium block">
                      Learning Progress
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-serif font-bold text-[#C9A24B]">
                        {m.learningProgressPercent}%
                      </span>
                      <span className="text-xs text-[#2A0F16]/60">Self-Paced</span>
                    </div>
                    <div className="w-full bg-[#FFFBF5] rounded-full h-1.5 overflow-hidden border border-[#C9A24B]/20">
                      <div
                        className="bg-[#C9A24B] h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, m.learningProgressPercent)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#2A0F16]/60 block pt-1">
                      Lessons completed in LMS
                    </span>
                  </div>

                  {/* 3. Syllabus Coverage */}
                  <div className="bg-white p-5 rounded-xl border border-[#C9A24B]/20 shadow-xs space-y-2">
                    <span className="text-xs text-[#2A0F16]/60 font-medium block">
                      Syllabus Coverage
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-serif font-bold text-[#2A0F16]">
                        {m.syllabusCoveragePercent}%
                      </span>
                      <span className="text-xs text-[#2A0F16]/60">Classroom</span>
                    </div>
                    <div className="w-full bg-[#FFFBF5] rounded-full h-1.5 overflow-hidden border border-[#C9A24B]/20">
                      <div
                        className="bg-[#2A0F16] h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, m.syllabusCoveragePercent)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#2A0F16]/60 block pt-1">
                      Topics covered by instructor
                    </span>
                  </div>

                  {/* 4. Verified Attendance */}
                  <div className="bg-white p-5 rounded-xl border border-[#C9A24B]/20 shadow-xs space-y-2">
                    <span className="text-xs text-[#2A0F16]/60 font-medium block">
                      Attendance Ratio
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-serif font-bold text-emerald-700">
                        {m.attendancePercentage}%
                      </span>
                      <span className="text-xs text-[#2A0F16]/60">Recorded</span>
                    </div>
                    <div className="w-full bg-[#FFFBF5] rounded-full h-1.5 overflow-hidden border border-[#C9A24B]/20">
                      <div
                        className="bg-emerald-600 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, m.attendancePercentage)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#2A0F16]/60 block pt-1">
                      Sessions attended to date
                    </span>
                  </div>
                </div>

                {/* Weighted Category Breakdown & Active Policy */}
                <div className="bg-white p-6 rounded-2xl border border-[#C9A24B]/20 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-[#C9A24B]/15 pb-3">
                    <h3 className="font-serif font-bold text-base text-[#2A0F16]">
                      Assessment Weights & Category Breakdown
                    </h3>
                    <span className="text-xs text-[#2A0F16]/60">
                      Approved Course Grading Policy v{p.version}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Assignments */}
                    <div className="p-4 rounded-xl bg-[#FFFBF5] border border-[#C9A24B]/20 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-[#2A0F16]">Assignments</span>
                        <span className="font-medium text-[#6D1A2B]">
                          Weight: {p.assignmentsWeightPercent}%
                        </span>
                      </div>
                      <span className="text-2xl font-serif font-bold text-[#6D1A2B]">
                        {m.assignmentScoreAverage}%
                      </span>
                      <p className="text-[11px] text-[#2A0F16]/60">
                        Average of all evaluated deliverables
                      </p>
                    </div>

                    {/* Quizzes */}
                    <div className="p-4 rounded-xl bg-[#FFFBF5] border border-[#C9A24B]/20 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-[#2A0F16]">Objective Quizzes</span>
                        <span className="font-medium text-[#C9A24B]">
                          Weight: {p.quizzesWeightPercent}%
                        </span>
                      </div>
                      <span className="text-2xl font-serif font-bold text-[#C9A24B]">
                        {m.quizScoreAverage}%
                      </span>
                      <p className="text-[11px] text-[#2A0F16]/60">
                        Average of completed module tests
                      </p>
                    </div>

                    {/* Projects */}
                    <div className="p-4 rounded-xl bg-[#FFFBF5] border border-[#C9A24B]/20 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-[#2A0F16]">Practical Labs</span>
                        <span className="font-medium text-[#2A0F16]">
                          Weight: {p.projectsWeightPercent}%
                        </span>
                      </div>
                      <span className="text-2xl font-serif font-bold text-[#2A0F16]">
                        {m.projectScoreAverage}%
                      </span>
                      <p className="text-[11px] text-[#2A0F16]/60">
                        Evaluated practical milestones score
                      </p>
                    </div>
                  </div>
                </div>

                {/* Academic Alerts Banner if any */}
                {item.alerts && item.alerts.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                      <ShieldAlert className="w-5 h-5 text-amber-700" />
                      <span>Academic Attention Notices</span>
                    </div>
                    <div className="space-y-2">
                      {item.alerts.map((alert: any) => (
                        <div
                          key={alert.id}
                          className="p-3 bg-white/80 rounded-lg border border-amber-200/60 text-xs text-amber-900 flex items-center justify-between"
                        >
                          <span>
                            <strong>{alert.alertType.replace("_", " ")}</strong>: Please review
                            pending submissions to ensure eligibility remains in good standing.
                          </span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                            {alert.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Explainable Learning Recommendations */}
                {item.recommendations && item.recommendations.length > 0 && (
                  <div className="bg-white rounded-2xl border border-[#C9A24B]/25 p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="w-5 h-5 text-[#C9A24B]" />
                      <h3 className="font-serif font-bold text-base text-[#2A0F16]">
                        Recommended Study Actions
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {item.recommendations.map((rec: any) => (
                        <div
                          key={rec.id}
                          className="p-4 rounded-xl border border-[#C9A24B]/20 bg-[#FFFBF5] flex items-center justify-between group hover:bg-[#F6EBCF]/30 transition-all"
                        >
                          <div>
                            <span className="text-[10px] font-bold text-[#6D1A2B] uppercase tracking-wider block">
                              {rec.recommendationType.replace("_", " ")}
                            </span>
                            <p className="text-sm font-medium text-[#2A0F16] mt-0.5">
                              {rec.suggestedAction}
                            </p>
                            {rec.evidence && (
                              <span className="text-xs text-[#2A0F16]/60 mt-1 block">
                                Context: {rec.evidence}
                              </span>
                            )}
                          </div>
                          <Link
                            href="/student/learning"
                            className="p-2 rounded-lg bg-white border border-[#C9A24B]/20 text-[#6D1A2B] group-hover:bg-[#6D1A2B] group-hover:text-white transition-all shadow-xs"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
