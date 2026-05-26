/**
 * Server-side read helpers for the CRM UI.
 *
 * These run in Server Components / Server Actions and return plain,
 * fully-serializable DTOs (no Date objects, no Prisma model instances) so the
 * results can be handed straight to Client Components.
 */
import { prisma } from "@/lib/db";
import {
  getAllDefinitions,
  getDefinitionsForLob,
  mergeFields,
  countMissingRequired,
  type ResolvedField,
} from "./field-definitions";
import { getRenewalSchedule, type RenewalSchedule } from "./settings";
import { ensureCustomizationSchema } from "./ensure-schema";
import { listFlows, type QuoteFlowSummary } from "@/lib/quote/flows";

// --- DTOs -------------------------------------------------------------------

export interface StageDTO {
  id: string;
  name: string;
  nameKa: string | null;
  type: string; // open | won | lost
  position: number;
}

export interface AgentDTO {
  id: string;
  name: string;
  role: string;
  roleKa: string | null;
}

export interface DealCardDTO {
  id: string;
  reference: string;
  title: string;
  request: string | null;
  requestKa: string | null;
  lineOfBusiness: string;
  stageId: string;
  status: string;
  estimatedValue: number | null;
  currency: string;
  source: string | null;
  personName: string;
  personNameKa: string | null;
  personPhone: string | null;
  personEmail: string | null;
  ownerId: string | null;
  ownerName: string | null;
  missingCount: number;
  fieldCount: number;
  city: string | null;
  cityKa: string | null;
  updatedAt: string;
}

export interface BoardData {
  pipelineId: string;
  pipelineName: string;
  stages: StageDTO[];
  deals: DealCardDTO[];
  agents: AgentDTO[];
}

export interface ActivityDTO {
  id: string;
  type: string;
  title: string;
  titleKa: string | null;
  body: string | null;
  bodyKa: string | null;
  author: string;
  createdAt: string;
}

export interface MessageDTO {
  id: string;
  channel: string;
  direction: string;
  status: string;
  subject: string | null;
  body: string;
  toAddress: string | null;
  fromAddress: string | null;
  createdAt: string;
}

export interface QuoteDTO {
  id: string;
  insurer: string;
  premium: number;
  currency: string;
  status: string;
}

export interface DealDetailDTO {
  id: string;
  reference: string;
  title: string;
  lineOfBusiness: string;
  request: string | null;
  requestKa: string | null;
  status: string;
  estimatedValue: number | null;
  currency: string;
  source: string | null;
  stageId: string;
  person: {
    id: string;
    name: string;
    nameKa: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    cityKa: string | null;
  };
  owner: { id: string; name: string } | null;
  stages: StageDTO[];
  fields: ResolvedField[];
  policy: {
    insurer: string | null;
    policyNumber: string | null;
    policyStart: string | null;
    renewalDate: string | null;
  };
  activities: ActivityDTO[];
  messages: MessageDTO[];
  quotes: QuoteDTO[];
}

// --- Queries ----------------------------------------------------------------

async function defaultPipeline() {
  const ordered = { stages: { orderBy: { position: "asc" as const } } };
  return (
    (await prisma.pipeline.findFirst({ where: { isDefault: true }, include: ordered })) ??
    (await prisma.pipeline.findFirst({ include: ordered }))
  );
}

/** The full kanban board: pipeline, stages, deals, and agents. */
export async function getBoardData(): Promise<BoardData | null> {
  const pipeline = await defaultPipeline();
  if (!pipeline) return null;

  const [deals, agents, definitions] = await Promise.all([
    prisma.deal.findMany({
      where: { pipelineId: pipeline.id },
      orderBy: { updatedAt: "desc" },
      include: { person: true, owner: true, profile: true },
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getAllDefinitions(),
  ]);

  return {
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    stages: pipeline.stages.map((s) => ({
      id: s.id,
      name: s.name,
      nameKa: s.nameKa,
      type: s.type,
      position: s.position,
    })),
    deals: deals.map((d) => {
      const defs = definitions.filter(
        (def) => def.lob === "" || def.lob === d.lineOfBusiness,
      );
      const resolved = mergeFields(defs, d.profile?.fields);
      return {
        id: d.id,
        reference: d.reference,
        title: d.title,
        request: d.request,
        requestKa: d.requestKa,
        lineOfBusiness: d.lineOfBusiness,
        stageId: d.stageId,
        status: d.status,
        estimatedValue: d.estimatedValue,
        currency: d.currency,
        source: d.source,
        personName: d.person.name,
        personNameKa: d.person.nameKa,
        personPhone: d.person.phone,
        personEmail: d.person.email,
        ownerId: d.ownerId,
        ownerName: d.owner?.name ?? null,
        missingCount: countMissingRequired(resolved),
        fieldCount: resolved.length,
        city: d.person.city,
        cityKa: d.person.cityKa,
        updatedAt: d.updatedAt.toISOString(),
      };
    }),
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      roleKa: a.roleKa,
    })),
  };
}

/** Everything needed to render one deal's record panel. */
export async function getDealDetail(id: string): Promise<DealDetailDTO | null> {
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      person: true,
      owner: true,
      pipeline: { include: { stages: { orderBy: { position: "asc" } } } },
      profile: true,
      activities: {
        orderBy: { createdAt: "desc" },
        take: 60,
        include: { author: true },
      },
      messages: { orderBy: { createdAt: "desc" }, take: 40 },
      quotes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!deal) return null;

  const definitions = await getDefinitionsForLob(deal.lineOfBusiness);
  const fields = mergeFields(definitions, deal.profile?.fields);

  // Policy columns are read with raw SQL — they may post-date the Prisma client.
  let policy = {
    insurer: null as string | null,
    policyNumber: null as string | null,
    policyStart: null as string | null,
    renewalDate: null as string | null,
  };
  try {
    await ensureCustomizationSchema();
    const rows = await prisma.$queryRaw<
      Array<{
        insurer: string | null;
        policyNumber: string | null;
        policyStart: string | null;
        policyExpiry: string | null;
      }>
    >`SELECT "insurer", "policyNumber", "policyStart", "policyExpiry"
      FROM "InsuranceProfile" WHERE "dealId" = ${deal.id}`;
    if (rows[0]) {
      policy = {
        insurer: rows[0].insurer,
        policyNumber: rows[0].policyNumber,
        policyStart: rows[0].policyStart,
        renewalDate: rows[0].policyExpiry,
      };
    }
  } catch {
    /* keep nulls — policy columns not available */
  }

  return {
    id: deal.id,
    reference: deal.reference,
    title: deal.title,
    lineOfBusiness: deal.lineOfBusiness,
    request: deal.request,
    requestKa: deal.requestKa,
    status: deal.status,
    estimatedValue: deal.estimatedValue,
    currency: deal.currency,
    source: deal.source,
    stageId: deal.stageId,
    person: {
      id: deal.person.id,
      name: deal.person.name,
      nameKa: deal.person.nameKa,
      email: deal.person.email,
      phone: deal.person.phone,
      city: deal.person.city,
      cityKa: deal.person.cityKa,
    },
    owner: deal.owner ? { id: deal.owner.id, name: deal.owner.name } : null,
    stages: deal.pipeline.stages.map((s) => ({
      id: s.id,
      name: s.name,
      nameKa: s.nameKa,
      type: s.type,
      position: s.position,
    })),
    fields,
    policy,
    activities: deal.activities.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      titleKa: a.titleKa,
      body: a.body,
      bodyKa: a.bodyKa,
      author: a.author?.name ?? a.authorName ?? "System",
      createdAt: a.createdAt.toISOString(),
    })),
    messages: deal.messages.map((m) => ({
      id: m.id,
      channel: m.channel,
      direction: m.direction,
      status: m.status,
      subject: m.subject,
      body: m.body,
      toAddress: m.toAddress,
      fromAddress: m.fromAddress,
      createdAt: m.createdAt.toISOString(),
    })),
    quotes: deal.quotes.map((q) => ({
      id: q.id,
      insurer: q.insurer,
      premium: q.premium,
      currency: q.currency,
      status: q.status,
    })),
  };
}

/** Active agents — for the shared sidebar. */
export async function getAgents(): Promise<AgentDTO[]> {
  const agents = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return agents.map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    roleKa: a.roleKa,
  }));
}

// --- Reports ----------------------------------------------------------------

export interface FunnelStage {
  stageId: string;
  name: string;
  nameKa: string | null;
  type: string;
  count: number;
  value: number;
}

export interface AgentStat {
  id: string;
  name: string;
  open: number;
  won: number;
  wonValue: number;
}

export interface LobStat {
  lob: string;
  count: number;
  value: number;
}

export interface ReportsData {
  openCount: number;
  openValue: number;
  wonCount: number;
  wonValue: number;
  lostCount: number;
  winRate: number;
  avgAgeDays: number;
  funnel: FunnelStage[];
  byAgent: AgentStat[];
  byLob: LobStat[];
}

export async function getReportsData(): Promise<ReportsData> {
  const pipeline = await defaultPipeline();
  const stages = pipeline?.stages ?? [];

  const [deals, agents] = await Promise.all([
    prisma.deal.findMany(),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const open = deals.filter((d) => d.status === "open");
  const won = deals.filter((d) => d.status === "won");
  const lost = deals.filter((d) => d.status === "lost");
  const closed = won.length + lost.length;
  const now = Date.now();

  const wonValueOf = (d: (typeof deals)[number]) =>
    d.closeValue ?? d.estimatedValue ?? 0;

  const lobMap = new Map<string, { count: number; value: number }>();
  for (const d of deals) {
    const entry = lobMap.get(d.lineOfBusiness) ?? { count: 0, value: 0 };
    entry.count += 1;
    entry.value += d.estimatedValue ?? 0;
    lobMap.set(d.lineOfBusiness, entry);
  }

  return {
    openCount: open.length,
    openValue: open.reduce((s, d) => s + (d.estimatedValue ?? 0), 0),
    wonCount: won.length,
    wonValue: won.reduce((s, d) => s + wonValueOf(d), 0),
    lostCount: lost.length,
    winRate: closed ? Math.round((won.length / closed) * 100) : 0,
    avgAgeDays: open.length
      ? Math.round(
          open.reduce(
            (s, d) => s + (now - d.createdAt.getTime()) / 86_400_000,
            0,
          ) / open.length,
        )
      : 0,
    funnel: stages.map((st) => {
      const ds = deals.filter((d) => d.stageId === st.id);
      return {
        stageId: st.id,
        name: st.name,
        nameKa: st.nameKa,
        type: st.type,
        count: ds.length,
        value: ds.reduce((s, d) => s + (d.estimatedValue ?? 0), 0),
      };
    }),
    byAgent: agents.map((a) => {
      const ds = deals.filter((d) => d.ownerId === a.id);
      return {
        id: a.id,
        name: a.name,
        open: ds.filter((d) => d.status === "open").length,
        won: ds.filter((d) => d.status === "won").length,
        wonValue: ds
          .filter((d) => d.status === "won")
          .reduce((s, d) => s + wonValueOf(d), 0),
      };
    }),
    byLob: [...lobMap.entries()].map(([lob, v]) => ({ lob, ...v })),
  };
}

// --- Contacts ---------------------------------------------------------------

export interface ContactDTO {
  id: string;
  name: string;
  nameKa: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  cityKa: string | null;
  source: string | null;
  dealCount: number;
  openCount: number;
}

export async function getContacts(search?: string): Promise<ContactDTO[]> {
  const term = search?.trim();
  const people = await prisma.person.findMany({
    where: term
      ? {
          OR: [
            { name: { contains: term } },
            { email: { contains: term } },
            { phone: { contains: term } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: { deals: { select: { status: true } } },
    take: 200,
  });
  return people.map((p) => ({
    id: p.id,
    name: p.name,
    nameKa: p.nameKa,
    email: p.email,
    phone: p.phone,
    city: p.city,
    cityKa: p.cityKa,
    source: p.source,
    dealCount: p.deals.length,
    openCount: p.deals.filter((d) => d.status === "open").length,
  }));
}

// --- Settings ---------------------------------------------------------------

export interface FieldDefDTO {
  id: string;
  key: string;
  labelEn: string;
  labelKa: string | null;
  type: string;
  required: boolean;
  /** "" = shared across all insurance types. */
  lob: string;
}

export interface SettingsData {
  stages: StageDTO[];
  fields: FieldDefDTO[];
  renewal: RenewalSchedule;
  flows: QuoteFlowSummary[];
}

export async function getSettingsData(): Promise<SettingsData> {
  const pipeline = await defaultPipeline();
  const [defs, renewal, flows] = await Promise.all([
    getAllDefinitions(),
    getRenewalSchedule(),
    listFlows().catch(() => []),
  ]);
  return {
    stages: (pipeline?.stages ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      nameKa: s.nameKa,
      type: s.type,
      position: s.position,
    })),
    fields: defs.map((d) => ({
      id: d.id,
      key: d.key,
      labelEn: d.labelEn,
      labelKa: d.labelKa,
      type: d.type,
      required: d.required,
      lob: d.lob,
    })),
    renewal,
    flows,
  };
}

// --- Contact detail (insurances hub) ----------------------------------------

export interface ContactDealDTO {
  id: string;
  reference: string;
  title: string;
  lineOfBusiness: string;
  request: string | null;
  status: string;
  stageName: string;
  stageNameKa: string | null;
  estimatedValue: number | null;
  currency: string;
  ownerName: string | null;
  policyExpiry: string | null;
  updatedAt: string;
}

export interface ContactDetailDTO {
  id: string;
  name: string;
  nameKa: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  cityKa: string | null;
  source: string | null;
  createdAt: string;
  deals: ContactDealDTO[];
}

export async function getContactDetail(
  id: string,
): Promise<ContactDetailDTO | null> {
  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      deals: {
        include: { stage: true, owner: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!person) return null;

  const expiryByDeal = new Map<string, string | null>();
  try {
    await ensureCustomizationSchema();
    const ids = person.deals.map((d) => d.id);
    if (ids.length) {
      const rows = await prisma.$queryRawUnsafe<
        Array<{ dealId: string; policyExpiry: string | null }>
      >(
        `SELECT "dealId", "policyExpiry" FROM "InsuranceProfile"
         WHERE "dealId" IN (${ids.map(() => "?").join(",")})`,
        ...ids,
      );
      for (const r of rows) expiryByDeal.set(r.dealId, r.policyExpiry);
    }
  } catch {
    /* policy column not ready — leave expiries null */
  }

  return {
    id: person.id,
    name: person.name,
    nameKa: person.nameKa,
    email: person.email,
    phone: person.phone,
    city: person.city,
    cityKa: person.cityKa,
    source: person.source,
    createdAt: person.createdAt.toISOString(),
    deals: person.deals.map((d) => ({
      id: d.id,
      reference: d.reference,
      title: d.title,
      lineOfBusiness: d.lineOfBusiness,
      request: d.request,
      status: d.status,
      stageName: d.stage.name,
      stageNameKa: d.stage.nameKa,
      estimatedValue: d.estimatedValue,
      currency: d.currency,
      ownerName: d.owner?.name ?? null,
      policyExpiry: expiryByDeal.get(d.id) ?? null,
      updatedAt: d.updatedAt.toISOString(),
    })),
  };
}

// --- Lead assignment --------------------------------------------------------

export interface AssignLeadDTO {
  id: string;
  reference: string;
  title: string;
  lineOfBusiness: string;
  request: string | null;
  personName: string;
  personNameKa: string | null;
  stageName: string;
  estimatedValue: number | null;
  currency: string;
  ownerId: string | null;
  source: string | null;
  createdAt: string;
}

export interface AssignAgentDTO {
  id: string;
  name: string;
  role: string;
  openCount: number;
}

export interface AssignmentData {
  leads: AssignLeadDTO[];
  agents: AssignAgentDTO[];
}

export async function getAssignmentData(): Promise<AssignmentData> {
  const pipeline = await defaultPipeline();
  const firstStageId = pipeline?.stages[0]?.id;

  const deals = await prisma.deal.findMany({
    where: {
      status: "open",
      OR: [
        { ownerId: null },
        ...(firstStageId ? [{ stageId: firstStageId }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    include: { person: true, stage: true },
  });

  const agents = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  const load = await Promise.all(
    agents.map(async (a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      openCount: await prisma.deal.count({
        where: { ownerId: a.id, status: "open" },
      }),
    })),
  );

  return {
    leads: deals.map((d) => ({
      id: d.id,
      reference: d.reference,
      title: d.title,
      lineOfBusiness: d.lineOfBusiness,
      request: d.request,
      personName: d.person.name,
      personNameKa: d.person.nameKa,
      stageName: d.stage.name,
      estimatedValue: d.estimatedValue,
      currency: d.currency,
      ownerId: d.ownerId,
      source: d.source,
      createdAt: d.createdAt.toISOString(),
    })),
    agents: load,
  };
}

// --- Renewals ---------------------------------------------------------------

export interface RenewalDTO {
  dealId: string;
  reference: string;
  personName: string;
  personNameKa: string | null;
  lineOfBusiness: string;
  insurer: string | null;
  policyExpiry: string;
  daysUntil: number;
  due: boolean;
  expired: boolean;
  ownerName: string | null;
}

export async function getRenewals(): Promise<RenewalDTO[]> {
  try {
    await ensureCustomizationSchema();
    const schedule = await getRenewalSchedule();
    const rows = await prisma.$queryRawUnsafe<
      Array<{ dealId: string; policyExpiry: string | null; insurer: string | null }>
    >(
      `SELECT "dealId", "policyExpiry", "insurer" FROM "InsuranceProfile"
       WHERE "policyExpiry" IS NOT NULL AND "policyExpiry" != ''`,
    );
    if (!rows.length) return [];

    const deals = await prisma.deal.findMany({
      where: { id: { in: rows.map((r) => r.dealId) } },
      include: { person: true, owner: true },
    });
    const dealById = new Map(deals.map((d) => [d.id, d]));
    const now = Date.now();
    const out: RenewalDTO[] = [];

    for (const r of rows) {
      const deal = dealById.get(r.dealId);
      if (!deal || !r.policyExpiry) continue;
      const expiry = new Date(r.policyExpiry).getTime();
      if (Number.isNaN(expiry)) continue;
      const daysUntil = Math.ceil((expiry - now) / 86_400_000);
      const due =
        daysUntil >= 0 &&
        (schedule.offsets.includes(daysUntil) ||
          daysUntil <= schedule.dailyForLastDays);
      out.push({
        dealId: deal.id,
        reference: deal.reference,
        personName: deal.person.name,
        personNameKa: deal.person.nameKa,
        lineOfBusiness: deal.lineOfBusiness,
        insurer: r.insurer,
        policyExpiry: r.policyExpiry,
        daysUntil,
        due,
        expired: daysUntil < 0,
        ownerName: deal.owner?.name ?? null,
      });
    }
    return out.sort((a, b) => a.daysUntil - b.daysUntil);
  } catch {
    return [];
  }
}
