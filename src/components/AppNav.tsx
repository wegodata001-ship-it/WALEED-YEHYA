"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Tractor,
  CircleDot,
  LayoutDashboard,
  Smartphone,
  LogOut,
  Briefcase,
  Wallet,
  Users,
  UserRound,
  CalendarDays,
} from "lucide-react";

const NAV = [
  { href: "/", label: "לוח בקרה", icon: LayoutDashboard },
  { href: "/schedule", label: "סידור עבודה", icon: CalendarDays },
  { href: "/machinery", label: "מכונות", icon: Tractor },
  { href: "/operations", label: "תפעול", icon: Briefcase },
  { href: "/finance", label: "כספים", icon: Wallet },
  { href: "/fleet", label: "כלי רכב", icon: CircleDot },
  { href: "/customers", label: "לקוחות", icon: UserRound },
  { href: "/employees", label: "עובדים", icon: Users },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/schedule") return pathname.startsWith("/schedule");
  if (href === "/operations") {
    return pathname.startsWith("/operations") || pathname.startsWith("/fuel");
  }
  if (href === "/finance") {
    return pathname.startsWith("/finance") || pathname.startsWith("/ledger") || pathname.startsWith("/billing");
  }
  if (href === "/employees") {
    return pathname.startsWith("/employees") || pathname.startsWith("/hr");
  }
  if (href === "/customers") {
    return pathname.startsWith("/customers");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppToolbar() {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="app-toolbar sticky top-0 z-50">
      <div className="app-toolbar-inner">
        <Link href="/" className="app-brand shrink-0">
          <span className="app-brand-mark" aria-hidden>
            <Tractor className="h-4 w-4" />
          </span>
          <span className="app-brand-text">
            <span className="app-brand-name">Walled Yehya</span>
            <span className="app-brand-tag">Group</span>
          </span>
        </Link>

        <nav className="app-tabs" aria-label="מחלקות המערכת">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`app-tab ${active ? "app-tab-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="h-3.5 w-3.5 opacity-80" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="app-toolbar-actions shrink-0">
          <Link href="/employee" className="app-action app-action-field">
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">עובדים</span>
          </Link>
          <button type="button" onClick={logout} className="app-action" title="יציאה">
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden md:inline">יציאה</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export function AppPageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="app-page-title">
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}

export function AppFooter() {
  return (
    <footer className="app-footer">
      <strong>WALLED YEHYA GROUP</strong>
      {" · "}חקלאות וקבלנות
      {" · "}נבנתה ע״י <strong>WEGO BUSINESS</strong>
    </footer>
  );
}

export function AppShell({
  title,
  subtitle,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="app-shell">
      <AppToolbar />
      <main className={wide ? "app-main app-main-wide" : "app-main"}>
        <AppPageTitle title={title} subtitle={subtitle} />
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
