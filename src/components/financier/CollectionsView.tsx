import { useId, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, Mail, MessageSquarePlus } from "lucide-react";
import type {
  FollowUpNoteRecord,
  NotificationDispatchRecord,
} from "../../../backend/services/financier/types";
import { DataTable, MetricCard, Modal, useToast, type SharedTableColumn } from "../shared";
import { financierApi, type FinancierCollectionsResponse } from "./api";
import { formatDateTime, formatMoney, formatShortDate, statusBadgeClass } from "./formatters";

export interface CollectionsViewProps {
  data: FinancierCollectionsResponse;
  onRefresh: () => Promise<void>;
}

export function CollectionsView({ data, onRefresh }: CollectionsViewProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const baseId = useId();

  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [noteTarget, setNoteTarget] = useState<{ id: string; name: string } | null>(null);
  const [channel, setChannel] = useState<FollowUpNoteRecord["channel"]>("CALL");
  const [noteText, setNoteText] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);

  const handleSendReminder = async (studentId: string, studentName: string) => {
    setRemindingId(studentId);
    try {
      const res = await financierApi.sendFeeReminder(studentId);
      showToast({
        title: `Reminder dispatched (${res.notification.status})`,
        description: `Sent fee reminder email for ${studentName}.`,
        tone: "success",
      });
      await onRefresh();
    } catch (err) {
      showToast({
        title: "Reminder dispatch failed",
        description: err instanceof Error ? err.message : "Could not send reminder.",
        tone: "danger",
      });
    } finally {
      setRemindingId(null);
    }
  };

  const handleSaveNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!noteTarget) return;
    if (noteText.trim().length < 4) {
      showToast({ title: "Enter at least 4 characters for follow-up note.", tone: "warning" });
      return;
    }

    setNoteBusy(true);
    try {
      await financierApi.addFollowUpNote({
        studentProfileId: noteTarget.id,
        channel,
        note: noteText.trim(),
        nextFollowUpDate: nextDate || null,
      });
      showToast({ title: `Saved follow-up note for ${noteTarget.name}`, tone: "success" });
      setNoteTarget(null);
      setNoteText("");
      setNextDate("");
      await onRefresh();
    } catch (err) {
      showToast({
        title: "Could not save note",
        description: err instanceof Error ? err.message : "Failed to save follow-up note.",
        tone: "danger",
      });
    } finally {
      setNoteBusy(false);
    }
  };

  const bucketForStudent = (maxDays: number): "0-30" | "31-60" | "61-90" | "90+" | "Current" => {
    if (maxDays > 90) return "90+";
    if (maxDays > 60) return "61-90";
    if (maxDays > 30) return "31-60";
    if (maxDays > 0) return "0-30";
    return "Current";
  };

  const ageingStudentColumns: SharedTableColumn<
    FinancierCollectionsResponse["ageing"]["students"][number]
  >[] = [
    {
      id: "student",
      label: "Student & Batch",
      sortValue: (r) => r.studentName,
      searchValue: (r) => `${r.studentName} ${r.registrationNumber} ${r.batchCode}`,
      render: (r) => (
        <div>
          <Link to={`/financier/students/${r.studentProfileId}`} className="fin-link">
            {r.studentName}
          </Link>
          <div className="fin-sub-text">
            {r.registrationNumber} · {r.batchCode}
          </div>
        </div>
      ),
    },
    {
      id: "bucket",
      label: "Ageing Bucket",
      sortValue: (r) => r.maxDaysOverdue,
      render: (r) => {
        const bucket = bucketForStudent(r.maxDaysOverdue);
        return (
          <div>
            <span
              className={statusBadgeClass(
                bucket === "90+" || bucket === "61-90"
                  ? "OVERDUE"
                  : bucket === "Current"
                    ? "PAID"
                    : "REVIEW"
              )}
            >
              {bucket === "Current" ? "Current" : `${bucket} days`}
            </span>
            <div className="fin-sub-text">
              Max {r.maxDaysOverdue} days overdue · {r.overdueInvoiceCount} overdue invoice(s)
            </div>
          </div>
        );
      },
    },
    {
      id: "outstanding",
      label: "Total Overdue / Due",
      numeric: true,
      sortValue: (r) => r.totalOutstandingPaise,
      render: (r) => <strong>{formatMoney(r.totalOutstandingPaise)}</strong>,
    },
    {
      id: "lastContact",
      label: "Last Reminder",
      sortValue: (r) => r.lastReminderAt || "",
      render: (r) => (
        <div>
          <div>{formatShortDate(r.lastReminderAt)}</div>
          {r.lastNote && <div className="fin-sub-text">{r.lastNote}</div>}
        </div>
      ),
    },
    {
      id: "actions",
      label: "Collections Actions",
      render: (r) => (
        <div className="fin-row-wrap">
          <button
            type="button"
            className="fin-btn fin-btn-primary fin-btn-sm"
            disabled={remindingId === r.studentProfileId}
            onClick={() => handleSendReminder(r.studentProfileId, r.studentName)}
          >
            <Mail size={13} aria-hidden="true" />
            <span>{remindingId === r.studentProfileId ? "Sending..." : "Send Reminder"}</span>
          </button>
          <button
            type="button"
            className="fin-btn fin-btn-secondary fin-btn-sm"
            onClick={() => setNoteTarget({ id: r.studentProfileId, name: r.studentName })}
          >
            <MessageSquarePlus size={13} aria-hidden="true" />
            <span>Add Note</span>
          </button>
        </div>
      ),
    },
  ];

  const { ageing, notes, notifications } = data;
  const maxBucketAmount = Math.max(...ageing.buckets.map((b) => b.amountPaise), 1);

  return (
    <div className="fin-stack-lg">
      <div className="fin-page-header">
        <div>
          <h1>Collections, Ageing & Fee Reminders</h1>
          <p>
            Monitor overdue student receivables across 0–30, 31–60, 61–90, and 90+ day buckets,
            dispatch Brevo email reminders, and log collection calls.
          </p>
        </div>
        <button
          type="button"
          className="fin-btn fin-btn-secondary"
          onClick={() => {
            void financierApi.downloadReportCsv("ageing").then(() => {
              showToast({ title: "Collections Ageing CSV exported", tone: "success" });
            });
          }}
        >
          <Download size={15} aria-hidden="true" />
          <span>Export Ageing CSV</span>
        </button>
      </div>

      {/* 4 Ageing Bucket Cards */}
      <section aria-label="Ageing bucket totals" className="fin-metrics-grid">
        {ageing.buckets.map((b) => (
          <MetricCard
            key={b.bucket}
            label={`${b.bucket} Days Overdue`}
            value={formatMoney(b.amountPaise)}
            hint={`${b.invoiceCount} item(s)`}
            hintTone={b.bucket === "90+" || b.bucket === "61-90" ? "danger" : "warning"}
            highlight={b.bucket === "90+"}
          />
        ))}
      </section>

      <section className="fin-card" aria-labelledby="col-table-heading">
        <div className="fin-card-header">
          <div>
            <h2 id="col-table-heading">Students With Outstanding / Overdue Balances</h2>
            <p>Press Enter on a row to view full student financial statement</p>
          </div>
          <span className="fin-badge fin-badge-primary">
            Total Overdue Pool: {formatMoney(ageing.totalOverduePaise)}
          </span>
        </div>

        <div className="fin-bar-list">
          {ageing.buckets.map((b) => {
            const pct = Math.round((b.amountPaise / maxBucketAmount) * 100);
            return (
              <div key={b.bucket} className="fin-bar-item">
                <div className="fin-row-between">
                  <strong>{b.bucket} days bucket</strong>
                  <span className="fin-sub-text">
                    {formatMoney(b.amountPaise)} ({b.invoiceCount} receivables)
                  </span>
                </div>
                <div className="fin-bar-track">
                  <div
                    className={
                      b.bucket === "90+" || b.bucket === "61-90"
                        ? "fin-bar-fill-danger"
                        : "fin-bar-fill-primary"
                    }
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <DataTable
          rows={ageing.students}
          columns={ageingStudentColumns}
          getRowId={(r) => r.studentProfileId}
          label="Overdue student receivables"
          onRowOpen={(stu) => navigate(`/financier/students/${stu.studentProfileId}`)}
        />
      </section>

      <div className="fin-split-grid">
        <section className="fin-card" aria-labelledby="col-notes-heading">
          <div className="fin-card-header">
            <h2 id="col-notes-heading">Follow-Up Call & Contact Log</h2>
          </div>
          {notes.length === 0 ? (
            <div className="fin-empty-state">No collection follow-up notes recorded yet.</div>
          ) : (
            <div className="fin-stack-sm">
              {notes.map((n) => (
                <article key={n.id} className="fin-kv-box">
                  <div className="fin-row-between">
                    <strong>
                      {n.studentName}{" "}
                      <span className="fin-badge fin-badge-neutral">{n.channel}</span>
                    </strong>
                    <span className="fin-sub-text">{formatDateTime(n.createdAt)}</span>
                  </div>
                  <p style={{ color: "var(--fin-ink)" }}>{n.note}</p>
                  <span className="fin-sub-text">
                    Logged by {n.createdByName}
                    {n.nextFollowUpDate ? ` · Next follow-up: ${formatShortDate(n.nextFollowUpDate)}` : ""}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="fin-card fin-card--gold-accent" aria-labelledby="col-mail-heading">
          <div className="fin-card-header">
            <h2 id="col-mail-heading">Brevo Email & Reminder Dispatches</h2>
          </div>
          {notifications.length === 0 ? (
            <div className="fin-empty-state">No notifications dispatched yet.</div>
          ) : (
            <div className="fin-stack-sm">
              {notifications.map((notif: NotificationDispatchRecord) => (
                <article key={notif.id} className="fin-kv-box">
                  <div className="fin-row-between">
                    <span className="fin-badge fin-badge-primary">{notif.kind}</span>
                    <span className={statusBadgeClass(notif.status)}>{notif.status}</span>
                  </div>
                  <strong>{notif.subject}</strong>
                  <span className="fin-sub-text">
                    To {notif.recipientEmail} via {notif.provider} · {formatDateTime(notif.sentAt)}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Add Follow-up Note Modal */}
      <Modal
        open={Boolean(noteTarget)}
        onClose={() => setNoteTarget(null)}
        title={`Log Follow-Up Note${noteTarget ? ` — ${noteTarget.name}` : ""}`}
        subtitle="Recorded immutably to audit log and student account statement"
      >
        <form onSubmit={handleSaveNote} className="fin-stack-md">
          <div className="fin-form-grid">
            <div className="fin-form-field">
              <label htmlFor={`${baseId}-ch`} className="fin-label">
                Outreach Channel
              </label>
              <select
                id={`${baseId}-ch`}
                className="fin-select"
                value={channel}
                onChange={(e) => setChannel(e.target.value as FollowUpNoteRecord["channel"])}
              >
                <option value="CALL">Phone Call</option>
                <option value="EMAIL">Email Follow-up</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="IN_PERSON">In-Person Desk</option>
              </select>
            </div>
            <div className="fin-form-field">
              <label htmlFor={`${baseId}-next`} className="fin-label">
                Next Follow-up Date (Optional)
              </label>
              <input
                id={`${baseId}-next`}
                type="date"
                className="fin-input"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
              />
            </div>
          </div>

          <div className="fin-form-field">
            <label htmlFor={`${baseId}-note`} className="fin-label">
              Summary Note
            </label>
            <textarea
              id={`${baseId}-note`}
              className="fin-textarea"
              placeholder="Discussed instalment schedule, promised payment date..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              required
            />
          </div>

          <div className="fin-row-between">
            <button
              type="button"
              className="fin-btn fin-btn-secondary"
              onClick={() => setNoteTarget(null)}
            >
              Cancel
            </button>
            <button type="submit" className="fin-btn fin-btn-primary" disabled={noteBusy}>
              {noteBusy ? "Saving..." : "Save Follow-Up Note"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
