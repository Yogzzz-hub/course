import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createStudentPanelCheckoutOrder,
  handleStudentPanelError,
  requireStudentSession,
} from "@/lib/student-panel";

export const dynamic = "force-dynamic";

const CheckoutBodySchema = z.object({
  planId: z.string().trim().min(1),
  expectedAmountMinor: z.number().int().positive(),
  currency: z.string().trim().regex(/^[A-Z]{3}$/),
});

export async function POST(request: NextRequest) {
  try {
    const { session, studentProfileId } = await requireStudentSession();
    const raw = await request.json().catch(() => ({}));
    const parsed = CheckoutBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid checkout payload" },
        { status: 422 }
      );
    }

    const order = await createStudentPanelCheckoutOrder(
      studentProfileId,
      session.userId,
      parsed.data
    );
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return handleStudentPanelError(error, "Failed to initiate checkout");
  }
}
