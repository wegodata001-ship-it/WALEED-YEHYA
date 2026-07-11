import Link from "next/link";
import { AppShell } from "@/components/AppNav";
import { DashboardClient } from "@/components/DashboardClient";
import { Smartphone } from "lucide-react";

export default function HomePage() {
  return (
    <AppShell title="לוח בקרה" subtitle="WALLED YEHYA GROUP">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 card-shadow">
        <div>
          <p className="text-sm font-bold text-primary-dark">WALLED YEHYA GROUP</p>
          <p className="text-xs text-muted">סיכום לפי מחלקה — מכונות · תפעול · כספים · רכב · לקוחות · עובדים</p>
        </div>
        <Link
          href="/employee"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          <Smartphone className="h-4 w-4" /> ממשק עובד
        </Link>
      </div>

      <DashboardClient />
    </AppShell>
  );
}
