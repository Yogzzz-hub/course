import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  cmsPackageSchema,
  type CmsPackage,
  type ResourceMap,
} from "./contracts";
import { useAdminAction, useAdminAuthority, useAdminResource } from "./hooks";
import { ActionFeedback } from "./ActionFeedback";
import {
  Button,
  Card,
  Empty,
  inputClass,
  Label,
  Notice,
  QueryView,
} from "./ui";
import { amountInput, dateTime, money, parseMinor } from "./utils";
type Programme = ResourceMap["programmes"]["programmes"][number];
type Version = Programme["versions"][number];
type Draft = Omit<CmsPackage, "totalMinor" | "feeLines"> & {
  feeLines: { label: string; amount: string }[];
};
const draftsFrom = (version: Version, currency: string): Draft[] =>
  version.packages.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    inclusions: item.inclusions.map((line) => ({ ...line })),
    feeLines: item.feeLines.map((line) => ({
      label: line.label,
      amount: amountInput(line.amountMinor, currency),
    })),
  }));
function PricingEditor({
  programme,
  version,
}: {
  programme: Programme;
  version: Version;
}) {
  const { can } = useAdminAuthority();
  const action = useAdminAction();
  const [validation, setValidation] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    draftsFrom(version, programme.currency),
  );
  const [baseRevision, setBaseRevision] = useState(programme.revision);
  const stale = baseRevision !== programme.revision;
  const disabled = action.busy || action.locked || stale;
  function update(index: number, updateDraft: (draft: Draft) => Draft) {
    setDrafts((values) =>
      values.map((value, at) => (at === index ? updateDraft(value) : value)),
    );
  }
  function save() {
    if (stale && !action.locked) return;
    setValidation(null);
    try {
      const packages = drafts.map((draft) => {
        const feeLines = draft.feeLines.map((line) => {
          const parsed = parseMinor(line.amount, programme.currency, true);
          if (parsed === null)
            throw new Error("Use valid monetary amounts without separators.");
          return { label: line.label, amountMinor: parsed };
        });
        const totalMinor = feeLines.reduce(
          (sum, line) => sum + BigInt(line.amountMinor),
          0n,
        );
        if (totalMinor < 0n || totalMinor > BigInt(Number.MAX_SAFE_INTEGER))
          throw new Error(
            "Package totals must be non-negative and within the supported range.",
          );
        const parsed = cmsPackageSchema.safeParse({
          ...draft,
          feeLines,
          totalMinor: Number(totalMinor),
        });
        if (!parsed.success)
          throw new Error(
            "Every package needs a name, description, labelled fee lines and a valid total.",
          );
        return parsed.data;
      });
      void action.run({
        type: "cms.save",
        programmeId: programme.id,
        baseVersionId: version.id,
        expectedRevision: baseRevision,
        packages,
      });
    } catch (failure) {
      setValidation(
        failure instanceof Error
          ? failure.message
          : "Check the package values.",
      );
    }
  }
  if (!can("cms.write"))
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {version.packages.map((item) => (
          <Card key={item.id}>
            <h3 className="font-semibold">{item.name}</h3>
            <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            <dl className="my-4 space-y-2 text-sm">
              {item.feeLines.map((line, index) => (
                <div key={index} className="flex justify-between gap-3">
                  <dt>{line.label}</dt>
                  <dd>{money(line.amountMinor, programme.currency)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t pt-3 font-semibold">
                <dt>Total</dt>
                <dd>{money(item.totalMinor, programme.currency)}</dd>
              </div>
            </dl>
            <ul className="space-y-2 text-sm">
              {item.inclusions.map((line, index) => (
                <li key={index}>
                  {line.included ? "Included" : "Excluded"}: {line.label}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="space-y-5"
    >
      <Notice>
        Saving creates a new draft version. Publishing requires a separate
        permission and queues a website rebuild.
      </Notice>
      {stale && (
        <Notice>
          Programme revision changed while this draft was open. Your entered
          values are preserved. Select the new saved version, or discard these
          values and reload the selected version.
          <div className="mt-3">
            <Button
              type="button"
              secondary
              disabled={action.busy || action.locked}
              onClick={() => {
                setDrafts(draftsFrom(version, programme.currency));
                setBaseRevision(programme.revision);
                setValidation(null);
                action.reset();
              }}
            >
              Discard changes and reload draft
            </Button>
          </div>
        </Notice>
      )}
      {drafts.map((draft, index) => (
        <Card key={draft.id}>
          <fieldset disabled={disabled} className="space-y-4">
            <legend className="mb-3 text-lg font-semibold">
              Package {index + 1}
            </legend>
            <div>
              <Label id={`package-name-${draft.id}`}>Package name</Label>
              <input
                id={`package-name-${draft.id}`}
                className={inputClass}
                required
                maxLength={4000}
                value={draft.name}
                onChange={(event) =>
                  update(index, (value) => ({
                    ...value,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label id={`package-description-${draft.id}`}>
                Package description
              </Label>
              <textarea
                id={`package-description-${draft.id}`}
                className={inputClass}
                required
                maxLength={4000}
                rows={2}
                value={draft.description}
                onChange={(event) =>
                  update(index, (value) => ({
                    ...value,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                Fee breakdown ({programme.currency})
              </h3>
              {draft.feeLines.map((line, lineIndex) => (
                <div
                  key={lineIndex}
                  className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]"
                >
                  <div>
                    <Label id={`fee-label-${draft.id}-${lineIndex}`}>
                      Fee label {lineIndex + 1}
                    </Label>
                    <input
                      id={`fee-label-${draft.id}-${lineIndex}`}
                      required
                      className={inputClass}
                      maxLength={4000}
                      value={line.label}
                      onChange={(event) =>
                        update(index, (value) => ({
                          ...value,
                          feeLines: value.feeLines.map((item, at) =>
                            at === lineIndex
                              ? { ...item, label: event.target.value }
                              : item,
                          ),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label id={`fee-amount-${draft.id}-${lineIndex}`}>
                      Amount {lineIndex + 1}
                    </Label>
                    <input
                      id={`fee-amount-${draft.id}-${lineIndex}`}
                      required
                      inputMode="decimal"
                      className={inputClass}
                      value={line.amount}
                      onChange={(event) =>
                        update(index, (value) => ({
                          ...value,
                          feeLines: value.feeLines.map((item, at) =>
                            at === lineIndex
                              ? { ...item, amount: event.target.value }
                              : item,
                          ),
                        }))
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    secondary
                    className="self-end"
                    disabled={draft.feeLines.length <= 1}
                    aria-label={`Remove fee ${lineIndex + 1} from ${draft.name}`}
                    onClick={() =>
                      update(index, (value) => ({
                        ...value,
                        feeLines: value.feeLines.filter(
                          (_, at) => at !== lineIndex,
                        ),
                      }))
                    }
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
              <Button
                secondary
                type="button"
                onClick={() =>
                  update(index, (value) => ({
                    ...value,
                    feeLines: [...value.feeLines, { label: "", amount: "0" }],
                  }))
                }
              >
                <Plus size={16} />
                Add fee line
              </Button>
              <p className="text-xs text-slate-600">
                Negative lines represent discounts. Taxes and fees must be
                explicitly labelled.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Tier inclusions</h3>
              {draft.inclusions.map((line, lineIndex) => (
                <div key={lineIndex} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`inclusion-${draft.id}-${lineIndex}`}
                    checked={line.included}
                    className="h-4 w-4 shrink-0"
                    onChange={(event) =>
                      update(index, (value) => ({
                        ...value,
                        inclusions: value.inclusions.map((item, at) =>
                          at === lineIndex
                            ? { ...item, included: event.target.checked }
                            : item,
                        ),
                      }))
                    }
                  />
                  <label
                    htmlFor={`inclusion-${draft.id}-${lineIndex}`}
                    className="sr-only"
                  >
                    Include benefit {lineIndex + 1} in {draft.name}
                  </label>
                  <input
                    className={inputClass}
                    aria-label={`Benefit ${lineIndex + 1} in ${draft.name}`}
                    required
                    maxLength={4000}
                    value={line.label}
                    onChange={(event) =>
                      update(index, (value) => ({
                        ...value,
                        inclusions: value.inclusions.map((item, at) =>
                          at === lineIndex
                            ? { ...item, label: event.target.value }
                            : item,
                        ),
                      }))
                    }
                  />
                  <Button
                    type="button"
                    secondary
                    aria-label={`Remove benefit ${lineIndex + 1} from ${draft.name}`}
                    onClick={() =>
                      update(index, (value) => ({
                        ...value,
                        inclusions: value.inclusions.filter(
                          (_, at) => at !== lineIndex,
                        ),
                      }))
                    }
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                secondary
                onClick={() =>
                  update(index, (value) => ({
                    ...value,
                    inclusions: [
                      ...value.inclusions,
                      { label: "", included: true },
                    ],
                  }))
                }
              >
                Add inclusion
              </Button>
            </div>
            <Button
              type="button"
              secondary
              disabled={drafts.length <= 1}
              onClick={() =>
                setDrafts((values) => values.filter((_, at) => at !== index))
              }
            >
              Remove package
            </Button>
          </fieldset>
        </Card>
      ))}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          secondary
          disabled={disabled}
          onClick={() =>
            setDrafts((values) => [
              ...values,
              {
                id: crypto.randomUUID(),
                name: "",
                description: "",
                feeLines: [{ label: "Tuition", amount: "0" }],
                inclusions: [],
              },
            ])
          }
        >
          Add package
        </Button>
        <Button
          type="submit"
          busy={action.busy}
          disabled={stale && !action.locked}
        >
          {action.locked ? "Retry original draft" : "Save new draft version"}
        </Button>
      </div>
      {validation && <Notice error>{validation}</Notice>}
      <ActionFeedback action={action} />
    </form>
  );
}
function ProgrammeEditor({ programme }: { programme: Programme }) {
  const { can } = useAdminAuthority();
  const [selected, setSelected] = useState(
    programme.versions[programme.versions.length - 1].id,
  );
  const action = useAdminAction();
  const version =
    programme.versions.find((item) => item.id === selected) ||
    programme.versions[programme.versions.length - 1];
  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{programme.name}</h2>
            <p className="mt-2 text-sm text-slate-600">
              Revision {programme.revision} · Website build:{" "}
              <strong>{programme.buildStatus}</strong>
            </p>
          </div>
          <div className="w-full sm:w-64">
            <Label id={`cms-version-${programme.id}`}>Version history</Label>
            <select
              id={`cms-version-${programme.id}`}
              className={inputClass}
              disabled={action.busy || action.locked}
              value={version.id}
              onChange={(event) => setSelected(event.target.value)}
            >
              {programme.versions.map((item) => (
                <option value={item.id} key={item.id}>
                  Version {item.number} · {item.status}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Created {dateTime(version.createdAt)}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {can("cms.publish") &&
            can("cms.rebuild") &&
            version.status === "draft" && (
              <Button
                busy={action.busy}
                disabled={
                  programme.buildStatus === "queued" ||
                  programme.buildStatus === "running"
                }
                onClick={() =>
                  void action.run({
                    type: "cms.publish",
                    programmeId: programme.id,
                    versionId: version.id,
                    expectedRevision: programme.revision,
                  })
                }
              >
                {action.locked
                  ? "Retry original publish"
                  : `Publish version ${version.number}`}
              </Button>
            )}
          {can("cms.rebuild") && programme.publishedVersionId && (
            <Button
              secondary
              busy={action.busy}
              disabled={
                programme.buildStatus === "queued" ||
                programme.buildStatus === "running"
              }
              onClick={() =>
                void action.run({
                  type: "cms.rebuild",
                  programmeId: programme.id,
                  expectedRevision: programme.revision,
                })
              }
            >
              {action.locked
                ? "Retry original rebuild"
                : "Rebuild published website"}
            </Button>
          )}
        </div>
        <div className="mt-4">
          <ActionFeedback action={action} />
        </div>
      </Card>
      <PricingEditor
        key={`${programme.id}:${version.id}`}
        programme={programme}
        version={version}
      />
    </div>
  );
}
function Catalogue({ programmes }: ResourceMap["programmes"]) {
  const [selected, setSelected] = useState(programmes[0]?.id || "");
  const programme =
    programmes.find((item) => item.id === selected) || programmes[0];
  return !programme ? (
    <Empty>No programmes are available in the CMS.</Empty>
  ) : (
    <div className="space-y-5">
      <div className="max-w-sm">
        <Label id="cms-programme">Programme</Label>
        <select
          id="cms-programme"
          className={inputClass}
          value={programme.id}
          onChange={(event) => setSelected(event.target.value)}
        >
          {programmes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <ProgrammeEditor key={programme.id} programme={programme} />
    </div>
  );
}
export function Programmes() {
  const query = useAdminResource("programmes");
  return (
    <QueryView query={query}>{(data) => <Catalogue {...data} />}</QueryView>
  );
}
