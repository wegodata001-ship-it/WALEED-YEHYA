import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { FleetTabsClient } from "@/components/FleetTabsClient";
import { SmallLoader } from "@/components/ui/SmallLoader";
import { withOwnershipField } from "@/lib/vehicle-ownership";

export const dynamic = "force-dynamic";

export default async function FleetPage() {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: [{ vehicleType: "asc" }, { licensePlate: "asc" }],
  });

  const serialized = vehicles.map((v) =>
    withOwnershipField({
      id: v.id,
      licensePlate: v.licensePlate,
      vehicleType: v.vehicleType,
      status: v.status,
      make: v.make,
      model: v.model,
      year: v.year,
      testExpiryDate: v.testExpiryDate?.toISOString() ?? null,
      liftingInspectionExpiry: v.liftingInspectionExpiry?.toISOString() ?? null,
      compulsoryInsurance: v.compulsoryInsurance ? Number(v.compulsoryInsurance) : null,
      thirdPartyInsurance: v.thirdPartyInsurance ? Number(v.thirdPartyInsurance) : null,
      insuranceValidUntil: v.insuranceValidUntil?.toISOString() ?? null,
      towingValidUntil: v.towingValidUntil?.toISOString() ?? null,
      windshieldInsurance: v.windshieldInsurance ? Number(v.windshieldInsurance) : null,
      registeredTo: v.registeredTo,
      agentPhone: v.agentPhone,
      notes: v.notes,
      isActive: v.isActive,
    })
  );

  return (
    <Suspense fallback={<SmallLoader className="min-h-[40vh]" />}>
      <FleetTabsClient initialVehicles={serialized} />
    </Suspense>
  );
}
