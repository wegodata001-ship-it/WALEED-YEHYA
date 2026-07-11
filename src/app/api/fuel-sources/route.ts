import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { FuelSourceType } from "@prisma/client";

export async function GET() {
  const org = await getDefaultOrg();
  const sources = await prisma.fuelSource.findMany({
    where: { organizationId: org.id },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  return NextResponse.json(
    sources.map((s) => ({
      ...s,
      currentLevel: Number(s.currentLevel),
      capacityLiters: s.capacityLiters != null ? Number(s.capacityLiters) : null,
    }))
  );
}

export async function POST(req: NextRequest) {
  try {
    const org = await getDefaultOrg();
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "שם מיכל נדרש" }, { status: 400 });

    const source = await prisma.fuelSource.create({
      data: {
        organizationId: org.id,
        name,
        sourceType: (body.sourceType as FuelSourceType) || FuelSourceType.FIXED_TANK,
        location: body.location ? String(body.location) : null,
        capacityLiters: body.capacityLiters != null && body.capacityLiters !== "" ? Number(body.capacityLiters) : null,
        currentLevel: body.currentLevel != null && body.currentLevel !== "" ? Number(body.currentLevel) : 0,
        isActive: body.isActive !== false,
      },
    });

    return NextResponse.json(
      {
        ...source,
        currentLevel: Number(source.currentLevel),
        capacityLiters: source.capacityLiters != null ? Number(source.capacityLiters) : null,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "שגיאה ביצירת מיכל" }, { status: 500 });
  }
}
