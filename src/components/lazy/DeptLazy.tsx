"use client";

import dynamic from "next/dynamic";
import { SmallLoader } from "@/components/ui/SmallLoader";

const fallback = <SmallLoader className="min-h-[40vh]" />;

/** Lazy-loaded heavy department clients — split JS for faster first paint. */

export const OperationsDeptLazy = dynamic(
  () =>
    import("@/components/OperationsDeptClient").then((m) => m.OperationsDeptClient),
  { loading: () => fallback, ssr: false }
);

export const EmployeesDeptLazy = dynamic(
  () =>
    import("@/components/EmployeesDeptClient").then((m) => m.EmployeesDeptClient),
  { loading: () => fallback, ssr: false }
);

export const CustomersDeptLazy = dynamic(
  () =>
    import("@/components/CustomersDeptClient").then((m) => m.CustomersDeptClient),
  { loading: () => fallback, ssr: false }
);

export const WorkScheduleLazy = dynamic(
  () =>
    import("@/components/dept/WorkScheduleSection").then((m) => m.WorkScheduleSection),
  { loading: () => fallback, ssr: false }
);

export const FuelPageLazy = dynamic(
  () => import("@/components/FuelPageClient").then((m) => m.FuelPageClient),
  { loading: () => fallback, ssr: false }
);

export const DashboardLazy = dynamic(
  () => import("@/components/DashboardClient").then((m) => m.DashboardClient),
  { loading: () => fallback, ssr: false }
);
