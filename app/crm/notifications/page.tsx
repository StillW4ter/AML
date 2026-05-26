import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserNotifications } from "@/lib/crm/notifications";
import { sweepNow } from "@/lib/crm/renewal-sweep";
import { NotificationsView } from "@/components/crm/notifications-view";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Force a fresh renewal sweep so this page always reflects today's state.
  await sweepNow().catch(() => undefined);
  const notifications = await getUserNotifications(user.id);
  return <NotificationsView notifications={notifications} />;
}
