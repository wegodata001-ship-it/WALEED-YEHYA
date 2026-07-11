import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { ApiAuthError, handleApiAuth, requireManager } from "@/lib/api-auth";

function parseDate(v: unknown) {
  if (!v || v === "") return null;
  return new Date(v as string);
}

function parseNum(v: unknown) {
  if (v === "" || v === null || v === undefined) return null;
  return Number(v);
}

export async function GET(req: NextRequest) {
  try {
    await requireManager();
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("all") === "true";
    const org = await getDefaultOrg();

    const vehicles = await prisma.vehicle.findMany({
      where: {
        organizationId: org.id,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ vehicleType: "asc" }, { licensePlate: "asc" }],
    });

    return NextResponse.json(vehicles);
  } catch (e) {
    return handleApiAuth(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const org = await getDefaultOrg();
    const user = await requireManager();

    const vehicle = await prisma.vehicle.create({
      data: {
        organizationId: org.id,
        licensePlate: body.licensePlate,
        vehicleType: body.vehicleType,
        status: body.status || "ACTIVE",
        make: body.make || null,
        model: body.model || null,
        year: body.year ? Number(body.year) : null,
        vin: body.vin || null,
        odometerKm: body.odometerKm ? Number(body.odometerKm) : null,
        fuelTankCapacity: parseNum(body.fuelTankCapacity),
        testExpiryDate: parseDate(body.testExpiryDate),
        liftingInspectionExpiry: parseDate(body.liftingInspectionExpiry),
        compulsoryInsurance: parseNum(body.compulsoryInsurance),
        thirdPartyInsurance: parseNum(body.thirdPartyInsurance),
        insuranceValidUntil: parseDate(body.insuranceValidUntil),
        towingValidUntil: parseDate(body.towingValidUntil),
        windshieldInsurance: parseNum(body.windshieldInsurance),
        registeredTo: body.registeredTo || null,
        agentPhone: body.agentPhone || null,
        notes: body.notes || null,
        isActive: body.isActive !== false,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        entityType: "Vehicle",
        entityId: vehicle.id,
        action: "CREATE",
        newValues: vehicle,
      },
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה ביצירת כלי רכב" }, { status: 500 });
  }
}
