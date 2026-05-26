import { getContacts } from "@/lib/crm/queries";
import { ContactsView } from "@/components/crm/contacts-view";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const contacts = await getContacts();
  return <ContactsView contacts={contacts} />;
}
