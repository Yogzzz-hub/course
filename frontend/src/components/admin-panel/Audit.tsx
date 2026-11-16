import { useMemo } from "react";
import type { ResourceMap } from "./contracts";
import { useAdminResource } from "./hooks";
import { DataTable, type TableColumn } from "./DataTable";
import { Card, QueryView } from "./ui";
import { dateTime } from "./utils";
type Event = ResourceMap["audit"]["events"][number];
export function Audit() {
  const query = useAdminResource("audit");
  const columns = useMemo<TableColumn<Event>[]>(
    () => [
      {
        id: "at",
        label: "Time",
        value: (row) => row.at,
        render: (row) => dateTime(row.at),
      },
      { id: "actor", label: "Actor", value: (row) => row.actor },
      {
        id: "action",
        label: "Action / target",
        value: (row) => `${row.action} ${row.target}`,
        render: (row) => (
          <>
            {row.action}
            <p className="mt-1 text-xs">{row.target}</p>
          </>
        ),
      },
      { id: "summary", label: "Audit summary", value: (row) => row.summary },
      {
        id: "request",
        label: "Request ID",
        value: (row) => row.requestId,
        render: (row) => (
          <span className="break-all text-xs">{row.requestId}</span>
        ),
      },
    ],
    [],
  );
  return (
    <Card>
      <QueryView query={query}>
        {(data) => (
          <DataTable data={data.events} columns={columns} label="Audit trail" />
        )}
      </QueryView>
    </Card>
  );
}
