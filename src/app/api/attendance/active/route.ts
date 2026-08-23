import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { handleApiAuth, requireManager } from "@/lib/api-auth";

/** Active shifts (today): checkIn != null && checkOut == null */
export async function GET() {
  try {
    await requireManager();
    const org = await getDefaultOrg();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const records = await prisma.attendanceRecord.findMany({
      where: {
        organizationId: org.id,
        workDate: { gte: todayStart, lt: todayEnd },
        checkIn: { not: null },
        checkOut: null,
        status: "PRESENT",
      },
      select: {
        id: true,
        employeeId: true,
        checkIn: true,
        employee: { select: { firstName: true, lastName: true } },
      },
      orderBy: { checkIn: "asc" },
    });

    return NextResponse.json({
      count: records.length,
      records: records.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
        checkIn: r.checkIn ? r.checkIn.toISOString() : null,
      })),
    });
  } catch (e) {
    return handleApiAuth(e);
  }
}

