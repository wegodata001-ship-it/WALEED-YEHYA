import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  normalizePhone,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  defaultPathForRole,
} from "@/lib/auth";
import { safeRedirectForRole } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  try {
    const { phone, password, next } = await req.json();
    if (!phone || !password) {
      return NextResponse.json({ error: "נדרשים טלפון וסיסמה" }, { status: 400 });
    }

    const normalized = normalizePhone(String(phone));
    const user = await prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [
          { phone: normalized },
          { phone: `0${normalized.slice(3)}` },
          { phone: String(phone) },
        ],
      },
      include: { employee: true },
    });

    if (!user || !(await verifyPassword(String(password), user.passwordHash))) {
      return NextResponse.json({ error: "טלפון או סיסמה שגויים" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await createSessionToken({
      userId: user.id,
      role: user.role,
      orgId: user.organizationId,
    });
    await setSessionCookie(token);

    const redirectTo = safeRedirectForRole(
      user.role,
      typeof next === "string" ? next : null
    ) || defaultPathForRole(user.role);

    return NextResponse.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        employeeId: user.employeeId,
      },
      redirectTo,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "שגיאה בהתחברות" }, { status: 500 });
  }
}
