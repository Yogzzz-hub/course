import { NextRequest, NextResponse } from "next/server";
import { generatePasswordResetOtp } from "@/lib/auth";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const ForgotPasswordSchema = z.object({
  identifier: z.string().min(3, "Identifier must be at least 3 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`forgot-pw:${ip}`, 5, 2 * 60 * 1000);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many password reset requests. Please wait a few moments before retrying." },
        { status: 429, headers: { "Retry-After": "120" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = ForgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please enter your registered institutional email or ID." },
        { status: 400 }
      );
    }

    const result = await generatePasswordResetOtp(parsed.data.identifier);

    return NextResponse.json({
      success: true,
      message: result.message,
      maskedEmail: result.maskedEmail,
      devOtp: result.devOtp,
    });
  } catch (error) {
    console.error("Forgot Password OTP request error:", error);
    return NextResponse.json(
      { error: "Failed to dispatch password reset code. Please try again." },
      { status: 500 }
    );
  }
}
