/**
 * Gmail OAuth callback — exchanges the code for tokens, stores a connected
 * email Channel, and redirects back to the CRM.
 */
import { env } from "@/lib/env";
import { fail } from "@/lib/api/respond";
import { exchangeCodeAndStore } from "@/lib/messaging/gmail";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const oauthError = url.searchParams.get("error");

  if (oauthError) return fail("oauth_error", oauthError, 400);
  if (!code) return fail("oauth_error", "Missing authorization code", 400);

  try {
    const { email } = await exchangeCodeAndStore(code, state || undefined);
    const back = new URL("/crm", env.appBaseUrl);
    back.searchParams.set("gmail", "connected");
    if (email) back.searchParams.set("mailbox", email);
    return Response.redirect(back.toString(), 302);
  } catch (err) {
    return fail("oauth_error", (err as Error).message, 502);
  }
}
