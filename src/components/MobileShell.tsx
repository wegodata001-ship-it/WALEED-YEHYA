"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { isOwnerRole } from "@/lib/roles";

export function MobileShell({
  title,
  subtitle,
  children,
  backHref = "/mobile",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  backHref?: string;
}) {
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.role && isOwnerRole(d.role)) setIsManager(true);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary-dark text-white px-4 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between gap-2 mb-2">
          <Link href={backHref} className="flex items-center gap-1 text-[#d4b44a] text-sm font-semibold">
            <ArrowRight className="h-4 w-4 rotate-180" />
            חזרה
          </Link>
          {isManager && (
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#c4a035] px-2.5 py-1 text-xs font-bold text-[#1e3318]"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              לוח בקרה
            </Link>
          )}
        </div>
        <h1 className="text-xl font-bold">{title}</h1>
        {subtitle && <p className="text-emerald-100/70 text-sm mt-0.5">{subtitle}</p>}
      </header>
      <main className="p-4 pb-24 max-w-lg mx-auto">{children}</main>
    </div>
  );
}
