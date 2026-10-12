import { useMemo, useState } from "react";
import type {
  LedgerEntry,
  OfflineProof,
  Refund,
  AdminCommand,
} from "./contracts";
import { commandPermissions, canReviewProof } from "./permissions";
import { useAdminAction, useAdminAuthority, useAdminResource } from "./hooks";
import { ActionFeedback } from "./ActionFeedback";
import { DataTable, type TableColumn } from "./DataTable";
import {
  Button,
  Card,
  inputClass,
  Label,
  Notice,
  QueryView,
  SecureLink,
} from "./ui";
import { amountInput, dateTime, money, parseMinor } from "./utils";
import { stageName } from "./Leads";

function FinancialDecision({
  id,
  title,
  commands,
}: {
  id: string;
  title: string;
  commands: { label: string; command: (reason: string) => AdminCommand }[];
}) {
  const { can } = useAdminAuthority();
  const action = useAdminAction();
  const [reason, setReason] = useState("");
  const allowed = commands.filter((item) =>
    commandPermissions(item.command("Review decision")).every(can),
  );
  if (!allowed.length) return null;
  return (
    <div className="min-w-56 space-y-3">
      <Label id={id}>{title}</Label>
      <textarea
        id={id}
        className={inputClass}
        rows={2}
        value={reason}
        maxLength={1200}
        disabled={action.locked || action.busy}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        {allowed
          .filter((_, index) => !action.locked || index === 0)
          .map((item, index) => (
            <Button
              key={item.label}
              secondary={index > 0}
              busy={action.busy}
              disabled={reason.trim().length < 10}
              onClick={() => void action.run(item.command(reason))}
            >
              {action.locked ? "Retry original request" : item.label}
            </Button>
          ))}
      </div>
      <ActionFeedback action={action} />
    </div>
  );
}
function ProofActions({ proof }: { proof: OfflineProof }) {
  const { session, can } = useAdminAuthority();
  const phase = proof.status === "pending_secondary" ? "second" : "first";
  if (
    !can("operations.read") ||
    !can(phase === "first" ? "proofs.review" : "proofs.approve")
  )
    return <span>{stageName(proof.status)}</span>;
  if (!canReviewProof(proof, session.userId, phase))
    return (
      <span>
        {proof.status === "pending_review" ||
        proof.status === "pending_secondary"
          ? "Independent reviewer required"
          : stageName(proof.status)}
      </span>
    );
  return (
    <FinancialDecision
      id={`proof-reason-${proof.id}`}
      title={`${phase === "second" ? "Secondary" : "Primary"} review reason for ${proof.student}`}
      commands={(["approved", "rejected"] as const).map((decision) => ({
        label:
          decision === "approved"
            ? phase === "second"
              ? "Verify payment"
              : "Approve primary review"
            : "Reject proof",
        command: (reason) => ({
          type: "proof.review",
          proofId: proof.id,
          expectedVersion: proof.version,
          phase,
          decision,
          reason,
        }),
      }))}
    />
  );
}
function RefundActions({ refund }: { refund: Refund }) {
  const { session } = useAdminAuthority();
  if (refund.status === "requested" && refund.requestedBy === session.userId)
    return <span>Independent refund approver required</span>;
  return (
    <>
      <p className="mb-3 font-semibold">{stageName(refund.status)}</p>
      {refund.status === "requested" && (
        <FinancialDecision
          id={`refund-reason-${refund.id}`}
          title={`Refund decision reason for ${refund.student}`}
          commands={(["approved", "rejected"] as const).map((decision) => ({
            label: decision === "approved" ? "Approve refund" : "Reject refund",
            command: (reason) => ({
              type: "refund.decide",
              refundId: refund.id,
              expectedVersion: refund.version,
              decision,
              reason,
            }),
          }))}
        />
      )}
      {refund.status === "approved" && refund.approvedBy && (
        <FinancialDecision
          id={`refund-execute-${refund.id}`}
          title={`Execution reason for ${refund.student}`}
          commands={[
            {
              label: "Execute approved refund",
              command: (reason) => ({
                type: "refund.execute",
                refundId: refund.id,
                expectedVersion: refund.version,
                reason,
              }),
            },
          ]}
        />
      )}
    </>
  );
}
function LedgerActions({ entry }: { entry: LedgerEntry }) {
  const { can } = useAdminAuthority();
  const action = useAdminAction();
  const [mode, setMode] = useState<"refund" | "reconcile" | null>(null);
  const [amount, setAmount] = useState(
    amountInput(entry.refundableMinor, entry.currency),
  );
  const [reference, setReference] = useState(entry.providerReference || "");
  const [reason, setReason] = useState("");
  const refundAllowed =
    can("refunds.request") &&
    can("operations.read") &&
    entry.status === "captured" &&
    entry.refundableMinor > 0;
  const reconcileAllowed =
    can("ledger.reconcile") &&
    can("operations.read") &&
    entry.status === "captured" &&
    entry.reconciliation === "unmatched";
  const parsed = parseMinor(amount, entry.currency);
  const valid =
    reason.trim().length >= 10 &&
    (mode === "refund"
      ? parsed !== null && parsed > 0 && parsed <= entry.refundableMinor
      : reference.trim().length >= 3);
  if (!refundAllowed && !reconcileAllowed)
    return <span className="text-slate-500">No available actions</span>;
  return (
    <div className="min-w-64 space-y-3">
      <div className="flex flex-wrap gap-2">
        {refundAllowed && (
          <Button
            secondary
            disabled={action.busy || action.locked}
            onClick={() => setMode("refund")}
          >
            Request refund
          </Button>
        )}
        {reconcileAllowed && (
          <Button
            secondary
            disabled={action.busy || action.locked}
            onClick={() => setMode("reconcile")}
          >
            Reconcile payment
          </Button>
        )}
      </div>
      {mode &&
        ((mode === "refund" && refundAllowed) ||
          (mode === "reconcile" && reconcileAllowed)) && (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!valid) return;
              void action.run(
                mode === "refund" && parsed !== null
                  ? {
                      type: "refund.request",
                      paymentId: entry.id,
                      amountMinor: parsed,
                      expectedVersion: entry.version,
                      reason,
                    }
                  : {
                      type: "ledger.reconcile",
                      entryId: entry.id,
                      providerReference: reference,
                      expectedVersion: entry.version,
                      reason,
                    },
              );
            }}
          >
            <div>
              <Label id={`ledger-value-${entry.id}`}>
                {mode === "refund"
                  ? `Refund amount (${entry.currency})`
                  : "Provider reference"}
              </Label>
              <input
                id={`ledger-value-${entry.id}`}
                className={inputClass}
                inputMode={mode === "refund" ? "decimal" : undefined}
                value={mode === "refund" ? amount : reference}
                disabled={action.locked || action.busy}
                maxLength={200}
                onChange={(event) =>
                  mode === "refund"
                    ? setAmount(event.target.value)
                    : setReference(event.target.value)
                }
              />
              {mode === "refund" && (
                <p className="mt-1 text-xs text-slate-600">
                  Maximum refundable:{" "}
                  {money(entry.refundableMinor, entry.currency)}
                </p>
              )}
            </div>
            <div>
              <Label id={`ledger-reason-${entry.id}`}>
                Reason for {entry.student}
              </Label>
              <textarea
                id={`ledger-reason-${entry.id}`}
                className={inputClass}
                rows={2}
                value={reason}
                maxLength={1200}
                disabled={action.locked || action.busy}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
            <Button type="submit" busy={action.busy} disabled={!valid}>
              {action.locked
                ? "Retry original request"
                : mode === "refund"
                  ? "Submit refund request"
                  : "Confirm reconciliation"}
            </Button>
          </form>
        )}
      <ActionFeedback action={action} />
    </div>
  );
}
export function Finance() {
  const query = useAdminResource("finance");
  const [tab, setTab] = useState<"ledger" | "proofs" | "refunds">("ledger");
  const [status, setStatus] = useState("all");
  const ledgerColumns = useMemo<TableColumn<LedgerEntry>[]>(
    () => [
      {
        id: "student",
        label: "Student / payment",
        value: (row) => `${row.student} ${row.description}`,
        render: (row) => (
          <>
            <p className="font-semibold">{row.student}</p>
            <p className="mt-1">{row.description}</p>
            <p className="mt-1 text-xs text-slate-500">{row.id}</p>
          </>
        ),
      },
      {
        id: "amount",
        label: "Amount",
        value: (row) => row.amountMinor,
        render: (row) => money(row.amountMinor, row.currency),
      },
      {
        id: "status",
        label: "Status",
        value: (row) => row.status,
        render: (row) => (
          <span
            className={
              row.status === "overdue" ? "font-semibold text-red-700" : ""
            }
          >
            {stageName(row.status)}
          </span>
        ),
      },
      {
        id: "date",
        label: "Due / captured",
        value: (row) => row.dueAt || row.capturedAt || "",
        render: (row) => dateTime(row.dueAt || row.capturedAt),
      },
      {
        id: "reconciliation",
        label: "Reconciliation",
        value: (row) => `${row.reconciliation} ${row.providerReference || ""}`,
        render: (row) => (
          <>
            {stageName(row.reconciliation)}
            <p className="mt-1 break-all text-xs">
              {row.providerReference || "No provider reference"}
            </p>
          </>
        ),
      },
      {
        id: "actions",
        label: "Financial controls",
        value: () => "",
        sortable: false,
        render: (row) => <LedgerActions entry={row} />,
      },
    ],
    [],
  );
  const proofColumns = useMemo<TableColumn<OfflineProof>[]>(
    () => [
      { id: "student", label: "Student", value: (row) => row.student },
      {
        id: "amount",
        label: "Amount",
        value: (row) => row.amountMinor,
        render: (row) => money(row.amountMinor, row.currency),
      },
      {
        id: "reference",
        label: "Evidence",
        value: (row) => row.reference,
        render: (row) => (
          <>
            <p>{row.reference}</p>
            <SecureLink href={row.proofUrl}>Open payment proof</SecureLink>
            <p className="text-xs text-slate-500">
              {dateTime(row.submittedAt)}
            </p>
          </>
        ),
      },
      {
        id: "status",
        label: "Approval stage",
        value: (row) => row.status,
        render: (row) => <ProofActions proof={row} />,
      },
    ],
    [],
  );
  const refundColumns = useMemo<TableColumn<Refund>[]>(
    () => [
      {
        id: "student",
        label: "Student / payment",
        value: (row) => row.student,
        render: (row) => (
          <>
            {row.student}
            <p className="mt-1 break-all text-xs">{row.paymentId}</p>
          </>
        ),
      },
      {
        id: "amount",
        label: "Refund amount",
        value: (row) => row.amountMinor,
        render: (row) => money(row.amountMinor, row.currency),
      },
      { id: "reason", label: "Request reason", value: (row) => row.reason },
      {
        id: "status",
        label: "Refund pipeline",
        value: (row) => row.status,
        render: (row) => <RefundActions refund={row} />,
      },
    ],
    [],
  );
  return (
    <div className="space-y-5">
      <Notice>
        Offline payments require a primary review and a different secondary
        approver. Refunds require approval before execution; final settlement is
        confirmed by the payment service.
      </Notice>
      <div className="flex flex-wrap gap-2" aria-label="Finance views">
        {(["ledger", "proofs", "refunds"] as const).map((value) => (
          <Button
            key={value}
            secondary={tab !== value}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {value === "ledger"
              ? "Ledger"
              : value === "proofs"
                ? "Offline proofs"
                : "Refunds"}
          </Button>
        ))}
      </div>
      <QueryView query={query}>
        {(data) => (
          <Card>
            {tab === "ledger" ? (
              <div className="space-y-4">
                <div className="max-w-xs">
                  <Label id="ledger-status">Payment status</Label>
                  <select
                    id="ledger-status"
                    className={inputClass}
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    {[
                      "all",
                      "captured",
                      "due",
                      "overdue",
                      "processing",
                      "refunded",
                    ].map((value) => (
                      <option key={value} value={value}>
                        {stageName(value)}
                      </option>
                    ))}
                  </select>
                </div>
                <DataTable
                  data={data.entries.filter(
                    (entry) => status === "all" || entry.status === status,
                  )}
                  columns={ledgerColumns}
                  label="Financial ledger"
                />
              </div>
            ) : tab === "proofs" ? (
              <DataTable
                data={data.proofs}
                columns={proofColumns}
                label="Offline payment proofs"
              />
            ) : (
              <DataTable
                data={data.refunds}
                columns={refundColumns}
                label="Refund requests"
              />
            )}
          </Card>
        )}
      </QueryView>
    </div>
  );
}
