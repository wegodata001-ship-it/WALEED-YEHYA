import { redirect } from "next/navigation";

export default function MobileAttendanceRedirect() {
  redirect("/employee/attendance");
}
