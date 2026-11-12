import { useState, useMemo } from "react";
import {
  ArrowRight,
  Clock,
  Filter,
  Mail,
  MoreVertical,
  Plus,
  Search,
  User,
  X,
} from "lucide-react";
import type { Lead, LeadStage } from "./contracts";
import { useAdminAction, useAdminAuthority, useAdminResource } from "./hooks";
import { ActionFeedback } from "./ActionFeedback";
import { Button, Card, Empty, inputClass, ScreenTitle, StatusPill } from "./ui";
import { dateTime, slaLabel } from "./utils";

export function LeadsSection({
  initialSearch = "",
  onOpenLead,
}: {
  initialSearch?: string;
  onOpenLead?: (lead: Lead) => void;
}) {
  const { can } = useAdminAuthority();
  const leadsQuery = useAdminResource("leads", {});
  const action = useAdminAction();

  const [activeStage, setActiveStage] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>(initialSearch);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const leads = leadsQuery.data?.leads || [];
  const owners = leadsQuery.data?.owners || [];
  const clock = Date.now();

  const stages: { id: string; label: string }[] = [
    { id: "all", label: "All" },
    { id: "new", label: "New" },
    { id: "counselled", label: "Counselled" },
    { id: "enrolled", label: "Enrolled" },
    { id: "lost", label: "Lost" },
  ];

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Stage filter
      if (activeStage !== "all") {
        if (activeStage === "new" && lead.stage !== "new") return false;
        if (
          activeStage === "counselled" &&
          lead.stage !== "counselled" &&
          lead.stage !== "scheduled"
        )
          return false;
        if (activeStage === "enrolled" && lead.stage !== "enrolled") return false;
        if (activeStage === "lost" && lead.stage !== "lost") return false;
      }
      // Search term filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = lead.name.toLowerCase().includes(q);
        const matchesEmail = lead.email.toLowerCase().includes(q);
        const matchesProg = lead.programme.toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesProg;
      }
      return true;
    });
  }, [leads, activeStage, searchTerm]);

  const counts = useMemo(() => {
    return {
      all: leads.length,
      new: leads.filter((l) => l.stage === "new").length,
      counselled: leads.filter(
        (l) => l.stage === "counselled" || l.stage === "scheduled",
      ).length,
      enrolled: leads.filter((l) => l.stage === "enrolled").length,
      lost: leads.filter((l) => l.stage === "lost").length,
    };
  }, [leads]);

  return (
    <div className="space-y-6">
      <ScreenTitle
        eyebrow="Student Pipeline"
        title="Admissions & Leads"
        actions={
          <Button
            secondary
            onClick={() => {
              /* export or filter */
            }}
          >
            Export leads
          </Button>
        }
      />

      <ActionFeedback action={action} />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Stage Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {stages.map((stage) => {
            const count = counts[stage.id as keyof typeof counts] ?? 0;
            const isActive = activeStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveStage(stage.id)}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition ${
                  isActive
                    ? "bg-[var(--btn-primary-bg)] text-white shadow-sm"
                    : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--accent-tint)]"
                }`}
              >
                {stage.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[var(--accent-tint)] text-[var(--muted)]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Local Search Input */}
        <div className="relative w-full sm:w-72">
          <Search
            size={16}
            aria-hidden="true"
            className="absolute left-3.5 top-3.5 text-[var(--muted)]"
          />
          <input
            type="search"
            placeholder="Filter leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputClass} pl-10`}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-3.5 text-[var(--muted)] hover:text-[var(--text)]"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Leads Table (Desktop) & Cards (Mobile) */}
      <Card className="p-0 overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="p-8 text-center">
            <Empty
              title="No matching leads"
              children="Try adjusting your filter chips or search term."
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-[var(--text)]">
                <thead className="bg-[var(--accent-tint)] border-b border-[var(--border)] text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">
                      Student
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Programme
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Owner
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Stage
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Next Follow-up
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredLeads.map((lead) => {
                    const owner = owners.find((o) => o.id === lead.ownerId);
                    const sla = slaLabel(lead.nextActionAt, clock);
                    const isBreached = sla.startsWith("Overdue");
                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-[var(--surface-alt)] transition"
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-[var(--text)]">
                            {lead.name}
                          </div>
                          <div className="text-xs text-[var(--muted)]">
                            {lead.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-[var(--text)]">
                          {lead.programme}
                        </td>
                        <td className="px-6 py-4 text-xs text-[var(--muted)]">
                          {owner?.name || "Unassigned"}
                        </td>
                        <td className="px-6 py-4">
                          <StatusPill status={lead.stage} />
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-xs font-medium ${
                              isBreached
                                ? "text-red-700 font-bold"
                                : "text-[var(--muted)]"
                            }`}
                          >
                            {sla}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLead(lead)}
                            className="inline-flex min-h-[36px] min-w-[70px] items-center justify-center rounded-lg border border-[var(--border)] px-3 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-tint)] hover:border-[var(--accent)] transition"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="divide-y divide-[var(--border)] md:hidden">
              {filteredLeads.map((lead) => {
                const owner = owners.find((o) => o.id === lead.ownerId);
                const sla = slaLabel(lead.nextActionAt, clock);
                const isBreached = sla.startsWith("Overdue");
                return (
                  <article key={lead.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-base text-[var(--text)]">
                          {lead.name}
                        </h3>
                        <p className="text-xs text-[var(--muted)]">{lead.email}</p>
                      </div>
                      <StatusPill status={lead.stage} />
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-xs text-[var(--muted)] pt-1 border-t border-[var(--border)]">
                      <span>{lead.programme}</span>
                      <span>Owner: {owner?.name || "Unassigned"}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span
                        className={`text-xs ${
                          isBreached
                            ? "text-red-700 font-bold"
                            : "text-[var(--muted)]"
                        }`}
                      >
                        SLA: {sla}
                      </span>
                      <Button
                        onClick={() => setSelectedLead(lead)}
                        className="min-h-[44px] min-w-[80px] px-4 text-xs font-bold !text-white"
                      >
                        Open Lead
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Lead Detail Modal / Drawer */}
      {selectedLead && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-[var(--accent)] uppercase">
                  Lead Details
                </span>
                <h2 className="text-xl font-bold text-[var(--text)]">
                  {selectedLead.name}
                </h2>
                <p className="text-xs text-[var(--muted)]">{selectedLead.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--muted)] hover:bg-[var(--accent-tint)]"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Programme:</span>
                <span className="font-semibold text-[var(--text)]">
                  {selectedLead.programme}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Current Stage:</span>
                <StatusPill status={selectedLead.stage} />
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Assigned Counsellor:</span>
                <span className="font-semibold text-[var(--text)]">
                  {owners.find((o) => o.id === selectedLead.ownerId)?.name ||
                    "Unassigned"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Last Updated:</span>
                <span className="text-xs text-[var(--text)]">
                  {dateTime(selectedLead.updatedAt)}
                </span>
              </div>
            </div>

            {can("leads.write") && (
              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                <label className="text-xs font-bold text-[var(--text)]">
                  Update Stage
                </label>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "new",
                      "contacted",
                      "scheduled",
                      "counselled",
                      "enrolled",
                      "lost",
                    ] as LeadStage[]
                  ).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={async () => {
                        await action.run({
                          type: "lead.move",
                          leadId: selectedLead.id,
                          stage: st,
                          expectedVersion: selectedLead.version,
                        });
                        setSelectedLead(null);
                      }}
                      className={`min-h-[40px] px-3 rounded-lg text-xs font-semibold border ${
                        selectedLead.stage === st
                          ? "bg-[var(--btn-primary-bg)] text-white border-[var(--btn-primary-bg)]"
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--accent-tint)]"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3">
              <Button secondary onClick={() => setSelectedLead(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
