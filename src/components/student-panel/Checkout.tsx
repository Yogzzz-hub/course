import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import {
  billingSchema,
  type Billing,
  type CheckoutInput,
  type LearningPlan,
  type PaymentGateway,
  type PaymentOrder,
  type StudentApi,
  type StudentSession,
} from "./contracts";
import { friendlyError, StudentApiError } from "./api";
import {
  useLearningPlan,
  usePaymentOrder,
  usePayments,
  useRequestKey,
  useStudentActions,
} from "./hooks";
import { FeeBreakdown } from "./Prospect";
import {
  Button,
  Card,
  Empty,
  Eyebrow,
  Field,
  fieldProps,
  inputClass,
  Notice,
  QueryView,
  SecureLink,
} from "./ui";
import { dateTime, money } from "./utils";

function CheckoutForm({
  api,
  session,
  plan,
  packageId,
  onOrder,
}: {
  api: StudentApi;
  session: StudentSession;
  plan: LearningPlan;
  packageId?: string;
  onOrder: (order: PaymentOrder) => void;
}) {
  const chosen =
    plan.packages.find((item) => item.id === packageId) ||
    plan.packages.find((item) => item.id === plan.recommendedPackageId)!;
  const [billing, setBilling] = useState<Billing>({
    name: session.name,
    email: session.email,
    address: "",
    city: "",
    postalCode: "",
    country: "IN",
  });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof Billing | "consent", string>>
  >({});
  const [lockedInput, setLockedInput] = useState<CheckoutInput | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const { checkout } = useStudentActions(api, session);
  const requestKey = useRequestKey();
  const expired = Date.parse(plan.expiresAt) <= now;
  const locked = checkout.isPending || !!lockedInput;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = billingSchema.safeParse(billing);
    const nextErrors: typeof errors = {};
    if (!result.success)
      for (const issue of result.error.issues)
        nextErrors[issue.path[0] as keyof Billing] = issue.message;
    if (!consent)
      nextErrors.consent = "Accept the displayed terms to continue.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>('.ss-student [aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    const input: CheckoutInput = lockedInput || {
      planId: plan.id,
      planVersion: plan.version,
      packageId: chosen.id,
      termsVersion: plan.terms.version,
      consent: true,
      expectedAmountMinor: chosen.dueNowMinor,
      currency: plan.currency,
      billing: result.success ? result.data : billing,
    };
    setLockedInput(input);
    try {
      const order = await checkout.mutateAsync({
        input,
        requestId: requestKey.forPayload(JSON.stringify(input)),
      });
      requestKey.reset();
      onOrder(order);
    } catch (error) {
      if (
        error instanceof StudentApiError &&
        error.status >= 400 &&
        error.status < 500
      ) {
        setLockedInput(null);
        requestKey.reset();
      }
    }
  }
  const labels: Record<keyof Billing, string> = {
    name: "Billing name",
    email: "Billing email",
    address: "Billing address",
    city: "City",
    postalCode: "Postal code",
    country: "Country code",
  };
  const autoComplete: Record<keyof Billing, string> = {
    name: "name",
    email: "email",
    address: "street-address",
    city: "address-level2",
    postalCode: "postal-code",
    country: "country",
  };
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_320px]">
      <Card>
        <Eyebrow>Secure checkout</Eyebrow>
        <h2 className="mb-5 text-xl font-semibold">Your billing details</h2>
        <form
          onSubmit={(event) => void submit(event)}
          noValidate
          method="post"
          className="space-y-4"
        >
          <fieldset
            disabled={locked || expired}
            className="grid gap-4 sm:grid-cols-2"
          >
            <legend className="sr-only">Billing information</legend>
            {(Object.keys(labels) as (keyof Billing)[]).map((name) => (
              <Field
                key={name}
                name={name}
                label={labels[name]}
                error={errors[name]}
              >
                <input
                  {...fieldProps(name, errors[name])}
                  className={inputClass}
                  value={billing[name]}
                  type={name === "email" ? "email" : "text"}
                  autoComplete={autoComplete[name]}
                  maxLength={
                    name === "address" ? 400 : name === "country" ? 2 : 120
                  }
                  onChange={(event) =>
                    setBilling({
                      ...billing,
                      [name]:
                        name === "country"
                          ? event.target.value.toUpperCase()
                          : event.target.value,
                    })
                  }
                />
              </Field>
            ))}
          </fieldset>
          <div className="rounded-xl bg-slate-50 p-4">
            <SecureLink href={plan.terms.url}>
              Read enrolment terms · {plan.terms.version}
            </SecureLink>
            <label className="mt-3 flex items-start gap-3 text-sm leading-6">
              <input
                {...fieldProps("consent", errors.consent)}
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-indigo-700"
                checked={consent}
                disabled={locked || expired}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span>
                I agree to the enrolment terms, version {plan.terms.version},
                and the displayed fees.
              </span>
            </label>
            {errors.consent && (
              <p
                id="student-consent-error"
                className="mt-2 text-sm text-red-700"
              >
                {errors.consent}
              </p>
            )}
          </div>
          {expired && (
            <Notice error>
              This learning plan has expired. Ask your counsellor for an updated
              plan before paying.
            </Notice>
          )}
          {checkout.isError && (
            <Notice error>
              {friendlyError(checkout.error)}
              {lockedInput &&
                " The result is uncertain. Retry with the same billing details to recover your order."}
            </Notice>
          )}
          <Button
            type="submit"
            busy={checkout.isPending}
            disabled={expired && !lockedInput}
          >
            {lockedInput && checkout.isError
              ? "Retry order safely"
              : `Create order · ${money(chosen.dueNowMinor, plan.currency)}`}
          </Button>
          <p className="flex gap-2 text-xs leading-5 text-slate-500">
            <LockKeyhole size={15} className="shrink-0" aria-hidden="true" />
            You’ll continue to the payment provider after your order is created.
            Card details are entered there.
          </p>
        </form>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Order summary</h2>
        <p className="mb-1 mt-3 text-sm text-slate-600">{plan.programme}</p>
        <p className="mb-5 font-semibold">{chosen.name}</p>
        <FeeBreakdown plan={plan} packageId={chosen.id} />
      </Card>
    </div>
  );
}
function PaymentStatus({
  api,
  session,
  gateway,
  orderId,
  onDismiss,
}: {
  api: StudentApi;
  session: StudentSession;
  gateway: PaymentGateway;
  orderId: string;
  onDismiss?: () => void;
}) {
  const query = usePaymentOrder(api, session, orderId);
  const [gatewayError, setGatewayError] = useState(false);
  const [opening, setOpening] = useState(false);
  return (
    <QueryView query={query}>
      {(order) => (
        <Card>
          <Eyebrow>Payment status</Eyebrow>
          <h2 className="text-xl font-semibold">
            {order.status === "verified"
              ? "Payment verified"
              : order.status === "pending"
                ? "Awaiting payment confirmation"
                : order.status === "failed"
                  ? "Payment was unsuccessful"
                  : "Payment cancelled"}
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Order {order.id} · {money(order.amountMinor, order.currency)}
          </p>
          <p className="my-4 text-sm leading-7 text-slate-600">
            {order.status === "verified"
              ? session.mode === "prospect"
                ? "Your payment is verified. Your enrolled workspace will open as soon as enrolment is ready."
                : "Your payment is verified and your balance will update automatically."
              : order.status === "pending"
                ? "We check the provider’s verified result automatically. Returning from checkout alone does not confirm payment."
                : "You have not been enrolled for this order. Review your payment history before creating another order."}
          </p>
          {gatewayError && (
            <Notice error>
              The payment link could not open. Check that your payment provider
              is configured, or contact support.
            </Notice>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {order.status === "pending" &&
              order.checkoutUrl &&
              Date.parse(order.expiresAt) > Date.now() && (
                <Button
                  busy={opening}
                  onClick={async () => {
                    setGatewayError(false);
                    setOpening(true);
                    try {
                      await gateway.open(order);
                    } catch {
                      setGatewayError(true);
                    } finally {
                      setOpening(false);
                    }
                  }}
                >
                  Continue to payment provider
                </Button>
              )}
            {order.status === "pending" &&
              Date.parse(order.expiresAt) <= Date.now() && (
                <Notice>
                  The payment link has expired. We’re still checking whether a
                  payment was received; contact support for a new link.
                </Notice>
              )}
            <Button secondary onClick={() => void query.refetch()}>
              Check payment status
            </Button>
            {order.receiptUrl && (
              <SecureLink href={order.receiptUrl}>View receipt</SecureLink>
            )}
            {(session.mode === "enrolled"
              ? order.status !== "pending"
              : ["failed", "cancelled"].includes(order.status)) &&
              onDismiss && (
                <Button secondary onClick={onDismiss}>
                  Back to payments
                </Button>
              )}
          </div>
        </Card>
      )}
    </QueryView>
  );
}
function Instalments({
  api,
  session,
  onOrder,
}: {
  api: StudentApi;
  session: StudentSession;
  onOrder: (orderId: string) => void;
}) {
  const query = usePayments(api, session);
  const { payInstalment } = useStudentActions(api, session);
  const requestKey = useRequestKey();
  const [uncertainId, setUncertainId] = useState<string | null>(null);
  return (
    <QueryView query={query}>
      {(data) =>
        data.instalments.length ? (
          <div className="space-y-4">
            {payInstalment.isError && (
              <Notice error>{friendlyError(payInstalment.error)}</Notice>
            )}
            {data.instalments.map((item) => (
              <Card key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">{item.label}</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      Due {dateTime(item.dueAt)}
                    </p>
                    <p className="mt-2 text-xl font-bold">
                      {money(item.amountMinor, data.currency)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${item.status === "paid" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}
                  >
                    {item.status}
                  </span>
                </div>
                {item.pendingOrderId && (
                  <Button
                    secondary
                    className="mt-4"
                    onClick={() => onOrder(item.pendingOrderId!)}
                  >
                    View payment status
                  </Button>
                )}
                {item.status === "due" &&
                  !item.pendingOrderId &&
                  session.mode === "enrolled" && (
                    <Button
                      className="mt-4"
                      busy={
                        payInstalment.isPending &&
                        (!uncertainId || uncertainId === item.id)
                      }
                      disabled={
                        payInstalment.isPending ||
                        (!!uncertainId && uncertainId !== item.id)
                      }
                      onClick={async () => {
                        setUncertainId(item.id);
                        try {
                          const order = await payInstalment.mutateAsync({
                            id: item.id,
                            requestId: requestKey.forPayload(item.id),
                          });
                          requestKey.reset();
                          setUncertainId(null);
                          onOrder(order.id);
                        } catch (error) {
                          if (
                            error instanceof StudentApiError &&
                            error.status >= 400 &&
                            error.status < 500
                          ) {
                            setUncertainId(null);
                            requestKey.reset();
                          }
                        }
                      }}
                    >
                      {uncertainId === item.id && payInstalment.isError
                        ? "Retry instalment order safely"
                        : "Pay instalment"}
                    </Button>
                  )}
                {item.receiptUrl && (
                  <SecureLink href={item.receiptUrl}>
                    Download receipt
                  </SecureLink>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Empty title="No payments to show">
            Your instalment schedule and receipts will appear here after your
            order is confirmed.
          </Empty>
        )
      }
    </QueryView>
  );
}
export function PaymentsView({
  api,
  session,
  gateway,
  packageId,
}: {
  api: StudentApi;
  session: StudentSession;
  gateway: PaymentGateway;
  packageId?: string;
}) {
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [acceptedAlternativeFor, setAcceptedAlternativeFor] = useState<string | null>(null);
  const pendingId = session.mode === "prospect" ? session.pendingOrderId : null;
  const orderId = createdOrderId || pendingId;
  const plan = useLearningPlan(api, session);
  if (orderId)
    return (
      <PaymentStatus
        api={api}
        session={session}
        gateway={gateway}
        orderId={orderId}
        onDismiss={() => setCreatedOrderId(null)}
      />
    );
  if (session.mode === "enrolled")
    return (
      <Instalments api={api} session={session} onOrder={setCreatedOrderId} />
    );
  return (
    <QueryView query={plan}>
      {(data) =>
        data ? packageId && !data.packages.some(tier => tier.id === packageId) && acceptedAlternativeFor !== packageId ? (
          <Card>
            <h2 className="text-xl font-semibold">The selected package is unavailable</h2>
            <p className="my-4 text-sm leading-7 text-slate-600">The package you selected is not included in your current learning plan. Review the academy recommendation before continuing; no order has been created.</p>
            <Button onClick={() => setAcceptedAlternativeFor(packageId)}>Review recommended package</Button>
          </Card>
        ) : (
          <CheckoutForm
            key={`${data.id}-${data.version}-${packageId || data.recommendedPackageId}`}
            api={api}
            session={session}
            plan={data}
            packageId={packageId}
            onOrder={(order) => setCreatedOrderId(order.id)}
          />
        ) : (
          <Empty title="No order ready yet">
            Your personalised learning plan must be shared before checkout
            becomes available.
          </Empty>
        )
      }
    </QueryView>
  );
}
