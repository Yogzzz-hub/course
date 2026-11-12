"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BookOpen, Plus, Globe, Layers, CheckCircle2, Clock } from "lucide-react";

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [code, setCode] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Software Engineering");
  const [durationWeeks, setDurationWeeks] = useState(16);
  const [durationHours, setDurationHours] = useState(120);
  const [agreedFeeDefault, setAgreedFeeDefault] = useState(3000);
  const [deliveryMode, setDeliveryMode] = useState("Hybrid");
  const [isPublished, setIsPublished] = useState(false);
  const [creating, setCreating] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/admin/courses");
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          slug,
          title,
          description,
          category,
          durationWeeks: Number(durationWeeks),
          durationHours: Number(durationHours),
          agreedFeeDefault: Number(agreedFeeDefault),
          deliveryMode,
          isPublished,
        }),
      });

      const data = await res.json();
      setCreating(false);

      if (res.ok) {
        setFeedbackMsg(`Course ${title} created with initial syllabus draft.`);
        setShowCreateModal(false);
        setCode("");
        setSlug("");
        setTitle("");
        setDescription("");
        fetchCourses();
      } else {
        alert(data.error || "Failed to create course");
      }
    } catch {
      setCreating(false);
    }
  };

  return (
    <AppShell
      user={{
        name: "Administrator",
        email: "admin@apexacademy.edu",
        role: "ADMIN",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
            Curriculum Administration
          </span>
          <h1 className="text-xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
            Course Catalog Management
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Author educational offerings, configure public visibility, and oversee versioned syllabi.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl bg-[#6D1A2B] text-white text-xs font-bold hover:bg-[#4E0F1E] transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Create New Course</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {courses.map((course) => {
          const activeSyllabus = course.syllabusVersions[0];

          return (
            <div
              key={course.id}
              className="bg-white rounded-2xl border border-[#2A0F16]/10 p-4 sm:p-6 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-card transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[#F6EBCF] text-[#4E0F1E]">
                    {course.code}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      course.isPublished
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-stone-100 text-stone-600 border border-stone-200"
                    }`}
                  >
                    {course.isPublished ? "Public" : "Unpublished Draft"}
                  </span>
                </div>

                <h2 className="text-base font-bold text-[#2A0F16]">{course.title}</h2>
                <p className="text-xs text-stone-500 mt-0.5">{course.category}</p>

                <p className="mt-3 text-xs text-stone-600 line-clamp-2">
                  {course.description}
                </p>

                <div className="mt-4 pt-3 border-t border-stone-100 grid grid-cols-2 gap-2 text-xs text-stone-600">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#C9A24B] shrink-0" />
                    <span>{course.durationWeeks} Wks ({course.durationHours} hrs)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#C9A24B] shrink-0" />
                    <span>{course.syllabusVersions.length} Versions</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase block font-medium">
                    Standard Fee
                  </span>
                  <span className="font-bold text-sm text-[#2A0F16]">
                    {formatCurrency(course.agreedFeeDefault)}
                  </span>
                </div>

                <span className="text-xs font-semibold text-[#6D1A2B]">
                  {course.batches.length} Active Batches
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateCourse}
            className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-elevated text-xs max-h-[90vh] overflow-y-auto my-auto"
          >
            <h3 className="text-base font-bold text-[#2A0F16]">Author New Course Offering</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Course Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CS-202"
                  className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg font-mono uppercase focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">URL Slug *</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  placeholder="e.g. advanced-distributed-systems"
                  className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg font-mono focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Course Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Advanced Distributed Systems Engineering"
                className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg bg-white focus:outline-none focus:border-[#6D1A2B]"
              >
                <option value="Software Engineering">Software Engineering</option>
                <option value="Data Science & Analytics">Data Science & Analytics</option>
                <option value="Cybersecurity">Cybersecurity</option>
                <option value="Cloud Architecture">Cloud Architecture</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Description *</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed curriculum overview..."
                className="w-full p-2.5 text-base sm:text-xs border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">Duration (Weeks)</label>
                <input
                  type="number"
                  min={1}
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(Number(e.target.value))}
                  className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Hours</label>
                <input
                  type="number"
                  min={1}
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Default Fee (INR)</label>
                <input
                  type="number"
                  min={0}
                  value={agreedFeeDefault}
                  onChange={(e) => setAgreedFeeDefault(Number(e.target.value))}
                  className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 min-h-[44px]">
              <input
                type="checkbox"
                id="pub"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 rounded text-[#6D1A2B]"
              />
              <label htmlFor="pub" className="text-xs font-semibold text-stone-700 cursor-pointer">
                Publish on Public Website Catalog Immediately
              </label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-full sm:flex-1 py-2.5 min-h-[44px] border border-stone-200 rounded-xl font-semibold hover:bg-stone-50"
              >
                Cancel
              </button>
              <Button
                type="submit"
                isLoading={creating}
                className="w-full sm:flex-1 py-2.5 min-h-[44px] rounded-xl bg-[#6D1A2B] text-white font-bold"
              >
                Create Course Offering
              </Button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
