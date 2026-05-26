import { getBoardData } from "@/lib/crm/queries";
import { PipelineView } from "@/components/crm/agent-workspace";

export const dynamic = "force-dynamic";

export default async function CrmPipelinePage() {
  const board = await getBoardData();

  if (!board) {
    return (
      <div className="grid h-full place-items-center bg-[#f6f7f9] p-8 text-center">
        <div>
          <p className="text-sm font-semibold text-[#1f2430]">
            No pipeline found
          </p>
          <p className="mt-1 text-[13px] text-[#6b7280]">
            Run{" "}
            <code className="rounded bg-[#e6e8ec] px-1.5 py-0.5 font-mono text-[12px]">
              npm run db:seed
            </code>{" "}
            to create the demo pipeline and deals.
          </p>
        </div>
      </div>
    );
  }

  return <PipelineView board={board} />;
}
