"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  BookOpen,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  X,
  Layers,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export default function TrainerLearningPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Unit Modal
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [unitTitle, setUnitTitle] = useState("");
  const [unitDesc, setUnitDesc] = useState("");
  const [unitDuration, setUnitDuration] = useState(120);

  // Lesson Modal
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [targetUnitId, setTargetUnitId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDesc, setLessonDesc] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonDuration, setLessonDuration] = useState(30);
  const [learningObjectives, setLearningObjectives] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/trainer/batches");
      const data = await res.json();
      if (data.batches && data.batches.length > 0) {
        const uniqueCourses: any[] = [];
        const seen = new Set();
        data.batches.forEach((b: any) => {
          if (b.course && !seen.has(b.course.id)) {
            seen.add(b.course.id);
            uniqueCourses.push(b.course);
          }
        });
        setCourses(uniqueCourses);
        if (uniqueCourses.length > 0) {
          setSelectedCourseId(uniqueCourses[0].id);
          fetchUnits(uniqueCourses[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async (cId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/trainer/learning/units?courseId=${cId}`);
      const data = await res.json();
      if (data.success) {
        setUnits(data.units);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitTitle || !selectedCourseId) return;

    try {
      setSaving(true);
      const res = await fetch("/api/trainer/learning/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId,
          title: unitTitle,
          description: unitDesc,
          estimatedMinutes: Number(unitDuration),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowUnitModal(false);
      setUnitTitle("");
      setUnitDesc("");
      fetchUnits(selectedCourseId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle || !targetUnitId) return;

    try {
      setSaving(true);
      const res = await fetch("/api/trainer/learning/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learningUnitId: targetUnitId,
          title: lessonTitle,
          description: lessonDesc,
          contentBody: lessonContent,
          estimatedMinutes: Number(lessonDuration),
          learningObjectives,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowLessonModal(false);
      setLessonTitle("");
      setLessonDesc("");
      setLessonContent("");
      setLearningObjectives("");
      fetchUnits(selectedCourseId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      user={{
        name: "Trainer",
        email: "",
        role: "TRAINER",
      }}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C9A24B]/20 pb-4 sm:pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
              Course Syllabus
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif text-[#2A0F16] font-bold mt-0.5">
              Learning Materials & Curriculum Management
            </h1>
            <p className="text-xs sm:text-sm text-[#2A0F16]/70 mt-1">
              Author and publish course learning units, interactive lessons, and curriculum resources.
            </p>
          </div>

          <button
            onClick={() => setShowUnitModal(true)}
            className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#6D1A2B] text-white text-xs font-semibold rounded-xl hover:bg-[#4E0F1E] transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Learning Unit</span>
          </button>
        </div>

        {/* Course Context Picker */}
        {courses.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-[#C9A24B]/20 shadow-xs">
            <span className="text-xs font-semibold text-[#2A0F16] shrink-0">Course:</span>
            <select
              value={selectedCourseId}
              onChange={(e) => {
                setSelectedCourseId(e.target.value);
                fetchUnits(e.target.value);
              }}
              className="w-full sm:w-auto max-w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2.5 rounded-lg border border-[#C9A24B]/30 bg-[#FFFBF5] font-medium text-[#2A0F16] shadow-xs"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.code})
                </option>
              ))}
            </select>
          </div>
        )}

      {loading ? (
        <div className="p-12 text-center text-[#2A0F16]/60 bg-white rounded-xl border border-[#C9A24B]/20 animate-pulse">
          Loading learning modules and units...
        </div>
      ) : units.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-[#C9A24B]/20 space-y-3">
          <BookOpen className="w-12 h-12 text-[#C9A24B] mx-auto opacity-60" />
          <h3 className="text-lg font-serif font-bold text-[#2A0F16]">No Learning Units Created</h3>
          <p className="text-sm text-[#2A0F16]/70 max-w-md mx-auto">
            Click "New Learning Unit" above to add the first curriculum module for this course.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {units.map((unit, uIdx) => (
            <div
              key={unit.id}
              className="bg-white rounded-2xl border border-[#C9A24B]/25 overflow-hidden shadow-sm space-y-3"
            >
              <div className="bg-[#FFFBF5] p-5 border-b border-[#C9A24B]/15 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#6D1A2B] text-white flex items-center justify-center text-xs font-bold font-serif">
                      {uIdx + 1}
                    </span>
                    <h3 className="font-serif font-bold text-base text-[#2A0F16]">{unit.title}</h3>
                  </div>
                  {unit.description && (
                    <p className="text-xs text-[#2A0F16]/70 mt-1 ml-8.5">{unit.description}</p>
                  )}
                </div>

                <button
                  onClick={() => {
                    setTargetUnitId(unit.id);
                    setShowLessonModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#C9A24B] text-[#6D1A2B] text-xs font-medium hover:bg-[#F6EBCF]/40 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C9A24B]" />
                  Add Lesson
                </button>
              </div>

              {/* Lessons within unit */}
              <div className="p-5 pt-0">
                {unit.lessons.length === 0 ? (
                  <p className="text-xs text-[#2A0F16]/50 italic py-2">
                    No lessons added to this unit yet.
                  </p>
                ) : (
                  <div className="divide-y divide-[#C9A24B]/10">
                    {unit.lessons.map((lesson: any, lIdx: number) => (
                      <div
                        key={lesson.id}
                        className="py-3 flex items-center justify-between hover:bg-[#FFFBF5]/40 px-2 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-[#C9A24B]">
                            {uIdx + 1}.{lIdx + 1}
                          </span>
                          <div>
                            <h4 className="text-xs font-semibold text-[#2A0F16]">{lesson.title}</h4>
                            <div className="flex items-center gap-3 text-[11px] text-[#2A0F16]/60 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#C9A24B]" />
                                {lesson.estimatedMinutes} mins
                              </span>
                              <span>• {lesson._count?.completions || 0} Student Completions</span>
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Published & Active
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Unit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#C9A24B]/30 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#C9A24B]/20 pb-3">
              <h3 className="font-serif font-bold text-base text-[#2A0F16]">
                Create New Learning Unit
              </h3>
              <button
                onClick={() => setShowUnitModal(false)}
                className="p-1 rounded text-[#2A0F16]/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUnit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Unit Title
                </label>
                <input
                  type="text"
                  value={unitTitle}
                  onChange={(e) => setUnitTitle(e.target.value)}
                  placeholder="e.g. Unit 1: Architecture & Data Modeling"
                  className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2.5 rounded-lg border border-[#C9A24B]/30"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={unitDesc}
                  onChange={(e) => setUnitDesc(e.target.value)}
                  placeholder="Overview of learning outcomes..."
                  className="w-full text-base sm:text-xs p-2.5 rounded-lg border border-[#C9A24B]/30"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUnitModal(false)}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2 border rounded-xl text-xs font-medium hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2 bg-[#6D1A2B] hover:bg-[#4E0F1E] text-white text-xs font-semibold rounded-xl"
                >
                  {saving ? "Saving..." : "Create Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Lesson Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-[#C9A24B]/30 shadow-2xl p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#C9A24B]/20 pb-3">
              <h3 className="font-serif font-bold text-base text-[#2A0F16]">
                Add Lesson
              </h3>
              <button
                onClick={() => setShowLessonModal(false)}
                className="p-1 rounded text-[#2A0F16]/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Lesson Title
                </label>
                <input
                  type="text"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="e.g. Lesson 1.1: Relational Schema Design"
                  className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2.5 rounded-lg border border-[#C9A24B]/30"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(Number(e.target.value))}
                    className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2.5 rounded-lg border border-[#C9A24B]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                    Short Description
                  </label>
                  <input
                    type="text"
                    value={lessonDesc}
                    onChange={(e) => setLessonDesc(e.target.value)}
                    placeholder="Brief summary..."
                    className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2.5 rounded-lg border border-[#C9A24B]/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Learning Objectives
                </label>
                <textarea
                  rows={2}
                  value={learningObjectives}
                  onChange={(e) => setLearningObjectives(e.target.value)}
                  placeholder="By the end of this lesson, students will understand..."
                  className="w-full text-base sm:text-xs p-2.5 rounded-lg border border-[#C9A24B]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Lesson Text Content (Markdown / Code / Notes)
                </label>
                <textarea
                  rows={5}
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                  placeholder="Enter lesson lecture notes, code snippets, or reference explanations..."
                  className="w-full text-base sm:text-xs p-3 rounded-lg border border-[#C9A24B]/30 font-mono"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLessonModal(false)}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2 border rounded-xl text-xs font-medium hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2 bg-[#6D1A2B] hover:bg-[#4E0F1E] text-white text-xs font-semibold rounded-xl"
                >
                  {saving ? "Indexing..." : "Publish & Index Lesson"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </AppShell>
  );
}
