"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";

export type SelectOption = { id: string; label: string };

type Props = {
  label: string;
  required?: boolean;
  value: string;
  options: SelectOption[];
  placeholder?: string;
  allowCreate?: boolean;
  disabled?: boolean;
  onChange: (label: string, option?: SelectOption) => void;
  onCreate?: (label: string) => Promise<SelectOption | null>;
};

export function SearchableSelect({
  label,
  required,
  value,
  options,
  placeholder = "חפש או בחר...",
  allowCreate = true,
  disabled,
  onChange,
  onCreate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [creating, setCreating] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const exactMatch = options.find(
    (o) => o.label.trim().toLowerCase() === query.trim().toLowerCase()
  );
  const showCreate =
    allowCreate &&
    onCreate &&
    query.trim().length > 0 &&
    !exactMatch;

  const pick = (opt: SelectOption) => {
    onChange(opt.label, opt);
    setQuery(opt.label);
    setOpen(false);
  };

  const create = async () => {
    if (!onCreate || !query.trim()) return;
    setCreating(true);
    try {
      const created = await onCreate(query.trim());
      if (created) pick(created);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-xs font-bold mb-1">
        {label}
        {required ? " *" : ""}
      </label>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
        <input
          disabled={disabled}
          value={query}
          required={required}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            onChange(e.target.value);
          }}
          className="field-input pr-10"
          autoComplete="off"
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => pick(o)}
              className={`w-full text-right px-3 py-2 text-sm hover:bg-muted/20 ${
                o.label === value ? "bg-primary/10 font-bold" : ""
              }`}
            >
              {o.label}
            </button>
          ))}
          {filtered.length === 0 && !showCreate && (
            <p className="px-3 py-2 text-xs text-muted">לא נמצאו תוצאות</p>
          )}
          {showCreate && (
            <button
              type="button"
              disabled={creating}
              onClick={create}
              className="w-full text-right px-3 py-2.5 text-sm font-bold text-primary border-t border-border hover:bg-primary/5 inline-flex items-center justify-end gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              {creating ? "שומר..." : `הוסף ערך חדש: "${query.trim()}"`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
