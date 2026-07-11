import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { ApiAuthError, handleApiAuth, requireManager } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    await requireManager();
    const org = await getDefaultOrg();
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicleId");

    const records = await prisma.serviceRecord.findMany({
      where: {
        organizationId: org.id,
        ...(vehicleId ? { vehicleId } : {}),
      },
      include: {
        vehicle: { select: { licensePlate: true, make: true, model: true } },
      },
      orderBy: { serviceDate: "desc" },
      take: 100,
    });

    const vehicles = await prisma.vehicle.findMany({
      where: { organizationId: org.id, isActive: true },
      select: {
        id: true,
        licensePlate: true,
        make: true,
        model: true,
        testExpiryDate: true,
        insuranceValidUntil: true,
        towingValidUntil: true,
        liftingInspectionExpiry: true,
        status: true,
      },
      orderBy: { licensePlate: "asc" },
    });

    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86400000);

    const alerts = vehicles
      .map((v) => {
        const items: { type: string; date: Date; label: string }[] = [];
        if (v.testExpiryDate) items.push({ type: "test", date: v.testExpiryDate, label: "טסט" });
        if (v.insuranceValidUntil) items.push({ type: "insurance", date: v.insuranceValidUntil, label: "ביטוח" });
        if (v.towingValidUntil) items.push({ type: "towing", date: v.towingValidUntil, label: "גרירה" });
        if (v.liftingInspectionExpiry) items.push({ type: "lifting", date: v.liftingInspectionExpiry, label: "בדיקת הרמה" });
        return items
          .filter((i) => i.date <= in30)
          .map((i) => ({
            vehicleId: v.id,
            licensePlate: v.licensePlate,
            alertType: i.label,
            expiryDate: i.date.toISOString(),
            expired: i.date < now,
            daysLeft: Math.ceil((i.date.getTime() - now.getTime()) / 86400000),
          }));
      })
      .flat()
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    return NextResponse.json({ records, vehicles, alerts });
  } catch (e) {
    return handleApiAuth(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const org = await getDefaultOrg();
    await requireManager();

    const record = await prisma.serviceRecord.create({
      data: {
        organizationId: org.id,
        vehicleId: body.vehicleId,
        serviceType: body.serviceType || "GENERAL",
        serviceDate: new Date(body.serviceDate || new Date()),
        odometerKm: body.odometerKm ? Number(body.odometerKm) : null,
        description: body.description || null,
        laborCost: body.laborCost ? Number(body.laborCost) : null,
        partsCost: body.partsCost ? Number(body.partsCost) : null,
        totalCost: body.totalCost ? Number(body.totalCost) : null,
        performedBy: body.performedBy || null,
        nextServiceDate: body.nextServiceDate ? new Date(body.nextServiceDate) : null,
        notes: body.notes || null,
      },
      include: { vehicle: { select: { licensePlate: true } } },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה בשמירת טיפול" }, { status: 500 });
  }
}
