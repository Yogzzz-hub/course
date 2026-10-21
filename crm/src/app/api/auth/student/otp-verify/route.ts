import { NextRequest, NextResponse } from "next/server";
import { verifyStudentOtp, setSessionCookie, primeUserActiveCache } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const OtpVerifySchema = z.object({
  identifier: z.string().min(1, "Identifier is required"),
  code: z.string().length(6, "Verification code must be exactly 6 digits"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = OtpVerifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid verification code format." },
        { status: 400 }
      );
    }

    const { identifier, code } = parsed.data;
    const result = await verifyStudentOtp(identifier, code);

    if (!result.success || !result.user) {
      return NextResponse.json(
        { error: result.error || "Verification failed." },
        { status: 401 }
      );
    }

    await setSessionCookie(result.user);
    primeUserActiveCache(result.user.userId);

    logAuditEvent({
      userId: result.user.userId,
      action: "STUDENT_LOGIN_OTP",
      entityType: "User",
      entityId: result.user.userId,
      details: { registrationNumber: result.user.registrationNumber },
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    console.error("Student OTP verify error:", error);
    return NextResponse.json(
      { error: "Verification process encountered an internal error." },
      { status: 500 }
    );
  }
}
