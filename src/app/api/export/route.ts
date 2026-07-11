import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { buildWhatsAppUrl, formatDailySummaryWhatsApp } from "@/lib/whatsapp";

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [workLogs, fuelTx] = await Promise.all([
    prisma.machineryWorkLog.findMany({ where: { workDate: { gte: today, lt: tomorrow } } }),
    prisma.fuelTransaction.findMany({ where: { transactionDate: { gte: today, lt: tomorrow } } }),
  ]);

  const header = "תאריך,מפעיל,כלי,חלקה,חומר,דונם,אשכולות,סטטוס\n";
  const rows = workLogs.map((l) =>
    [
      l.workDate.toISOString().split("T")[0],
      l.operatorId,
      l.vehicleId,
      l.plotId,
      l.materialType,
      Number(l.acresWorked),
      l.baleCount || "",
      l.syncStatus,
    ].join(",")
  );

  return new NextResponse(header + rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="machinery-${today.toISOString().split("T")[0]}.csv"`,
    },
  });
}

export async function POST() {
  const org = await getDefaultOrg();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [workLogs, fuelTx] = await Promise.all([
    prisma.machineryWorkLog.findMany({
      where: { workDate: { gte: today, lt: tomorrow } },
      include: { operator: true },
    }),
    prisma.fuelTransaction.findMany({ where: { transactionDate: { gte: today, lt: tomorrow } } }),
  ]);

  const message = formatDailySummaryWhatsApp({
    date: today.toLocaleDateString("he-IL"),
    totalAcres: workLogs.reduce((s, l) => s + Number(l.acresWorked), 0),
    totalFuel: fuelTx.reduce((s, t) => s + Number(t.liters), 0),
    workLogs: workLogs.length,
    fuelLogs: fuelTx.length,
    operators: new Set(workLogs.map((l) => l.operatorId)).size,
  });

  const phone = org.managerPhone || process.env.WHATSAPP_MANAGER_PHONE || "";
  const url = buildWhatsAppUrl(phone, message);

  await prisma.communicationLog.create({
    data: {
      organizationId: org.id,
      channel: "WHATSAPP",
      recipientPhone: phone,
      recipientName: "מנהל",
      message,
      entityType: "DailySummary",
      status: "SENT",
    },
  });

  return NextResponse.json({ url, message });
}
