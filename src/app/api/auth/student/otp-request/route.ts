import { NextRequest, NextResponse } from "next/server";
import { generateStudentOtp } from "@/lib/auth";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const OtpRequestSchema = z.object({
  identifier: z.string().min(3, "Identifier must be at least 3 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`otp:${ip}`, 5, 2 * 60 * 1000);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please wait a few moments before requesting a new code." },
        { status: 429, headers: { "Retry-After": "120" } }
      );
    }

    const body = await req.json();
    const parsed = OtpRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please provide your registered student email address or student ID." },
        { status: 400 }
      );
    }

    const result = await generateStudentOtp(parsed.data.identifier);

    return NextResponse.json({
      success: true,
      message: result.message,
      devOtp: result.devOtp, // Returned only when DEV_OTP_TEST_MODE is enabled
    });
  } catch (error) {
    console.error("Student OTP Request error:", error);
    return NextResponse.json(
      { error: "Failed to dispatch OTP. Please try again." },
      { status: 500 }
    );
  }
}
