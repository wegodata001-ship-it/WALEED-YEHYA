"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Fuel, ClipboardCheck, Users, LogOut, Clock, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { isOwnerRole } from "@/lib/roles";

type User = { firstName: string; lastName: string; role: string; employeeId?: string | null };

export default function MobilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [hours, setHours] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.firstName) setUser(d);
      });
    const now = new Date();
    fetch(`/api/attendance?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
      .then((r) => r.json())
      .then((d) => setHours(d.summary?.totalHours || 0))
      .catch(() => {});
  }, []);

  const isWarehouse = user?.role === "WAREHOUSE_MANAGER";
  const isField = user?.role === "FIELD_OPERATOR";
  const isManager = user?.role ? isOwnerRole(user.role) : false;

  const quickActions = [
    ...(isField
      ? [{ title: "המשימות שלי", icon: ClipboardCheck, href: "/mobile/tasks", color: "bg-primary", desc: "סמן השלמה בלבד" }]
      : !isWarehouse
        ? [{ title: "יומן עבודה", icon: ClipboardCheck, href: "/mobile/machinery", color: "bg-primary", desc: "רישום מלא" }]
        : []),
    { title: "תדלוק", icon: Fuel, href: "/mobile/fuel", color: "bg-[#c26a12]", desc: "רכב / מיכל / חיצוני" },
    {
      title: isWarehouse ? "כניסה / יציאה" : "נוכחות ושעות",
      icon: isWarehouse ? Clock : Users,
      href: "/mobile/attendance",
      color: "bg-[#3d6b2e]",
      desc: hours ? `${hours} ש׳ החודש` : "דיווח וכרטסת",
    },
  ];

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="min-h-screen text-white" style={{ background: "linear-gradient(165deg,#1e3318 0%,#3d6b2e 55%,#243d1c 100%)" }}>
      <header className="px-4 py-6">
        <div className="flex justify-between items-start">
          <div>
            <Link href="/" className="block">
              <p className="text-[#d4b44a] text-sm font-semibold hover:underline">WALLED YEHYA GROUP</p>
              <h1 className="text-2xl font-extrabold mt-1">ממשק שטח</h1>
            </Link>
            {user && <p className="text-emerald-100/80 text-sm mt-1 font-medium">שלום, {user.firstName}</p>}
          </div>
          <button onClick={logout} className="p-2 rounded-lg bg-white/10" type="button">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="px-4 pb-8 space-y-3">
        {isManager && (
          <Link
            href="/"
            className="flex items-center gap-4 rounded-2xl border-2 border-[#d4b44a]/60 bg-[#d4b44a]/15 p-4 text-white active:scale-[0.98] transition-transform"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#c4a035] text-[#1e3318]">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-lg font-extrabold block">חזרה ללוח בקרה</span>
              <span className="text-xs text-emerald-100/80">ממשק מנהל מלא</span>
            </div>
            <ArrowRight className="h-5 w-5 text-[#d4b44a] rotate-180" />
          </Link>
        )}

        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-4 rounded-2xl bg-white p-4 text-primary-dark active:scale-[0.98] transition-transform"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${action.color}`}>
              <action.icon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-lg font-extrabold block">{action.title}</span>
              <span className="text-xs text-muted">{action.desc}</span>
            </div>
            <ArrowRight className="h-5 w-5 text-muted rotate-180" />
          </Link>
        ))}
      </main>
    </div>
  );
}
