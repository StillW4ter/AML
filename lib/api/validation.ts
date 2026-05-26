/** Shared Zod schemas for the CRM API. */
import { z } from "zod";

export const LINES_OF_BUSINESS = [
  "auto",
  "health",
  "home",
  "travel",
  "pet",
  "commercial",
] as const;

export const ACTIVITY_TYPES = [
  "call",
  "sms",
  "whatsapp",
  "email",
  "note",
  "status",
  "system",
] as const;

export const CHANNELS = ["email", "sms", "whatsapp"] as const;

export const consentSchema = z
  .object({
    marketing: z.boolean().optional(),
    channels: z.array(z.enum(["sms", "whatsapp", "email"])).optional(),
  })
  .optional();

export const personInput = z.object({
  name: z.string().min(1, "name is required"),
  nameKa: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  cityKa: z.string().optional(),
  source: z.string().optional(),
  companyId: z.string().optional(),
  consent: consentSchema,
});

export const companyInput = z.object({
  name: z.string().min(1),
  domain: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  size: z.enum(["micro", "small", "medium", "large"]).optional(),
});

export const leadInput = z.object({
  lineOfBusiness: z.enum(LINES_OF_BUSINESS),
  request: z.string().optional(),
  requestKa: z.string().optional(),
  estimatedValue: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  source: z.string().optional(),
  ownerId: z.string().optional(),
  pipelineId: z.string().optional(),
  person: personInput,
  /** Free-form key/value underwriting hints; merged into the InsuranceProfile. */
  profile: z.record(z.unknown()).optional(),
});

export const ingestLeadInput = leadInput;

export const leadUpdateInput = z.object({
  title: z.string().optional(),
  request: z.string().optional(),
  estimatedValue: z.number().nonnegative().optional(),
  ownerId: z.string().optional(),
  status: z.enum(["open", "won", "lost"]).optional(),
  lossReason: z.string().optional(),
});

export const stageMoveInput = z
  .object({
    stageId: z.string().optional(),
    stage: z.string().optional(),
    /** Skip the stage gate (manager override). */
    force: z.boolean().optional(),
  })
  .refine((d) => Boolean(d.stageId || d.stage), {
    message: "Provide stageId or stage (name).",
  });

export const activityInput = z.object({
  dealId: z.string().optional(),
  personId: z.string().optional(),
  type: z.enum(ACTIVITY_TYPES),
  title: z.string().min(1),
  titleKa: z.string().optional(),
  body: z.string().optional(),
  bodyKa: z.string().optional(),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
});

export const messageInput = z.object({
  channel: z.enum(CHANNELS),
  to: z.string().min(1),
  body: z.string().min(1),
  subject: z.string().optional(),
  dealId: z.string().optional(),
  personId: z.string().optional(),
  /** Which agent's connected channel to send from (Gmail mailbox / WA session). */
  agentId: z.string().optional(),
  urgent: z.boolean().optional(),
});

export const webhookInput = z.object({
  url: z.string().url(),
  events: z.array(z.string().min(1)).min(1),
});

export type LeadInput = z.infer<typeof leadInput>;
export type IngestLeadInput = z.infer<typeof ingestLeadInput>;
export type MessageInput = z.infer<typeof messageInput>;

/** Flatten a ZodError into a compact field->message map. */
export function flattenZod(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    out[issue.path.join(".") || "_"] = issue.message;
  }
  return out;
}
