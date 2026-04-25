import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-guard";
import { AdminShell } from "./admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  // /admin/login se renderiza sin shell (lo controla el page mismo)
  // Si entra a /admin/* sin sesión, el proxy ya redirige.
  if (!session) {
    return <>{children}</>;
  }
  return <AdminShell session={session}>{children}</AdminShell>;
}
