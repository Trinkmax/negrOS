import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/staff-session";
import { listLoginStaffAction } from "@/lib/actions/staff-auth";
import { LoginWizard } from "./login-wizard";

export const metadata = { title: "Ingresar" };

export default async function StaffLoginPage() {
  const session = await getStaffSession();
  if (session) redirect("/staff");
  const staff = await listLoginStaffAction();
  return <LoginWizard staffList={staff} />;
}
