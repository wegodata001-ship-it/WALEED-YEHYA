"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppNav";
import { InlineLoader, SmallLoader } from "@/components/ui/SmallLoader";

type SubRow = {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxId: string | null;
  notes: string | null;
  isActive: boolean;
  _count?: { jobs: number; ledgerEntries: number; fuelTransactions: number };
};

type Detail = SubRow & {
  jobs: { id: string; jobDate: string; description: string | null; totalAmount: number | null; status: string }[];
  ledgerEntries: {
    id: string;
    entryDate: string;
    entryType: string;
    category: string;
    amount: number;
    description: string;
  }[];
  fuelTransactions: {
    id: string;
    transactionDate: string;
    liters: number;
    totalCost: number | null;
    licensePlate: string | null;
    vehicle: { licensePlate: string } | null;
  }[];
};

const emptyForm = () => ({
  name: "",
  company: "",
  phone: "",
  address: "",
  notes: "",
});

export function SubcontractorsPageClient() {
  const [rows, setRows] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<SubRow | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDesc, setPayDesc] = useState("תשלום");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/subcontractors?all=${showAll}`);
      const data = await res.json();
      if (Array.isArray(data)) setRows(data);
    } finally {
      setLoading(false);
    }
  }, [showAll]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (id: string) => {
    const res = await fetch(`/api/subcontractors/${id}`);
    const data = await res.json();
    if (res.ok) setDetail(data);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const payload = {
        name: form.name.trim(),
        contactPerson: form.company.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      };
      const url = modal === "edit" && editing ? `/api/subcontractors/${editing.id}` : "/api/subcontractors";
      const method = modal === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "שגיאה");
        return;
      }
      setModal(null);
      setEditing(null);
      setForm(emptyForm());
      await load();
    } finally {
      setSaving(false);
    }
  };

  const archive = async (id: string) => {
    await fetch(`/api/subcontractors/${id}?mode=archive`, { method: "DELETE" });
    await load();
    if (detail?.id === id) setDetail(null);
  };

  const hardDelete = async (id: string) => {
    if (!confirm("מחיקה לצמיתות? כולל כרטסת ועבודות.")) return;
    await fetch(`/api/subcontractors/${id}?mode=hard`, { method: "DELETE" });
    await load();
    if (detail?.id === id) setDetail(null);
  };

  const addPayment = async () => {
    if (!detail) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const res = await fetch(`/api/subcontractors/${detail.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ledger",
        amount,
        description: payDesc || "תשלום",
        entryType: "CREDIT",
        category: "JOB_PAYMENT",
      }),
    });
    if (res.ok) {
      setPayAmount("");
      await openDetail(detail.id);
    }
  };

  const activeCount = useMemo(() => rows.filter((r) => r.isActive).length, [rows]);

  return (
    <AppShell title="קבלני משנה" subtitle={`${activeCount} פעילים · רשימה · כרטסת · ארכיון`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          הצג גם בארכיון
        </label>
        <button
          type="button"
          onClick={() => {
            setForm(emptyForm());
            setEditing(null);
            setModal("add");
          }}
          className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" /> הוסף קבלן
        </button>
      </div>

      {loading ? (
        <SmallLoader />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card card-shadow">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="border-b bg-muted/30 text-xs text-muted">
                <th className="px-3 py-2.5 font-bold">שם</th>
                <th className="px-3 py-2.5 font-bold">חברה / איש קשר</th>
                <th className="px-3 py-2.5 font-bold">טלפון</th>
                <th className="px-3 py-2.5 font-bold">סטטוס</th>
                <th className="px-3 py-2.5 font-bold">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-bold text-primary-dark">{r.name}</td>
                  <td className="px-3 py-2.5">{r.contactPerson || r.taxId || "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.phone || "—"}</td>
                  <td className="px-3 py-2.5">{r.isActive ? "פעיל" : "ארכיון"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button type="button" className="text-xs font-bold text-primary" onClick={() => openDetail(r.id)}>
                        כרטיס
                      </button>
                      <button
                        type="button"
                        className="text-xs font-bold text-primary inline-flex items-center gap-1"
                        onClick={() => {
                          setEditing(r);
                          setForm({
                            name: r.name,
                            company: r.contactPerson || "",
                            phone: r.phone || "",
                            address: r.address || "",
                            notes: r.notes || "",
                          });
                          setModal("edit");
                        }}
                      >
                        <Pencil className="h-3 w-3" /> עריכה
                      </button>
                      {r.isActive && (
                        <button
                          type="button"
                          className="text-xs font-bold text-amber-700 inline-flex items-center gap-1"
                          onClick={() => archive(r.id)}
                        >
                          <Archive className="h-3 w-3" /> ארכיון
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-xs font-bold text-danger inline-flex items-center gap-1"
                        onClick={() => hardDelete(r.id)}
                      >
                        <Trash2 className="h-3 w-3" /> מחיקה
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-8 text-center text-muted">אין קבלני משנה</p>}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModal(null)} />
          <form onSubmit={save} className="relative bg-card rounded-2xl border p-5 w-full max-w-md space-y-3 card-shadow">
            <h3 className="font-bold text-lg">{modal === "add" ? "קבלן חדש" : "עריכת קבלן"}</h3>
            <input required className="field-input" placeholder="שם" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="field-input" placeholder="חברה / איש קשר" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <input className="field-input" placeholder="טלפון" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="field-input" placeholder="כתובת" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <textarea className="field-input min-h-[70px]" placeholder="הערות" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            {msg && <p className="text-sm text-danger font-semibold">{msg}</p>}
            <button type="submit" disabled={saving} className="w-full rounded-xl bg-primary py-3 text-white font-extrabold disabled:opacity-50 inline-flex justify-center gap-2">
              {saving ? <><InlineLoader /> שומר...</> : "שמור"}
            </button>
          </form>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetail(null)} />
          <div className="relative bg-card rounded-2xl border p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 card-shadow">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg">{detail.name}</h3>
                <p className="text-sm text-muted">{detail.contactPerson || "—"} · {detail.phone || "—"}</p>
                <p className="text-sm text-muted">{detail.address || ""}</p>
                {detail.notes && <p className="text-sm mt-1">{detail.notes}</p>}
              </div>
              <button type="button" className="rounded-lg border px-2 py-1 text-xs font-bold" onClick={() => setDetail(null)}>
                סגור
              </button>
            </div>

            <section>
              <h4 className="font-bold mb-2">כרטסת / תשלומים</h4>
              <div className="flex gap-2 mb-2">
                <input type="number" className="field-input" placeholder="סכום" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                <input className="field-input" placeholder="תיאור" value={payDesc} onChange={(e) => setPayDesc(e.target.value)} />
                <button type="button" onClick={addPayment} className="rounded-xl bg-primary px-3 text-white text-xs font-bold whitespace-nowrap">
                  הוסף
                </button>
              </div>
              <div className="rounded-xl border max-h-40 overflow-auto">
                <table className="w-full text-xs">
                  <tbody className="divide-y">
                    {detail.ledgerEntries.map((e) => (
                      <tr key={e.id}>
                        <td className="p-2">{new Date(e.entryDate).toLocaleDateString("he-IL")}</td>
                        <td className="p-2">{e.description}</td>
                        <td className="p-2 font-bold">₪{Number(e.amount).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {detail.ledgerEntries.length === 0 && <p className="p-3 text-muted text-center">אין תנועות</p>}
              </div>
            </section>

            <section>
              <h4 className="font-bold mb-2">היסטוריית עבודות</h4>
              <div className="rounded-xl border max-h-40 overflow-auto">
                <table className="w-full text-xs">
                  <tbody className="divide-y">
                    {detail.jobs.map((j) => (
                      <tr key={j.id}>
                        <td className="p-2">{new Date(j.jobDate).toLocaleDateString("he-IL")}</td>
                        <td className="p-2">{j.description || j.status}</td>
                        <td className="p-2">{j.totalAmount != null ? `₪${Number(j.totalAmount).toFixed(0)}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {detail.jobs.length === 0 && <p className="p-3 text-muted text-center">אין עבודות</p>}
              </div>
            </section>

            <section>
              <h4 className="font-bold mb-2">תדלוקים / כלי רכב</h4>
              <div className="rounded-xl border max-h-40 overflow-auto">
                <table className="w-full text-xs">
                  <tbody className="divide-y">
                    {detail.fuelTransactions.map((t) => (
                      <tr key={t.id}>
                        <td className="p-2">{new Date(t.transactionDate).toLocaleDateString("he-IL")}</td>
                        <td className="p-2">{t.licensePlate || t.vehicle?.licensePlate || "—"}</td>
                        <td className="p-2 font-bold">{Number(t.liters).toFixed(0)} ל׳</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {detail.fuelTransactions.length === 0 && <p className="p-3 text-muted text-center">אין תדלוקים</p>}
              </div>
            </section>
          </div>
        </div>
      )}
    </AppShell>
  );
}
