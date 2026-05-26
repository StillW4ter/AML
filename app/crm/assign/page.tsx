import { getCurrentUser, canManage } from "@/lib/auth";
import { getAssignmentData } from "@/lib/crm/queries";
import { AssignmentView } from "@/components/crm/assignment-view";

export const dynamic = "force-dynamic";

export default async function AssignPage() {
  const user = await getCurrentUser();

  if (!canManage(user?.role)) {
    return (
      <div className="grid h-full place-items-center bg-[#f6f7f9] p-8 text-center">
        <div className="max-w-sm">
          <p className="text-sm font-semibold text-[#1f2430]">
            Managers only
          </p>
          <p className="mt-1 text-[13px] text-[#6b7280]">
            Lead assignment is available to managers and senior agents.
          </p>
        </div>
      </div>
    );
  }

  const data = await getAssignmentData();
  return <AssignmentView data={data} />;
}
