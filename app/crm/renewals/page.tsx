import { getRenewals } from "@/lib/crm/queries";
import { sweepNow } from "@/lib/crm/renewal-sweep";
import { RenewalsView } from "@/components/crm/renewals-view";

export const dynamic = "force-dynamic";

export default async function RenewalsPage() {
  // Force a fresh sweep so renewal notifications + auto-deals stay in sync.
  await sweepNow().catch(() => undefined);
  const renewals = await getRenewals();
  return <RenewalsView renewals={renewals} />;
}
