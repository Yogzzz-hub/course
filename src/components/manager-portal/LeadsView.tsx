import React, { useState } from "react";
import { Search, Calendar, MessageSquare } from "lucide-react";
import type { Lead, Counsellor } from "../../data/managerMock";
import { Drawer } from "./Drawer";

export function LeadsView({
  leads,
  counsellors,
  onAddToast,
  onUpdateLead,
}: {
  leads: Lead[];
  counsellors: Counsellor[];
  onAddToast: (toast: { type: "success" | "info" | "warning"; title: string; message: string }) => void;
  onUpdateLead: (updated: Lead) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newNoteText, setNewNoteText] = useState("");
  const [callDate, setCallDate] = useState("");
  const [callTime, setCallTime] = useState("");
  const [selectedCounsellor, setSelectedCounsellor] = useState("");

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.track.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSaveNote = () => {
    if (!selectedLead || !newNoteText.trim()) return;
    // TODO: Connect to backend API: POST /api/leads/[id]/notes to persist lead note
    const updatedLead: Lead = {
      ...selectedLead,
      notes: [newNoteText.trim(), ...selectedLead.notes],
    };
    onUpdateLead(updatedLead);
    setSelectedLead(updatedLead);
    setNewNoteText("");
    onAddToast({
      type: "success",
      title: "Note Recorded",
      message: `Note added to ${selectedLead.name}'s profile.`,
    });
  };

  const handleScheduleCall = () => {
    if (!selectedLead || !callDate) return;
    // TODO: Connect to backend API: POST /api/leads/[id]/schedule-call to sync with manager/counsellor calendar
    const timeStr = callTime || "10:00 AM";
    const noteText = `Scheduled Call on ${callDate} at ${timeStr}`;
    const updatedLead: Lead = {
      ...selectedLead,
      status: "Counselling Scheduled",
      notes: [noteText, ...selectedLead.notes],
    };
    onUpdateLead(updatedLead);
    setSelectedLead(updatedLead);
    setCallDate("");
    setCallTime("");
    onAddToast({
      type: "success",
      title: "Call Scheduled",
      message: `Follow-up call booked for ${callDate} at ${timeStr}.`,
    });
  };

  const handleAssignCounsellor = () => {
    if (!selectedLead || !selectedCounsellor) return;
    // TODO: Connect to backend API: PATCH /api/leads/[id]/assign to reassign lead ownership
    const updatedLead: Lead = {
      ...selectedLead,
      assignedCounsellor: selectedCounsellor,
    };
    onUpdateLead(updatedLead);
    setSelectedLead(updatedLead);
    onAddToast({
      type: "info",
      title: "Counsellor Reassigned",
      message: `${selectedLead.name} assigned to ${selectedCounsellor}.`,
    });
  };

  return (
    <div className="space-y-3">
      {/* Search and Filters bar - NO headings or subheadings */}
      <div
        className="p-3 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--muted)" }}
          />
          <input
            type="text"
            placeholder="Search leads by name, track, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs border outline-none"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {["ALL", "New Lead", "Counselling Scheduled", "Offer Extended", "Admitted", "Lost"].map(
            (status) => {
              const isSelected = statusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border cursor-pointer"
                  style={{
                    backgroundColor: isSelected ? "var(--accent)" : "transparent",
                    borderColor: isSelected ? "var(--accent)" : "var(--border)",
                    color: isSelected ? "var(--accent-contrast)" : "var(--muted)",
                  }}
                >
                  {status === "ALL" ? "All Leads" : status}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Leads Table */}
      <div
        className="rounded-xl border overflow-hidden shadow-2xs"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
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
                <th className="py-2.5 px-3.5">Candidate</th>
                <th className="py-2.5 px-3.5">Track Interest</th>
                <th className="py-2.5 px-3.5">Score</th>
                <th className="py-2.5 px-3.5">Assigned To</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5">Date</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-black/2 dark:hover:bg-white/2 transition-colors"
                >
                  <td className="py-2.5 px-3.5">
                    <span className="font-semibold text-xs" style={{ color: "var(--text)" }}>
                      {lead.name}
                    </span>
                    <p className="text-[10px] text-stone-500" style={{ color: "var(--muted)" }}>
                      {lead.email} • {lead.phone}
                    </p>
                  </td>
                  <td className="py-2.5 px-3.5 font-medium" style={{ color: "var(--text)" }}>
                    {lead.track}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-10 h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: "var(--bg-secondary)" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${lead.score}%`,
                            backgroundColor:
                              lead.score >= 80
                                ? "#059669"
                                : lead.score >= 60
                                ? "#D97706"
                                : "#DC2626",
                          }}
                        />
                      </div>
                      <span className="font-medium text-[10px]">{lead.score}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 text-[11px]" style={{ color: "var(--text)" }}>
                    {lead.assignedCounsellor}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <span
                      className="text-[9px] font-medium px-2 py-0.5 rounded"
                      style={{
                        backgroundColor:
                          lead.status === "New Lead"
                            ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                            : lead.status === "Admitted"
                            ? "#D1FAE5"
                            : lead.status === "Offer Extended"
                            ? "#FEF3C7"
                            : lead.status === "Counselling Scheduled"
                            ? "#EDE9FE"
                            : "#FEE2E2",
                        color:
                          lead.status === "New Lead"
                            ? "var(--accent)"
                            : lead.status === "Admitted"
                            ? "#047857"
                            : lead.status === "Offer Extended"
                            ? "#B45309"
                            : lead.status === "Counselling Scheduled"
                            ? "#6D28D9"
                            : "#B91C1C",
                      }}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-[11px]" style={{ color: "var(--muted)" }}>
                    {lead.date}
                  </td>
                  <td className="py-2.5 px-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedLead(lead)}
                      className="px-2 py-1 rounded border text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      style={{
                        borderColor: "var(--border)",
                        color: "var(--text)",
                      }}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-xs" style={{ color: "var(--muted)" }}>
                    No leads found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Details Drawer */}
      <Drawer
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        title={selectedLead?.name || "Lead Details"}
        subtitle={`ID: ${selectedLead?.id} • Source: ${selectedLead?.source}`}
      >
        {selectedLead && (
          <div className="space-y-4 text-xs">
            {/* Quick Profile Summary */}
            <div
              className="p-3 rounded-lg border space-y-1.5"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-stone-500">Status</span>
                <span className="font-semibold text-[10px] px-1.5 py-0.2 rounded bg-black/5">
                  {selectedLead.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-stone-500">Track</span>
                <span className="font-semibold">{selectedLead.track}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-stone-500">Email</span>
                <span>{selectedLead.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-stone-500">Phone</span>
                <span>{selectedLead.phone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-stone-500">Assigned Advisor</span>
                <span className="font-semibold" style={{ color: "var(--accent)" }}>
                  {selectedLead.assignedCounsellor}
                </span>
              </div>
            </div>

            {/* Reassign Counsellor */}
            <div className="space-y-1.5">
              <label className="font-semibold block text-xs" style={{ color: "var(--text)" }}>
                Reassign Counsellor
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedCounsellor}
                  onChange={(e) => setSelectedCounsellor(e.target.value)}
                  className="flex-1 p-1.5 rounded-lg border text-xs outline-none"
                  style={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                >
                  <option value="">Select advisor...</option>
                  {counsellors.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.activeLeadsCount} active)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAssignCounsellor}
                  disabled={!selectedCounsellor}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-50 cursor-pointer"
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "var(--accent-contrast)",
                  }}
                >
                  Assign
                </button>
              </div>
            </div>

            {/* Schedule Follow-up Call */}
            <div className="space-y-1.5">
              <label className="font-semibold block text-xs" style={{ color: "var(--text)" }}>
                Schedule Call
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={callDate}
                  onChange={(e) => setCallDate(e.target.value)}
                  className="p-1.5 rounded-lg border text-xs outline-none"
                  style={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                />
                <input
                  type="time"
                  value={callTime}
                  onChange={(e) => setCallTime(e.target.value)}
                  className="p-1.5 rounded-lg border text-xs outline-none"
                  style={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleScheduleCall}
                disabled={!callDate}
                className="w-full py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                style={{
                  borderColor: "var(--accent)",
                  color: "var(--accent)",
                }}
              >
                <Calendar size={13} />
                <span>Confirm Call</span>
              </button>
            </div>

            {/* Notes Section */}
            <div className="space-y-2">
              <label className="font-semibold flex items-center gap-1 text-xs" style={{ color: "var(--text)" }}>
                <MessageSquare size={13} />
                <span>Notes ({selectedLead.notes.length})</span>
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add note..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveNote();
                  }}
                  className="flex-1 p-1.5 rounded-lg border text-xs outline-none"
                  style={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={!newNoteText.trim()}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-50 cursor-pointer"
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "var(--accent-contrast)",
                  }}
                >
                  Save
                </button>
              </div>

              <div className="space-y-1.5 mt-2">
                {selectedLead.notes.map((note, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg border text-[11px] leading-relaxed"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    {note}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
