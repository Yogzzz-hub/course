import React, { useState } from "react";
import { CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
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
    // TODO: Connect to backend API: POST /api/admissions
    onAddToast({
      type: "info",
      title: "New Enrolment Staged",
      message: "Ready to capture candidate documents and fee schedule.",
    });
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
    </div>
  );
}
