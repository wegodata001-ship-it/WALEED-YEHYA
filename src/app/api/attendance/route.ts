import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { parseDateRange } from "@/lib/dateRange";
import { ApiAuthError, handleApiAuth, requireAuthUser, requireManager } from "@/lib/api-auth";
import { isEmployeeRole } from "@/lib/roles";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    const { searchParams } = new URL(req.url);
    const org = await getDefaultOrg();

    let employeeId = searchParams.get("employeeId") || user.employeeId || undefined;
    if (isEmployeeRole(user.role)) {
      if (!user.employeeId) throw new ApiAuthError(403, "אין הרשאה");
      employeeId = user.employeeId;
    }

    const { start, end, year, month } = parseDateRange(searchParams);

  const where = {
    organizationId: org.id,
    workDate: { gte: start, lt: end },
    ...(employeeId ? { employeeId } : {}),
  };

  const records = await prisma.attendanceRecord.findMany({
    where,
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
      timeEntries: true,
    },
    orderBy: { workDate: "desc" },
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const openToday = employeeId
    ? await prisma.attendanceRecord.findFirst({
        where: {
          organizationId: org.id,
          employeeId,
          workDate: { gte: todayStart, lt: todayEnd },
          checkIn: { not: null },
          checkOut: null,
          status: "PRESENT",
        },
        orderBy: { createdAt: "desc" },
      })
    : null;

  let totalHours = 0;
  for (const r of records) {
    if (r.checkIn && r.checkOut) {
      totalHours += (r.checkOut.getTime() - r.checkIn.getTime()) / 3600000;
    }
    for (const t of r.timeEntries) totalHours += Number(t.hours);
  }

  return NextResponse.json({
    records,
    openToday,
    summary: {
      year,
      month,
      days: records.length,
      totalHours: Math.round(totalHours * 10) / 10,
      pendingApprovals: records.filter((r) => r.approvalStatus === "PENDING").length,
    },
  });
  } catch (e) {
    return handleApiAuth(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const org = await getDefaultOrg();
    const user = await requireAuthUser();

    const action = body.action || "create";
    let employeeId = body.employeeId || user.employeeId;

    if (isEmployeeRole(user.role)) {
      if (!user.employeeId) throw new ApiAuthError(403, "אין הרשאה");
      employeeId = user.employeeId;
      if (!["check_in", "check_out", "correction"].includes(action)) {
        throw new ApiAuthError(403, "אין הרשאה");
      }
    }

    if (!employeeId) {
      return NextResponse.json({ error: "לא משויך עובד למשתמש" }, { status: 400 });
    }
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    if (action === "check_in") {
      const existing = await prisma.attendanceRecord.findFirst({
        where: {
          organizationId: org.id,
          employeeId,
          workDate: { gte: todayStart, lt: todayEnd },
          checkOut: null,
        },
      });
      if (existing?.checkIn) {
        return NextResponse.json({ error: "כבר דווחה כניסה היום", record: existing }, { status: 400 });
      }
      const record = await prisma.attendanceRecord.create({
        data: {
          organizationId: org.id,
          employeeId,
          workDate: todayStart,
          status: "PRESENT",
          checkIn: new Date(),
          photoUrl: typeof body.photoUrl === "string" && body.photoUrl.trim() ? body.photoUrl.trim() : null,
          createdById: user.id,
          syncStatus: "SYNCED",
          approvalStatus: "APPROVED",
        },
        include: { employee: true },
      });
      return NextResponse.json(record, { status: 201 });
    }

    if (action === "check_out") {
      const open = await prisma.attendanceRecord.findFirst({
        where: {
          organizationId: org.id,
          employeeId,
          workDate: { gte: todayStart, lt: todayEnd },
          checkIn: { not: null },
          checkOut: null,
        },
        orderBy: { createdAt: "desc" },
      });
      if (!open) {
        return NextResponse.json({ error: "אין כניסה פתוחה להיום" }, { status: 400 });
      }
      const checkOut = new Date();
      const hours = (checkOut.getTime() - (open.checkIn?.getTime() || checkOut.getTime())) / 3600000;
      const record = await prisma.attendanceRecord.update({
        where: { id: open.id },
        data: {
          checkOut,
          timeEntries: {
            create: [{ entryType: "REGULAR", hours: Math.round(hours * 100) / 100 }],
          },
        },
        include: { employee: true, timeEntries: true },
      });
      return NextResponse.json(record);
    }

    if (action === "correction") {
      const record = await prisma.attendanceRecord.create({
        data: {
          organizationId: org.id,
          employeeId,
          workDate: body.workDate ? new Date(body.workDate) : todayStart,
          status: "PRESENT",
          checkIn: body.checkIn ? new Date(body.checkIn) : null,
          checkOut: body.checkOut ? new Date(body.checkOut) : null,
          correctionNote: body.correctionNote || body.notes || "בקשת תיקון נוכחות",
          notes: body.notes || null,
          approvalStatus: "PENDING",
          createdById: user.id,
          syncStatus: "SYNCED",
          timeEntries: body.hours
            ? { create: [{ entryType: "REGULAR", hours: Number(body.hours) }] }
            : undefined,
        },
        include: { employee: true, timeEntries: true },
      });
      return NextResponse.json(record, { status: 201 });
    }

    const record = await prisma.attendanceRecord.create({
      data: {
        organizationId: org.id,
        clientId: body.clientId || null,
        employeeId,
        workDate: new Date(body.workDate || new Date()),
        status: body.status || "PRESENT",
        checkIn: body.checkIn ? new Date(body.checkIn) : new Date(),
        checkOut: body.checkOut ? new Date(body.checkOut) : null,
        taskDescription: body.taskDescription || null,
        plotId: body.plotId || null,
        notes: body.notes || null,
        correctionNote: body.correctionNote || null,
        approvalStatus: body.approvalStatus || "APPROVED",
        gpsLat: body.gpsLat ?? null,
        gpsLng: body.gpsLng ?? null,
        photoUrl: body.photoUrl || null,
        createdById: user.id,
        syncStatus: "SYNCED",
        timeEntries: body.hours
          ? {
              create: [
                { entryType: "REGULAR", hours: Number(body.hours) },
                ...(body.overtimeHours
                  ? [{ entryType: "OVERTIME" as const, hours: Number(body.overtimeHours) }]
                  : []),
              ],
            }
          : undefined,
      },
      include: { employee: true, timeEntries: true },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה בשמירת נוכחות" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireManager();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

    const record = await prisma.attendanceRecord.update({
      where: { id: body.id },
      data: {
        ...(body.approvalStatus ? { approvalStatus: body.approvalStatus } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.checkIn ? { checkIn: new Date(body.checkIn) } : {}),
        ...(body.checkOut ? { checkOut: new Date(body.checkOut) } : {}),
      },
      include: { employee: true, timeEntries: true },
    });
    return NextResponse.json(record);
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה בעדכון נוכחות" }, { status: 500 });
  }
}
