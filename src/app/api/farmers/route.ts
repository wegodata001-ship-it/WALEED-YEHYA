import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { ApiAuthError, handleApiAuth, requireManager } from "@/lib/api-auth";
import { upsertFarmerMetaInNotes, withFarmerMetaFields } from "@/lib/farmer-meta";

export async function GET() {
  try {
    await requireManager();
    const org = await getDefaultOrg();
    const farmers = await prisma.farmer.findMany({
      where: { organizationId: org.id },
      include: {
        moshav: { select: { id: true, name: true, nameHe: true } },
        plots: {
          where: { isActive: true },
          include: { moshav: { select: { id: true, name: true, nameHe: true } } },
          orderBy: { name: "asc" },
        },
      },
      orderBy: [{ isActive: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
    });
    return NextResponse.json(farmers.map((f) => withFarmerMetaFields(f)));
  } catch (e) {
    return handleApiAuth(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireManager();
    const org = await getDefaultOrg();
    const body = await req.json();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    if (!firstName || !lastName) {
      return NextResponse.json({ error: "שם פרטי ומשפחה נדרשים" }, { status: 400 });
    }

    let moshavId: string | null = null;
    const moshavName = String(body.moshavName || "").trim();
    if (moshavName) {
      const moshav = await prisma.moshav.upsert({
        where: { organizationId_name: { organizationId: org.id, name: moshavName } },
        create: { organizationId: org.id, name: moshavName, nameHe: moshavName },
        update: {},
      });
      moshavId = moshav.id;
    }

    const notes = upsertFarmerMetaInNotes(body.notes || null, {
      phone2: body.phone2 ?? null,
      contact: body.contactPerson ?? null,
      moshavIds: moshavId ? [moshavId] : [],
      preserveUnset: false,
    });

    const farmer = await prisma.farmer.create({
      data: {
        organizationId: org.id,
        firstName,
        lastName,
        phone: body.phone ? String(body.phone) : null,
        address: body.address ? String(body.address) : null,
        notes,
        moshavId,
      },
      include: {
        moshav: { select: { id: true, name: true, nameHe: true } },
        plots: { include: { moshav: { select: { id: true, name: true, nameHe: true } } } },
      },
    });

    return NextResponse.json(withFarmerMetaFields(farmer), { status: 201 });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה ביצירת לקוח" }, { status: 500 });
  }
}
