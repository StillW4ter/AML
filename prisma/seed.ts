/**
 * Seed: a default Sales pipeline, three agents, an API key, and the four
 * sample insurance deals the Gurdena UI currently shows as mock data.
 *
 * Run with:  npm run db:seed   (or automatically via `prisma migrate reset`)
 */
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();

const STAGES = [
  { name: "New", nameKa: "ახალი", type: "open", requiredFields: null },
  { name: "Contacted", nameKa: "დაკავშირებული", type: "open", requiredFields: null },
  { name: "In call", nameKa: "ზარში", type: "open", requiredFields: null },
  // "lob:required" expands to the deal's quote-critical fields (see pipeline.ts).
  { name: "Offer prepared", nameKa: "ოფერი მზადაა", type: "open", requiredFields: ["lob:required"] },
  { name: "Offer sent", nameKa: "ოფერი გაგზავნილია", type: "open", requiredFields: null },
  { name: "Won", nameKa: "მოგებული", type: "won", requiredFields: null },
  { name: "Lost", nameKa: "წაგებული", type: "lost", requiredFields: null },
];

type Field = {
  key: string;
  labelEn: string;
  labelKa: string;
  type: string;
  value: string;
  source: string;
  required: boolean;
};

function field(
  key: string,
  labelEn: string,
  labelKa: string,
  type: string,
  value: string,
  source: string,
  required: boolean,
): Field {
  return { key, labelEn, labelKa, type, value, source, required };
}

async function main() {
  console.log("Seeding Gurdena CRM…");

  // Clear existing data (dev seed — safe to wipe).
  await prisma.webhookDelivery.deleteMany();
  await prisma.webhookEndpoint.deleteMany();
  await prisma.message.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.insuranceProfile.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.stage.deleteMany();
  await prisma.pipeline.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.person.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  // --- Agents ---------------------------------------------------------------
  const mariam = await prisma.user.create({
    data: { name: "Mariam K.", email: "mariam@ways.ge", role: "senior_agent", roleKa: "უფროსი აგენტი" },
  });
  const sandro = await prisma.user.create({
    data: { name: "Sandro B.", email: "sandro@ways.ge", role: "agent", roleKa: "გაყიდვების აგენტი" },
  });
  const nika = await prisma.user.create({
    data: { name: "Nika D.", email: "nika@ways.ge", role: "agent", roleKa: "მხარდაჭერის აგენტი" },
  });

  // --- Pipeline + stages ----------------------------------------------------
  const pipeline = await prisma.pipeline.create({
    data: { name: "Sales", isDefault: true },
  });
  const stages: Record<string, string> = {};
  for (let i = 0; i < STAGES.length; i++) {
    const s = STAGES[i];
    const stage = await prisma.stage.create({
      data: {
        pipelineId: pipeline.id,
        name: s.name,
        nameKa: s.nameKa,
        position: i,
        type: s.type,
        requiredFields: s.requiredFields ?? undefined,
      },
    });
    stages[s.name] = stage.id;
  }

  // --- API key --------------------------------------------------------------
  const rawKey = `gk_live_${crypto.randomBytes(24).toString("hex")}`;
  await prisma.apiKey.create({
    data: {
      name: "Seed key (full access)",
      hash: crypto.createHash("sha256").update(rawKey).digest("hex"),
      prefix: rawKey.slice(0, 12),
      scopes: "*",
    },
  });

  // --- Sample deals (mirrors the Gurdena UI mock leads) --------------------
  const deals = [
    {
      ref: "LD-1024",
      person: { name: "Nino Mchedlidze", nameKa: "ნინო მჭედლიძე", phone: "+995599428810", email: "nino.mchedlidze@email.com", city: "Tbilisi", cityKa: "თბილისი" },
      lob: "auto",
      request: "Car insurance",
      requestKa: "ავტო დაზღვევა",
      stage: "In call",
      source: "Website",
      value: 1240,
      owner: mariam.id,
      fields: [
        field("coverage", "Coverage type", "დაფარვის ტიპი", "select", "Private casco", "agent", true),
        field("vehicle", "Vehicle", "ავტომობილი", "text", "Toyota Prius, 2018", "agent", true),
        field("engine", "Engine", "ძრავი", "text", "1.8L hybrid", "ai", false),
        field("vehicleValue", "Vehicle value", "ავტომობილის ღირებულება", "number", "9000", "ai", true),
        field("deductible", "Deductible", "ფრანშიზა", "select", "", "missing", true),
        field("youngestDriver", "Youngest driver", "ყველაზე ახალგაზრდა მძღოლი", "number", "", "missing", true),
      ],
    },
    {
      ref: "LD-1025",
      person: { name: "Giorgi Lomidze", nameKa: "გიორგი ლომიძე", phone: "+995555124419", email: "giorgi.lomidze@email.com", city: "Batumi", cityKa: "ბათუმი" },
      lob: "auto",
      request: "Car insurance",
      requestKa: "ავტო დაზღვევა",
      stage: "New",
      source: "Google Ads",
      value: 980,
      owner: sandro.id,
      fields: [
        field("coverage", "Coverage type", "დაფარვის ტიპი", "select", "", "missing", true),
        field("vehicle", "Vehicle", "ავტომობილი", "text", "VW Golf, 2015", "import", true),
        field("engine", "Engine", "ძრავი", "text", "", "missing", false),
        field("vehicleValue", "Vehicle value", "ავტომობილის ღირებულება", "number", "", "missing", true),
        field("deductible", "Deductible", "ფრანშიზა", "select", "", "missing", true),
        field("youngestDriver", "Youngest driver", "ყველაზე ახალგაზრდა მძღოლი", "number", "", "missing", true),
      ],
    },
    {
      ref: "LD-1026",
      person: { name: "Tamar Beridze", nameKa: "თამარ ბერიძე", phone: "+995577310290", email: "tamar.beridze@email.com", city: "Kutaisi", cityKa: "ქუთაისი" },
      lob: "health",
      request: "Health insurance",
      requestKa: "ჯანმრთელობის დაზღვევა",
      stage: "Offer sent",
      source: "Facebook",
      value: 936,
      owner: nika.id,
      fields: [
        field("insuredCount", "People insured", "დასაზღვევი პირები", "number", "2", "agent", true),
        field("ageRange", "Age range", "ასაკობრივი დიაპაზონი", "text", "30-40", "agent", true),
        field("coverageLevel", "Coverage level", "დაფარვის დონე", "select", "Standard", "agent", true),
        field("preExisting", "Pre-existing conditions", "არსებული მდგომარეობა", "text", "None", "agent", false),
      ],
    },
    {
      ref: "LD-1027",
      person: { name: "Ana Chikovani", nameKa: "ანა ჩიქოვანი", phone: "+995598662011", email: "ana.chikovani@email.com", city: "Tbilisi", cityKa: "თბილისი" },
      lob: "home",
      request: "Home insurance",
      requestKa: "სახლის დაზღვევა",
      stage: "Contacted",
      source: "Referral",
      value: 420,
      owner: mariam.id,
      fields: [
        field("propertyType", "Property type", "ქონების ტიპი", "select", "Apartment", "agent", true),
        field("address", "Address", "მისამართი", "text", "", "missing", true),
        field("rebuildValue", "Rebuild value", "აღდგენის ღირებულება", "number", "", "missing", true),
        field("contentsValue", "Contents value", "ნივთების ღირებულება", "number", "", "missing", false),
      ],
    },
  ];

  for (const d of deals) {
    const person = await prisma.person.create({
      data: {
        name: d.person.name,
        nameKa: d.person.nameKa,
        phone: d.person.phone,
        email: d.person.email,
        city: d.person.city,
        cityKa: d.person.cityKa,
        source: d.source,
        consent: { marketing: true, channels: ["sms", "whatsapp", "email"] },
      },
    });

    const stageType =
      d.stage === "Won" ? "won" : d.stage === "Lost" ? "lost" : "open";

    const deal = await prisma.deal.create({
      data: {
        reference: d.ref,
        title: `${d.request} — ${d.person.name}`,
        lineOfBusiness: d.lob,
        request: d.request,
        requestKa: d.requestKa,
        status: stageType,
        estimatedValue: d.value,
        currency: "GEL",
        source: d.source,
        personId: person.id,
        pipelineId: pipeline.id,
        stageId: stages[d.stage],
        ownerId: d.owner,
        profile: { create: { lob: d.lob, fields: d.fields } },
      },
    });

    await prisma.activity.create({
      data: {
        dealId: deal.id,
        personId: person.id,
        type: "system",
        title: `Lead created from ${d.source}`,
        titleKa: "ლიდი შეიქმნა",
        authorName: "System",
      },
    });
  }

  console.log("Seed complete.");
  console.log(`  Pipeline:   ${pipeline.name} (${STAGES.length} stages)`);
  console.log(`  Agents:     3   Deals: ${deals.length}`);
  console.log("");
  console.log("  API key (shown once — copy it now):");
  console.log(`    ${rawKey}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
