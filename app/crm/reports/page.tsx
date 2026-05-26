import { getReportsData } from "@/lib/crm/queries";
import { ReportsView } from "@/components/crm/reports-view";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const data = await getReportsData();
  return <ReportsView data={data} />;
}
