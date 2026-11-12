import { useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  FileCheck,
  Percent,
  Receipt,
  User,
  X,
} from "lucide-react";
import type { OfflineProof } from "./contracts";
import { useAdminAction, useAdminAuthority, useAdminResource } from "./hooks";
import { ActionFeedback } from "./ActionFeedback";
import { Button, Card, Empty, ScreenTitle, StatusPill } from "./ui";
import { money } from "./utils";

type OfferItem = import("./contracts").ResourceMap["offers"]["offers"][number];

export function ApprovalsSection() {
  const { can } = useAdminAuthority();
  const offersQuery = useAdminResource("offers", {});
  const financeQuery = useAdminResource("finance", {});
  const action = useAdminAction();

  const [activeTab, setActiveTab] = useState<"offers" | "proofs">("offers");

  const allOffers = offersQuery.data?.offers || [];
  const pendingOffers = allOffers.filter((o) => o.status === "pending");

  const allProofs = financeQuery.data?.proofs || [];
  const pendingProofs = allProofs.filter((p) => p.status === "pending_review");

  return (
    <div className="space-y-6">
      <ScreenTitle
        eyebrow="Compliance & Governance"
        title="Offers & Approvals"
      />

      <ActionFeedback action={action} />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#DFE5EC] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("offers")}
          className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "offers"
              ? "bg-[#681C35] text-white shadow-sm"
              : "border border-[#DFE5EC] bg-white text-[#241921] hover:bg-[#F3F7FA]"
          }`}
        >
          <Percent size={16} />
          Discount Offers
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              activeTab === "offers"
                ? "bg-white/20 text-white"
                : "bg-[#F3F7FA] text-[#645A62]"
            }`}
          >
            {pendingOffers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("proofs")}
          className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "proofs"
              ? "bg-[#681C35] text-white shadow-sm"
              : "border border-[#DFE5EC] bg-white text-[#241921] hover:bg-[#F3F7FA]"
          }`}
        >
          <Receipt size={16} />
          Bank Proofs
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              activeTab === "proofs"
                ? "bg-white/20 text-white"
                : "bg-[#F3F7FA] text-[#645A62]"
            }`}
          >
            {pendingProofs.length}
          </span>
        </button>
      </div>

      {/* Offers Tab Content */}
      {activeTab === "offers" && (
        <div className="space-y-4">
          {pendingOffers.length === 0 ? (
            <Empty
              title="No pending discount offers"
              children="All fee discount and scholarship requests have been processed."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingOffers.map((offer: OfferItem) => (
                <Card key={offer.id} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-[#681C35] uppercase">
                          Scholarship / Discount Request
                        </span>
                        <StatusPill status="Pending Review" variant="pending" />
                      </div>
                      <h3 className="text-lg font-bold text-[#241921]">
                        {offer.leadName}
                      </h3>
                      <p className="text-sm text-[#645A62]">
                        {offer.packageName} · Counsellor: {offer.counsellor}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-xs text-[#645A62]">Requested Final Fee</div>
                      <div className="text-xl font-bold text-[#241921]">
                        {money(offer.finalMinor, offer.currency)}
                      </div>
                      <div className="text-xs text-[#9E6000] font-semibold">
                        Discount: -{money(offer.discountMinor, offer.currency)} (
                        {money(offer.originalMinor, offer.currency)} standard)
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#DFE5EC] bg-[#F7F9FB] p-3.5 text-xs text-[#241921]">
                    <span className="font-bold text-[#645A62] block mb-1">
                      Justification:
                    </span>
                    {offer.reason}
                  </div>

                  {can("offers.decide") && (
                    <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-[#DFE5EC]">
                      <Button
                        secondary
                        busy={action.busy}
                        onClick={() =>
                          action.run({
                            type: "offer.decide",
                            offerId: offer.id,
                            decision: "rejected",
                            reason:
                              "Discount threshold exceeds approved tier guidelines for this cycle.",
                            expectedVersion: offer.version,
                          })
                        }
                      >
                        <X size={16} /> Reject Discount
                      </Button>
                      <Button
                        busy={action.busy}
                        onClick={() =>
                          action.run({
                            type: "offer.decide",
                            offerId: offer.id,
                            decision: "approved",
                            reason:
                              "Approved under institutional scholarship quota and alumni eligibility.",
                            expectedVersion: offer.version,
                          })
                        }
                      >
                        <Check size={16} /> Approve Discount
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Proofs Tab Content */}
      {activeTab === "proofs" && (
        <div className="space-y-4">
          {pendingProofs.length === 0 ? (
            <Empty
              title="No pending payment proofs"
              children="All bank transfer slips and NEFT/RTGS verifications are up to date."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingProofs.map((proof) => (
                <Card key={proof.id} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-[#681C35] uppercase">
                          Bank Transfer Proof
                        </span>
                        <StatusPill status="Verification Needed" variant="pending" />
                      </div>
                      <h3 className="text-lg font-bold text-[#241921]">
                        {proof.student}
                      </h3>
                      <p className="text-sm text-[#645A62]">
                        Ref: {proof.reference} · Submitted by {proof.submittedBy}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-xs text-[#645A62]">Transfer Amount</div>
                      <div className="text-xl font-bold text-[#241921]">
                        {money(proof.amountMinor, proof.currency)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#DFE5EC]">
                    <a
                      href={proof.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-[#681C35] hover:underline"
                    >
                      <FileCheck size={16} /> View Bank Slip Attachment
                    </a>

                    {can("proofs.review") && (
                      <div className="flex items-center gap-2">
                        <Button
                          secondary
                          busy={action.busy}
                          onClick={() =>
                            action.run({
                              type: "proof.review",
                              proofId: proof.id,
                              phase: "first",
                              decision: "rejected",
                              reason:
                                "Transfer reference not found on operating account statement.",
                              expectedVersion: proof.version,
                            })
                          }
                        >
                          <X size={16} /> Reject Slip
                        </Button>
                        <Button
                          busy={action.busy}
                          onClick={() =>
                            action.run({
                              type: "proof.review",
                              proofId: proof.id,
                              phase: "first",
                              decision: "approved",
                              reason:
                                "Transaction verified against ICICI operating bank statement credit.",
                              expectedVersion: proof.version,
                            })
                          }
                        >
                          <Check size={16} /> Verify Transfer
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
