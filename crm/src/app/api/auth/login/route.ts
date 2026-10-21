import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, primeUserActiveCache } from "@/lib/auth";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`login:${ip}`, 10, 60 * 1000);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait before retrying." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email or password format." },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        studentProfile: true,
        trainerProfile: true,
        managerProfile: true,
        financierProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "This account has been deactivated. Please contact the administrator." },
        { status: 403 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    let profileId: string | undefined;
    let registrationNumber: string | undefined;

    if (user.role === "STUDENT" && user.studentProfile) {
      profileId = user.studentProfile.id;
      registrationNumber = user.studentProfile.registrationNumber;
    } else if (user.role === "TRAINER" && user.trainerProfile) {
      profileId = user.trainerProfile.id;
    } else if (user.role === "MANAGER" && user.managerProfile) {
      profileId = user.managerProfile.id;
    } else if (user.role === "FINANCIER" && user.financierProfile) {
      profileId = user.financierProfile.id;
    }

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profileId,
      registrationNumber,
    });

    primeUserActiveCache(user.id);

    logAuditEvent({
      userId: user.id,
      action: "USER_LOGIN_PASSWORD",
      entityType: "User",
      entityId: user.id,
      details: { role: user.role },
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
