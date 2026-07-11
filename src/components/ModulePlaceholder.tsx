import Link from "next/link";
import { AppShell } from "@/components/AppNav";

export default function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <AppShell title={title} subtitle={description}>
      <div className="rounded-lg border border-border bg-card p-8 text-center card-shadow">
        <p className="text-muted">מודול זה בפיתוח — יושק בשלב הבא</p>
        <Link href="/" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
          חזרה ללוח הבקרה
        </Link>
      </div>
    </AppShell>
  );
}
