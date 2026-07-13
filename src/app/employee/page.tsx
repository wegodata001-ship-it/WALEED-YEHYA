"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Clock, FileText, Fuel, History, LogOut, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

type User = { firstName: string; lastName: string; role: string; employeeId?: string | null };

export default function EmployeeHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.firstName) setUser(d);
      });
    const now = new Date();
    fetch(`/api/tasks?mine=1&year=${now.getFullYear()}&month=${now.getMonth() + 1}&statuses=ASSIGNED,IN_PROGRESS`)
      .then((r) => r.json())
      .then((d) => setOpenCount(Array.isArray(d) ? d.length : 0))
      .catch(() => {});
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const menu = [
    {
      title: "סידור העבודה שלי",
      icon: CalendarDays,
      href: "/employee/schedule",
      color: "bg-primary",
      desc: openCount ? `${openCount} עבודות פתוחות` : "העבודות של היום",
    },
    {
      title: "היסטוריית המשימות שלי",
      icon: History,
      href: "/employee/history",
      color: "bg-[#2d6a4f]",
      desc: "כל העבודות שביצעת",
    },
    {
      title: "דיווח תדלוק",
      icon: Fuel,
      href: "/employee/fuel",
      color: "bg-[#8b4513]",
      desc: "רכב חברה, קבלן או מילוי מיכל",
    },
    {
      title: "הנוכחות שלי",
      icon: Clock,
      href: "/employee/attendance",
      color: "bg-[#2d4a8a]",
      desc: "כניסה, יציאה והיסטוריה",
    },
    {
      title: "דיווחים",
      icon: FileText,
      href: "/employee/reports",
      color: "bg-[#c26a12]",
      desc: "יומן עבודה אישי",
    },
    {
      title: "הפרופיל שלי",
      icon: UserRound,
      href: "/employee/profile",
      color: "bg-[#5c4d7a]",
      desc: "פרטים אישיים",
    },
  ];

  return (
    <div className="min-h-screen text-white" style={{ background: "linear-gradient(165deg,#1e3318 0%,#3d6b2e 55%,#243d1c 100%)" }}>
      <header className="px-4 py-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[#d4b44a] text-sm font-semibold">WALLED YEHYA GROUP</p>
            <h1 className="text-2xl font-extrabold mt-1">ממשק עובד</h1>
            {user && <p className="text-emerald-100/80 text-sm mt-1 font-medium">שלום, {user.firstName}</p>}
          </div>
          <button onClick={logout} className="p-2 rounded-lg bg-white/10" type="button">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="px-4 pb-8 space-y-3">
        {menu.map((action) => (
          <Link
            key={action.href + action.title}
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
