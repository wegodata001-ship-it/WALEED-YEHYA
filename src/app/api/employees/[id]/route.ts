import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { hashPassword, normalizePhone } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { ApiAuthError, handleApiAuth, requireManager } from "@/lib/api-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const org = await getDefaultOrg();
    const body = await req.json();

    const existing = await prisma.employee.findFirst({
      where: { id, organizationId: org.id },
      include: { user: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "עובד לא נמצא" }, { status: 404 });
    }

    let phone = existing.phone;
    if (body.phone !== undefined) {
      phone = normalizePhone(String(body.phone));
      const conflict = await prisma.user.findFirst({
        where: { phone, NOT: existing.user ? { id: existing.user.id } : undefined },
      });
      if (conflict) {
        return NextResponse.json({ error: "מספר טלפון כבר קיים במערכת" }, { status: 400 });
      }
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(body.firstName !== undefined ? { firstName: String(body.firstName) } : {}),
        ...(body.lastName !== undefined ? { lastName: String(body.lastName) } : {}),
        ...(body.phone !== undefined ? { phone } : {}),
        ...(body.position !== undefined ? { position: body.position ? String(body.position) : null } : {}),
        ...(body.salaryType !== undefined
          ? { salaryType: body.salaryType === "MONTHLY" ? "MONTHLY" : "HOURLY" }
          : {}),
        ...(body.hourlyRate !== undefined
          ? { hourlyRate: body.hourlyRate != null && body.hourlyRate !== "" ? Number(body.hourlyRate) : null }
          : {}),
        ...(body.monthlySalary !== undefined
          ? {
              monthlySalary:
                body.monthlySalary != null && body.monthlySalary !== "" ? Number(body.monthlySalary) : null,
            }
          : {}),
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      },
      include: { user: { select: { id: true, phone: true, role: true, isActive: true } } },
    });

    if (existing.user) {
      const userData: {
        firstName?: string;
        lastName?: string;
        phone?: string | null;
        role?: UserRole;
        isActive?: boolean;
        passwordHash?: string;
      } = {};
      if (body.firstName !== undefined) userData.firstName = String(body.firstName);
      if (body.lastName !== undefined) userData.lastName = String(body.lastName);
      if (body.phone !== undefined) userData.phone = phone;
      if (body.role !== undefined) userData.role = body.role as UserRole;
      if (body.isActive !== undefined) userData.isActive = Boolean(body.isActive);
      if (body.password && String(body.password).trim()) {
        userData.passwordHash = await hashPassword(String(body.password));
      }
      if (Object.keys(userData).length > 0) {
        await prisma.user.update({ where: { id: existing.user.id }, data: userData });
      }
    }

    const refreshed = await prisma.employee.findUnique({
      where: { id },
      include: { user: { select: { id: true, phone: true, role: true, isActive: true } } },
    });

    return NextResponse.json(refreshed || employee);
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה בעדכון עובד" }, { status: 500 });
  }
}

/** Soft-delete: deactivate employee + linked user. No hard delete. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const org = await getDefaultOrg();

    const existing = await prisma.employee.findFirst({
      where: { id, organizationId: org.id },
      include: { user: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "עובד לא נמצא" }, { status: 404 });
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: { isActive: false },
      include: { user: { select: { id: true, phone: true, role: true, isActive: true } } },
    });

    if (existing.user) {
      await prisma.user.update({
        where: { id: existing.user.id },
        data: { isActive: false },
      });
    }

    return NextResponse.json({ ...employee, user: employee.user ? { ...employee.user, isActive: false } : null });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה במחיקת עובד" }, { status: 500 });
  }
}
