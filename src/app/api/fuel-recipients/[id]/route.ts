import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiAuthError, handleApiAuth, requireManager } from "@/lib/api-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const body = await req.json();

    const updated = await prisma.fuelRecipient.update({
      where: { id },
      data: {
        ...(body.pricePerLiter !== undefined ? { pricePerLiter: Number(body.pricePerLiter) } : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    console.error(e);
    return NextResponse.json({ error: "שגיאה בעדכון נמען" }, { status: 500 });
  }
}
