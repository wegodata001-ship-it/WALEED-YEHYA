import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { handleApiAuth, requireManager } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    await requireManager();
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") || new Date().getFullYear());
  const month = Number(searchParams.get("month") || new Date().getMonth() + 1);

  const org = await getDefaultOrg();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const [recipients, transactions] = await Promise.all([
    prisma.fuelRecipient.findMany({
      where: { organizationId: org.id, isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { vehicle: true, subcontractor: true, employee: true },
    }),
    prisma.fuelTransaction.findMany({
      where: {
        organizationId: org.id,
        transactionDate: { gte: start, lt: end },
        recipientId: { not: null },
      },
    }),
  ]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const matrix: Record<string, Record<string, number>> = {};
  const columnTotals: Record<string, number> = {};
  const rowTotals: Record<string, number> = {};

  for (const day of days) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    matrix[key] = {};
    rowTotals[key] = 0;
  }

  for (const r of recipients) {
    columnTotals[r.id] = 0;
  }

  for (const tx of transactions) {
    if (!tx.recipientId) continue;
    const d = new Date(tx.transactionDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!matrix[key]) continue;
    const liters = Number(tx.liters);
    matrix[key][tx.recipientId] = (matrix[key][tx.recipientId] || 0) + liters;
    columnTotals[tx.recipientId] = (columnTotals[tx.recipientId] || 0) + liters;
    rowTotals[key] = (rowTotals[key] || 0) + liters;
  }

  const categories = {
    tanks: recipients.filter((r) => r.category === "TANK"),
    internal: recipients.filter((r) => r.category === "COMPANY_VEHICLE" || r.category === "COMPANY_EMPLOYEE"),
    external: recipients.filter((r) => r.category === "EXTERNAL_CUSTOMER"),
  };

  return NextResponse.json({
    year,
    month,
    recipients,
    categories,
    days,
    matrix,
    columnTotals,
    rowTotals,
    grandTotal: Object.values(columnTotals).reduce((a, b) => a + b, 0),
  });
  } catch (e) {
    return handleApiAuth(e);
  }
}
