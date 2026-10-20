import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-academy-secret-key-32-chars-long!!"
);

export const SESSION_COOKIE_NAME = "academy_session";

export interface SessionPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
  profileId?: string;
  registrationNumber?: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

const userActiveCache = new Map<string, { isActive: boolean; expires: number }>();

export function invalidateUserActiveCache(userId: string) {
  userActiveCache.delete(userId);
}

export function primeUserActiveCache(userId: string, ttlMs: number = 120000) {
  userActiveCache.set(userId, { isActive: true, expires: Date.now() + ttlMs });
}

export async function requireAuth(allowedRoles?: Role[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }

  const now = Date.now();
  const cached = userActiveCache.get(session.userId);
  if (cached && cached.expires > now) {
    if (!cached.isActive) {
      throw new Error("ACCOUNT_INACTIVE");
    }
    return session;
  }

  // Also verify user is still active in database
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isActive: true },
  });

  if (!user || !user.isActive) {
    userActiveCache.set(session.userId, { isActive: false, expires: now + 30000 });
    throw new Error("ACCOUNT_INACTIVE");
  }

  userActiveCache.set(session.userId, { isActive: true, expires: now + 60000 });
  return session;
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

import { sendStudentOtpEmail } from "./smtp";

// Student Email OTP management via SMTP
export async function generateStudentOtp(identifier: string): Promise<{ success: boolean; devOtp?: string; message: string }> {
  // Normalize identifier
  const cleanId = identifier.trim().toLowerCase();

  // Check if student exists by registered email or registration number
  const student = await prisma.user.findFirst({
    where: {
      role: "STUDENT",
      isActive: true,
      OR: [
        { email: cleanId },
        { studentProfile: { registrationNumber: identifier.trim().toUpperCase() } },
      ],
    },
    include: { studentProfile: true },
  });

  if (!student) {
    // Return generic message to prevent email enumeration attacks
    return {
      success: true,
      message: "If an active student account matches this email, a verification code has been dispatched via SMTP.",
    };
  }

  // Generate 6 digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otpCode, 8);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Expire prior unconsumed OTPs for this identifier and student email
  await prisma.otpRecord.updateMany({
    where: {
      OR: [
        { identifier: cleanId, consumed: false },
        { identifier: student.email.toLowerCase(), consumed: false },
      ],
    },
    data: { consumed: true },
  });

  // Create new OTP record
  await prisma.otpRecord.create({
    data: {
      identifier: cleanId,
      otpHash,
      expiresAt,
    },
  });

  if (cleanId !== student.email.toLowerCase()) {
    await prisma.otpRecord.create({
      data: {
        identifier: student.email.toLowerCase(),
        otpHash,
        expiresAt,
      },
    });
  }

  // Dispatch via SMTP Email
  await sendStudentOtpEmail(student.email, student.name, otpCode, student.id);

  const isDev = process.env.DEV_OTP_TEST_MODE === "true" || process.env.NODE_ENV !== "production";

  if (isDev) {
    console.log(`[SMTP DEV OTP DISPATCH] Student: ${student.email} / Code: ${otpCode}`);
    return {
      success: true,
      devOtp: otpCode,
      message: `[Development Mode] Verification code sent to ${student.email}.`,
    };
  }

  const maskedEmail = student.email.replace(/(.{2})(.*)(?=@)/, (_m, a, b) => a + "*".repeat(b.length));
  return {
    success: true,
    message: `A 6-digit verification code has been dispatched via SMTP to ${maskedEmail}.`,
  };
}

export async function verifyStudentOtp(identifier: string, code: string): Promise<{ success: boolean; user?: SessionPayload; error?: string }> {
  const cleanId = identifier.trim().toLowerCase();

  const student = await prisma.user.findFirst({
    where: {
      role: "STUDENT",
      isActive: true,
      OR: [
        { email: cleanId },
        { studentProfile: { registrationNumber: identifier.trim().toUpperCase() } },
      ],
    },
    include: { studentProfile: true },
  });

  if (!student || !student.studentProfile) {
    return { success: false, error: "No active student account found for this email address." };
  }

  // Find latest active OTP
  const otpRecord = await prisma.otpRecord.findFirst({
    where: {
      OR: [
        { identifier: cleanId },
        { identifier: student.email.toLowerCase() },
      ],
      consumed: false,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) {
    return { success: false, error: "No pending verification code found. Please request a new code." };
  }

  if (new Date() > otpRecord.expiresAt) {
    await prisma.otpRecord.update({
      where: { id: otpRecord.id },
      data: { consumed: true },
    });
    return { success: false, error: "This verification code has expired. Please request a new one." };
  }

  if (otpRecord.attempts >= 3) {
    await prisma.otpRecord.update({
      where: { id: otpRecord.id },
      data: { consumed: true },
    });
    return { success: false, error: "Too many failed attempts. This verification code has been invalidated." };
  }

  const isValid = await bcrypt.compare(code.trim(), otpRecord.otpHash);
  if (!isValid) {
    await prisma.otpRecord.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });
    return { success: false, error: `Invalid code. ${2 - otpRecord.attempts} attempts remaining.` };
  }

  // Mark consumed
  await prisma.otpRecord.updateMany({
    where: {
      OR: [
        { identifier: cleanId },
        { identifier: student.email.toLowerCase() },
      ],
      consumed: false,
    },
    data: { consumed: true },
  });

  const sessionPayload: SessionPayload = {
    userId: student.id,
    email: student.email,
    role: "STUDENT",
    name: student.name,
    profileId: student.studentProfile.id,
    registrationNumber: student.studentProfile.registrationNumber,
  };

  return { success: true, user: sessionPayload };
}
