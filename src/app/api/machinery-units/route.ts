import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { MachineryUnitType } from "@prisma/client";
import { handleApiAuth, requireAuthUser, requireManager } from "@/lib/api-auth";

export async function GET() {
  try {
    await requireManager();
  const org = await getDefaultOrg();
  const includeInactive = false;
  const units = await prisma.machineryUnit.findMany({
    where: { organizationId: org.id, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      unitType: true,
      unitNumber: true,
      headerColor: true,
      sortOrder: true,
      isActive: true,
    },
  });
  return NextResponse.json(units);
  } catch (e) {
    return handleApiAuth(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuthUser();
    const org = await getDefaultOrg();
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "שם מכונה נדרש" }, { status: 400 });
    }

    const unitType = (body.unitType as MachineryUnitType) || MachineryUnitType.HARVESTER;
    const maxSort = await prisma.machineryUnit.aggregate({
      where: { organizationId: org.id },
      _max: { sortOrder: true },
    });

    const unit = await prisma.machineryUnit.create({
      data: {
        organizationId: org.id,
        name,
        unitType,
        unitNumber: body.unitNumber ? String(body.unitNumber) : null,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
        headerColor: body.headerColor || null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        unitType: true,
        unitNumber: true,
      },
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error && e.message.includes("Unique") ? "מכונה בשם זה כבר קיימת" : "שגיאה ביצירת מכונה";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
