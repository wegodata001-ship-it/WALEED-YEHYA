import { AppShell } from "@/components/AppNav";
import { WorkScheduleSection } from "@/components/dept/WorkScheduleSection";

export const dynamic = "force-dynamic";

export default function SchedulePage() {
  return (
    <AppShell title="סידור עבודה" subtitle="יצירה, שיוך לעובדים ומעקב סטטוסים בזמן אמת">
      <WorkScheduleSection />
    </AppShell>
  );
}
