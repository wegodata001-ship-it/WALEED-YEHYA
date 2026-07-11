import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrg } from "@/lib/org";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { CommunicationChannel, CommunicationStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const org = await getDefaultOrg();
    const phone = body.phone || org.managerPhone || process.env.WHATSAPP_MANAGER_PHONE;

    if (!phone) {
      return NextResponse.json({ error: "לא הוגדר מספר WhatsApp למנהל" }, { status: 400 });
    }

    const url = buildWhatsAppUrl(phone, body.message);

    await prisma.communicationLog.create({
      data: {
        organizationId: org.id,
        channel: CommunicationChannel.WHATSAPP,
        recipientPhone: phone,
        recipientName: body.recipientName || "מנהל",
        message: body.message,
        entityType: body.entityType || null,
        entityId: body.entityId || null,
        status: CommunicationStatus.SENT,
      },
    });

    if (body.entityType === "MachineryWorkLog" && body.entityId) {
      await prisma.machineryWorkLog.update({
        where: { id: body.entityId },
        data: { whatsappShared: true },
      });
    }
    if (body.entityType === "FuelTransaction" && body.entityId) {
      await prisma.fuelTransaction.update({
        where: { id: body.entityId },
        data: { whatsappShared: true },
      });
    }

    return NextResponse.json({ url, phone });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "שגיאה בשליחת WhatsApp" }, { status: 500 });
  }
}
