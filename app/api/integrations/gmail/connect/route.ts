/**
 * Start the Gmail OAuth flow — redirects the agent to Google's consent screen.
 * Pass ?agentId=<userId> so the resulting mailbox is linked to that agent.
 */
import { configured } from "@/lib/env";
import { fail } from "@/lib/api/respond";
import { buildAuthUrl } from "@/lib/messaging/gmail";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!configured.gmail) {
    return fail(
      "not_configured",
      "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local first.",
      400,
    );
  }
  const agentId = new URL(req.url).searchParams.get("agentId") ?? "";
  return Response.redirect(buildAuthUrl(agentId), 302);
}
