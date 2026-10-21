import { NextRequest, NextResponse } from "next/server";
import { resetPasswordWithOtp } from "@/lib/auth";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const ResetPasswordSchema = z.object({
  identifier: z.string().min(3, "Identifier is required"),
  code: z.string().length(6, "Verification code must be 6 digits"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`reset-pw:${ip}`, 10, 5 * 60 * 1000);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many password reset attempts. Please wait a few moments before retrying." },
        { status: 429, headers: { "Retry-After": "180" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = ResetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      const err = parsed.error.errors[0]?.message || "Invalid submission parameters";
      return NextResponse.json({ error: err }, { status: 400 });
    }

    const { identifier, code, newPassword } = parsed.data;
    const result = await resetPasswordWithOtp(identifier, code, newPassword);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Password reset failed." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message || "Password successfully reset.",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during password reset." },
      { status: 500 }
    );
  }
}
