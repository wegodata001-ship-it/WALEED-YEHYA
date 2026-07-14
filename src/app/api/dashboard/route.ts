import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { handleApiAuth, requireManager } from "@/lib/api-auth";
import { cacheGet, cacheSet } from "@/lib/ttl-cache";

function parseRange(searchParams: URLSearchParams) {
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (from && to) {
    return { start: new Date(from), end: new Date(new Date(to).getTime() + 86400000) };
  }
  if (year && month) {
    return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { start: today, end: tomorrow };
}

export async function GET(req: NextRequest) {
  try {
    await requireManager();
  const { searchParams } = new URL(req.url);
  const org = await getDefaultOrg();
  const { start, end } = parseRange(searchParams);
  const cacheKey = `dashboard:${org.id}:${start.toISOString()}:${end.toISOString()}`;
  const cached = cacheGet<unknown>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const [workLogs, fuelTx, attendance, pendingMachinery, pendingFuel, lowFuel, maintenanceAlerts, employeesCount, customersCount, vehiclesCount, pendingTasks, pendingAtt, ledgerCount, customerLedgerCount] = await Promise.all([
    prisma.machineryWorkLog.findMany({
      where: { organizationId: org.id, workDate: { gte: start, lt: end } },
      select: {
        id: true,
        workDate: true,
        acresWorked: true,
        materialType: true,
        driverName: true,
        plotName: true,
        operatorId: true,
        syncStatus: true,
        gpsLat: true,
        gpsLng: true,
        createdAt: true,
        operator: { select: { firstName: true, lastName: true } },
        plot: { select: { name: true, nameHe: true } },
        machineryUnit: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.fuelTransaction.findMany({
      where: { organizationId: org.id, transactionDate: { gte: start, lt: end } },
      select: {
        id: true,
        liters: true,
        licensePlate: true,
        totalCost: true,
        syncStatus: true,
        gpsLat: true,
        gpsLng: true,
        createdAt: true,
        vehicle: { select: { licensePlate: true } },
        source: { select: { name: true } },
        recipient: { select: { name: true, category: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.attendanceRecord.count({
      where: { organizationId: org.id, workDate: { gte: start, lt: end }, status: "PRESENT" },
    }),
    prisma.machineryWorkLog.count({ where: { organizationId: org.id, syncStatus: "PENDING" } }),
    prisma.fuelTransaction.count({ where: { organizationId: org.id, syncStatus: "PENDING" } }),
    prisma.fuelSource.findMany({
      where: { organizationId: org.id, isActive: true },
      select: { capacityLiters: true, currentLevel: true, name: true },
    }),
    prisma.vehicle.findMany({
      where: { organizationId: org.id, isActive: true },
      select: {
        id: true,
        licensePlate: true,
        testExpiryDate: true,
        insuranceValidUntil: true,
        towingValidUntil: true,
        liftingInspectionExpiry: true,
      },
    }),
    prisma.employee.count({ where: { organizationId: org.id, isActive: true } }),
    prisma.farmer.count({ where: { organizationId: org.id, isActive: true } }),
    prisma.vehicle.count({ where: { organizationId: org.id, isActive: true } }),
    prisma.fieldTask.count({
      where: { organizationId: org.id, status: "COMPLETED", approvalStatus: "PENDING" },
    }),
    prisma.attendanceRecord.count({
      where: { organizationId: org.id, approvalStatus: "PENDING" },
    }),
    prisma.employeeLedgerEntry.count({
      where: { entryDate: { gte: start, lt: end }, employee: { organizationId: org.id } },
    }).catch(() => 0),
    prisma.customerLedgerEntry
      .count({
        where: { organizationId: org.id, entryDate: { gte: start, lt: end } },
      })
      .catch(() => 0),
  ]);

  const pendingSync = pendingMachinery + pendingFuel;
  const totalAcres = workLogs.reduce((s, l) => s + Number(l.acresWorked), 0);
  const totalFuel = fuelTx.reduce((s, t) => s + Number(t.liters), 0);
  const totalFuelCost = fuelTx.reduce((s, t) => s + Number(t.totalCost || 0), 0);
  const operators = new Set(workLogs.map((l) => l.operatorId).filter(Boolean)).size;

  const fuelAlerts = lowFuel.filter(
    (s) => s.capacityLiters && Number(s.currentLevel) / Number(s.capacityLiters) < 0.25
  ).length;

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400000);
  let expiryAlerts = 0;
  for (const v of maintenanceAlerts) {
    const dates = [v.testExpiryDate, v.insuranceValidUntil, v.towingValidUntil, v.liftingInspectionExpiry].filter(Boolean);
    if (dates.some((d) => d! <= in30)) expiryAlerts++;
  }

  const activity = [
    ...workLogs.map((l) => ({
      id: l.id,
      type: "machinery" as const,
      title: `${l.driverName || (l.operator ? `${l.operator.firstName} ${l.operator.lastName}` : "ללא שם")} — ${l.machineryUnit?.name || "מכונה"}`,
      subtitle: `${Number(l.acresWorked)} דונם | ${l.plotName || l.plot?.nameHe || "—"}`,
      time: l.createdAt.toISOString(),
      syncStatus: l.syncStatus,
      gps: l.gpsLat && l.gpsLng ? { lat: l.gpsLat, lng: l.gpsLng } : null,
    })),
    ...fuelTx.map((t) => ({
      id: t.id,
      type: "fuel" as const,
      title: `${t.recipient?.name || t.licensePlate || t.vehicle?.licensePlate} — ${Number(t.liters)} ליטר`,
      subtitle: `₪${Number(t.totalCost || 0).toFixed(0)} | ${t.source?.name || ""}`,
      time: t.createdAt.toISOString(),
      syncStatus: t.syncStatus,
      gps: t.gpsLat && t.gpsLng ? { lat: t.gpsLat, lng: t.gpsLng } : null,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 20);

  const payload = {
    range: { start, end },
    stats: {
      totalAcres: Math.round(totalAcres * 10) / 10,
      totalFuel: Math.round(totalFuel),
      totalFuelCost: Math.round(totalFuelCost),
      operators,
      workLogsCount: workLogs.length,
      fuelLogsCount: fuelTx.length,
      attendanceCount: attendance,
      pendingSync,
      alerts: fuelAlerts + expiryAlerts,
      expiryAlerts,
      employeesCount,
      customersCount,
      vehiclesCount,
      pendingApprovals: pendingTasks + pendingAtt,
      ledgerMovements:
        (typeof ledgerCount === "number" ? ledgerCount : 0) +
        (typeof customerLedgerCount === "number" ? customerLedgerCount : 0),
      tanksCount: lowFuel.length,
    },
    activity,
    fuelLevels: lowFuel.map((s) => ({
      name: s.name,
      current: Number(s.currentLevel),
      capacity: s.capacityLiters ? Number(s.capacityLiters) : null,
    })),
  };
  cacheSet(cacheKey, payload, 8_000);
  return NextResponse.json(payload);
  } catch (e) {
    return handleApiAuth(e);
  }
}
