import { listReceiptsAction } from "@/lib/actions/receipts";
import { listBranchesAction } from "@/lib/actions/branches";
import { listAccountsAction } from "@/lib/actions/accounts";
import { listStaffAction } from "@/lib/actions/staff";
import { ReceiptsView } from "./view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comprobantes" };

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    branch?: string;
    account?: string;
    staff?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const filters = {
    from: sp.from ? new Date(sp.from).toISOString() : undefined,
    to: sp.to ? new Date(sp.to).toISOString() : undefined,
    branchIds: sp.branch ? sp.branch.split(",") : undefined,
    accountIds: sp.account ? sp.account.split(",") : undefined,
    staffIds: sp.staff ? sp.staff.split(",") : undefined,
    page: sp.page ? Math.max(0, parseInt(sp.page, 10) || 0) : 0,
    pageSize: 50,
  };

  const [{ rows, total, page, pageSize }, branches, accounts, staff] =
    await Promise.all([
      listReceiptsAction(filters),
      listBranchesAction(),
      listAccountsAction(),
      listStaffAction(),
    ]);

  return (
    <ReceiptsView
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      branches={branches}
      accounts={accounts}
      staff={staff}
    />
  );
}
