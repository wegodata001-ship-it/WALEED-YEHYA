"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EmployeeBottomNav } from "@/components/employee/EmployeeBottomNav";

export function EmployeeShell({
  title,
  subtitle,
  children,
  backHref = "/employee",
  wide = false,
  showNav = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  backHref?: string;
  wide?: boolean;
  showNav?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary-dark text-white px-4 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between gap-2 mb-2">
          <Link href={backHref} className="flex items-center gap-1 text-[#d4b44a] text-sm font-semibold">
            <ArrowRight className="h-4 w-4 rotate-180" />
            חזרה
          </Link>
        </div>
        <h1 className="text-xl font-bold">{title}</h1>
        {subtitle && <p className="text-emerald-100/70 text-sm mt-0.5">{subtitle}</p>}
      </header>
      <main className={`p-4 mx-auto ${showNav ? "pb-24" : "pb-8"} ${wide ? "max-w-6xl" : "max-w-lg"}`}>
        {children}
      </main>
      {showNav && <EmployeeBottomNav />}
    </div>
  );
}

/** @deprecated Use EmployeeShell — kept for gradual migration */
export const MobileShell = EmployeeShell;
