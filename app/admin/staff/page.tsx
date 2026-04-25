import { listStaffAction } from "@/lib/actions/staff";
import { listBranchesAction } from "@/lib/actions/branches";
import { StaffView } from "./view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff" };

export default async function StaffAdminPage() {
  const [staff, branches] = await Promise.all([
    listStaffAction(),
    listBranchesAction(),
  ]);
  return <StaffView staff={staff} branches={branches} />;
}
