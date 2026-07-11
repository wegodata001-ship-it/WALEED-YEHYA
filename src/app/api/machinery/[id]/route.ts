import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/org";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUser();
    const { id } = await params;
    const body = await req.json();

    const log = await prisma.machineryWorkLog.update({
      where: { id },
      data: {
        ...(body.driverName !== undefined ? { driverName: String(body.driverName) || null } : {}),
        ...(body.settlement !== undefined ? { settlement: String(body.settlement) || null } : {}),
        ...(body.customerName !== undefined ? { customerName: String(body.customerName) || null } : {}),
        ...(body.plotName !== undefined ? { plotName: String(body.plotName) || null } : {}),
        ...(body.acresWorked !== undefined ? { acresWorked: Number(body.acresWorked), reportedQuantity: Number(body.acresWorked) } : {}),
        ...(body.notes !== undefined ? { notes: String(body.notes) || null } : {}),
        ...(body.materialType !== undefined ? { materialType: body.materialType || null } : {}),
        ...(body.approvalStatus !== undefined ? { approvalStatus: String(body.approvalStatus) } : {}),
        ...(body.plannedQuantity !== undefined ? { plannedQuantity: Number(body.plannedQuantity) } : {}),
      },
    });

    return NextResponse.json(log);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "שגיאה בעדכון יומן" }, { status: 500 });
  }
}
