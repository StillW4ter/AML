import { notFound } from "next/navigation";
import { getContactDetail } from "@/lib/crm/queries";
import { ContactDetailView } from "@/components/crm/contact-detail-view";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export default async function ContactDetailPage({ params }: Ctx) {
  const { id } = await params;
  const contact = await getContactDetail(id);
  if (!contact) notFound();
  return <ContactDetailView contact={contact} />;
}
