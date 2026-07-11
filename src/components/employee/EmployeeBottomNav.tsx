"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Clock, FileText, History, UserRound } from "lucide-react";

const NAV = [
  { href: "/employee/schedule", label: "סידור", icon: CalendarDays },
  { href: "/employee/history", label: "היסטוריה", icon: History },
  { href: "/employee/attendance", label: "נוכחות", icon: Clock },
  { href: "/employee/reports", label: "דיווחים", icon: FileText },
  { href: "/employee/profile", label: "פרופיל", icon: UserRound },
];

export function EmployeeBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border safe-area-pb">
      <div className="flex justify-around items-center max-w-6xl mx-auto px-1 py-2">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 min-w-0 flex-1 ${
                active ? "text-primary" : "text-muted"
              }`}
            >
              <item.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
              <span className="text-[10px] font-bold truncate w-full text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
