import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { hashPassword, normalizePhone } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { ApiAuthError, handleApiAuth, requireManager } from "@/lib/api-auth";

export async function GET() {
  try {
    await requireManager();
    const org = await getDefaultOrg();
    const employees = await prisma.employee.findMany({
      where: { organizationId: org.id },
      include: { user: { select: { id: true, phone: true, role: true, isActive: true } } },
      orderBy: [{ isActive: "desc" }, { firstName: "asc" }],
    });
    return NextResponse.json(employees);
  } catch (e) {
    return handleApiAuth(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const org = await getDefaultOrg();
    await requireManager();

    const phone = normalizePhone(String(body.phone));
    const password = String(body.password || "1234");
    const role = (body.role as UserRole) || UserRole.FIELD_OPERATOR;

    const existing = await prisma.user.findFirst({ where: { phone } });
    if (existing) {
      return NextResponse.json({ error: "מספר טלפון כבר קיים במערכת" }, { status: 400 });
    }

    const employee = await prisma.employee.create({
      data: {
        organizationId: org.id,
        firstName: body.firstName,
        lastName: body.lastName,
        phone,
        position: body.position || null,
        employeeNumber: body.employeeNumber || null,
        salaryType: body.salaryType === "MONTHLY" ? "MONTHLY" : "HOURLY",
        hourlyRate: body.hourlyRate ? Number(body.hourlyRate) : body.salaryType === "MONTHLY" ? null : 45,
        monthlySalary: body.monthlySalary ? Number(body.monthlySalary) : null,
        isActive: true,
      },
    });

    const user = await prisma.user.create({
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

    return NextResponse.json({ employee, user: { id: user.id, phone: user.phone, role: user.role } }, { status: 201 });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה בהוספת עובד" }, { status: 500 });
  }
}
