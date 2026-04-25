import { listBranchesAction } from "@/lib/actions/branches";
import { BranchesView } from "./view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sucursales" };

export default async function BranchesPage() {
  const branches = await listBranchesAction();
  return <BranchesView branches={branches} />;
}
