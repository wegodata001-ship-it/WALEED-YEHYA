"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/AppNav";

export type DeptTab = { id: string; label: string };

type Props = {
  title: string;
  subtitle?: string;
  tabs: DeptTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  filter?: ReactNode;
  children: ReactNode;
};

export function DepartmentLayout({
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  filter,
  children,
}: Props) {
  return (
    <AppShell title={title} subtitle={subtitle} wide>
      <div className="sub-tabs" role="tablist" aria-label={`תת־לשוניות ${title}`}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`sub-tab ${activeTab === t.id ? "sub-tab-active" : ""}`}
            onClick={() => onTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {filter}
      {children}
    </AppShell>
  );
}
