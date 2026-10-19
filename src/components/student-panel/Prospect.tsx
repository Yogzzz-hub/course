import { ArrowRight, Check, Minus, Sparkles } from "lucide-react";
import { useState } from "react";
import type { LearningPlan, StudentApi, StudentSession } from "./contracts";
import { useLearningPlan, useSessions } from "./hooks";
import { Button, Card, Empty, Eyebrow, QueryView, SecureLink } from "./ui";
import { dateTime, money, nextStep, type PanelTab } from "./utils";
import { ConsultationCard } from "./ConsultationEnquiryModal";

export function NextStepCard({
  session,
  navigate,
}: {
  session: Extract<StudentSession, { mode: "prospect" }>;
  navigate: (tab: PanelTab) => void;
}) {
  const step = nextStep(session.leadStatus);
  return (
    <section className="relative overflow-hidden rounded-2xl bg-indigo-950 p-6 text-white sm:p-8">
      <div
        className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full border-32 border-indigo-800/40"
        aria-hidden="true"
      />
      <Eyebrow>
        <span className="text-indigo-200">Your next step</span>
      </Eyebrow>
      <h2 className="relative text-2xl font-semibold">{step.title}</h2>
      <p className="relative mt-3 max-w-xl text-sm leading-7 text-indigo-100">
        {step.description}
      </p>
      {"href" in step ? (
        <a
          href={step.href}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-indigo-950"
        >
          {step.action}
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      ) : (
        <Button
          secondary
          className="relative mt-6"
          onClick={() => navigate(step.tab)}
        >
          {step.action}
          <ArrowRight size={16} aria-hidden="true" />
        </Button>
      )}
    </section>
  );
}
export function ProspectHome({
  session,
  navigate,
}: {
  session: Extract<StudentSession, { mode: "prospect" }>;
  navigate: (tab: PanelTab) => void;
}) {
  return (
    <div className="space-y-6">
      <NextStepCard session={session} navigate={navigate} />
      <ConsultationCard session={session} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <Sparkles
            size={22}
            className="mb-4 text-indigo-700"
            aria-hidden="true"
          />
          <h2 className="text-lg font-semibold">A plan built around you</h2>
          <p className="my-3 text-sm leading-relaxed text-slate-600">
            Keep your counsellor’s recommendation, package inclusions and exact
            fee breakdown together in one place.
          </p>
          <Button secondary onClick={() => navigate("work")}>
            My learning plan
          </Button>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">
            Clear steps. Room to decide.
          </h2>
          <ol className="mt-4 space-y-3 text-sm text-slate-600">
            <li>01 · Talk through your goals</li>
            <li>02 · Review your personalised plan</li>
            <li>03 · Choose a package and enrol</li>
          </ol>
          <p className="mt-5 text-xs leading-relaxed text-slate-500">
            Your workspace updates as your counsellor confirms each step.
          </p>
        </Card>
      </div>
    </div>
  );
}
export function FeeBreakdown({
  plan,
  packageId,
}: {
  plan: LearningPlan;
  packageId: string;
}) {
  const selected = plan.packages.find((item) => item.id === packageId)!;
  return (
    <dl className="space-y-3 text-sm">
      {selected.feeLines.map((line, index) => (
        <div
          className="flex justify-between gap-4"
          key={`${line.label}-${index}`}
        >
          <dt className="text-slate-600">{line.label}</dt>
          <dd className="shrink-0 font-medium">
            {money(line.amountMinor, plan.currency)}
          </dd>
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 font-semibold">
        <dt>Total programme fee</dt>
        <dd>{money(selected.totalMinor, plan.currency)}</dd>
      </div>
      <div className="flex justify-between gap-4 font-semibold text-indigo-700">
        <dt>Due at checkout</dt>
        <dd>{money(selected.dueNowMinor, plan.currency)}</dd>
      </div>
      {selected.dueNowMinor < selected.totalMinor && (
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600">Remaining balance</dt>
          <dd>
            {money(selected.totalMinor - selected.dueNowMinor, plan.currency)}
          </dd>
        </div>
      )}
    </dl>
  );
}
function PlanDetails({
  plan,
  onCheckout,
}: {
  plan: LearningPlan;
  onCheckout: (packageId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(plan.recommendedPackageId);
  const selected =
    plan.packages.find((item) => item.id === selectedId) || plan.packages[0];
  return (
    <div className="space-y-5">
      <Card>
        <Eyebrow>Counsellor recommendation</Eyebrow>
        <h2 className="text-xl font-semibold">{plan.programme}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">{plan.summary}</p>
        <p className="mt-4 text-xs font-semibold text-slate-500">
          Prepared by {plan.counsellor} · Plan {plan.version}
        </p>
      </Card>
      <fieldset>
        <legend className="mb-3 text-lg font-semibold">
          Compare your packages
        </legend>
        <div className="grid gap-4 xl:grid-cols-3">
          {plan.packages.map((item) => (
            <label
              key={item.id}
              className={`cursor-pointer rounded-2xl border-2 bg-white p-5 ${selected.id === item.id ? "border-indigo-600" : "border-slate-200"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold">{item.name}</span>
                <input
                  type="radio"
                  name="student-package"
                  value={item.id}
                  checked={selected.id === item.id}
                  onChange={() => setSelectedId(item.id)}
                  className="mt-1 size-4 accent-indigo-700"
                />
              </div>
              {item.id === plan.recommendedPackageId && (
                <span className="mt-2 inline-block rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800">
                  Recommended for you
                </span>
              )}
              <p className="my-3 text-sm leading-relaxed text-slate-600">
                {item.description}
              </p>
              <p className="text-xl font-bold">
                {money(item.totalMinor, plan.currency)}
              </p>
              <ul className="mt-4 space-y-2">
                {item.inclusions.map((feature) => (
                  <li
                    key={feature.label}
                    className="flex gap-2 text-xs leading-5 text-slate-600"
                  >
                    {feature.included ? (
                      <Check
                        className="mt-0.5 shrink-0 text-indigo-700"
                        size={15}
                        aria-label="Included"
                      />
                    ) : (
                      <Minus
                        className="mt-0.5 shrink-0"
                        size={15}
                        aria-label="Not included"
                      />
                    )}
                    <span>
                      {feature.label}
                      {!feature.included && " (not included)"}
                    </span>
                  </li>
                ))}
              </ul>
            </label>
          ))}
        </div>
      </fieldset>
      <Card>
        <h2 className="mb-5 text-lg font-semibold">
          {selected.name} · Fee breakdown
        </h2>
        <FeeBreakdown plan={plan} packageId={selected.id} />
        <div className="mt-5 border-t border-slate-200 pt-4">
          <SecureLink href={plan.terms.url}>
            Review terms · {plan.terms.version}
          </SecureLink>
          <p className="mb-4 text-xs text-slate-500">
            Plan valid until {dateTime(plan.expiresAt)}. Your final order is
            confirmed by the server.
          </p>
          <Button onClick={() => onCheckout(selected.id)}>
            Continue to checkout
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
export function LearningPlanView({
  api,
  session,
  onCheckout,
}: {
  api: StudentApi;
  session: StudentSession;
  onCheckout: (packageId: string) => void;
}) {
  const query = useLearningPlan(api, session);
  return (
    <QueryView query={query}>
      {(plan) =>
        plan ? (
          <PlanDetails
            key={`${plan.id}-${plan.version}`}
            plan={plan}
            onCheckout={onCheckout}
          />
        ) : (
          <Empty title="Your learning plan is on its way">
            Once your counsellor shares a recommendation, you’ll see the
            programme, package options and exact fees here.
          </Empty>
        )
      }
    </QueryView>
  );
}
export function CounsellingSessions({
  api,
  session,
}: {
  api: StudentApi;
  session: StudentSession;
}) {
  const query = useSessions(api, session);
  return (
    <div className="space-y-5">
      <ConsultationCard session={session} />
      <QueryView query={query}>
      {(sessions) =>
        sessions.length ? (
          <div className="space-y-4">
            {sessions.map((item) => (
              <Card key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{item.title}</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {dateTime(item.startsAt)}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize">
                    {item.status}
                  </span>
                </div>
                {item.status === "booked" && item.joinUrl && (
                  <SecureLink href={item.joinUrl}>
                    Join counselling session
                  </SecureLink>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Empty title="No counselling sessions yet">
            Choose a time to talk about your goals.{" "}
            <SecureLink href="/book-session">
              Book a counselling call
            </SecureLink>
          </Empty>
        )
      }
    </QueryView>
    </div>
  );
}
