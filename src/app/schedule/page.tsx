import { AppShell } from "@/components/AppNav";
import { WorkScheduleLazy } from "@/components/lazy/DeptLazy";

export const dynamic = "force-dynamic";

export default function SchedulePage() {
  return (
    <AppShell title="סידור עבודה" subtitle="יצירה, שיוך לעובדים ומעקב סטטוסים בזמן אמת">
      <WorkScheduleLazy />
    </AppShell>
  );
}
