import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { MachineryUnitType } from "@prisma/client";
import { ApiAuthError, handleApiAuth, requireManager } from "@/lib/api-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const org = await getDefaultOrg();
    const body = await req.json();

    const existing = await prisma.machineryUnit.findFirst({
      where: { id, organizationId: org.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "מכונה לא נמצאה" }, { status: 404 });
    }

    const unit = await prisma.machineryUnit.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
        ...(body.unitType !== undefined ? { unitType: body.unitType as MachineryUnitType } : {}),
        ...(body.unitNumber !== undefined
          ? { unitNumber: body.unitNumber ? String(body.unitNumber) : null }
          : {}),
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      },
      select: {
        id: true,
        name: true,
        unitType: true,
        unitNumber: true,
        isActive: true,
        sortOrder: true,
        headerColor: true,
      },
    });

    return NextResponse.json(unit);
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה בעדכון מכונה" }, { status: 500 });
  }
}

/** Soft-delete machinery unit */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const org = await getDefaultOrg();

    const existing = await prisma.machineryUnit.findFirst({
      where: { id, organizationId: org.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "מכונה לא נמצאה" }, { status: 404 });
    }

    const unit = await prisma.machineryUnit.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        unitType: true,
        unitNumber: true,
        isActive: true,
      },
    });

    return NextResponse.json(unit);
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה במחיקת מכונה" }, { status: 500 });
  }
}
