import { useCallback, useEffect, useId, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import type { AuditLogRecord } from "../../../backend/services/financier/types";
import { DataTable, Modal, useToast, type SharedTableColumn } from "../shared";
import { financierApi } from "./api";
import { formatDateTime } from "./formatters";

export function AuditView() {
  const { showToast } = useToast();
  const baseId = useId();
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financierApi.listAuditLogs({
        entityType: entityFilter || undefined,
        action: actionFilter || undefined,
      });
      setLogs(res.logs);
    } catch (err) {
      showToast({
        title: "Failed to load Audit Log",
        description: err instanceof Error ? err.message : "Could not read audit entries.",
        tone: "danger",
      });
    } finally {
      setLoading(false);
    }
  }, [entityFilter, actionFilter, showToast]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const entityTypes = Array.from(new Set(logs.map((l) => l.entityType))).sort();
  const actions = Array.from(new Set(logs.map((l) => l.action))).sort();

  const columns: SharedTableColumn<AuditLogRecord>[] = [
    {
      id: "timestamp",
      label: "Timestamp (UTC)",
      sortValue: (r) => r.timestamp,
      render: (r) => (
        <div>
          <strong>{formatDateTime(r.timestamp)}</strong>
          <div className="fin-sub-text fin-mono">{r.requestId}</div>
        </div>
      ),
    },
    {
      id: "actor",
      label: "Actor & Role",
      sortValue: (r) => r.actorName,
      searchValue: (r) => `${r.actorName} ${r.actorRole} ${r.actorId}`,
      render: (r) => (
        <div>
          <strong>{r.actorName}</strong>
          <div className="fin-sub-text">{r.actorRole}</div>
        </div>
      ),
    },
    {
      id: "action",
      label: "Action",
      sortValue: (r) => r.action,
      searchValue: (r) => `${r.action} ${r.entityType} ${r.entityId}`,
      render: (r) => <span className="fin-badge fin-badge-primary">{r.action}</span>,
    },
    {
      id: "entity",
      label: "Target Record",
      sortValue: (r) => `${r.entityType}:${r.entityId}`,
      render: (r) => (
        <div>
          <strong>{r.entityType}</strong>
          <div className="fin-sub-text fin-mono">{r.entityId}</div>
        </div>
      ),
    },
    {
      id: "reason",
      label: "Reason / Notes",
      searchValue: (r) => r.reason || "",
      render: (r) => r.reason || "—",
    },
    {
      id: "diff",
      label: "Before / After Snapshot",
      render: (r) => (
        <button
          type="button"
          className="fin-btn fin-btn-secondary fin-btn-sm"
          onClick={() => setSelectedLog(r)}
        >
          Inspect Diff
        </button>
      ),
    },
  ];

  return (
    <div className="fin-stack-lg">
      <div className="fin-page-header">
        <div>
          <h1>Immutable Financial Audit Log</h1>
          <p>
            Every write to payments, invoices, discounts, payroll, ledger reversals, and
            reminders records an atomic before/after snapshot in the same transaction.
          </p>
        </div>
        <button
          type="button"
          className="fin-btn fin-btn-secondary"
          onClick={() => void loadLogs()}
        >
          <RefreshCw size={15} aria-hidden="true" />
          <span>Refresh Log</span>
        </button>
      </div>

      <div className="fin-alert fin-alert--success">
        <ShieldCheck size={18} aria-hidden="true" />
        <span>
          Strict Transactional Audit Guarantee active: if an audit write fails, the entire
          underlying financial state mutation is rolled back.
        </span>
      </div>

      <section className="fin-card" aria-label="Audit trail table">
        <div className="fin-form-grid">
          <div className="fin-form-field">
            <label htmlFor={`${baseId}-ent`} className="fin-label">
              Filter Entity Type
            </label>
            <select
              id={`${baseId}-ent`}
              className="fin-select"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            >
              <option value="">All Entities</option>
              {entityTypes.map((et) => (
                <option key={et} value={et}>
                  {et}
                </option>
              ))}
            </select>
          </div>
          <div className="fin-form-field">
            <label htmlFor={`${baseId}-act`} className="fin-label">
              Filter Action
            </label>
            <select
              id={`${baseId}-act`}
              className="fin-select"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">All Actions</option>
              {actions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && logs.length === 0 ? (
          <div className="fin-empty-state">Loading financial audit history...</div>
        ) : (
          <DataTable
            rows={logs}
            columns={columns}
            getRowId={(r) => r.id}
            label="Audit logs"
            onRowOpen={(log) => setSelectedLog(log)}
          />
        )}
      </section>

      <Modal
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={selectedLog ? `Audit Snapshot — ${selectedLog.action}` : "Audit Snapshot"}
        subtitle={
          selectedLog
            ? `${selectedLog.entityType} (${selectedLog.entityId}) · ${formatDateTime(selectedLog.timestamp)}`
            : undefined
        }
      >
        {selectedLog && (
          <div className="fin-stack-md">
            <div className="fin-kv-grid">
              <div className="fin-kv-box">
                <span className="fin-kv-label">Actor</span>
                <span className="fin-kv-value">
                  {selectedLog.actorName} ({selectedLog.actorRole})
                </span>
              </div>
              <div className="fin-kv-box">
                <span className="fin-kv-label">Request ID</span>
                <span className="fin-kv-value fin-mono">{selectedLog.requestId}</span>
              </div>
            </div>

            {selectedLog.reason && (
              <div className="fin-kv-box">
                <span className="fin-kv-label">Reason</span>
                <span>{selectedLog.reason}</span>
              </div>
            )}

            <div>
              <h3 style={{ marginBottom: 6 }}>Before State</h3>
              <pre className="fin-code-block">
                {selectedLog.before ? JSON.stringify(selectedLog.before, null, 2) : "null (New Record)"}
              </pre>
            </div>

            <div>
              <h3 style={{ marginBottom: 6 }}>After State</h3>
              <pre className="fin-code-block">
                {selectedLog.after ? JSON.stringify(selectedLog.after, null, 2) : "null"}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
