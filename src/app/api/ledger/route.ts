import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { parseDateRange } from "@/lib/dateRange";
import { LedgerCategory, LedgerEntryType } from "@prisma/client";
import { ApiAuthError, handleApiAuth, requirePayrollAccess } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    await requirePayrollAccess();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "all";
  const org = await getDefaultOrg();
  const { start, end } = parseDateRange(searchParams);

  const [employeeEntries, subcontractorEntries, customerEntries, externalFuel] = await Promise.all([
    type === "subcontractor" || type === "fuel" || type === "customer"
      ? []
      : prisma.employeeLedgerEntry.findMany({
          where: { entryDate: { gte: start, lt: end }, employee: { organizationId: org.id } },
          include: { employee: { select: { firstName: true, lastName: true } } },
          orderBy: { entryDate: "desc" },
        }),
    type === "employee" || type === "fuel" || type === "customer"
      ? []
      : prisma.subcontractorLedgerEntry.findMany({
          where: { entryDate: { gte: start, lt: end }, subcontractor: { organizationId: org.id } },
          include: { subcontractor: { select: { name: true } } },
          orderBy: { entryDate: "desc" },
        }),
    type === "employee" || type === "subcontractor" || type === "fuel"
      ? []
      : prisma.customerLedgerEntry.findMany({
          where: { organizationId: org.id, entryDate: { gte: start, lt: end } },
          orderBy: { entryDate: "desc" },
        }),
    type === "employee" || type === "subcontractor" || type === "customer"
      ? []
      : prisma.fuelTransaction.findMany({
          where: {
            organizationId: org.id,
            transactionDate: { gte: start, lt: end },
            transactionType: "SUBCONTRACTOR_CHARGE",
          },
          select: {
            id: true,
            transactionDate: true,
            liters: true,
            pricePerLiter: true,
            totalCost: true,
            recipient: { select: { name: true, pricePerLiter: true } },
            subcontractor: { select: { name: true } },
          },
          orderBy: { transactionDate: "desc" },
        }),
  ]);

  const movements = [
    ...employeeEntries.map((e) => ({
      id: e.id,
      date: e.entryDate.toISOString(),
      entityType: "employee" as const,
      entityName: `${e.employee.firstName} ${e.employee.lastName}`,
      entryType: e.entryType,
      category: e.category,
      amount: Number(e.amount),
      description: e.description,
    })),
    ...subcontractorEntries.map((e) => ({
      id: e.id,
      date: e.entryDate.toISOString(),
      entityType: "subcontractor" as const,
      entityName: e.subcontractor.name,
      entryType: e.entryType,
      category: e.category,
      amount: Number(e.amount),
      description: e.description,
    })),
    ...customerEntries.map((e) => ({
      id: e.id,
      date: e.entryDate.toISOString(),
      entityType: "customer" as const,
      entityName: e.customerName,
      entryType: e.entryType,
      category: e.category,
      amount: Number(e.amount),
      description: e.description,
    })),
    ...externalFuel.map((t) => ({
      id: t.id,
      date: t.transactionDate.toISOString(),
      entityType: "fuel" as const,
      entityName: t.recipient?.name || t.subcontractor?.name || "לקוח חיצוני",
      entryType: "DEBIT" as const,
      category: "JOB_CHARGE",
      amount: Number(t.totalCost || 0),
      description: `${Number(t.liters)} ליטר × ₪${Number(t.pricePerLiter || t.recipient?.pricePerLiter || 0)}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const employeeBalance = await prisma.employeeLedgerEntry.groupBy({
    by: ["employeeId"],
    where: { employee: { organizationId: org.id } },
    _sum: { amount: true },
  });

  return NextResponse.json({ start, end, movements, employeeBalance });
  } catch (e) {
    return handleApiAuth(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePayrollAccess();
    const org = await getDefaultOrg();
    const body = await req.json();
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "סכום לא תקין" }, { status: 400 });
    }

    const entryType = (body.entryType as LedgerEntryType) || LedgerEntryType.CREDIT;
    const category = (body.category as LedgerCategory) || LedgerCategory.OTHER;
    const description = String(body.description || "").trim() || "תנועה ידנית";
    const entryDate = new Date(body.entryDate || new Date());
    const targetType = body.targetType || body.entityType; // employee | customer

    if (targetType === "employee") {
      if (!body.employeeId) {
        return NextResponse.json({ error: "בחר עובד" }, { status: 400 });
      }
      const entry = await prisma.employeeLedgerEntry.create({
        data: {
          employeeId: body.employeeId,
          entryDate,
          entryType,
          category,
          amount,
          description,
        },
        include: { employee: { select: { firstName: true, lastName: true } } },
      });
      return NextResponse.json(
        {
          id: entry.id,
          entityType: "employee",
          entityName: `${entry.employee.firstName} ${entry.employee.lastName}`,
          entryType: entry.entryType,
          category: entry.category,
          amount: Number(entry.amount),
          description: entry.description,
          date: entry.entryDate.toISOString(),
        },
        { status: 201 }
      );
    }

    if (targetType === "customer") {
      const customerName = String(body.customerName || "").trim();
      if (!customerName && !body.farmerId) {
        return NextResponse.json({ error: "בחר או הזן לקוח" }, { status: 400 });
      }
      const farmerId = body.farmerId || null;
      let name = customerName;
      if (farmerId) {
        const farmer = await prisma.farmer.findFirst({
          where: { id: farmerId, organizationId: org.id },
        });
        if (farmer) name = `${farmer.firstName} ${farmer.lastName}`;
      }
      const entry = await prisma.customerLedgerEntry.create({
        data: {
          organizationId: org.id,
          farmerId,
          customerName: name,
          entryDate,
          entryType,
          category,
          amount,
          description,
        },
      });
      return NextResponse.json(
        {
          id: entry.id,
          entityType: "customer",
          entityName: entry.customerName,
          entryType: entry.entryType,
          category: entry.category,
          amount: Number(entry.amount),
          description: entry.description,
          date: entry.entryDate.toISOString(),
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ error: "סוג יעד לא נתמך (employee / customer)" }, { status: 400 });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה בשמירת תנועה" }, { status: 500 });
  }
}
