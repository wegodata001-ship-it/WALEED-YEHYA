import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { canViewPayroll } from "@/lib/roles";
import { FinanceDeptClient } from "@/components/FinanceDeptClient";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const user = await getSessionUser();
  if (!user || !canViewPayroll(user.role)) {
    redirect("/");
  }
  return <FinanceDeptClient />;
}
