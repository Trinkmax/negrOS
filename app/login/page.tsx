import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/staff-session";
import { LoginPin } from "./login-pin";

export const metadata = { title: "Ingresar" };

export default async function StaffLoginPage() {
  const session = await getStaffSession();
  if (session) redirect("/staff");
  return <LoginPin />;
}
