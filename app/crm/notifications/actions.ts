"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { markRead, markAllRead } from "@/lib/crm/notifications";

export async function markReadAction(id: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const };
  await markRead(id, user.id);
  revalidatePath("/crm");
  return { ok: true as const };
}

export async function markAllReadAction() {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const };
  await markAllRead(user.id);
  revalidatePath("/crm");
  return { ok: true as const };
}
