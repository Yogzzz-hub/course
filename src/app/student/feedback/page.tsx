"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Star,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Send,
} from "lucide-react";

export default function StudentFeedbackPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [courseId, setCourseId] = useState("");
  const [feedbackType, setFeedbackType] = useState("COURSE");
  const [rating, setRating] = useState(5);
  const [writtenFeedback, setWrittenFeedback] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [resCourses, resFeedback] = await Promise.all([
        fetch("/api/student/learning"),
        fetch("/api/student/feedback"),
      ]);

      const dataCourses = await resCourses.json();
      if (dataCourses.success && dataCourses.courses.length > 0) {
        setCourses(dataCourses.courses);
        setCourseId(dataCourses.courses[0].course.id);
      }

      const dataFeedback = await resFeedback.json();
      if (dataFeedback.success) {
        setFeedbacks(dataFeedback.feedbacks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !writtenFeedback.trim()) return;

    try {
      setSubmitting(true);
      setErrorMsg("");
      setSuccessMsg("");

      const res = await fetch("/api/student/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          feedbackType,
          rating,
          writtenFeedback,
          isAnonymous,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMsg("Your feedback was submitted confidentially. Thank you!");
      setWrittenFeedback("");
      // Refresh list
      const resFeedback = await fetch("/api/student/feedback");
      const d = await resFeedback.json();
      if (d.success) setFeedbacks(d.feedbacks);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-[#C9A24B]/20 pb-6">
        <h1 className="text-3xl font-serif text-[#2A0F16] font-bold">
          Academic & Course Feedback
        </h1>
        <p className="text-sm text-[#2A0F16]/70 mt-1">
          Share confidential evaluations on course curriculum, instructor delivery, and learning materials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Feedback Submission Form */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-[#C9A24B]/25 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#C9A24B]" />
            <h3 className="font-serif font-bold text-lg text-[#2A0F16]">
              Submit Academic Evaluation
            </h3>
          </div>

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs border border-emerald-200">
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Enrolled Course
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full text-base sm:text-xs p-3 sm:p-2.5 rounded-lg border border-[#C9A24B]/30 bg-white min-h-[44px]"
                  required
                >
                  {courses.map((c) => (
                    <option key={c.course.id} value={c.course.id}>
                      {c.course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Feedback Category
                </label>
                <select
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value)}
                  className="w-full text-base sm:text-xs p-3 sm:p-2.5 rounded-lg border border-[#C9A24B]/30 bg-white min-h-[44px]"
                >
                  <option value="COURSE">Curriculum & Course Content</option>
                  <option value="TRAINER">Trainer Delivery & Support</option>
                  <option value="LEARNING_MATERIAL">Learning Materials & Labs</option>
                  <option value="LESSON_DIFFICULTY">Lesson Pace & Difficulty</option>
                  <option value="PLATFORM_ISSUE">Platform / Technology Experience</option>
                </select>
              </div>
            </div>

            {/* Star Rating */}
            <div>
              <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                Rating (1 to 5 Stars)
              </label>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-stone-50 transition-colors"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= rating
                          ? "fill-[#C9A24B] text-[#C9A24B]"
                          : "text-[#2A0F16]/20"
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs text-[#2A0F16]/60 font-semibold ml-2">
                  {rating} of 5 Stars
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                Detailed Comments & Suggestions
              </label>
              <textarea
                rows={4}
                value={writtenFeedback}
                onChange={(e) => setWrittenFeedback(e.target.value)}
                placeholder="What aspects were most effective? What could be improved in topic explanations or assignments?"
                className="w-full text-base sm:text-xs p-3 rounded-lg border border-[#C9A24B]/30 focus:outline-hidden focus:border-[#6D1A2B]"
                required
              />
            </div>

            {/* Anonymous Toggle */}
            <div className="flex items-center gap-2 pt-1 min-h-[44px]">
              <input
                type="checkbox"
                id="anon"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded text-[#6D1A2B] focus:ring-[#6D1A2B]"
              />
              <label htmlFor="anon" className="text-xs text-[#2A0F16]/80 cursor-pointer">
                Submit anonymously (your name will not be disclosed to trainers)
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-[#6D1A2B] text-white text-xs font-semibold rounded-lg hover:bg-[#4E0F1E] transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                <span>{submitting ? "Submitting..." : "Submit Feedback"}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* Right: Past Submissions */}
        <div className="space-y-4">
          <h3 className="font-serif font-bold text-base text-[#2A0F16]">
            Past Feedback History
          </h3>

          {loading ? (
            <div className="p-6 bg-white rounded-xl border border-[#C9A24B]/20 text-xs text-[#2A0F16]/60 animate-pulse">
              Loading past submissions...
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="p-6 bg-white rounded-xl border border-[#C9A24B]/20 text-xs text-[#2A0F16]/60 text-center">
              No previous feedback submitted.
            </div>
          ) : (
            <div className="space-y-3">
              {feedbacks.map((f) => (
                <div
                  key={f.id}
                  className="p-4 rounded-xl bg-white border border-[#C9A24B]/20 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#6D1A2B]">
                      {f.course?.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#F6EBCF] text-[#6D1A2B]">
                      {f.reviewStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          s <= f.rating
                            ? "fill-[#C9A24B] text-[#C9A24B]"
                            : "text-[#2A0F16]/20"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[#2A0F16]/80 line-clamp-3 italic">
                    "{f.writtenFeedback}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
