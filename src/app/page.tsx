import { AppShell } from "@/components/AppNav";
import { DashboardClient } from "@/components/DashboardClient";

export default function HomePage() {
  return (
    <AppShell title="לוח בקרה" subtitle="WALLED YEHYA GROUP">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 card-shadow">
        <div>
          <p className="text-sm font-bold text-primary-dark">WALLED YEHYA GROUP</p>
          <p className="text-xs text-muted">סיכום לפי מחלקה — מכונות · תפעול · כספים · רכב · לקוחות · עובדים</p>
        </div>
      </div>

      <DashboardClient />
    </AppShell>
  );
}
