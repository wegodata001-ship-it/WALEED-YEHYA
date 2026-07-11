import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg, getCurrentUser } from "@/lib/org";
import { FuelTransactionType, LedgerCategory, LedgerEntryType } from "@prisma/client";
import { parseDateRange } from "@/lib/dateRange";
import { ApiAuthError, handleApiAuth, requireAuthUser, requireManager } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    await requireManager();
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || 50);
  const hasDate =
    searchParams.has("year") ||
    searchParams.has("month") ||
    searchParams.has("from") ||
    searchParams.has("day");
  const range = hasDate ? parseDateRange(searchParams) : null;

  const transactions = await prisma.fuelTransaction.findMany({
    where: range
      ? { transactionDate: { gte: range.start, lt: range.end } }
      : undefined,
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
    await requireAuthUser();
    const body = await req.json();
    const org = await getDefaultOrg();
    const user = await getCurrentUser();

    const liters = Number(body.liters);

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

    const tx = await prisma.$transaction(async (txClient) => {
      const transaction = await txClient.fuelTransaction.create({
        data: {
          organizationId: org.id,
          clientId: body.clientId || null,
          transactionDate: new Date(body.transactionDate || new Date()),
          sourceId: isInbound ? null : body.sourceId || recipient?.fuelSourceId || null,
          recipientId: recipient?.id || body.recipientId || null,
          vehicleId: vehicleId || null,
          licensePlate: body.licensePlate || null,
          transactionType: txType,
          liters,
          pricePerLiter,
          totalCost,
          odometerKm: body.odometerKm ? Number(body.odometerKm) : null,
          operatorId: body.operatorId || null,
          subcontractorId: subcontractorId || null,
          notes: [body.notes, body.driverName ? `נהג: ${body.driverName}` : null].filter(Boolean).join(" · ") || null,
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

      if (levelSourceId) {
        await txClient.fuelSource.update({
          where: { id: levelSourceId },
          data: { currentLevel: isInbound ? { increment: liters } : { decrement: liters } },
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

    return NextResponse.json(tx, { status: 201 });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה בשמירת תדלוק" }, { status: 500 });
  }
}
