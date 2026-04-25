import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-guard";
import { AdminLoginForm } from "./form";

export const metadata = { title: "Admin · Ingresar" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getAdminSession();
  const sp = await searchParams;
  if (session) redirect(sp.next ?? "/admin");
  return <AdminLoginForm next={sp.next} />;
}
