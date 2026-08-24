import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { hashPassword, normalizePhone } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { ApiAuthError, handleApiAuth, requireManager } from "@/lib/api-auth";
import { canViewPayroll } from "@/lib/roles";

function stripSalary<T extends Record<string, unknown>>(emp: T): T {
  const clone = { ...emp };
  delete (clone as { hourlyRate?: unknown }).hourlyRate;
  delete (clone as { monthlySalary?: unknown }).monthlySalary;
  delete (clone as { overtimeRate?: unknown }).overtimeRate;
  delete (clone as { travelRate?: unknown }).travelRate;
  delete (clone as { salaryType?: unknown }).salaryType;
  return clone;
}

export async function GET() {
  try {
    const user = await requireManager();
    const org = await getDefaultOrg();
    const employees = await prisma.employee.findMany({
      where: { organizationId: org.id },
      include: { user: { select: { id: true, phone: true, role: true, isActive: true } } },
      orderBy: [{ isActive: "desc" }, { firstName: "asc" }],
    });
    if (!canViewPayroll(user.role)) {
      return NextResponse.json(employees.map((e) => stripSalary(e as unknown as Record<string, unknown>)));
    }
    return NextResponse.json(employees);
  } catch (e) {
    return handleApiAuth(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const org = await getDefaultOrg();
    const user = await requireManager();

    const phone = normalizePhone(String(body.phone));
    const password = String(body.password || "1234");
    const role = (body.role as UserRole) || UserRole.FIELD_OPERATOR;

    const existing = await prisma.user.findFirst({ where: { phone } });
    if (existing) {
      return NextResponse.json({ error: "מספר טלפון כבר קיים במערכת" }, { status: 400 });
    }

    const canSalary = canViewPayroll(user.role);
    const employee = await prisma.employee.create({
      data: {
        organizationId: org.id,
        firstName: body.firstName,
        lastName: body.lastName,
        phone,
        position: body.position || null,
        employeeNumber: body.employeeNumber || null,
        salaryType: canSalary && body.salaryType === "MONTHLY" ? "MONTHLY" : "HOURLY",
        hourlyRate: canSalary && body.hourlyRate ? Number(body.hourlyRate) : canSalary ? 45 : null,
        monthlySalary: canSalary && body.monthlySalary ? Number(body.monthlySalary) : null,
        isActive: true,
      },
    });

    const createdUser = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: `${phone}@walledyehya.local`,
        phone,
        passwordHash: await hashPassword(password),
        firstName: body.firstName,
        lastName: body.lastName,
        role,
        employeeId: employee.id,
      },
    });

    const payload = {
      employee: canSalary ? employee : stripSalary(employee as unknown as Record<string, unknown>),
      user: { id: createdUser.id, phone: createdUser.phone, role: createdUser.role },
    };
    return NextResponse.json(payload, { status: 201 });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה בהוספת עובד" }, { status: 500 });
  }
}
