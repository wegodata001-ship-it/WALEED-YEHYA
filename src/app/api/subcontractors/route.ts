import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { ApiAuthError, handleApiAuth, requireManager } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    await requireManager();
    const org = await getDefaultOrg();
    const includeInactive = new URL(req.url).searchParams.get("all") === "true";
    const rows = await prisma.subcontractor.findMany({
      where: { organizationId: org.id, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            jobs: true,
            ledgerEntries: true,
            fuelTransactions: true,
          },
        },
      },
    });
    return NextResponse.json(rows);
  } catch (e) {
    return handleApiAuth(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireManager();
    const org = await getDefaultOrg();
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "שם קבלן נדרש" }, { status: 400 });

    const existing = await prisma.subcontractor.findFirst({
      where: { organizationId: org.id, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      if (!existing.isActive) {
        const reactivated = await prisma.subcontractor.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
        return NextResponse.json(reactivated);
      }
      return NextResponse.json({ error: "קבלן בשם זה כבר קיים" }, { status: 400 });
    }

    const row = await prisma.subcontractor.create({
      data: {
        organizationId: org.id,
        name,
        contactPerson: body.contactPerson ? String(body.contactPerson) : body.company ? String(body.company) : null,
        phone: body.phone ? String(body.phone) : null,
        email: body.email ? String(body.email) : null,
        address: body.address ? String(body.address) : null,
        taxId: body.taxId ? String(body.taxId) : null,
        notes: body.notes ? String(body.notes) : null,
        isActive: true,
      },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה ביצירת קבלן" }, { status: 500 });
  }
}
