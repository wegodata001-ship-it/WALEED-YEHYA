import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { ApiAuthError, handleApiAuth, requireManager } from "@/lib/api-auth";
import { LedgerCategory, LedgerEntryType } from "@prisma/client";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const org = await getDefaultOrg();

    const row = await prisma.subcontractor.findFirst({
      where: { id, organizationId: org.id },
      include: {
        jobs: { orderBy: { jobDate: "desc" }, take: 50 },
        ledgerEntries: { orderBy: { entryDate: "desc" }, take: 80 },
        fuelTransactions: {
          orderBy: { transactionDate: "desc" },
          take: 40,
          select: {
            id: true,
            transactionDate: true,
            liters: true,
            totalCost: true,
            licensePlate: true,
            vehicle: { select: { licensePlate: true } },
          },
        },
      },
    });
    if (!row) return NextResponse.json({ error: "קבלן לא נמצא" }, { status: 404 });
    return NextResponse.json(row);
  } catch (e) {
    return handleApiAuth(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const org = await getDefaultOrg();
    const body = await req.json();

    const existing = await prisma.subcontractor.findFirst({ where: { id, organizationId: org.id } });
    if (!existing) return NextResponse.json({ error: "קבלן לא נמצא" }, { status: 404 });

    const row = await prisma.subcontractor.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
        ...(body.contactPerson !== undefined || body.company !== undefined
          ? { contactPerson: String(body.contactPerson || body.company || "") || null }
          : {}),
        ...(body.phone !== undefined ? { phone: body.phone ? String(body.phone) : null } : {}),
        ...(body.email !== undefined ? { email: body.email ? String(body.email) : null } : {}),
        ...(body.address !== undefined ? { address: body.address ? String(body.address) : null } : {}),
        ...(body.taxId !== undefined ? { taxId: body.taxId ? String(body.taxId) : null } : {}),
        ...(body.notes !== undefined ? { notes: body.notes ? String(body.notes) : null } : {}),
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      },
    });
    return NextResponse.json(row);
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה בעדכון קבלן" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const org = await getDefaultOrg();
    const mode = new URL(req.url).searchParams.get("mode") || "archive";

    const existing = await prisma.subcontractor.findFirst({ where: { id, organizationId: org.id } });
    if (!existing) return NextResponse.json({ error: "קבלן לא נמצא" }, { status: 404 });

    if (mode === "hard") {
      await prisma.$transaction(async (tx) => {
        await tx.subcontractorSettlement.deleteMany({ where: { subcontractorId: id } });
        await tx.subcontractorLedgerEntry.deleteMany({ where: { subcontractorId: id } });
        await tx.subcontractorJob.deleteMany({ where: { subcontractorId: id } });
        await tx.fuelRecipient.updateMany({ where: { subcontractorId: id }, data: { subcontractorId: null } });
        await tx.fuelTransaction.updateMany({ where: { subcontractorId: id }, data: { subcontractorId: null } });
        await tx.subcontractor.delete({ where: { id } });
      });
      return NextResponse.json({ success: true, mode: "hard" });
    }

    const row = await prisma.subcontractor.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ ...row, mode: "archive" });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה במחיקת קבלן" }, { status: 500 });
  }
}

/** POST payment/ledger entry on subcontractor card */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const org = await getDefaultOrg();
    const body = await req.json();

    const existing = await prisma.subcontractor.findFirst({ where: { id, organizationId: org.id } });
    if (!existing) return NextResponse.json({ error: "קבלן לא נמצא" }, { status: 404 });

    if (body.action === "ledger") {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "סכום לא תקין" }, { status: 400 });
      }
      const entry = await prisma.subcontractorLedgerEntry.create({
        data: {
          subcontractorId: id,
          entryDate: new Date(body.entryDate || new Date()),
          entryType: (body.entryType as LedgerEntryType) || LedgerEntryType.CREDIT,
          category: (body.category as LedgerCategory) || LedgerCategory.JOB_PAYMENT,
          amount,
          description: String(body.description || "תשלום"),
        },
      });
      return NextResponse.json(entry, { status: 201 });
    }

    return NextResponse.json({ error: "פעולה לא נתמכת" }, { status: 400 });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}
