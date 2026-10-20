import { NextRequest, NextResponse } from "next/server";
import { processPaymentProviderWebhook } from "@/lib/payment-gateway";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const provider = (body.provider || "SANDBOX").toUpperCase() as
      | "SANDBOX"
      | "RAZORPAY"
      | "STRIPE";
    const eventId = body.eventId || body.id || `evt_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const eventType = body.eventType || body.event || "SANDBOX_PAYMENT_SUCCESS";
    const signature = req.headers.get("x-signature") || undefined;

    const result = await processPaymentProviderWebhook({
      provider,
      eventId,
      eventType,
      payload: body,
      signature,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Payment webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process payment webhook" },
      { status: 500 }
    );
  }
}
