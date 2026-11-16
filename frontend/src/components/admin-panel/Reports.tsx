import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { ResourceMap } from "./contracts";
import { useAdminAction, useAdminAuthority, useAdminResource } from "./hooks";
import { ActionFeedback } from "./ActionFeedback";
import { DataTable, type TableColumn } from "./DataTable";
import {
  Button,
  Card,
  Empty,
  inputClass,
  Label,
  Notice,
  QueryView,
  SecureLink,
} from "./ui";
import { dateTime, money } from "./utils";
type Counsellor = ResourceMap["reports"]["counsellors"][number];
function ExportDownload({ id }: { id: string }) {
  const { can, now } = useAdminAuthority();
  const query = useAdminResource("export", { id });
  if (!can("reports.export")) return null;
  return (
    <QueryView query={query}>
      {(data) =>
        data.status === "ready" && data.downloadUrl && data.expiresAt ? (
          Date.parse(data.expiresAt) > now ? (
            <SecureLink href={data.downloadUrl}>Download report CSV</SecureLink>
          ) : (
            <Notice>Download expired. Generate a new export.</Notice>
          )
        ) : (
          <Notice error={data.status === "failed"}>
            Export {data.status}.{" "}
            {data.status === "queued" || data.status === "running"
              ? "The download will appear when processing finishes."
              : "Generate a new export to try again."}
          </Notice>
        )
      }
    </QueryView>
  );
}
export function Reports() {
  const { can } = useAdminAuthority();
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [period, setPeriod] = useState({ from, to });
  const action = useAdminAction();
  const query = useAdminResource("reports", period);
  const [exportId, setExportId] = useState<string | null>(null);
  const columns = useMemo<TableColumn<Counsellor>[]>(
    () => [
      { id: "name", label: "Counsellor", value: (row) => row.name },
      { id: "leads", label: "Leads", value: (row) => row.leads },
      { id: "sessions", label: "Sessions", value: (row) => row.sessions },
      { id: "enrolments", label: "Enrolments", value: (row) => row.enrolments },
      {
        id: "conversion",
        label: "Conversion",
        value: (row) => (row.leads ? row.enrolments / row.leads : 0),
        render: (row) =>
          row.leads
            ? `${((100 * row.enrolments) / row.leads).toFixed(1)}%`
            : "No leads",
      },
      {
        id: "revenue",
        label: "Revenue",
        value: (row) => row.revenueMinor,
        render: (row) => money(row.revenueMinor, query.data?.currency || "INR"),
      },
    ],
    [query.data?.currency],
  );
  return (
    <div className="space-y-5">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (from && to && from <= to) {
            setPeriod({ from, to });
            setExportId(null);
          }
        }}
      >
        <div>
          <Label id="report-from">From</Label>
          <input
            type="date"
            id="report-from"
            className={inputClass}
            required
            value={from}
            max={to}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div>
          <Label id="report-to">To</Label>
          <input
            type="date"
            id="report-to"
            className={inputClass}
            required
            value={to}
            min={from}
            max={today}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={!from || !to || from > to}>
          Apply period
        </Button>
        {can("reports.export") && (
          <Button
            type="button"
            secondary
            busy={action.busy}
            disabled={!query.isSuccess}
            onClick={() => {
              void action
                .run({ type: "reports.export", ...period, format: "csv" })
                .then((result) => {
                  if (result?.status === "succeeded" && result.resourceId)
                    setExportId(result.resourceId);
                });
            }}
          >
            <Download size={16} />
            {action.locked ? "Retry original export" : "Generate CSV export"}
          </Button>
        )}
      </form>
      <ActionFeedback action={action} />
      {can("reports.export") && exportId && (
        <ExportDownload key={exportId} id={exportId} />
      )}
      <QueryView query={query}>
        {(data) => (
          <>
            <p className="text-xs text-slate-500">
              Reporting period: {data.from} to {data.to} · Generated{" "}
              {dateTime(data.generatedAt)}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {(
                [
                  ["Captured revenue", data.revenue.capturedMinor],
                  ["Refunded", data.revenue.refundedMinor],
                  ["Instalments due", data.revenue.dueMinor],
                  ["Overdue instalments", data.revenue.overdueMinor],
                ] as const
              ).map(([label, value]) => (
                <Card key={label}>
                  <p className="text-sm text-slate-600">{label}</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight">
                    {money(value, data.currency)}
                  </p>
                </Card>
              ))}
            </div>
            <Card>
              <h2 className="mb-5 text-lg font-semibold">
                Full-funnel conversion
              </h2>
              {!data.funnel.length ? (
                <Empty>No funnel data for this period.</Empty>
              ) : (
                <ol className="space-y-4">
                  {data.funnel.map((stage, index) => {
                    const max = Math.max(
                      ...data.funnel.map((item) => item.count),
                      1,
                    );
                    const first = data.funnel[0].count;
                    return (
                      <li key={`${index}:${stage.label}`}>
                        <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                          <span className="font-semibold">{stage.label}</span>
                          <span>
                            {stage.count.toLocaleString()} ·{" "}
                            {first > 0
                              ? `${((100 * stage.count) / first).toFixed(1)}% of initial leads`
                              : "No initial leads"}
                          </span>
                        </div>
                        <div
                          className="h-2 overflow-hidden rounded-full bg-slate-100"
                          aria-hidden="true"
                        >
                          <div
                            className="h-full rounded-full bg-indigo-600"
                            style={{ width: `${(100 * stage.count) / max}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>
            <Card>
              <h2 className="mb-5 text-lg font-semibold">
                Counsellor performance
              </h2>
              <DataTable
                data={data.counsellors}
                columns={columns}
                label="Counsellor performance"
              />
            </Card>
          </>
        )}
      </QueryView>
    </div>
  );
}
