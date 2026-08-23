import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { ApiAuthError, handleApiAuth, requireAuthUser, requireManager } from "@/lib/api-auth";
import { isEmployeeRole } from "@/lib/roles";
import { parseFuelLitersFromNotes, upsertFuelLitersInNotes } from "@/lib/vehicle-fuel";
import { cacheDeletePrefix } from "@/lib/ttl-cache";

export async function GET(req: NextRequest) {
  try {
    await requireManager();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const unitId = searchParams.get("unitId");
  const limit = Number(searchParams.get("limit") || 100);

  const where: Record<string, unknown> = {};
  if (date) {
    where.workDate = {
      gte: new Date(date),
      lt: new Date(new Date(date).getTime() + 86400000),
    };
  }
  if (unitId) where.machineryUnitId = unitId;

  const logs = await prisma.machineryWorkLog.findMany({
    where,
    select: {
      id: true,
      workDate: true,
      driverName: true,
      settlement: true,
      customerName: true,
      plotName: true,
      quantityUnit: true,
      acresWorked: true,
      operator: { select: { firstName: true, lastName: true } },
      plot: { select: { name: true, nameHe: true } },
      machineryUnit: { select: { name: true } },
    },
    orderBy: { workDate: "desc" },
    take: limit,
  });

  return NextResponse.json(logs);
  } catch (e) {
    return handleApiAuth(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireAuthUser();
    const body = await req.json();
    const org = await getDefaultOrg();

    let operatorId = body.operatorId || null;
    let driverName = body.driverName || null;
    if (isEmployeeRole(sessionUser.role)) {
      if (!sessionUser.employeeId) throw new ApiAuthError(403, "אין הרשאה");
      operatorId = sessionUser.employeeId;
      driverName = sessionUser.employee
        ? `${sessionUser.employee.firstName} ${sessionUser.employee.lastName}`
        : `${sessionUser.firstName} ${sessionUser.lastName}`;
    }

    const unit = body.machineryUnitId
      ? await prisma.machineryUnit.findUnique({
          where: { id: body.machineryUnitId },
          include: { vehicle: true },
        })
      : null;

    const fuelUsedLitersRaw = body.fuelUsedLiters;
    const fuelUsedLiters =
      fuelUsedLitersRaw === "" || fuelUsedLitersRaw == null ? null : Number(fuelUsedLitersRaw);

    const log = await prisma.machineryWorkLog.create({
      data: {
        organizationId: org.id,
        clientId: body.clientId || null,
        machineryUnitId: body.machineryUnitId || null,
        workDate: new Date(body.workDate || new Date()),
        operatorId,
        driverName,
        vehicleId: body.vehicleId || unit?.vehicleId || null,
        plotId: body.plotId || null,
        plotName: body.plotName || null,
        settlement: body.settlement || null,
        customerName: body.customerName || null,
        materialType: body.materialType || null,
        quantityUnit: body.quantityUnit || "DUNAM",
        acresWorked: body.acresWorked,
        baleCategory: body.baleCategory || null,
        baleCount: body.baleCount ? Number(body.baleCount) : null,
        choppingMechanism: body.choppingMechanism || "NONE",
        startTime: body.startTime ? new Date(body.startTime) : null,
        endTime: body.endTime ? new Date(body.endTime) : null,
        notes:
          fuelUsedLiters != null && Number.isFinite(fuelUsedLiters) && fuelUsedLiters > 0
            ? `${body.notes || ""}${body.notes ? "\n" : ""}__fuel_used_liters:${fuelUsedLiters}__`
            : body.notes || null,
        gpsLat: body.gpsLat ?? null,
        gpsLng: body.gpsLng ?? null,
        photoUrl: body.photoUrl || null,
        whatsappShared: body.whatsappShared || false,
        createdById: sessionUser.id,
        syncStatus: "SYNCED",
      },
      include: { operator: true, vehicle: true, plot: true, machineryUnit: true },
    });

    if (fuelUsedLiters != null && Number.isFinite(fuelUsedLiters) && fuelUsedLiters > 0) {
      const vehicleId = (body.vehicleId || unit?.vehicleId || null) as string | null;
      if (vehicleId) {
        const v = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true, notes: true } });
        if (v) {
          const before = parseFuelLitersFromNotes(v.notes) ?? 0;
          const next = Math.max(0, before - fuelUsedLiters);
          await prisma.vehicle.update({
            where: { id: v.id },
            data: { notes: upsertFuelLitersInNotes(v.notes, next) },
          });
        }
      }
    }

    // Ensure real-time fuel display updates in employee/manager UIs.
    cacheDeletePrefix(`lookup:${org.id}:`);
    cacheDeletePrefix(`dashboard:${org.id}:`);

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: sessionUser.id,
        entityType: "MachineryWorkLog",
        entityId: log.id,
        action: "CREATE",
        newValues: log,
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה בשמירת יומן מכונה" }, { status: 500 });
  }
}
