import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { ApiAuthError, handleApiAuth, requireManager } from "@/lib/api-auth";
import { cacheDeletePrefix } from "@/lib/ttl-cache";
import {
  encodeOwnershipInNotes,
  parseOwnershipFromNotes,
  stripOwnershipFromNotes,
  withOwnershipField,
} from "@/lib/vehicle-ownership";
import { parseFuelLitersFromNotes, upsertFuelLitersInNotes } from "@/lib/vehicle-fuel";

function parseDate(v: unknown) {
  if (!v || v === "") return null;
  return new Date(v as string);
}

function parseNum(v: unknown) {
  if (v === "" || v === null || v === undefined) return null;
  return Number(v);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    return NextResponse.json(withOwnershipField(vehicle));
  } catch (e) {
    return handleApiAuth(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const org = await getDefaultOrg();
    const user = await requireManager();

    const old = await prisma.vehicle.findUnique({ where: { id } });
    if (!old) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

    const ownership =
      body.ownership !== undefined
        ? body.ownership
        : parseOwnershipFromNotes(old.notes);
    const plainNotes =
      body.notes !== undefined ? body.notes : stripOwnershipFromNotes(old.notes);
    const preservedFuel = parseFuelLitersFromNotes(old.notes);
    const nextFuel =
      body.fuelLiters !== undefined
        ? body.fuelLiters === null
          ? null
          : body.fuelLiters === ""
            ? preservedFuel
            : Number(body.fuelLiters)
        : preservedFuel;

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        licensePlate: body.licensePlate ?? old.licensePlate,
        vehicleType: body.vehicleType ?? old.vehicleType,
        status: body.status ?? old.status,
        make: body.make !== undefined ? body.make : old.make,
        model: body.model !== undefined ? body.model : old.model,
        year: body.year !== undefined ? (body.year ? Number(body.year) : null) : old.year,
        vin: body.vin !== undefined ? body.vin : old.vin,
        odometerKm: body.odometerKm !== undefined ? (body.odometerKm ? Number(body.odometerKm) : null) : old.odometerKm,
        fuelTankCapacity: body.fuelTankCapacity !== undefined ? parseNum(body.fuelTankCapacity) : old.fuelTankCapacity,
        testExpiryDate: body.testExpiryDate !== undefined ? parseDate(body.testExpiryDate) : old.testExpiryDate,
        liftingInspectionExpiry: body.liftingInspectionExpiry !== undefined ? parseDate(body.liftingInspectionExpiry) : old.liftingInspectionExpiry,
        compulsoryInsurance: body.compulsoryInsurance !== undefined ? parseNum(body.compulsoryInsurance) : old.compulsoryInsurance,
        thirdPartyInsurance: body.thirdPartyInsurance !== undefined ? parseNum(body.thirdPartyInsurance) : old.thirdPartyInsurance,
        insuranceValidUntil: body.insuranceValidUntil !== undefined ? parseDate(body.insuranceValidUntil) : old.insuranceValidUntil,
        towingValidUntil: body.towingValidUntil !== undefined ? parseDate(body.towingValidUntil) : old.towingValidUntil,
        windshieldInsurance: body.windshieldInsurance !== undefined ? parseNum(body.windshieldInsurance) : old.windshieldInsurance,
        registeredTo: body.registeredTo !== undefined ? body.registeredTo : old.registeredTo,
        agentPhone: body.agentPhone !== undefined ? body.agentPhone : old.agentPhone,
        notes: upsertFuelLitersInNotes(encodeOwnershipInNotes(ownership, plainNotes), nextFuel),
        isActive: body.isActive !== undefined ? body.isActive : old.isActive,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        entityType: "Vehicle",
        entityId: vehicle.id,
        action: "UPDATE",
        oldValues: old,
        newValues: vehicle,
      },
    });

    // Ensure employees see updates immediately (lookup cache + dashboard cache).
    cacheDeletePrefix(`lookup:${org.id}:`);
    cacheDeletePrefix(`dashboard:${org.id}:`);

    return NextResponse.json(withOwnershipField(vehicle));
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה בעדכון כלי רכב" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const org = await getDefaultOrg();
    const user = await requireManager();
    const mode = new URL(req.url).searchParams.get("mode") || "archive";

    const old = await prisma.vehicle.findFirst({ where: { id, organizationId: org.id } });
    if (!old) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

    if (mode === "hard") {
      await prisma.$transaction(async (tx) => {
        await tx.tire.deleteMany({ where: { vehicleId: id } });
        await tx.vehicleCompliance.deleteMany({ where: { vehicleId: id } });
        await tx.serviceRecord.deleteMany({ where: { vehicleId: id } });
        await tx.fuelRecipient.updateMany({ where: { vehicleId: id }, data: { vehicleId: null } });
        await tx.fuelTransaction.updateMany({ where: { vehicleId: id }, data: { vehicleId: null } });
        await tx.machineryWorkLog.updateMany({ where: { vehicleId: id }, data: { vehicleId: null } });
        await tx.machineryUnit.updateMany({ where: { vehicleId: id }, data: { vehicleId: null } });
        await tx.vehicle.delete({ where: { id } });
      });
      cacheDeletePrefix(`lookup:${org.id}:`);
      cacheDeletePrefix(`dashboard:${org.id}:`);
      return NextResponse.json({ success: true, mode: "hard" });
    }

    await prisma.vehicle.update({
      where: { id },
      data: { isActive: false, status: "RETIRED" },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        entityType: "Vehicle",
        entityId: id,
        action: "DELETE",
        oldValues: old,
      },
    });

    cacheDeletePrefix(`lookup:${org.id}:`);
    cacheDeletePrefix(`dashboard:${org.id}:`);

    return NextResponse.json({ success: true, mode: "archive" });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה במחיקת כלי רכב" }, { status: 500 });
  }
}
