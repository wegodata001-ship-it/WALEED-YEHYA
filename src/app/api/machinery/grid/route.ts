import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { parseDateRange } from "@/lib/dateRange";
import { handleApiAuth, requireManager } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    await requireManager();
  const { searchParams } = new URL(req.url);
  const unitType = searchParams.get("unitType");
  const org = await getDefaultOrg();
  const { start, end, year, month } = parseDateRange(searchParams);

  const units = await prisma.machineryUnit.findMany({
    where: {
      organizationId: org.id,
      isActive: true,
      ...(unitType ? { unitType: unitType as never } : {}),
    },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, unitNumber: true, unitType: true, headerColor: true },
  });

  const logs = await prisma.machineryWorkLog.findMany({
    where: {
      organizationId: org.id,
      workDate: { gte: start, lt: end },
      machineryUnitId: { in: units.map((u) => u.id) },
    },
    select: {
      id: true,
      workDate: true,
      driverName: true,
      settlement: true,
      customerName: true,
      plotName: true,
      materialType: true,
      quantityUnit: true,
      acresWorked: true,
      plannedQuantity: true,
      reportedQuantity: true,
      approvalStatus: true,
      notes: true,
      machineryUnitId: true,
      operator: { select: { firstName: true, lastName: true } },
      plot: { select: { name: true, nameHe: true } },
    },
    orderBy: { workDate: "asc" },
  });

  const byUnit: Record<string, typeof logs> = {};
  const unitTotals: Record<string, number> = {};

  for (const unit of units) {
    byUnit[unit.id] = [];
    unitTotals[unit.id] = 0;
  }

  for (const log of logs) {
    if (!log.machineryUnitId) continue;
    byUnit[log.machineryUnitId].push(log);
    unitTotals[log.machineryUnitId] += Number(log.acresWorked);
  }

  return NextResponse.json({
    year,
    month,
    day: searchParams.get("day") ? Number(searchParams.get("day")) : null,
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    units,
    byUnit,
    unitTotals,
    grandTotal: Object.values(unitTotals).reduce((a, b) => a + b, 0),
  });
  } catch (e) {
    return handleApiAuth(e);
  }
}
