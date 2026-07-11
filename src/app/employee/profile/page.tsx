"use client";

import { useEffect, useState } from "react";
import { EmployeeShell } from "@/components/EmployeeShell";
import { Loader2, UserRound, Phone, Briefcase } from "lucide-react";

type Me = {
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  employee?: { position: string | null } | null;
};

const ROLE_LABELS: Record<string, string> = {
  FIELD_OPERATOR: "עובד שטח",
  WAREHOUSE_MANAGER: "מנהל מחסן",
  OWNER: "בעלים",
  ADMIN: "מנהל",
};

export default function EmployeeProfilePage() {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.firstName) setUser(d);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <EmployeeShell title="הפרופיל שלי" subtitle="טוען...">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
      </EmployeeShell>
    );
  }

  if (!user) {
    return (
      <EmployeeShell title="הפרופיל שלי">
        <p className="text-center text-muted py-10">לא ניתן לטעון פרטים</p>
      </EmployeeShell>
    );
  }

  return (
    <EmployeeShell title="הפרופיל שלי" subtitle="פרטים אישיים בלבד">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 card-shadow">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <UserRound className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-primary-dark">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm text-muted">{ROLE_LABELS[user.role] || user.role}</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted" />
            <span className="font-semibold">{user.phone}</span>
          </div>
          {user.employee?.position && (
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted" />
              <span>{user.employee.position}</span>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-center text-muted mt-6">שינוי סיסמה יתווסף בשלב הבא</p>
    </EmployeeShell>
  );
}
