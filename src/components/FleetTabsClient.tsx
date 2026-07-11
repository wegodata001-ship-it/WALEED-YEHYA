"use client";

import { useState } from "react";
import { FleetPageClient, type VehicleRow } from "@/components/FleetPageClient";
import { FleetMaintenancePanel } from "@/components/FleetMaintenancePanel";
import { DepartmentLayout } from "@/components/DepartmentLayout";

const TABS = [
  { id: "register", label: "רישום ועריכה" },
  { id: "maintenance", label: "טיפולים והתראות" },
];

export function FleetTabsClient({ initialVehicles }: { initialVehicles: VehicleRow[] }) {
  const [tab, setTab] = useState("register");

  return (
    <DepartmentLayout
      title="כלי רכב"
      subtitle="רישום צי · טסט · ביטוח · יומן טיפולים"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === "register" ? (
        <FleetPageClient initialVehicles={initialVehicles} embedded />
      ) : (
        <FleetMaintenancePanel />
      )}
    </DepartmentLayout>
  );
}
