import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
  role: z.enum(["STUDENT", "TRAINER", "MANAGER", "ADMIN", "FINANCIER"]),
  employeeCode: z.string().optional(),
  specialization: z.string().optional(),
  department: z.string().optional(),
});

export async function GET() {
  try {
    await requireAuth(["ADMIN"]);

    const users = await prisma.user.findMany({
      include: {
        studentProfile: true,
        trainerProfile: true,
        managerProfile: true,
        financierProfile: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        registrationNumber: u.studentProfile?.registrationNumber,
        employeeCode: u.trainerProfile?.employeeCode,
        department: u.managerProfile?.department || u.financierProfile?.department,
      })),
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["ADMIN"]);
    const body = await req.json();
    const parsed = CreateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const {
      name,
      email,
      phone,
      password,
      role,
      employeeCode,
      specialization,
      department,
    } = parsed.data;

    const normalizedEmail = email.trim().toLowerCase();

    const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (exists) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          phone: phone?.trim() || null,
          passwordHash,
          role,
          isActive: true,
        },
      });

      if (role === "STUDENT") {
        const count = await tx.studentProfile.count();
        const regNum = `ACA-2026-${(count + 1).toString().padStart(4, "0")}`;
        await tx.studentProfile.create({
          data: {
            userId: u.id,
            registrationNumber: regNum,
          },
        });
      } else if (role === "TRAINER") {
        await tx.trainerProfile.create({
          data: {
            userId: u.id,
            employeeCode: employeeCode || `TR-${Math.floor(100 + Math.random() * 900)}`,
            specialization: specialization || null,
          },
        });
      } else if (role === "MANAGER") {
        await tx.managerProfile.create({
          data: {
            userId: u.id,
            department: department || "Operations & Admissions",
          },
        });
      } else if (role === "FINANCIER") {
        await tx.financierProfile.create({
          data: {
            userId: u.id,
            department: department || "Finance & Accounts",
          },
        });
      }

      return u;
    });

    await logAuditEvent({
      userId: session.userId,
      action: "USER_CREATED",
      entityType: "User",
      entityId: user.id,
      details: { email: user.email, role: user.role },
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Failed to create user account" }, { status: 500 });
  }
}
