import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { unreadCount } from "@/lib/crm/notifications";
import { CrmShell } from "@/components/crm/crm-shell";

export const metadata: Metadata = {
  title: "Gurdena CRM — Insurance Pipeline",
  description:
    "Pipeline-style insurance sales CRM for WAYS — leads, deals, and omnichannel messaging.",
};

export const dynamic = "force-dynamic";

export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const unread = await unreadCount(user.id);

  return (
    <div className="h-screen overflow-hidden bg-[#f6f7f9] font-sans text-[#1f2430] antialiased">
      <CrmShell user={user} unread={unread}>
        {children}
      </CrmShell>
    </div>
  );
}
