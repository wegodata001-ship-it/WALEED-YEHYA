import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { parseDateRange } from "@/lib/dateRange";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupBy = searchParams.get("groupBy") || "settlement";
  const org = await getDefaultOrg();
  const { start, end } = parseDateRange(searchParams);

  const logs = await prisma.machineryWorkLog.findMany({
    where: {
      organizationId: org.id,
      workDate: { gte: start, lt: end },
    },
    select: {
      id: true,
      workDate: true,
      settlement: true,
      customerName: true,
      plotName: true,
      acresWorked: true,
      quantityUnit: true,
      materialType: true,
      machineryUnit: { select: { name: true, unitType: true } },
      plot: { select: { name: true, nameHe: true, moshav: { select: { nameHe: true } } } },
    },
    orderBy: { workDate: "asc" },
  });

  type Row = {
    key: string;
    settlement: string;
    customerName: string;
    plotName: string;
    totalQuantity: number;
    workDays: number;
    entries: typeof logs;
  };

  const map = new Map<string, Row>();

  for (const log of logs) {
    const settlement = log.settlement || log.plot?.moshav?.nameHe || "ללא ישוב";
    const customer = log.customerName || "ללא לקוח";
    const plot = log.plotName || log.plot?.nameHe || log.plot?.name || "ללא חלקה";
    const key =
      groupBy === "customer"
        ? customer
        : groupBy === "plot"
          ? `${settlement}|${plot}`
          : settlement;

    const existing = map.get(key) || {
      key,
      settlement,
      customerName: customer,
      plotName: plot,
      totalQuantity: 0,
      workDays: 0,
      entries: [],
    };
    existing.totalQuantity += Number(log.acresWorked);
    existing.workDays += 1;
    existing.entries.push(log);
    map.set(key, existing);
  }

  const rows = Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  const grandTotal = rows.reduce((s, r) => s + r.totalQuantity, 0);

  return NextResponse.json({ start, end, groupBy, rows, grandTotal, entryCount: logs.length });
}
