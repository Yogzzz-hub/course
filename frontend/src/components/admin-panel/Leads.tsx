import { useState } from "react";
import { Clock3, GripVertical } from "lucide-react";
import type { Lead, LeadStage, ResourceMap } from "./contracts";
import { stageSchema } from "./contracts";
import { useAdminAction, useAdminAuthority, useAdminResource } from "./hooks";
import { ActionFeedback } from "./ActionFeedback";
import { Button, Card, Empty, inputClass, Label, QueryView } from "./ui";
import { dateTime, slaLabel } from "./utils";
export const stageName = (stage: string) =>
  stage.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());
function Timeline({ lead }: { lead: Lead }) {
  const query = useAdminResource("timeline", { id: lead.id });
  return (
    <Card>
      <h2 className="text-lg font-semibold">Timeline for {lead.name}</h2>
      <QueryView query={query}>
        {(data) =>
          !data.events.length ? (
            <Empty>No events recorded for this lead.</Empty>
          ) : (
            <ol className="mt-4 space-y-4">
              {data.events.map((event) => (
                <li
                  key={event.id}
                  className="border-l-2 border-indigo-200 pl-4"
                >
                  <p className="text-sm font-semibold">
                    {event.action} · {event.actor}
                  </p>
                  <p className="mt-1 text-sm">{event.summary}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {dateTime(event.at)} · {event.requestId}
                  </p>
                </li>
              ))}
            </ol>
          )
        }
      </QueryView>
    </Card>
  );
}
function LeadCard({
  lead,
  owners,
  clock,
  onTimeline,
}: {
  lead: Lead;
  owners: ResourceMap["leads"]["owners"];
  clock: number;
  onTimeline: () => void;
}) {
  const { can } = useAdminAuthority();
  const action = useAdminAction();
  const [stage, setStage] = useState<LeadStage | "">("");
  return (
    <article
      draggable={can("leads.write")}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", lead.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{lead.name}</h3>
        {can("leads.write") && (
          <GripVertical
            aria-hidden="true"
            size={16}
            className="shrink-0 text-slate-400"
          />
        )}
      </div>
      <p className="break-all text-xs text-slate-600">{lead.email}</p>
      <p className="text-sm">{lead.programme}</p>
      <p className="text-xs text-slate-500">
        Owner:{" "}
        {owners.find((owner) => owner.id === lead.ownerId)?.name ||
          "Unassigned"}
      </p>
      <p
        className={`flex items-center gap-1 text-xs ${lead.nextActionAt && Date.parse(lead.nextActionAt) < clock ? "text-red-700" : "text-slate-600"}`}
      >
        <Clock3 size={14} aria-hidden="true" />
        {slaLabel(lead.nextActionAt, clock)}
      </p>
      {can("leads.write") && lead.allowedTransitions.length > 0 && (
        <div className="space-y-2">
          <Label id={`stage-${lead.id}`}>Move {lead.name}</Label>
          <select
            id={`stage-${lead.id}`}
            value={stage}
            disabled={action.busy || action.locked}
            className={inputClass}
            onChange={(event) =>
              setStage(stageSchema.parse(event.target.value))
            }
          >
            <option value="" disabled>
              Choose stage
            </option>
            {lead.allowedTransitions.map((value) => (
              <option value={value} key={value}>
                {stageName(value)}
              </option>
            ))}
          </select>
          <Button
            secondary
            className="w-full"
            busy={action.busy}
            disabled={!stage}
            onClick={() =>
              stage &&
              void action.run({
                type: "lead.move",
                leadId: lead.id,
                stage,
                expectedVersion: lead.version,
              })
            }
          >
            {action.locked ? "Retry original move" : "Update stage"}
          </Button>
          <ActionFeedback action={action} />
        </div>
      )}
      {can("audit.read") && (
        <button
          type="button"
          onClick={onTimeline}
          className="min-h-11 text-sm font-semibold text-indigo-700 underline"
        >
          View timeline
        </button>
      )}
    </article>
  );
}
function Board({
  data,
  receivedAt,
}: {
  data: ResourceMap["leads"];
  receivedAt: number;
}) {
  const { can, now } = useAdminAuthority();
  const [owner, setOwner] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const action = useAdminAction();
  // The server timestamp is anchored to the query's receipt time, independent of the browser clock.
  const clock = Date.parse(data.serverNow) + Math.max(0, now - receivedAt);
  const filtered = data.leads.filter(
    (lead) =>
      owner === "all" ||
      (owner === "unassigned" ? lead.ownerId === null : lead.ownerId === owner),
  );
  const lead = data.leads.find((item) => item.id === selected);
  return (
    <div className="space-y-5">
      <div className="max-w-xs">
        <Label id="lead-owner">Filter by owner</Label>
        <select
          id="lead-owner"
          className={inputClass}
          value={owner}
          onChange={(event) => setOwner(event.target.value)}
        >
          <option value="all">All owners</option>
          <option value="unassigned">Unassigned</option>
          {data.owners.map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <ActionFeedback action={action} />
      {!filtered.length && <Empty>No leads match this owner.</Empty>}
      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max gap-4">
          {stageSchema.options.map((stage) => {
            const rows = filtered.filter((item) => item.stage === stage);
            return (
              <section
                key={stage}
                aria-label={`${stageName(stage)} leads`}
                className="w-64 rounded-2xl bg-slate-100 p-3"
                onDragOver={(event) => {
                  if (can("leads.write")) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!can("leads.write") || action.busy || action.locked)
                    return;
                  const item = data.leads.find(
                    (value) =>
                      value.id === event.dataTransfer.getData("text/plain"),
                  );
                  if (item?.allowedTransitions.includes(stage))
                    void action.run({
                      type: "lead.move",
                      leadId: item.id,
                      stage,
                      expectedVersion: item.version,
                    });
                }}
              >
                <h2 className="mb-3 flex items-center justify-between text-sm font-semibold">
                  {stageName(stage)}
                  <span className="rounded-full bg-white px-2 py-1 text-xs">
                    {rows.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {rows.map((item) => (
                    <LeadCard
                      key={item.id}
                      lead={item}
                      owners={data.owners}
                      clock={clock}
                      onTimeline={() => setSelected(item.id)}
                    />
                  ))}
                  {!rows.length && (
                    <p className="p-3 text-xs text-slate-500">
                      No leads in this stage.
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
      {can("audit.read") && lead && (
        <div className="space-y-3">
          <Button secondary onClick={() => setSelected(null)}>
            Close timeline
          </Button>
          <Timeline key={lead.id} lead={lead} />
        </div>
      )}
    </div>
  );
}
export function Leads() {
  const query = useAdminResource("leads");
  return (
    <QueryView query={query}>
      {(data) => <Board data={data} receivedAt={query.dataUpdatedAt} />}
    </QueryView>
  );
}
