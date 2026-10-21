"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingUp,
  FileText,
  PlayCircle,
  HelpCircle,
  Award,
} from "lucide-react";

export default function StudentLearningPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  useEffect(() => {
    fetchLearningData();
  }, []);

  const fetchLearningData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/learning");
      const data = await res.json();
      if (data.success && data.courses.length > 0) {
        setCourses(data.courses);
        setSelectedCourseId(data.courses[0].course.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedCourse = courses.find((c) => c.course.id === selectedCourseId);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C9A24B]/20 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-[#2A0F16] font-bold">
            Student Learning Workspace
          </h1>
          <p className="text-xs sm:text-sm text-[#2A0F16]/70 mt-1">
            Access curriculum lessons, learning resources, and track your activity progress.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <Link
            href="/student/performance"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#6D1A2B] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#4E0F1E] transition-all shadow-sm min-h-[44px]"
          >
            <TrendingUp className="w-4 h-4 text-[#C9A24B]" />
            Performance View
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#2A0F16]/60 bg-white rounded-xl border border-[#C9A24B]/20 animate-pulse">
          Loading learning modules and course structure...
        </div>
      ) : courses.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-[#C9A24B]/20 space-y-3">
          <BookOpen className="w-12 h-12 text-[#C9A24B] mx-auto opacity-60" />
          <h3 className="text-lg font-serif font-bold text-[#2A0F16]">No Active Enrolled Courses</h3>
          <p className="text-sm text-[#2A0F16]/70 max-w-md mx-auto">
            You do not currently have active batch enrollments with published learning modules.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Course Tabs if multiple courses */}
          {courses.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-[#C9A24B]/20">
              {courses.map((item) => (
                <button
                  key={item.course.id}
                  onClick={() => setSelectedCourseId(item.course.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                    selectedCourseId === item.course.id
                      ? "bg-[#6D1A2B] text-white shadow-sm"
                      : "bg-white text-[#2A0F16]/70 hover:bg-[#F6EBCF]/40"
                  }`}
                >
                  {item.course.title} ({item.batch.code})
                </button>
              ))}
            </div>
          )}

          {selectedCourse && (
            <div className="space-y-6">
              {/* Dual Metric Highlights: Clear separation between Syllabus Coverage & Learning Activity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Student Learning Activity Progress */}
                <div className="bg-white p-6 rounded-xl border border-[#C9A24B]/20 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-[#F6EBCF]/50 text-[#6D1A2B]">
                        <CheckCircle2 className="w-5 h-5 text-[#C9A24B]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#2A0F16]">
                          Your Learning Progress
                        </h4>
                        <p className="text-xs text-[#2A0F16]/60">
                          Lessons completed by you in this course
                        </p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold font-serif text-[#6D1A2B]">
                      {selectedCourse.learningProgress.progressPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-[#FFFBF5] rounded-full h-2.5 overflow-hidden border border-[#C9A24B]/20">
                    <div
                      className="bg-[#6D1A2B] h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${selectedCourse.learningProgress.progressPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-[#2A0F16]/70 pt-1">
                    <span>
                      Completed: {selectedCourse.learningProgress.completedLessons} of{" "}
                      {selectedCourse.learningProgress.totalLessons} Lessons
                    </span>
                    <span>Self-Paced Activity</span>
                  </div>
                </div>

                {/* 2. Trainer Syllabus Coverage */}
                <div className="bg-white p-6 rounded-xl border border-[#C9A24B]/20 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-[#F6EBCF]/50 text-[#6D1A2B]">
                        <TrendingUp className="w-5 h-5 text-[#C9A24B]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#2A0F16]">
                          Class Syllabus Coverage
                        </h4>
                        <p className="text-xs text-[#2A0F16]/60">
                          Topics taught and verified by batch trainer
                        </p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold font-serif text-[#C9A24B]">
                      {selectedCourse.syllabusCoverage}%
                    </span>
                  </div>
                  <div className="w-full bg-[#FFFBF5] rounded-full h-2.5 overflow-hidden border border-[#C9A24B]/20">
                    <div
                      className="bg-[#C9A24B] h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${selectedCourse.syllabusCoverage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-[#2A0F16]/70 pt-1">
                    <span>Batch: {selectedCourse.batch.code}</span>
                    <span>Institutional Progress</span>
                  </div>
                </div>
              </div>

              {/* Units and Lessons Tree */}
              <div className="space-y-4">
                <h3 className="text-xl font-serif font-bold text-[#2A0F16]">
                  Curriculum Modules & Lessons
                </h3>

                {selectedCourse.units.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-[#C9A24B]/20 text-[#2A0F16]/60 text-sm">
                    No learning units have been published for this course yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedCourse.units.map((unit: any, uIdx: number) => (
                      <div
                        key={unit.id}
                        className="bg-white rounded-xl border border-[#C9A24B]/20 overflow-hidden shadow-sm"
                      >
                        <div className="bg-[#FFFBF5] p-4 border-b border-[#C9A24B]/15 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-full bg-[#6D1A2B] text-white flex items-center justify-center text-xs font-bold font-serif">
                              {uIdx + 1}
                            </span>
                            <div>
                              <h4 className="font-serif font-bold text-[#2A0F16] text-base">
                                {unit.title}
                              </h4>
                              {unit.description && (
                                <p className="text-xs text-[#2A0F16]/70 mt-0.5">
                                  {unit.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-medium px-2.5 py-1 rounded bg-[#F6EBCF] text-[#6D1A2B]">
                            {unit.lessons.length} {unit.lessons.length === 1 ? "Lesson" : "Lessons"}
                          </span>
                        </div>

                        {/* Lessons List */}
                        <div className="divide-y divide-[#C9A24B]/10">
                          {unit.lessons.map((lesson: any, lIdx: number) => {
                            const isCompleted =
                              lesson.completions &&
                              lesson.completions.length > 0 &&
                              ["COMPLETED", "VERIFIED"].includes(lesson.completions[0].status);

                            return (
                              <Link
                                key={lesson.id}
                                href={`/student/learning/${selectedCourse.course.id}/lessons/${lesson.id}`}
                                className="p-4 flex items-center justify-between hover:bg-[#FFFBF5]/60 transition-all group"
                              >
                                <div className="flex items-center gap-3.5">
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-[#C9A24B]/40 shrink-0 flex items-center justify-center">
                                      <span className="text-[10px] text-[#2A0F16]/60">
                                        {lIdx + 1}
                                      </span>
                                    </div>
                                  )}
                                  <div>
                                    <p
                                      className={`text-sm font-medium ${
                                        isCompleted
                                          ? "text-[#2A0F16] line-through opacity-80"
                                          : "text-[#2A0F16] group-hover:text-[#6D1A2B]"
                                      }`}
                                    >
                                      {lesson.title}
                                    </p>
                                    <div className="flex items-center gap-3 text-xs text-[#2A0F16]/60 mt-0.5">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-[#C9A24B]" />
                                        {lesson.estimatedMinutes} mins
                                      </span>
                                      {lesson.subtopic && (
                                        <span>• Topic: {lesson.subtopic.title}</span>
                                      )}
                                      {lesson.resources.length > 0 && (
                                        <span>
                                          • {lesson.resources.length} Resource
                                          {lesson.resources.length > 1 ? "s" : ""}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-xs px-2.5 py-1 rounded-full ${
                                      isCompleted
                                        ? "bg-emerald-50 text-emerald-700 font-medium border border-emerald-200"
                                        : "bg-[#FFFBF5] text-[#2A0F16]/70 border border-[#C9A24B]/20"
                                    }`}
                                  >
                                    {isCompleted ? "Completed" : "Start"}
                                  </span>
                                  <ChevronRight className="w-4 h-4 text-[#C9A24B] group-hover:translate-x-1 transition-transform" />
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
