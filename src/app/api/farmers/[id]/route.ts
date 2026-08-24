import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { ApiAuthError, handleApiAuth, requireManager } from "@/lib/api-auth";
import {
  parseMoshavIdsFromNotes,
  upsertFarmerMetaInNotes,
  withFarmerMetaFields,
} from "@/lib/farmer-meta";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const org = await getDefaultOrg();
    const farmer = await prisma.farmer.findFirst({
      where: { id, organizationId: org.id },
      include: {
        moshav: { select: { id: true, name: true, nameHe: true } },
        plots: {
          include: { moshav: { select: { id: true, name: true, nameHe: true } } },
          orderBy: { name: "asc" },
        },
      },
    });
    if (!farmer) return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    return NextResponse.json(withFarmerMetaFields(farmer));
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

    let linked = parseMoshavIdsFromNotes(existing.notes);
    if (body.addMoshavName) {
      const name = String(body.addMoshavName).trim();
      if (name) {
        const moshav = await prisma.moshav.upsert({
          where: { organizationId_name: { organizationId: org.id, name } },
          create: { organizationId: org.id, name, nameHe: name },
          update: { isActive: true },
        });
        linked = Array.from(new Set([...linked, moshav.id]));
        if (!moshavId) moshavId = moshav.id;
      }
    }
    if (body.removeMoshavId) {
      linked = linked.filter((x) => x !== body.removeMoshavId);
      if (moshavId === body.removeMoshavId) moshavId = linked[0] || null;
    }

    const plainNotes =
      body.notes !== undefined
        ? body.notes
        : body.displayNotes !== undefined
          ? body.displayNotes
          : undefined;

    const notes =
      plainNotes !== undefined ||
      body.phone2 !== undefined ||
      body.contactPerson !== undefined ||
      body.addMoshavName ||
      body.removeMoshavId
        ? upsertFarmerMetaInNotes(
            plainNotes !== undefined ? String(plainNotes || "") : existing.notes,
            {
              phone2: body.phone2 !== undefined ? body.phone2 : undefined,
              contact: body.contactPerson !== undefined ? body.contactPerson : undefined,
              moshavIds: linked,
            }
          )
        : undefined;

    const farmer = await prisma.farmer.update({
      where: { id },
      data: {
        ...(body.firstName !== undefined ? { firstName: String(body.firstName) } : {}),
        ...(body.lastName !== undefined ? { lastName: String(body.lastName) } : {}),
        ...(body.phone !== undefined ? { phone: body.phone ? String(body.phone) : null } : {}),
        ...(body.address !== undefined ? { address: body.address ? String(body.address) : null } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
        ...(body.moshavName !== undefined || body.addMoshavName || body.removeMoshavId
          ? { moshavId }
          : {}),
      },
      include: {
        moshav: { select: { id: true, name: true, nameHe: true } },
        plots: {
          include: { moshav: { select: { id: true, name: true, nameHe: true } } },
          orderBy: { name: "asc" },
        },
      },
    });

    return NextResponse.json(withFarmerMetaFields(farmer));
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה בעדכון לקוח" }, { status: 500 });
  }
}

/** Soft-delete: deactivate farmer. No hard delete of customer history. */
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
      include: {
        moshav: { select: { id: true, name: true, nameHe: true } },
        plots: { include: { moshav: { select: { id: true, name: true, nameHe: true } } } },
      },
    });

    return NextResponse.json(withFarmerMetaFields(farmer));
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה במחיקת לקוח" }, { status: 500 });
  }
}
