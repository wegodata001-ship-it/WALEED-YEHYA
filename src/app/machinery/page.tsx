import { redirect } from "next/navigation";

/** Legacy route — machinery registry & journal live under /fleet */
export default function MachineryAdminRedirect() {
  redirect("/fleet?tab=journal");
}
