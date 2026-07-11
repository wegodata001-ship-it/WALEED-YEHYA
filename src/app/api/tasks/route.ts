import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg, getCurrentUser } from "@/lib/org";
import { parseDateRange } from "@/lib/dateRange";

export async function GET(req: NextRequest) {
  const org = await getDefaultOrg();
  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "1";
  const status = searchParams.get("status");
  const { start, end } = parseDateRange(searchParams);

  const tasks = await prisma.fieldTask.findMany({
    where: {
      organizationId: org.id,
      workDate: { gte: start, lt: end },
      ...(mine && user.employeeId ? { assigneeId: user.employeeId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true } },
      machineryUnit: { select: { id: true, name: true } },
    },
    orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(
    tasks.map((t) => ({
      ...t,
      plannedQuantity: Number(t.plannedQuantity),
      reportedQuantity: t.reportedQuantity != null ? Number(t.reportedQuantity) : null,
    }))
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const org = await getDefaultOrg();
    const user = await getCurrentUser();

    const task = await prisma.fieldTask.create({
      data: {
        organizationId: org.id,
        assigneeId: body.assigneeId,
        workDate: new Date(body.workDate || new Date()),
        machineryUnitId: body.machineryUnitId || null,
        settlement: body.settlement || null,
        customerName: body.customerName || null,
        plotName: body.plotName || null,
        plannedQuantity: Number(body.plannedQuantity || body.acresWorked || 0),
        quantityUnit: body.quantityUnit || "DUNAM",
        taskDescription: body.taskDescription || null,
        status: "ASSIGNED",
        approvalStatus: "PENDING",
        createdById: user.id,
      },
      include: {
        assignee: { select: { firstName: true, lastName: true } },
        machineryUnit: { select: { name: true } },
      },
    });

    return NextResponse.json(
      { ...task, plannedQuantity: Number(task.plannedQuantity) },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "שגיאה ביצירת משימה" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const user = await getCurrentUser();
    if (!body.id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

    // Field worker completes task
    if (body.action === "complete") {
      const reported = Number(body.reportedQuantity);
      const task = await prisma.fieldTask.findUnique({ where: { id: body.id } });
      if (!task) return NextResponse.json({ error: "משימה לא נמצאה" }, { status: 404 });

      const needsReview = Math.abs(reported - Number(task.plannedQuantity)) > 0.01;
      const updated = await prisma.fieldTask.update({
        where: { id: body.id },
        data: {
          reportedQuantity: reported,
          actualNotes: body.actualNotes || null,
          status: "COMPLETED",
          completedAt: new Date(),
          approvalStatus: needsReview ? "PENDING" : "APPROVED",
        },
        include: {
          assignee: { select: { firstName: true, lastName: true } },
          machineryUnit: { select: { name: true } },
        },
      });

      // Sync / create work log for billing
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
          acresWorked: reported,
          plannedQuantity: Number(task.plannedQuantity),
          reportedQuantity: reported,
          approvalStatus: needsReview ? "PENDING" : "APPROVED",
          notes: body.actualNotes || task.taskDescription,
          createdById: user.id,
          syncStatus: "SYNCED",
        },
      });

      return NextResponse.json({
        ...updated,
        plannedQuantity: Number(updated.plannedQuantity),
        reportedQuantity: updated.reportedQuantity != null ? Number(updated.reportedQuantity) : null,
      });
    }

    // Manager approve / adjust
    if (body.action === "approve" || body.action === "adjust") {
      const finalQty = body.finalQuantity != null ? Number(body.finalQuantity) : undefined;
      const updated = await prisma.fieldTask.update({
        where: { id: body.id },
        data: {
          approvalStatus: body.action === "approve" || body.approvalStatus === "APPROVED" ? "APPROVED" : body.approvalStatus,
          ...(finalQty != null ? { reportedQuantity: finalQty } : {}),
          status: "COMPLETED",
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

      return NextResponse.json({
        ...updated,
        plannedQuantity: Number(updated.plannedQuantity),
        reportedQuantity: updated.reportedQuantity != null ? Number(updated.reportedQuantity) : null,
      });
    }

    return NextResponse.json({ error: "פעולה לא ידועה" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "שגיאה בעדכון משימה" }, { status: 500 });
  }
}
