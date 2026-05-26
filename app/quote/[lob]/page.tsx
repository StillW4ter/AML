import Link from "next/link";
import { getActiveFlowForLob } from "@/lib/quote/flows";
import { QuoteForm } from "@/components/quote/quote-form";

export const dynamic = "force-dynamic";

export default async function QuotePage({
  params,
}: {
  params: Promise<{ lob: string }>;
}) {
  const { lob } = await params;
  const flow = await getActiveFlowForLob(lob);

  if (!flow) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-[#fee2e2] text-[#b91c1c]">
          !
        </span>
        <h1 className="mt-4 text-xl font-bold text-[#1f2430]">
          This quote form isn&rsquo;t ready yet.
        </h1>
        <p className="mt-2 text-sm text-[#6b7280]">
          A manager can configure it in Settings &rarr; Quote flows.
        </p>
        <Link
          href="/crm/settings"
          className="mt-6 rounded-lg bg-[#4f46e5] px-4 py-2 text-sm font-semibold text-white"
        >
          Open CRM
        </Link>
      </main>
    );
  }

  return <QuoteForm flow={flow} />;
}
