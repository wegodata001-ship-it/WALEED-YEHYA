import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { handleApiAuth, requireAuthUser } from "@/lib/api-auth";
import { parseOwnershipFromNotes } from "@/lib/vehicle-ownership";
import { parseFuelLitersFromNotes } from "@/lib/vehicle-fuel";
import { cacheGet, cacheSet } from "@/lib/ttl-cache";

export async function GET(req: NextRequest) {
  try {
    await requireAuthUser();
    const org = await getDefaultOrg();
    const scope = new URL(req.url).searchParams.get("scope") || "full";
    const cacheKey = `lookup:${org.id}:${scope}`;
    const cached = cacheGet<unknown>(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Lightweight payload for work-schedule screens
    if (scope === "schedule") {
      const [vehicles, employees, machineryUnits] = await Promise.all([
        prisma.vehicle.findMany({
          where: { organizationId: org.id, isActive: true },
          orderBy: { licensePlate: "asc" },
          select: { id: true, licensePlate: true, make: true, model: true, notes: true },
        }),
        prisma.employee.findMany({
          where: { organizationId: org.id, isActive: true },
          orderBy: { firstName: "asc" },
          select: { id: true, firstName: true, lastName: true },
        }),
        prisma.machineryUnit.findMany({
          where: { organizationId: org.id, isActive: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            unitType: true,
            unitNumber: true,
            vehicleId: true,
            vehicle: { select: { licensePlate: true, notes: true } },
          },
        }),
      ]);

      const payload = {
        vehicles: vehicles.map((v) => ({
          id: v.id,
          licensePlate: v.licensePlate,
          make: v.make,
          model: v.model,
          ownership: parseOwnershipFromNotes(v.notes),
          fuelLiters: parseFuelLitersFromNotes(v.notes),
        })),
        employees,
        machineryUnits: machineryUnits.map((m) => ({
          id: m.id,
          name: m.name,
          unitType: m.unitType,
          unitNumber: m.unitNumber,
          vehicleId: m.vehicleId,
          vehicleLicensePlate: m.vehicle?.licensePlate || null,
          vehicleFuelLiters: parseFuelLitersFromNotes(m.vehicle?.notes),
        })),
        org: { id: org.id, name: org.name },
      };
      cacheSet(cacheKey, payload, 30_000);
      return NextResponse.json(payload);
    }

    const [plots, vehicles, employees, fuelSources, fuelRecipients, machineryUnits, farmers, moshavim] =
      await Promise.all([
        prisma.plot.findMany({
          where: { organizationId: org.id, isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, nameHe: true, farmerId: true, moshavId: true },
        }),
        prisma.vehicle.findMany({
          where: { organizationId: org.id, isActive: true },
          orderBy: { licensePlate: "asc" },
          select: { id: true, licensePlate: true, make: true, model: true, notes: true },
        }),
        prisma.employee.findMany({
          where: { organizationId: org.id, isActive: true },
          orderBy: { firstName: "asc" },
          select: { id: true, firstName: true, lastName: true },
        }),
        prisma.fuelSource.findMany({
          where: { organizationId: org.id },
          orderBy: [{ isActive: "desc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            sourceType: true,
            currentLevel: true,
            capacityLiters: true,
            isActive: true,
          },
        }),
        prisma.fuelRecipient.findMany({
          where: { organizationId: org.id, isActive: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            category: true,
            columnRole: true,
            pricePerLiter: true,
            vehicleId: true,
            fuelSourceId: true,
            vehicle: { select: { licensePlate: true } },
          },
        }),
        prisma.machineryUnit.findMany({
          where: { organizationId: org.id, isActive: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            unitType: true,
            unitNumber: true,
            vehicleId: true,
            vehicle: { select: { licensePlate: true, notes: true } },
          },
        }),
        prisma.farmer.findMany({
          where: { organizationId: org.id, isActive: true },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          select: { id: true, firstName: true, lastName: true, moshavId: true },
        }),
        prisma.moshav.findMany({
          where: { organizationId: org.id, isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, nameHe: true },
        }),
      ]);

    const vehiclesWithOwnership = vehicles.map((v) => ({
      id: v.id,
      licensePlate: v.licensePlate,
      make: v.make,
      model: v.model,
      ownership: parseOwnershipFromNotes(v.notes),
      fuelLiters: parseFuelLitersFromNotes(v.notes),
    }));

    const payload = {
      plots,
      vehicles: vehiclesWithOwnership,
      employees,
      fuelSources,
      fuelRecipients,
      machineryUnits: machineryUnits.map((m) => ({
        id: m.id,
        name: m.name,
        unitType: m.unitType,
        unitNumber: m.unitNumber,
        vehicleId: m.vehicleId,
        vehicleLicensePlate: m.vehicle?.licensePlate || null,
        vehicleFuelLiters: parseFuelLitersFromNotes(m.vehicle?.notes),
      })),
      farmers,
      moshavim,
      org: { id: org.id, name: org.name },
    };
    cacheSet(cacheKey, payload, 30_000);
    return NextResponse.json(payload);
  } catch (e) {
    return handleApiAuth(e);
  }
}
