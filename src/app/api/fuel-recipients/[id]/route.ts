import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
}
