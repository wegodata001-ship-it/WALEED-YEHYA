import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { parseDateRange } from "@/lib/dateRange";
import { handleApiAuth, requireManager } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    await requireManager();
  const { searchParams } = new URL(req.url);
  const org = await getDefaultOrg();
  const employeeId = searchParams.get("employeeId");
  const { start, end } = parseDateRange(searchParams);

  const [workLogs, attendance] = await Promise.all([
    prisma.machineryWorkLog.findMany({
      where: {
        organizationId: org.id,
        workDate: { gte: start, lt: end },
        ...(employeeId ? { operatorId: employeeId } : {}),
      },
      select: {
        id: true,
        workDate: true,
        driverName: true,
        settlement: true,
        customerName: true,
        plotName: true,
        acresWorked: true,
        quantityUnit: true,
        operatorId: true,
        operator: { select: { id: true, firstName: true, lastName: true } },
        plot: { select: { nameHe: true, name: true } },
        machineryUnit: { select: { name: true } },
      },
      orderBy: { workDate: "asc" },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        organizationId: org.id,
        workDate: { gte: start, lt: end },
        ...(employeeId ? { employeeId } : {}),
      },
      select: {
        id: true,
        workDate: true,
        status: true,
        employeeId: true,
        plotId: true,
        employee: { select: { firstName: true, lastName: true } },
        timeEntries: { select: { entryType: true, hours: true } },
      },
      orderBy: { workDate: "asc" },
    }),
  ]);

  type DayRow = {
    date: string;
    employeeId: string;
    employeeName: string;
    settlement: string;
    plotName: string;
    customerName: string;
    quantity: number;
    quantityUnit: string;
    machinery: string;
    attendanceHours: number;
    status: string;
  };

  const days: DayRow[] = [];

  for (const log of workLogs) {
    const name = log.driverName || (log.operator ? `${log.operator.firstName} ${log.operator.lastName}` : "—");
    days.push({
      date: log.workDate.toISOString(),
      employeeId: log.operatorId || "",
      employeeName: name,
      settlement: log.settlement || "—",
      plotName: log.plotName || log.plot?.nameHe || log.plot?.name || "—",
      customerName: log.customerName || "—",
      quantity: Number(log.acresWorked),
      quantityUnit: log.quantityUnit,
      machinery: log.machineryUnit?.name || "—",
      attendanceHours: 0,
      status: "WORK",
    });
  }

  for (const att of attendance) {
    const hours = att.timeEntries.reduce((s, t) => s + Number(t.hours), 0);
    days.push({
      date: att.workDate.toISOString(),
      employeeId: att.employeeId,
      employeeName: `${att.employee.firstName} ${att.employee.lastName}`,
      settlement: "—",
      plotName: att.plotId ? "חלקה במערכת" : "—",
      customerName: "—",
      quantity: hours,
      quantityUnit: "HOUR",
      machinery: "נוכחות",
      attendanceHours: hours,
      status: att.status,
    });
  }

  days.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const byEmployee = new Map<string, { name: string; days: number; totalQty: number }>();
  for (const d of days) {
    const key = d.employeeId || d.employeeName;
    const cur = byEmployee.get(key) || { name: d.employeeName, days: 0, totalQty: 0 };
    cur.days += 1;
    cur.totalQty += d.quantity;
    byEmployee.set(key, cur);
  }

  const employees = await prisma.employee.findMany({
    where: { organizationId: org.id, isActive: true },
    select: { id: true, firstName: true, lastName: true, position: true },
    orderBy: { firstName: "asc" },
  });

  return NextResponse.json({
    start,
    end,
    days,
    summary: Array.from(byEmployee.values()),
    employees,
  });
  } catch (e) {
    return handleApiAuth(e);
  }
}
