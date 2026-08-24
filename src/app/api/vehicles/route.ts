import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { ApiAuthError, handleApiAuth, requireManager } from "@/lib/api-auth";
import { encodeOwnershipInNotes, withOwnershipField } from "@/lib/vehicle-ownership";
import { upsertFuelLitersInNotes } from "@/lib/vehicle-fuel";
import { upsertVehicleTypeLabelInNotes } from "@/lib/custom-labels";
import { cacheDeletePrefix } from "@/lib/ttl-cache";
import { VehicleType } from "@prisma/client";

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

    return NextResponse.json(vehicles.map(withOwnershipField));
  } catch (e) {
    return handleApiAuth(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const org = await getDefaultOrg();
    const user = await requireManager();

    if (!body.ownership || !["COMPANY", "CONTRACTOR"].includes(body.ownership)) {
      return NextResponse.json({ error: "חובה לבחור סוג בעלות (רכב חברה / רכב קבלן)" }, { status: 400 });
    }

    const vehicleType = (body.vehicleType as VehicleType) || VehicleType.TRACTOR;
    const customTypeLabel =
      vehicleType === "OTHER" && body.customVehicleType
        ? String(body.customVehicleType).trim()
        : body.vehicleTypeLabel
          ? String(body.vehicleTypeLabel).trim()
          : null;

    if (customTypeLabel) {
      const sku = `CUSTOM_VEHICLE_TYPE:${customTypeLabel}`.slice(0, 64);
      const existingType = await prisma.inventoryItem.findFirst({
        where: {
          organizationId: org.id,
          category: "CUSTOM_VEHICLE_TYPE",
          OR: [{ sku }, { name: { equals: customTypeLabel, mode: "insensitive" } }],
        },
      });
      if (!existingType) {
        await prisma.inventoryItem.create({
          data: {
            organizationId: org.id,
            sku,
            name: customTypeLabel,
            nameHe: customTypeLabel,
            category: "CUSTOM_VEHICLE_TYPE",
            unit: "UNIT",
            isActive: true,
          },
        });
      } else if (!existingType.isActive) {
        await prisma.inventoryItem.update({ where: { id: existingType.id }, data: { isActive: true } });
      }
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        organizationId: org.id,
        licensePlate: body.licensePlate,
        vehicleType,
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
        notes: upsertVehicleTypeLabelInNotes(
          upsertFuelLitersInNotes(
            encodeOwnershipInNotes(body.ownership, body.notes || null),
            body.fuelLiters !== undefined && body.fuelLiters !== "" ? Number(body.fuelLiters) : null
          ),
          customTypeLabel
        ),
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

    // Ensure employees see updates immediately (lookup cache + dashboard cache).
    cacheDeletePrefix(`lookup:${org.id}:`);
    cacheDeletePrefix(`dashboard:${org.id}:`);

    return NextResponse.json(withOwnershipField(vehicle), { status: 201 });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה ביצירת כלי רכב" }, { status: 500 });
  }
}
