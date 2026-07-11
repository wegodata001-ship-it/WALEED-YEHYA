import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { FuelSourceType } from "@prisma/client";
import { ApiAuthError, handleApiAuth, requireManager } from "@/lib/api-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const org = await getDefaultOrg();
    const body = await req.json();

    const existing = await prisma.fuelSource.findFirst({
      where: { id, organizationId: org.id },
    });
    if (!existing) return NextResponse.json({ error: "מיכל לא נמצא" }, { status: 404 });

    const source = await prisma.fuelSource.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
        ...(body.sourceType !== undefined ? { sourceType: body.sourceType as FuelSourceType } : {}),
        ...(body.location !== undefined ? { location: body.location ? String(body.location) : null } : {}),
        ...(body.capacityLiters !== undefined
          ? { capacityLiters: body.capacityLiters === "" || body.capacityLiters == null ? null : Number(body.capacityLiters) }
          : {}),
        ...(body.currentLevel !== undefined
          ? { currentLevel: Number(body.currentLevel || 0) }
          : {}),
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      },
    });

    return NextResponse.json({
      ...source,
      currentLevel: Number(source.currentLevel),
      capacityLiters: source.capacityLiters != null ? Number(source.capacityLiters) : null,
    });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה בעדכון מיכל" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const org = await getDefaultOrg();
    const existing = await prisma.fuelSource.findFirst({
      where: { id, organizationId: org.id },
    });
    if (!existing) return NextResponse.json({ error: "מיכל לא נמצא" }, { status: 404 });

    // Soft-delete to keep history
    await prisma.fuelSource.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה במחיקת מיכל" }, { status: 500 });
  }
}
