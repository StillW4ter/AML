import { notFound, redirect } from "next/navigation";
import { getCurrentUser, canManage } from "@/lib/auth";
import { getFlowById } from "@/lib/quote/flows";
import { FlowBuilder } from "@/components/crm/flow-builder";

export const dynamic = "force-dynamic";

export default async function FlowEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManage(user.role)) {
    return (
      <div className="grid h-full place-items-center bg-[#f6f7f9] p-8 text-center">
        <p className="text-sm font-semibold text-[#1f2430]">Managers only</p>
      </div>
    );
  }

  const { id } = await params;
  const flow = await getFlowById(id);
  if (!flow) notFound();

  return <FlowBuilder initialFlow={flow} />;
}
