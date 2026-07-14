"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FleetPageClient, type VehicleRow } from "@/components/FleetPageClient";
import { FleetMaintenancePanel } from "@/components/FleetMaintenancePanel";
import { MachineryPageClient } from "@/components/MachineryPageClient";
import { DepartmentLayout } from "@/components/DepartmentLayout";

const TABS = [
  { id: "register", label: "רישום ועריכה" },
  { id: "journal", label: "יומן עבודה" },
  { id: "maintenance", label: "טיפולים והתראות" },
];

export function FleetTabsClient({ initialVehicles }: { initialVehicles: VehicleRow[] }) {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [tab, setTab] = useState(() =>
    tabFromUrl === "journal" || tabFromUrl === "maintenance" ? tabFromUrl : "register"
  );

  useEffect(() => {
    if (tabFromUrl === "journal" || tabFromUrl === "maintenance" || tabFromUrl === "register") {
      setTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  return (
    <DepartmentLayout
      title="כלי רכב"
      subtitle="רכבי חברה · רכבי קבלן · מכונות · טיפולים"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === "register" ? (
        <FleetPageClient initialVehicles={initialVehicles} embedded />
      ) : tab === "journal" ? (
        <MachineryPageClient embedded />
      ) : (
        <FleetMaintenancePanel />
      )}
    </DepartmentLayout>
  );
}
