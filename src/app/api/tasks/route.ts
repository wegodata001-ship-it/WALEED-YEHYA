import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { parseDateRange } from "@/lib/dateRange";
import { ApiAuthError, handleApiAuth, requireAuthUser, requireManager } from "@/lib/api-auth";
import { isEmployeeRole, isManagerRole } from "@/lib/roles";
import {
  encodeTaskDescription,
  getTaskMedia,
  parseSessionMeta,
  parseVehicleFromDescription,
  parseUnitLabelFromDescription,
  resolveMeterKind,
  resolveTaskDisplayFields,
  serializeSessionMeta,
  stripTaskTags,
  type TaskProgressReport,
} from "@/lib/field-task-utils";
import { quantityUnitDisplayLabel, parseScheduleQuantityUnit } from "@/lib/constants";
import { compareTaskQuantities } from "@/lib/task-quantity";
import { findOpenShift, SHIFT_GATE_ERRORS } from "@/lib/shift-gate";

const REPORTABLE_STATUSES = new Set(["IN_PROGRESS", "AWAITING_COMPLETION"]);
const QUANTITY_EPS = 0.01;

function serializeTask(t: {
  id: string;
  workDate: Date;
  settlement: string | null;
  customerName: string | null;
  plotName: string | null;
  plannedQuantity: { toString(): string } | number;
  reportedQuantity: { toString(): string } | number | null;
  quantityUnit: string;
  taskDescription: string | null;
  actualNotes: string | null;
  status: string;
  approvalStatus: string;
  completedAt: Date | null;
  assigneeId: string;
  machineryUnitId: string | null;
  assignee?: { id?: string; firstName: string; lastName: string };
  machineryUnit?: { id?: string; name: string } | null;
}) {
  const session = parseSessionMeta(t.actualNotes);
  const media = getTaskMedia(session);
  const vehiclePlate = parseVehicleFromDescription(t.taskDescription);
  const display = resolveTaskDisplayFields(t);
  const unitLabel = display.unitLabel ?? parseUnitLabelFromDescription(t.taskDescription);
  const plannedQuantity = Number(t.plannedQuantity);
  const reportedQuantity = t.reportedQuantity != null ? Number(t.reportedQuantity) : null;
  const quantityComparison = compareTaskQuantities(plannedQuantity, reportedQuantity, t.quantityUnit);
  const progressReports = Array.isArray(session.progressReports) ? session.progressReports : [];
  return {
    ...t,
    plannedQuantity,
    reportedQuantity,
    remainingQuantity: quantityComparison.remaining,
    progressReports,
    quantityComparison,
    vehiclePlate,
    managerNotes: stripTaskTags(t.taskDescription),
    material: display.material,
    plot: display.plot,
    unitLabel,
    quantityUnitLabel: quantityUnitDisplayLabel(t.quantityUnit, unitLabel),
    workType: display.workType,
    session,
    meterReading: session.meterReading ?? null,
    meterKind: session.meterKind ?? resolveMeterKind({ machineryUnitId: t.machineryUnitId, vehiclePlate }),
    employeeNotes: session.employeeNotes || (t.status === "COMPLETED" && !session.startedAt ? t.actualNotes : null),
    media,
    photoUrls: session.photoUrls || media.map((m) => m.path),
    startedAt: session.startedAt || null,
    completedAt: t.completedAt ? t.completedAt.toISOString() : session.completedAt || null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    const { searchParams } = new URL(req.url);
    const mine = searchParams.get("mine") === "1";

    if (isEmployeeRole(user.role)) {
      if (!mine || !user.employeeId) {
        throw new ApiAuthError(403, "אין הרשאה");
      }
    }

    const org = await getDefaultOrg();
    const status = searchParams.get("status");
    const statuses = searchParams.get("statuses");
    const { start, end } = parseDateRange(searchParams);

    const statusFilter = statuses
      ? { in: statuses.split(",").map((s) => s.trim()).filter(Boolean) }
      : status
        ? status
        : undefined;

    const tasks = await prisma.fieldTask.findMany({
      where: {
        organizationId: org.id,
        workDate: { gte: start, lt: end },
        ...(mine && user.employeeId ? { assigneeId: user.employeeId } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        machineryUnit: { select: { id: true, name: true } },
      },
      orderBy: [{ workDate: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(tasks.map(serializeTask));
  } catch (e) {
    return handleApiAuth(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireManager();
    const body = await req.json();
    const org = await getDefaultOrg();

    const workDateRaw = body.workDate || new Date();
    const workTime = body.workTime as string | undefined;
    const workDate = new Date(workDateRaw);
    if (workTime && /^\d{1,2}:\d{2}$/.test(workTime)) {
      const [h, m] = workTime.split(":").map(Number);
      workDate.setHours(h, m, 0, 0);
    }

    if (!body.customerName?.trim()) {
      return NextResponse.json({ error: "חובה למלא לקוח" }, { status: 400 });
    }

    const qtyParsed = body.quantityUnitUi
      ? parseScheduleQuantityUnit(body.quantityUnitUi)
      : { quantityUnit: body.quantityUnit || "DUNAM", unitLabel: body.unitLabel };

    const task = await prisma.fieldTask.create({
      data: {
        organizationId: org.id,
        assigneeId: body.assigneeId,
        workDate,
        machineryUnitId: body.machineryUnitId || null,
        settlement: body.settlement || body.address || null,
        customerName: body.customerName.trim(),
        plotName: body.plotName || body.plot || body.workType || null,
        plannedQuantity: Number(body.plannedQuantity ?? 1),
        quantityUnit: qtyParsed.quantityUnit || "DUNAM",
        taskDescription: encodeTaskDescription({
          vehiclePlate: body.vehiclePlate,
          material: body.material,
          unitLabel: qtyParsed.unitLabel,
          notes: body.taskDescription || body.notes || null,
        }),
        status: "ASSIGNED",
        approvalStatus: "PENDING",
        createdById: user.id,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        machineryUnit: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(serializeTask(task), { status: 201 });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה ביצירת סידור עבודה" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const user = await requireAuthUser();
    if (!body.id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

    const task = await prisma.fieldTask.findUnique({
      where: { id: body.id },
      include: { assignee: { select: { firstName: true, lastName: true } } },
    });
    if (!task) return NextResponse.json({ error: "סידור עבודה לא נמצא" }, { status: 404 });

    const isEmployeeTaskAction =
      body.action === "start" || body.action === "complete" || body.action === "progress";
    const isManagerAction = body.action === "approve" || body.action === "adjust";

    if (isEmployeeTaskAction) {
      if (isEmployeeRole(user.role)) {
        if (!user.employeeId || task.assigneeId !== user.employeeId) {
          throw new ApiAuthError(403, "אין הרשאה");
        }
      } else if (!isManagerRole(user.role)) {
        throw new ApiAuthError(403, "אין הרשאה");
      }
    } else if (isManagerAction) {
      if (!isManagerRole(user.role)) throw new ApiAuthError(403, "אין הרשאה");
    } else {
      return NextResponse.json({ error: "פעולה לא ידועה" }, { status: 400 });
    }

    if (body.action === "start") {
      if (task.status !== "ASSIGNED") {
        return NextResponse.json({ error: "העבודה כבר התחילה או הסתיימה" }, { status: 400 });
      }

      // Business rule: assignee must be on an open attendance shift
      const org = await getDefaultOrg();
      const openShift = await findOpenShift(org.id, task.assigneeId);
      if (!openShift) {
        return NextResponse.json(
          {
            error: SHIFT_GATE_ERRORS.NO_OPEN_SHIFT,
            code: "NO_OPEN_SHIFT",
          },
          { status: 409 }
        );
      }

      const updated = await prisma.fieldTask.update({
        where: { id: body.id },
        data: {
          status: "IN_PROGRESS",
          actualNotes: serializeSessionMeta({ startedAt: new Date().toISOString() }),
        },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true } },
          machineryUnit: { select: { id: true, name: true } },
        },
      });
      return NextResponse.json(serializeTask(updated));
    }

    if (body.action === "complete" || body.action === "progress") {
      if (!REPORTABLE_STATUSES.has(task.status)) {
        return NextResponse.json(
          { error: "ניתן לדווח ביצוע רק על משימה בטיפול" },
          { status: 400 }
        );
      }

      const vehiclePlate = parseVehicleFromDescription(task.taskDescription);
      const meterKind = resolveMeterKind({ machineryUnitId: task.machineryUnitId, vehiclePlate });
      let meterReading: number | undefined;
      if (meterKind) {
        meterReading = body.meterReading != null ? Number(body.meterReading) : NaN;
        if (!Number.isFinite(meterReading) || meterReading < 0) {
          return NextResponse.json(
            { error: meterKind === "engine_hours" ? "יש למלא שעות מנוע נוכחיות" : "יש למלא קילומטרים נוכחיים" },
            { status: 400 }
          );
        }
      }

      if (body.reportedQuantity == null || body.reportedQuantity === "") {
        return NextResponse.json({ error: "יש למלא כמות שבוצעה" }, { status: 400 });
      }
      // Body quantity = this session's added amount (not cumulative total)
      const increment = Number(body.reportedQuantity);
      if (!Number.isFinite(increment) || increment <= 0) {
        return NextResponse.json({ error: "כמות שבוצעה חייבת להיות גדולה מאפס" }, { status: 400 });
      }

      const planned = Number(task.plannedQuantity);
      const previousTotal = task.reportedQuantity != null ? Number(task.reportedQuantity) : 0;
      const newTotal = Math.round((previousTotal + increment) * 1000) / 1000;
      const remainingAfter = Math.round((planned - newTotal) * 1000) / 1000;
      const isFullyDone = remainingAfter <= QUANTITY_EPS;

      const existing = parseSessionMeta(task.actualNotes);
      const media = Array.isArray(body.media)
        ? body.media
            .filter(
              (m: unknown) =>
                m &&
                typeof m === "object" &&
                "path" in m &&
                typeof (m as { path: unknown }).path === "string"
            )
            .map((m: { path: string; kind?: string; mimeType?: string }) => ({
              path: m.path,
              kind: m.kind === "video" ? ("video" as const) : ("image" as const),
              mimeType: m.mimeType || (m.kind === "video" ? "video/mp4" : "image/jpeg"),
            }))
        : [];
      const legacyPhotoUrls = Array.isArray(body.photoUrls)
        ? body.photoUrls.filter((u: unknown) => typeof u === "string")
        : [];

      const reportedAt = new Date().toISOString();
      const progressEntry: TaskProgressReport = {
        at: reportedAt,
        quantity: increment,
        totalAfter: newTotal,
        notes: body.actualNotes || body.employeeNotes || null,
        media: media.length > 0 ? media : undefined,
      };
      const progressReports = [...(existing.progressReports || []), progressEntry];
      const mergedMedia = [...(existing.media || []), ...media];
      const mergedLegacy =
        media.length === 0 && legacyPhotoUrls.length > 0
          ? [...(existing.photoUrls || []), ...legacyPhotoUrls]
          : existing.photoUrls;

      const sessionMeta = serializeSessionMeta({
        startedAt: existing.startedAt || reportedAt,
        completedAt: isFullyDone ? reportedAt : undefined,
        media: mergedMedia.length > 0 ? mergedMedia : undefined,
        photoUrls: mergedMedia.length === 0 && mergedLegacy && mergedLegacy.length > 0 ? mergedLegacy : undefined,
        employeeNotes: body.actualNotes || body.employeeNotes || existing.employeeNotes || null,
        progressReports,
        ...(meterKind && meterReading != null ? { meterReading, meterKind } : {}),
      });

      const hasMedia = media.length > 0 || legacyPhotoUrls.length > 0;
      const needsReview =
        !isFullyDone ||
        Math.abs(newTotal - planned) > QUANTITY_EPS ||
        hasMedia ||
        Boolean(body.actualNotes);

      const updated = await prisma.fieldTask.update({
        where: { id: body.id },
        data: {
          reportedQuantity: newTotal,
          actualNotes: sessionMeta,
          // Partial progress stays IN_PROGRESS ("בטיפול") until planned qty is met
          status: isFullyDone ? "COMPLETED" : "IN_PROGRESS",
          completedAt: isFullyDone ? new Date() : null,
          approvalStatus: isFullyDone ? (needsReview ? "PENDING" : "APPROVED") : "PENDING",
        },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true } },
          machineryUnit: { select: { id: true, name: true } },
        },
      });

      const org = await getDefaultOrg();
      await prisma.machineryWorkLog.create({
        data: {
          organizationId: org.id,
          machineryUnitId: task.machineryUnitId,
          workDate: task.workDate,
          operatorId: task.assigneeId,
          driverName: `${updated.assignee.firstName} ${updated.assignee.lastName}`,
          settlement: task.settlement,
          customerName: task.customerName,
          plotName: task.plotName,
          quantityUnit: task.quantityUnit,
          acresWorked: increment,
          plannedQuantity: planned,
          reportedQuantity: newTotal,
          approvalStatus: isFullyDone ? (needsReview ? "PENDING" : "APPROVED") : "PENDING",
          notes: body.actualNotes || stripTaskTags(task.taskDescription) || task.taskDescription,
          createdById: user.id,
          syncStatus: "SYNCED",
        },
      });

      return NextResponse.json(serializeTask(updated));
    }

    if (body.action === "approve" || body.action === "adjust") {
      const finalQty = body.finalQuantity != null ? Number(body.finalQuantity) : undefined;
      const updated = await prisma.fieldTask.update({
        where: { id: body.id },
        data: {
          approvalStatus: body.action === "approve" || body.approvalStatus === "APPROVED" ? "APPROVED" : body.approvalStatus,
          ...(finalQty != null ? { reportedQuantity: finalQty } : {}),
          status: "COMPLETED",
        },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true } },
          machineryUnit: { select: { id: true, name: true } },
        },
      });

      if (finalQty != null) {
        await prisma.machineryWorkLog.updateMany({
          where: {
            operatorId: updated.assigneeId,
            workDate: updated.workDate,
            customerName: updated.customerName,
            plotName: updated.plotName,
          },
          data: {
            acresWorked: finalQty,
            reportedQuantity: finalQty,
            approvalStatus: "APPROVED",
          },
        });
      } else {
        await prisma.machineryWorkLog.updateMany({
          where: {
            operatorId: updated.assigneeId,
            workDate: updated.workDate,
            approvalStatus: "PENDING",
          },
          data: { approvalStatus: "APPROVED" },
        });
      }

      return NextResponse.json(serializeTask(updated));
    }

    return NextResponse.json({ error: "פעולה לא ידועה" }, { status: 400 });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה בעדכון סידור עבודה" }, { status: 500 });
  }
}
