"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";

export async function signInAction(email: string, password: string) {
  if (!email.trim() || !password) {
    return { ok: false as const, error: "Enter your email and password" };
  }
  const result = await signIn(email, password);
  return result.ok
    ? { ok: true as const }
    : { ok: false as const, error: result.error ?? "Sign-in failed" };
}

export async function signOutAction() {
  await signOut();
  redirect("/login");
}
