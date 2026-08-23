import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { FuelTransactionType, LedgerCategory, LedgerEntryType } from "@prisma/client";
import { parseDateRange } from "@/lib/dateRange";
import { ApiAuthError, handleApiAuth, requireAuthUser, requireManager } from "@/lib/api-auth";
import { cacheDeletePrefix } from "@/lib/ttl-cache";
import { parseFuelLitersFromNotes, upsertFuelLitersInNotes } from "@/lib/vehicle-fuel";

export async function GET(req: NextRequest) {
  try {
    await requireManager();
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || 50);
  const vehicleId = searchParams.get("vehicleId");
  const sourceId = searchParams.get("sourceId") || searchParams.get("fuelSourceId");
  const recipientId = searchParams.get("recipientId");
  const hasDate =
    searchParams.has("year") ||
    searchParams.has("month") ||
    searchParams.has("from") ||
    searchParams.has("day");
  const range = hasDate ? parseDateRange(searchParams) : null;

  const transactions = await prisma.fuelTransaction.findMany({
    where: {
      ...(range ? { transactionDate: { gte: range.start, lt: range.end } } : {}),
      ...(vehicleId ? { vehicleId } : {}),
      ...(sourceId ? { sourceId } : {}),
      ...(recipientId ? { recipientId } : {}),
    },
    select: {
      id: true,
      transactionDate: true,
      liters: true,
      totalCost: true,
      pricePerLiter: true,
      licensePlate: true,
      odometerKm: true,
      notes: true,
      meterPhotoUrl: true,
      transactionType: true,
      vehicle: { select: { licensePlate: true } },
      source: { select: { name: true } },
      operator: { select: { firstName: true, lastName: true } },
      recipient: { select: { id: true, name: true, category: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(transactions);
  } catch (e) {
    return handleApiAuth(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    const body = await req.json();
    const org = await getDefaultOrg();

    const liters = Number(body.liters);
    if (!Number.isFinite(liters) || liters <= 0) {
      return NextResponse.json({ error: "כמות ליטרים לא תקינה" }, { status: 400 });
    }

    const recipient = body.recipientId
      ? await prisma.fuelRecipient.findUnique({ where: { id: body.recipientId } })
      : null;

    const pricePerLiter = body.pricePerLiter
      ? Number(body.pricePerLiter)
      : recipient?.pricePerLiter
        ? Number(recipient.pricePerLiter)
        : 6.85;

    let vehicleId = body.vehicleId || recipient?.vehicleId;
    const subcontractorId = body.subcontractorId || recipient?.subcontractorId;

    if (!vehicleId && body.licensePlate) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { organizationId: org.id, licensePlate: body.licensePlate },
      });
      vehicleId = vehicle?.id;
    }

    let txType: FuelTransactionType = body.transactionType || "REFUEL_VEHICLE";
    if (body.transactionType === "TANK_FILL" || recipient?.columnRole === "TANK_FILL") txType = "TANK_FILL";
    if (recipient?.category === "EXTERNAL_CUSTOMER") txType = "SUBCONTRACTOR_CHARGE";

    const isInbound = txType === "TANK_FILL" || txType === "TANK_TRANSFER";
    const totalCost = liters * pricePerLiter;
    const levelSourceId = body.fuelSourceId || body.sourceId || recipient?.fuelSourceId || null;
    const sourceIdForTx = levelSourceId || (body.sourceId || recipient?.fuelSourceId || null);

    const tx = await prisma.$transaction(async (txClient) => {
      const beforeSource = levelSourceId
        ? await txClient.fuelSource.findUnique({
            where: { id: levelSourceId },
            select: { id: true, currentLevel: true, capacityLiters: true, sourceType: true },
          })
        : null;

      const beforeVehicle =
        vehicleId && (txType === "REFUEL_VEHICLE" || txType === "SUBCONTRACTOR_CHARGE")
          ? await txClient.vehicle.findUnique({
              where: { id: vehicleId },
              select: { id: true, notes: true },
            })
          : null;

      const transaction = await txClient.fuelTransaction.create({
        data: {
          organizationId: org.id,
          clientId: body.clientId || null,
          transactionDate: new Date(body.transactionDate || new Date()),
          // Keep a reference to the physical tank even for inbound fills (for per-tank history)
          sourceId: sourceIdForTx,
          recipientId: recipient?.id || body.recipientId || null,
          vehicleId: vehicleId || null,
          licensePlate: body.licensePlate || null,
          transactionType: txType,
          liters,
          pricePerLiter,
          totalCost,
          odometerKm: body.odometerKm ? Number(body.odometerKm) : null,
          operatorId: body.operatorId || user.employeeId || null,
          subcontractorId: subcontractorId || null,
          notes: body.notes || null,
          gpsLat: body.gpsLat ?? null,
          gpsLng: body.gpsLng ?? null,
          photoUrl: body.photoUrl || null,
          meterPhotoUrl: body.meterPhotoUrl || null,
          whatsappShared: body.whatsappShared || false,
          createdById: user.id,
          syncStatus: "SYNCED",
        },
        include: { vehicle: true, source: true, operator: true, recipient: true },
      });

      if (levelSourceId && beforeSource && beforeSource.sourceType !== "EXTERNAL_STATION") {
        const beforeLevel = Number(beforeSource.currentLevel);
        const cap = beforeSource.capacityLiters != null ? Number(beforeSource.capacityLiters) : null;
        const rawNext = isInbound ? beforeLevel + liters : beforeLevel - liters;
        const next = Math.max(0, cap != null ? Math.min(cap, rawNext) : rawNext);
        await txClient.fuelSource.update({ where: { id: levelSourceId }, data: { currentLevel: next } });
      }

      if (beforeVehicle) {
        const beforeFuel = parseFuelLitersFromNotes(beforeVehicle.notes) ?? 0;
        const nextFuel = Math.max(0, beforeFuel + liters);
        await txClient.vehicle.update({
          where: { id: beforeVehicle.id },
          data: { notes: upsertFuelLitersInNotes(beforeVehicle.notes, nextFuel) },
        });
      }

      if (txType === "SUBCONTRACTOR_CHARGE" && subcontractorId) {
        await txClient.subcontractorLedgerEntry.create({
          data: {
            subcontractorId,
            entryDate: new Date(body.transactionDate || new Date()),
            entryType: LedgerEntryType.DEBIT,
            category: LedgerCategory.JOB_CHARGE,
            amount: totalCost,
            description: `תדלוק ${liters} ליטר × ₪${pricePerLiter}`,
            referenceId: transaction.id,
            referenceType: "FuelTransaction",
          },
        });
      }

      return transaction;
    });

    cacheDeletePrefix(`lookup:${org.id}:`);
    cacheDeletePrefix(`dashboard:${org.id}:`);

    return NextResponse.json(tx, { status: 201 });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה בשמירת תדלוק" }, { status: 500 });
  }
}
