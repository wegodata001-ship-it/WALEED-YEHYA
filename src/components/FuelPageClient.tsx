"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Smartphone, Table2, List, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppNav";
import { FuelGridClient } from "@/components/FuelGridClient";
import { FUEL_SOURCE_LABELS, FUEL_RECIPIENT_LABELS } from "@/lib/constants";

type Transaction = {
  id: string;
  transactionDate: string;
  liters: number;
  totalCost: number | null;
  licensePlate: string | null;
  vehicle: { licensePlate: string } | null;
  operator: { firstName: string; lastName: string } | null;
  source: { name: string } | null;
  recipient: { name: string; category: string } | null;
};

type Source = {
  id: string;
  name: string;
  sourceType: string;
  capacityLiters: number | null;
  currentLevel: number;
};

export function FuelPageClient() {
  const [tab, setTab] = useState<"grid" | "list">("grid");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    Promise.all([
      fetch("/api/fuel?limit=200", { signal: controller.signal }).then((r) => r.json()),
      fetch("/api/lookup", { signal: controller.signal }).then((r) => r.json()),
    ])
      .then(([tx, lookup]) => {
        if (Array.isArray(tx)) {
          setTransactions(
            tx.map((t: Transaction & { liters: unknown }) => ({
              ...t,
              liters: Number(t.liters),
              totalCost: t.totalCost ? Number(t.totalCost) : null,
            }))
          );
        }
        if (lookup?.fuelSources) {
          setSources(
            lookup.fuelSources.map((s: Source & { currentLevel?: unknown; capacityLiters?: unknown }) => ({
              ...s,
              currentLevel: Number(s.currentLevel ?? 0),
              capacityLiters: s.capacityLiters ? Number(s.capacityLiters) : null,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timer);
        setLoading(false);
      });
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  const totalLiters = transactions.reduce((s, t) => s + Number(t.liters), 0);

  return (
    <AppShell
      title="מעקב דלק"
      subtitle={`טבלה חודשית · עובדים ולקוחות חיצוניים | ${totalLiters.toFixed(0)} ליטר`}
      wide
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 border-b border-border">
          <button
            onClick={() => setTab("grid")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${
              tab === "grid" ? "border-primary text-primary" : "border-transparent text-muted"
            }`}
          >
            <Table2 className="h-4 w-4" /> טבלת דלק חודשית
          </button>
          <button
            onClick={() => setTab("list")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${
              tab === "list" ? "border-primary text-primary" : "border-transparent text-muted"
            }`}
          >
            <List className="h-4 w-4" /> רשימת תדלוקים
          </button>
        </div>
        <Link
          href="/mobile/fuel"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          <Smartphone className="h-4 w-4" />
          רישום שטח
        </Link>
      </div>

      {!loading && sources.length > 0 && (
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          {sources.map((s) => {
            const pct = s.capacityLiters
              ? Math.round((Number(s.currentLevel) / Number(s.capacityLiters)) * 100)
              : 0;
            return (
              <div
                key={s.id}
                className={`rounded-lg border px-3 py-2 card-shadow ${
                  pct < 25 ? "border-danger/50 bg-red-50" : "border-border bg-card"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="text-xs text-muted">{FUEL_SOURCE_LABELS[s.sourceType]}</p>
                  </div>
                  <p className="text-xl font-bold tabular-nums">{Number(s.currentLevel).toFixed(0)} ל׳</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "grid" ? (
        <FuelGridClient initialYear={2024} initialMonth={6} />
      ) : loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card card-shadow">
          <table className="w-full text-sm">
            <thead className="bg-background">
              <tr>
                <th className="p-3 text-right font-semibold">תאריך</th>
                <th className="p-3 text-right font-semibold">עמודה / נמען</th>
                <th className="p-3 text-right font-semibold">סוג</th>
                <th className="p-3 text-right font-semibold">רישוי</th>
                <th className="p-3 text-right font-semibold">ליטרים</th>
                <th className="p-3 text-right font-semibold">עלות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-background/50">
                  <td className="p-3">{new Date(t.transactionDate).toLocaleDateString("he-IL")}</td>
                  <td className="p-3 font-medium">{t.recipient?.name || "—"}</td>
                  <td className="p-3 text-xs">
                    {t.recipient ? FUEL_RECIPIENT_LABELS[t.recipient.category] : "—"}
                  </td>
                  <td className="p-3 font-mono">{t.licensePlate || t.vehicle?.licensePlate || "—"}</td>
                  <td className="p-3 font-bold">{Number(t.liters)}</td>
                  <td className="p-3">₪{Number(t.totalCost || 0).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && <p className="p-8 text-center text-muted">אין תדלוקים — התחל מממשק השטח</p>}
        </div>
      )}
    </AppShell>
  );
}
