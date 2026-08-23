"use client";

import { useEffect, useState } from "react";
import { Table2, List } from "lucide-react";
import { AppShell } from "@/components/AppNav";
import { SmallLoader } from "@/components/ui/SmallLoader";
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

type HistoryTx = {
  id: string;
  transactionDate: string;
  liters: number;
  transactionType: string;
  licensePlate: string | null;
  vehicle: { licensePlate: string } | null;
  operator: { firstName: string; lastName: string } | null;
  recipient: { name: string; category: string } | null;
};

export function FuelPageClient() {
  const [tab, setTab] = useState<"grid" | "list">("grid");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [historySource, setHistorySource] = useState<Source | null>(null);
  const [historyTx, setHistoryTx] = useState<HistoryTx[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  useEffect(() => {
    if (!historySource) return;
    const ac = new AbortController();
    setHistoryLoading(true);
    fetch(`/api/fuel?limit=160&sourceId=${encodeURIComponent(historySource.id)}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setHistoryTx(
            data.map((t: HistoryTx & { liters: unknown; totalCost?: unknown }) => ({
              ...t,
              liters: Number(t.liters),
            }))
          );
        } else setHistoryTx([]);
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
    return () => ac.abort();
  }, [historySource]);

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
                  s.capacityLiters && pct < 20 ? "border-danger/50 bg-red-50" : "border-border bg-card"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="text-xs text-muted">{FUEL_SOURCE_LABELS[s.sourceType]}</p>
                  </div>
                  <p className="text-xl font-bold tabular-nums">{Number(s.currentLevel).toFixed(0)} ל׳</p>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setHistorySource(s)}
                    className="text-xs font-bold text-primary underline"
                  >
                    היסטוריית תדלוקים
                  </button>
                </div>
                {s.capacityLiters != null && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>
                        קיבולת: <span className="font-semibold tabular-nums">{Number(s.capacityLiters).toFixed(0)} ל׳</span>
                      </span>
                      <span className={pct < 20 ? "font-bold text-danger" : "font-bold text-foreground"}>
                        {pct}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className={`h-full ${pct < 20 ? "bg-danger" : "bg-primary"}`}
                        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {historySource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHistorySource(null)} />
          <div className="relative bg-card rounded-2xl border p-5 max-w-lg w-full card-shadow space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg">היסטוריית תנועות דלק</h3>
                <p className="text-sm text-muted">{historySource.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistorySource(null)}
                className="rounded-lg border px-2 py-1 text-xs font-bold"
              >
                סגור
              </button>
            </div>

            {historyLoading ? (
              <div className="py-10 flex justify-center">
                <SmallLoader />
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-xs text-muted">
                    <tr>
                      <th className="p-2 text-right font-bold">תאריך</th>
                      <th className="p-2 text-right font-bold">יעד</th>
                      <th className="p-2 text-right font-bold">ליטרים</th>
                      <th className="p-2 text-right font-bold">עובד</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historyTx.map((t) => (
                      <tr key={t.id} className="hover:bg-muted/20">
                        <td className="p-2 whitespace-nowrap">{new Date(t.transactionDate).toLocaleString("he-IL")}</td>
                        <td className="p-2">
                          {t.licensePlate || t.vehicle?.licensePlate || t.recipient?.name || "—"}
                        </td>
                        <td className="p-2 font-bold tabular-nums">{Number(t.liters).toFixed(0)} ל׳</td>
                        <td className="p-2">
                          {t.operator ? `${t.operator.firstName} ${t.operator.lastName || ""}`.trim() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {historyTx.length === 0 && <p className="p-6 text-center text-muted">אין תנועות</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "grid" ? (
        <FuelGridClient initialYear={2024} initialMonth={6} />
      ) : loading ? (
        <SmallLoader />
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
