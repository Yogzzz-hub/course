import { useMemo, useState } from "react";
import type { ResourceMap } from "./contracts";
import { useAdminAction, useAdminAuthority, useAdminResource } from "./hooks";
import { ActionFeedback } from "./ActionFeedback";
import { DataTable, type TableColumn } from "./DataTable";
import { Button, inputClass, Label, QueryView } from "./ui";
import { dateTime, money } from "./utils";
type Offer = ResourceMap["offers"]["offers"][number];
function Decision({ offer }: { offer: Offer }) {
  const { can, session } = useAdminAuthority();
  const action = useAdminAction();
  const [reason, setReason] = useState("");
  if (
    !can("offers.decide") ||
    !can("operations.read") ||
    offer.status !== "pending"
  )
    return <span>{offer.status}</span>;
  if (offer.requestedBy === session.userId)
    return (
      <span className="text-slate-600">Independent administrator required</span>
    );
  return (
    <div className="min-w-56 space-y-3">
      <Label id={`offer-reason-${offer.id}`}>
        Decision reason for {offer.leadName}
      </Label>
      <textarea
        id={`offer-reason-${offer.id}`}
        className={inputClass}
        rows={2}
        value={reason}
        maxLength={1200}
        disabled={action.locked || action.busy}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        {(["approved", "rejected"] as const)
          .filter((_, index) => !action.locked || index === 0)
          .map((decision) => (
            <Button
              key={decision}
              secondary={decision === "rejected"}
              busy={action.busy}
              disabled={reason.trim().length < 10}
              onClick={() =>
                void action.run({
                  type: "offer.decide",
                  offerId: offer.id,
                  expectedVersion: offer.version,
                  decision,
                  reason,
                })
              }
            >
              {action.locked
                ? "Retry original decision"
                : decision === "approved"
                  ? "Approve offer"
                  : "Reject offer"}
            </Button>
          ))}
      </div>
      <ActionFeedback action={action} />
    </div>
  );
}
export function Offers() {
  const query = useAdminResource("offers");
  const columns = useMemo<TableColumn<Offer>[]>(
    () => [
      {
        id: "lead",
        label: "Lead / package",
        value: (row) => `${row.leadName} ${row.packageName}`,
        render: (row) => (
          <>
            <p className="font-semibold">{row.leadName}</p>
            <p className="mt-1 text-slate-600">{row.packageName}</p>
          </>
        ),
      },
      {
        id: "original",
        label: "Original price",
        value: (row) => row.originalMinor,
        render: (row) => money(row.originalMinor, row.currency),
      },
      {
        id: "discount",
        label: "Discount scheme",
        value: (row) => row.discountMinor,
        render: (row) => (
          <>
            {row.scheme.kind === "percentage"
              ? `${row.scheme.basisPoints / 100}%`
              : "Fixed discount"}
            <p className="mt-1">{money(row.discountMinor, row.currency)}</p>
          </>
        ),
      },
      {
        id: "final",
        label: "Final price",
        value: (row) => row.finalMinor,
        render: (row) => <strong>{money(row.finalMinor, row.currency)}</strong>,
      },
      {
        id: "counsellor",
        label: "Requested by",
        value: (row) => row.counsellor,
        render: (row) => (
          <>
            <p>{row.counsellor}</p>
            <p className="mt-1 max-w-xs text-slate-600">{row.reason}</p>
            <p className="mt-2 text-xs">{dateTime(row.requestedAt)}</p>
          </>
        ),
      },
      {
        id: "status",
        label: "Administrative sign-off",
        value: (row) => row.status,
        sortable: false,
        render: (row) => <Decision offer={row} />,
      },
    ],
    [],
  );
  return (
    <QueryView query={query}>
      {(data) => (
        <DataTable data={data.offers} columns={columns} label="Offers" />
      )}
    </QueryView>
  );
}
