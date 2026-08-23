import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { handleApiAuth, requireManager } from "@/lib/api-auth";
import { cacheGet, cacheSet } from "@/lib/ttl-cache";
import { parseFuelLitersFromNotes } from "@/lib/vehicle-fuel";

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

  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  const now = new Date();
  const weekStart = new Date(today0.getTime() - 7 * 86400000);
  const monthStart = new Date(today0.getTime() - 30 * 86400000);

  const [
    workLogs,
    fuelTx,
    attendance,
    pendingMachinery,
    pendingFuel,
    lowFuel,
    maintenanceAlerts,
    vehiclesForFuel,
    machinesForFuel,
    fuelOutTodayAgg,
    fuelOutWeekAgg,
    fuelOutMonthAgg,
    employeesCount,
    customersCount,
    vehiclesCount,
    pendingTasks,
    pendingAtt,
    ledgerCount,
    customerLedgerCount,
    tasksAgg,
    tasksByStatus,
  ] = await Promise.all([
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
    prisma.vehicle.findMany({
      where: { organizationId: org.id, isActive: true },
      select: { id: true, licensePlate: true, make: true, model: true, notes: true },
    }),
    prisma.machineryUnit.findMany({
      where: { organizationId: org.id, isActive: true, vehicleId: { not: null } },
      select: {
        id: true,
        name: true,
        unitType: true,
        vehicle: { select: { licensePlate: true, notes: true } },
      },
    }),
    prisma.fuelTransaction.aggregate({
      where: { organizationId: org.id, transactionDate: { gte: today0, lt: now }, transactionType: { in: ["REFUEL_VEHICLE", "SUBCONTRACTOR_CHARGE"] } },
      _sum: { liters: true },
    }),
    prisma.fuelTransaction.aggregate({
      where: { organizationId: org.id, transactionDate: { gte: weekStart, lt: now }, transactionType: { in: ["REFUEL_VEHICLE", "SUBCONTRACTOR_CHARGE"] } },
      _sum: { liters: true },
    }),
    prisma.fuelTransaction.aggregate({
      where: { organizationId: org.id, transactionDate: { gte: monthStart, lt: now }, transactionType: { in: ["REFUEL_VEHICLE", "SUBCONTRACTOR_CHARGE"] } },
      _sum: { liters: true },
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
    prisma.fieldTask.aggregate({
      where: { organizationId: org.id, workDate: { gte: start, lt: end } },
      _sum: { plannedQuantity: true, reportedQuantity: true },
    }),
    prisma.fieldTask.groupBy({
      by: ["status"],
      where: { organizationId: org.id, workDate: { gte: start, lt: end } },
      _count: { _all: true },
    }),
  ]);

  const pendingSync = pendingMachinery + pendingFuel;
  const totalAcres = workLogs.reduce((s, l) => s + Number(l.acresWorked), 0);
  const totalFuel = fuelTx.reduce((s, t) => s + Number(t.liters), 0);
  const totalFuelCost = fuelTx.reduce((s, t) => s + Number(t.totalCost || 0), 0);
  const operators = new Set(workLogs.map((l) => l.operatorId).filter(Boolean)).size;

  const plannedTasksQty = Number((tasksAgg as { _sum?: { plannedQuantity?: unknown } })._sum?.plannedQuantity || 0);
  const reportedTasksQty = Number((tasksAgg as { _sum?: { reportedQuantity?: unknown } })._sum?.reportedQuantity || 0);
  const remainingTasksQty = plannedTasksQty - reportedTasksQty;

  const statusCounts = new Map<string, number>();
  for (const row of (tasksByStatus as { status: string; _count: { _all: number } }[]) || []) {
    statusCounts.set(row.status, Number(row._count?._all || 0));
  }
  const tasksWaiting = (statusCounts.get("ASSIGNED") || 0) + (statusCounts.get("PENDING") || 0);
  const tasksInProgress =
    (statusCounts.get("IN_PROGRESS") || 0) + (statusCounts.get("AWAITING_COMPLETION") || 0);
  const tasksCompleted = statusCounts.get("COMPLETED") || 0;

  const fuelAlerts = lowFuel.filter(
    (s) => s.capacityLiters && Number(s.currentLevel) / Number(s.capacityLiters) < 0.2
  ).length;

  const fuelStockLiters = lowFuel.reduce((s, t) => s + Number(t.currentLevel), 0);
  const fuelConsumptionToday = Number((fuelOutTodayAgg as { _sum?: { liters?: unknown } })._sum?.liters || 0);
  const fuelConsumptionWeek = Number((fuelOutWeekAgg as { _sum?: { liters?: unknown } })._sum?.liters || 0);
  const fuelConsumptionMonth = Number((fuelOutMonthAgg as { _sum?: { liters?: unknown } })._sum?.liters || 0);

  const lowFuelVehicles = (vehiclesForFuel as { id: string; licensePlate: string; make: string | null; model: string | null; notes: string | null }[])
    .map((v) => ({ ...v, fuelLiters: parseFuelLitersFromNotes(v.notes) }))
    .filter((v) => v.fuelLiters != null && Number(v.fuelLiters) < 15)
    .slice(0, 8);

  const lowFuelMachines = (machinesForFuel as { id: string; name: string; unitType: string; vehicle: { licensePlate: string; notes: string | null } | null }[])
    .map((m) => ({ ...m, fuelLiters: parseFuelLitersFromNotes(m.vehicle?.notes) }))
    .filter((m) => m.fuelLiters != null && Number(m.fuelLiters) < 15)
    .slice(0, 8);

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
      fuelStockLiters: Math.round(fuelStockLiters),
      fuelConsumptionToday: Math.round(fuelConsumptionToday),
      fuelConsumptionWeek: Math.round(fuelConsumptionWeek),
      fuelConsumptionMonth: Math.round(fuelConsumptionMonth),
      operators,
      workLogsCount: workLogs.length,
      fuelLogsCount: fuelTx.length,
      attendanceCount: attendance,
      tasksWaiting,
      tasksInProgress,
      tasksCompleted,
      tasksPlannedTotal: Math.round(plannedTasksQty * 10) / 10,
      tasksReportedTotal: Math.round(reportedTasksQty * 10) / 10,
      tasksRemainingTotal: Math.round(remainingTasksQty * 10) / 10,
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
    fuel: {
      lowVehicles: lowFuelVehicles.map((v) => ({
        id: v.id,
        licensePlate: v.licensePlate,
        name: v.model || v.make || v.licensePlate,
        fuelLiters: Number(v.fuelLiters),
      })),
      lowMachines: lowFuelMachines.map((m) => ({
        id: m.id,
        name: m.name,
        licensePlate: m.vehicle?.licensePlate || null,
        fuelLiters: Number(m.fuelLiters),
      })),
    },
  };
  cacheSet(cacheKey, payload, 8_000);
  return NextResponse.json(payload);
  } catch (e) {
    return handleApiAuth(e);
  }
}
