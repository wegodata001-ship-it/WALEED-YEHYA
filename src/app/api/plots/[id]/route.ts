import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { ApiAuthError, handleApiAuth, requireManager } from "@/lib/api-auth";
import { normalizeLabel } from "@/lib/master-data";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const org = await getDefaultOrg();
    const body = await req.json();

    const existing = await prisma.plot.findFirst({ where: { id, organizationId: org.id } });
    if (!existing) return NextResponse.json({ error: "חלקה לא נמצאה" }, { status: 404 });

    let moshavId = existing.moshavId;
    if (body.settlementName !== undefined || body.moshavName !== undefined) {
      const settlementName = normalizeLabel(String(body.settlementName || body.moshavName || ""));
      if (settlementName) {
        const moshav = await prisma.moshav.upsert({
          where: { organizationId_name: { organizationId: org.id, name: settlementName } },
          create: { organizationId: org.id, name: settlementName, nameHe: settlementName },
          update: { isActive: true },
        });
        moshavId = moshav.id;
      } else {
        moshavId = null;
      }
    }

    const name = body.name !== undefined ? normalizeLabel(String(body.name)) : undefined;
    const plot = await prisma.plot.update({
      where: { id },
      data: {
        ...(name ? { name, nameHe: name } : {}),
        ...(body.notes !== undefined ? { notes: body.notes ? String(body.notes) : null } : {}),
        ...(body.farmerId !== undefined ? { farmerId: body.farmerId || null } : {}),
        ...(body.settlementName !== undefined || body.moshavName !== undefined || body.moshavId !== undefined
          ? { moshavId: body.moshavId !== undefined ? body.moshavId : moshavId }
          : {}),
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      },
      include: {
        moshav: { select: { id: true, name: true, nameHe: true } },
        farmer: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return NextResponse.json(plot);
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה בעדכון חלקה" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const org = await getDefaultOrg();
    const mode = new URL(req.url).searchParams.get("mode") || "archive";

    const existing = await prisma.plot.findFirst({ where: { id, organizationId: org.id } });
    if (!existing) return NextResponse.json({ error: "חלקה לא נמצאה" }, { status: 404 });

    if (mode === "hard") {
      await prisma.machineryWorkLog.updateMany({ where: { plotId: id }, data: { plotId: null } });
      await prisma.plot.delete({ where: { id } });
      return NextResponse.json({ success: true, mode: "hard" });
    }

    const plot = await prisma.plot.update({
      where: { id },
      data: { isActive: false },
      include: {
        moshav: { select: { id: true, name: true, nameHe: true } },
        farmer: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return NextResponse.json({ ...plot, mode: "archive" });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה במחיקת חלקה" }, { status: 500 });
  }
}
