import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { ApiAuthError, handleApiAuth, requireManager } from "@/lib/api-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const org = await getDefaultOrg();
    const body = await req.json();

    const existing = await prisma.farmer.findFirst({
      where: { id, organizationId: org.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    let moshavId = existing.moshavId;
    if (body.moshavName !== undefined) {
      const moshavName = String(body.moshavName || "").trim();
      if (moshavName) {
        const moshav = await prisma.moshav.upsert({
          where: { organizationId_name: { organizationId: org.id, name: moshavName } },
          create: { organizationId: org.id, name: moshavName, nameHe: moshavName },
          update: {},
        });
        moshavId = moshav.id;
      } else {
        moshavId = null;
      }
    }

    const farmer = await prisma.farmer.update({
      where: { id },
      data: {
        ...(body.firstName !== undefined ? { firstName: String(body.firstName) } : {}),
        ...(body.lastName !== undefined ? { lastName: String(body.lastName) } : {}),
        ...(body.phone !== undefined ? { phone: body.phone ? String(body.phone) : null } : {}),
        ...(body.notes !== undefined ? { notes: body.notes ? String(body.notes) : null } : {}),
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
        ...(body.moshavName !== undefined ? { moshavId } : {}),
      },
      include: { moshav: { select: { id: true, name: true, nameHe: true } } },
    });

    return NextResponse.json(farmer);
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה בעדכון לקוח" }, { status: 500 });
  }
}

/** Soft-delete: deactivate farmer. No hard delete. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const org = await getDefaultOrg();

    const existing = await prisma.farmer.findFirst({
      where: { id, organizationId: org.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    const farmer = await prisma.farmer.update({
      where: { id },
      data: { isActive: false },
      include: { moshav: { select: { id: true, name: true, nameHe: true } } },
    });

    return NextResponse.json(farmer);
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה במחיקת לקוח" }, { status: 500 });
  }
}
