import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { handleApiAuth, requireAuthUser } from "@/lib/api-auth";
import { parseOwnershipFromNotes } from "@/lib/vehicle-ownership";

export async function GET() {
  try {
    await requireAuthUser();
  const org = await getDefaultOrg();

  const [plots, vehicles, employees, fuelSources, fuelRecipients, machineryUnits, farmers, moshavim] =
    await Promise.all([
    prisma.plot.findMany({
      where: { organizationId: org.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, nameHe: true },
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
      },
    }),
    prisma.farmer.findMany({
      where: { organizationId: org.id, isActive: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
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
  }));

  return NextResponse.json({
    plots,
    vehicles: vehiclesWithOwnership,
    employees,
    fuelSources,
    fuelRecipients,
    machineryUnits,
    farmers,
    moshavim,
    org: { id: org.id, name: org.name },
  });
  } catch (e) {
    return handleApiAuth(e);
  }
}
