import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { ApiAuthError, handleApiAuth, requireManager } from "@/lib/api-auth";
import { normalizeLabel } from "@/lib/master-data";

/** GET /api/plots?farmerId=&moshavId=&all=1 */
export async function GET(req: NextRequest) {
  try {
    await requireManager();
    const org = await getDefaultOrg();
    const { searchParams } = new URL(req.url);
    const farmerId = searchParams.get("farmerId");
    const moshavId = searchParams.get("moshavId");
    const includeInactive = searchParams.get("all") === "true";

    const plots = await prisma.plot.findMany({
      where: {
        organizationId: org.id,
        ...(includeInactive ? {} : { isActive: true }),
        ...(farmerId ? { farmerId } : {}),
        ...(moshavId ? { moshavId } : {}),
      },
      include: {
        moshav: { select: { id: true, name: true, nameHe: true } },
        farmer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(plots);
  } catch (e) {
    return handleApiAuth(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireManager();
    const org = await getDefaultOrg();
    const body = await req.json();
    const name = normalizeLabel(String(body.name || ""));
    if (!name) return NextResponse.json({ error: "שם חלקה נדרש" }, { status: 400 });

    let moshavId: string | null = body.moshavId || null;
    const settlementName = normalizeLabel(String(body.settlementName || body.moshavName || ""));
    if (!moshavId && settlementName) {
      const moshav = await prisma.moshav.upsert({
        where: { organizationId_name: { organizationId: org.id, name: settlementName } },
        create: { organizationId: org.id, name: settlementName, nameHe: settlementName },
        update: { isActive: true },
      });
      moshavId = moshav.id;
    }

    const existing = await prisma.plot.findFirst({
      where: {
        organizationId: org.id,
        name: { equals: name, mode: "insensitive" },
        ...(body.farmerId ? { farmerId: String(body.farmerId) } : {}),
      },
    });
    if (existing) {
      const updated = await prisma.plot.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          ...(body.farmerId ? { farmerId: String(body.farmerId) } : {}),
          ...(moshavId ? { moshavId } : {}),
          ...(body.notes !== undefined ? { notes: body.notes ? String(body.notes) : null } : {}),
        },
        include: {
          moshav: { select: { id: true, name: true, nameHe: true } },
          farmer: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      return NextResponse.json(updated);
    }

    const plot = await prisma.plot.create({
      data: {
        organizationId: org.id,
        name,
        nameHe: name,
        moshavId,
        farmerId: body.farmerId ? String(body.farmerId) : null,
        notes: body.notes ? String(body.notes) : null,
        isActive: true,
      },
      include: {
        moshav: { select: { id: true, name: true, nameHe: true } },
        farmer: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return NextResponse.json(plot, { status: 201 });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה ביצירת חלקה" }, { status: 500 });
  }
}
