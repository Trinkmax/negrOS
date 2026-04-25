import { listAccountsAction } from "@/lib/actions/accounts";
import { listBranchesAction } from "@/lib/actions/branches";
import { AccountsView } from "./view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cuentas" };

export default async function AccountsPage() {
  const [accounts, branches] = await Promise.all([
    listAccountsAction(),
    listBranchesAction(),
  ]);
  return <AccountsView accounts={accounts} branches={branches} />;
}
