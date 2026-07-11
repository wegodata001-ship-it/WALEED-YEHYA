"use client";

import type { ReactNode } from "react";
import { Pencil } from "lucide-react";

export type WorkCardField = { label: string; value: ReactNode };

type Props = {
  date?: string | null;
  title: ReactNode;
  subtitle?: ReactNode;
  fields: WorkCardField[];
  qtyLabel?: string;
  qty?: ReactNode;
  notes?: string | null;
  onEdit?: () => void;
  onClick?: () => void;
  footer?: ReactNode;
  className?: string;
};

export function WorkCardDetail({
  date,
  title,
  subtitle,
  fields,
  qtyLabel = "כמות",
  qty,
  notes,
  onEdit,
  onClick,
  footer,
  className = "",
}: Props) {
  const Tag = onClick ? "button" : "article";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`work-card work-card--detail text-right ${onClick ? "cursor-pointer w-full" : ""} ${className}`}
    >
      <header className="work-card-head">
        <div className="min-w-0">
          {date ? <p className="work-card-date">{date}</p> : null}
          <h3 className="work-card-title">{title}</h3>
          {subtitle ? <p className="work-card-type">{subtitle}</p> : null}
        </div>
        {onEdit ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="work-card-edit"
            title="עריכה"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </header>

      {fields.length > 0 && (
        <dl className="work-card-fields">
          {fields.map((f) => (
            <div key={f.label} className="work-card-field">
              <dt>{f.label}</dt>
              <dd>{f.value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      )}

      {qty != null && qty !== "" ? (
        <footer className="work-card-qty">
          <span>{qtyLabel}</span>
          <strong>{qty}</strong>
        </footer>
      ) : null}

      {footer}

      {notes ? <p className="work-card-notes">{notes}</p> : null}
    </Tag>
  );
}
