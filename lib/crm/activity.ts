/** Timeline writer — every meaningful event becomes an Activity row. */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface LogActivityArgs {
  dealId?: string;
  personId?: string;
  type: "call" | "sms" | "whatsapp" | "email" | "note" | "status" | "system";
  title: string;
  titleKa?: string;
  body?: string;
  bodyKa?: string;
  authorId?: string;
  /** Free-text author for AI / system entries that have no User row. */
  authorName?: string;
  meta?: Record<string, unknown>;
}

export async function logActivity(args: LogActivityArgs) {
  return prisma.activity.create({
    data: {
      dealId: args.dealId,
      personId: args.personId,
      type: args.type,
      title: args.title,
      titleKa: args.titleKa,
      body: args.body,
      bodyKa: args.bodyKa,
      authorId: args.authorId,
      authorName: args.authorName,
      meta: args.meta
        ? (args.meta as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });
}
