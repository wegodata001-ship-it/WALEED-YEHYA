"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea";
  required?: boolean;
  options?: { value: string; label: string }[];
  colSpan?: 2;
};

type CrudModalProps = {
  open: boolean;
  title: string;
  fields: Field[];
  initial: Record<string, unknown>;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
};

export function CrudModal({ open, title, fields, initial, onClose, onSave }: CrudModalProps) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(form);
      onClose();
    } catch {
      setError("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border card-shadow">
        <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <h3 className="font-bold text-lg text-primary-dark">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-background">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.key} className={f.colSpan === 2 ? "sm:col-span-2" : ""}>
              <label className="block text-sm font-semibold mb-1">
                {f.label}{f.required && <span className="text-danger"> *</span>}
              </label>
              {f.type === "select" ? (
                <select
                  required={f.required}
                  value={String(form[f.key] ?? "")}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="field-input"
                >
                  <option value="">בחר</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  value={String(form[f.key] ?? "")}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="field-input min-h-[80px]"
                  rows={3}
                />
              ) : (
                <input
                  type={f.type || "text"}
                  required={f.required}
                  value={form[f.key] === null || form[f.key] === undefined ? "" : String(form[f.key])}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="field-input"
                />
              )}
            </div>
          ))}
          {error && <p className="sm:col-span-2 text-sm text-danger">{error}</p>}
          <div className="sm:col-span-2 flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-primary py-3 text-white font-semibold hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? "שומר..." : "שמור"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 rounded-xl border border-border py-3 font-medium hover:bg-background"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
