import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, ShieldCheck, X } from "lucide-react";
import type { Admission } from "./types";
import { Drawer } from "./Drawer";
import { ResponsiveTable } from "./ResponsiveTable";

export function AdmissionsView({
  admissions,
  onAddToast,
  onUpdateAdmission,
}: {
  admissions: Admission[];
  onAddToast: (toast: { type: "success" | "info" | "warning"; title: string; message: string }) => void;
  onUpdateAdmission: (updated: Admission) => void;
}) {
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);

  // Staging New Enrolment Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  const [candidateCourse, setCandidateCourse] = useState("Python Full Stack");
  const [candidateBatch, setCandidateBatch] = useState("PFS-2026-A");
  const [candidateFeeStatus, setCandidateFeeStatus] = useState<
    "1st Installment Paid" | "Full Payment Verified" | "Installment Due"
  >("1st Installment Paid");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsCreateModalOpen(false);
        setSelectedAdmission(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleApprove = (adm: Admission) => {
    // TODO: Connect to backend API: POST /api/admissions/[id]/approve
    const updated: Admission = {
      ...adm,
      status: "APPROVED",
      agreementSigned: true,
      feeStatus: "1st Installment Paid",
    };
    onUpdateAdmission(updated);
    if (selectedAdmission?.id === adm.id) setSelectedAdmission(updated);
    onAddToast({
      type: "success",
      title: "Admission Approved",
      message: `${adm.studentName}'s enrolment has been verified and confirmed in ${adm.batch}.`,
    });
  };

  const handleCreateEnrolment = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateEnrolmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim() || !candidateEmail.trim()) return;

    const newAdm: Admission = {
      id: `ADM-${Date.now().toString().slice(-4)}`,
      registrationNumber: `REG-${Math.floor(1000 + Math.random() * 9000)}`,
      studentName: candidateName.trim(),
      email: candidateEmail.trim(),
      phone: candidatePhone.trim() || "+91 98765 00000",
      course: candidateCourse,
      batch: candidateBatch,
      feeStatus: candidateFeeStatus,
      agreementSigned: candidateFeeStatus === "Full Payment Verified",
      enrolledDate: "Today",
      status: "PENDING_VERIFICATION",
    };

    onUpdateAdmission(newAdm);
    onAddToast({
      type: "success",
      title: "Enrolment Staged",
      message: `${newAdm.studentName} registered for ${newAdm.course} (${newAdm.batch}).`,
    });

    setIsCreateModalOpen(false);
    setCandidateName("");
    setCandidateEmail("");
    setCandidatePhone("");
  };

  return (
    <div className="space-y-3">
      {/* Top action toolbar - NO headings or subheadings */}
      <div
        className="p-3 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <span className="font-medium text-stone-500" style={{ color: "var(--muted)" }}>
          Showing {admissions.length} active candidates
        </span>
        <button
          type="button"
          onClick={handleCreateEnrolment}
          className="px-3 py-2 rounded-lg text-xs font-semibold transition-opacity shadow-2xs hover:opacity-90 cursor-pointer min-h-[44px] flex items-center justify-center"
          style={{
            backgroundColor: "var(--accent)",
            color: "var(--accent-contrast)",
          }}
        >
          Stage New Enrolment
        </button>
      </div>

      {/* Admissions Table */}
      <div
        className="rounded-xl border overflow-hidden shadow-2xs"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="overflow-x-auto">
          <ResponsiveTable className="w-full text-left border-collapse text-xs">
            <thead>
              <tr
                className="border-b"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                  color: "var(--muted)",
                  fontWeight: 600,
                  fontSize: "11px",
                }}
              >
                <th className="py-2.5 px-3.5">Reg Number & Student</th>
                <th className="py-2.5 px-3.5">Track & Batch</th>
                <th className="py-2.5 px-3.5">Fee Status</th>
                <th className="py-2.5 px-3.5">Agreement</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {admissions.map((adm) => (
                <tr
                  key={adm.id}
                  className="hover:bg-black/2 dark:hover:bg-white/2 transition-colors"
                >
                  <td className="py-2.5 px-3.5">
                    <span className="font-mono text-[10px] font-semibold block" style={{ color: "var(--accent)" }}>
                      {adm.registrationNumber}
                    </span>
                    <span className="font-semibold text-xs" style={{ color: "var(--text)" }}>
                      {adm.studentName}
                    </span>
                    <p className="text-[10px] text-stone-500">{adm.email}</p>
                  </td>
                  <td className="py-2.5 px-3.5">
                    <p className="font-medium" style={{ color: "var(--text)" }}>
                      {adm.course}
                    </p>
                    <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--muted)" }}>
                      {adm.batch}
                    </p>
                  </td>
                  <td className="py-2.5 px-3.5">
                    <span
                      className="text-[9px] font-semibold px-2 py-0.5 rounded"
                      style={{
                        backgroundColor:
                          adm.feeStatus === "Full Payment Verified"
                            ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                            : "var(--bg-secondary)",
                        color:
                          adm.feeStatus === "Full Payment Verified"
                            ? "var(--accent)"
                            : "var(--muted)",
                      }}
                    >
                      {adm.feeStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5">
                    {adm.agreementSigned ? (
                      <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: "var(--accent)" }}>
                        <CheckCircle2 size={12} />
                        Signed
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: "var(--muted)" }}>
                        <AlertCircle size={12} />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <span
                      className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
                      style={{
                        backgroundColor:
                          adm.status === "APPROVED"
                            ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                            : "var(--bg-secondary)",
                        color:
                          adm.status === "APPROVED"
                            ? "var(--accent)"
                            : "var(--muted)",
                      }}
                    >
                      {adm.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-right space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedAdmission(adm)}
                      className="px-2.5 py-1.5 rounded border text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer min-h-[44px] md:min-h-0 inline-flex items-center justify-center"
                      style={{
                        borderColor: "var(--border)",
                        color: "var(--text)",
                      }}
                    >
                      Review
                    </button>
                    {adm.status !== "APPROVED" && (
                      <button
                        type="button"
                        onClick={() => handleApprove(adm)}
                        className="px-2.5 py-1.5 rounded font-semibold text-[11px] transition-opacity shadow-2xs hover:opacity-90 cursor-pointer min-h-[44px] md:min-h-0 inline-flex items-center justify-center"
                        style={{
                          backgroundColor: "var(--accent)",
                          color: "var(--accent-contrast)",
                        }}
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </ResponsiveTable>
        </div>
      </div>

      {/* Admission Review Drawer */}
      <Drawer
        isOpen={!!selectedAdmission}
        onClose={() => setSelectedAdmission(null)}
        title={selectedAdmission?.studentName || "Admission Verification"}
        subtitle={`Registration: ${selectedAdmission?.registrationNumber}`}
      >
        {selectedAdmission && (
          <div className="space-y-4 text-xs">
            <div
              className="p-3 rounded-lg border space-y-1.5"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex justify-between">
                <span className="font-medium text-stone-500">Candidate</span>
                <span className="font-semibold">{selectedAdmission.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-stone-500">Contact</span>
                <span>{selectedAdmission.phone} • {selectedAdmission.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-stone-500">Cohort</span>
                <span className="font-semibold">{selectedAdmission.batch}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-stone-500">Course</span>
                <span>{selectedAdmission.course}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-stone-500">Fee Status</span>
                <span className="font-semibold">{selectedAdmission.feeStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-stone-500">Agreement</span>
                <span className="font-semibold">
                  {selectedAdmission.agreementSigned ? "Signed" : "Pending Signature"}
                </span>
              </div>
            </div>

            {selectedAdmission.status !== "APPROVED" ? (
              <button
                type="button"
                onClick={() => handleApprove(selectedAdmission)}
                className="w-full py-2 rounded-lg font-semibold text-xs transition-opacity shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "var(--accent-contrast)",
                }}
              >
                <ShieldCheck size={14} />
                <span>Confirm & Finalize Admission</span>
              </button>
            ) : (
              <div
                className="p-2.5 rounded-lg border flex items-center gap-2"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--accent) 8%, var(--surface))",
                  borderColor: "color-mix(in srgb, var(--accent) 30%, var(--border))",
                  color: "var(--accent)",
                }}
              >
                <CheckCircle2 size={14} style={{ color: "var(--accent)" }} />
                <span className="font-medium text-[11px]">This admission is approved and enrolled.</span>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Stage New Enrolment Modal */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border)" }}>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase" style={{ color: "var(--accent)" }}>
                  Admissions Console
                </span>
                <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>
                  Stage Candidate Enrolment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-2 text-stone-500 hover:text-stone-900 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEnrolmentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1" style={{ color: "var(--text)" }}>
                  Student Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Malhotra"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border outline-none text-xs"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1" style={{ color: "var(--text)" }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="student@example.com"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    className="w-full p-2.5 rounded-lg border outline-none text-xs"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1" style={{ color: "var(--text)" }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={candidatePhone}
                    onChange={(e) => setCandidatePhone(e.target.value)}
                    className="w-full p-2.5 rounded-lg border outline-none text-xs"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1" style={{ color: "var(--text)" }}>
                    Enrolled Course
                  </label>
                  <select
                    value={candidateCourse}
                    onChange={(e) => setCandidateCourse(e.target.value)}
                    className="w-full p-2.5 rounded-lg border outline-none text-xs cursor-pointer"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    <option value="Python Full Stack">Python Full Stack</option>
                    <option value="Full-Stack App Development">Full-Stack App Development</option>
                    <option value="Django & Cloud APIs">Django & Cloud APIs</option>
                    <option value="React & Next.js Architecture">React & Next.js Architecture</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1" style={{ color: "var(--text)" }}>
                    Allocated Cohort Batch
                  </label>
                  <select
                    value={candidateBatch}
                    onChange={(e) => setCandidateBatch(e.target.value)}
                    className="w-full p-2.5 rounded-lg border outline-none text-xs cursor-pointer"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    <option value="PFS-2026-A">PFS-2026-A (Weekdays)</option>
                    <option value="FSA-2026-B">FSA-2026-B (Weekends)</option>
                    <option value="DCA-2026-C">DCA-2026-C (Morning)</option>
                    <option value="RNA-2026-D">RNA-2026-D (Evening)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1" style={{ color: "var(--text)" }}>
                  Initial Tuition State
                </label>
                <select
                  value={candidateFeeStatus}
                  onChange={(e) =>
                    setCandidateFeeStatus(
                      e.target.value as "1st Installment Paid" | "Full Payment Verified" | "Installment Due"
                    )
                  }
                  className="w-full p-2.5 rounded-lg border outline-none text-xs cursor-pointer"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                >
                  <option value="1st Installment Paid">1st Installment Paid</option>
                  <option value="Full Payment Verified">Full Payment Verified</option>
                  <option value="Installment Due">Installment Due</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border font-semibold text-xs hover:bg-black/5 dark:hover:bg-white/5 transition"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-semibold text-xs shadow-xs hover:opacity-90 transition"
                  style={{ backgroundColor: "var(--accent)", color: "var(--accent-contrast)" }}
                >
                  Confirm Candidate Enrolment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
