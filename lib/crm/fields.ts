/**
 * Insurance underwriting fields.
 *
 * Each Deal carries an InsuranceProfile whose `fields` JSON is a FieldValue[].
 * Every value records a `source` so the UI can badge AI suggestions and the
 * pipeline can count what is still missing for a quote.
 */

export type FieldType = "text" | "number" | "date" | "boolean" | "select";
export type FieldSource = "agent" | "ai" | "import" | "missing";

export interface FieldValue {
  key: string;
  labelEn: string;
  labelKa: string;
  type: FieldType;
  value: string;
  source: FieldSource;
  /** Required for a quote — drives the Offer-prepared stage gate. */
  required: boolean;
}

type Template = Omit<FieldValue, "value" | "source">;

/** Default underwriting field set per line of business. */
export const LOB_TEMPLATES: Record<string, Template[]> = {
  auto: [
    { key: "coverage", labelEn: "Coverage type", labelKa: "დაფარვის ტიპი", type: "select", required: true },
    { key: "vehicle", labelEn: "Vehicle", labelKa: "ავტომობილი", type: "text", required: true },
    { key: "engine", labelEn: "Engine", labelKa: "ძრავი", type: "text", required: false },
    { key: "vehicleValue", labelEn: "Vehicle value", labelKa: "ავტომობილის ღირებულება", type: "number", required: true },
    { key: "deductible", labelEn: "Deductible", labelKa: "ფრანშიზა", type: "select", required: true },
    { key: "youngestDriver", labelEn: "Youngest driver", labelKa: "ყველაზე ახალგაზრდა მძღოლი", type: "number", required: true },
  ],
  health: [
    { key: "insuredCount", labelEn: "People insured", labelKa: "დასაზღვევი პირები", type: "number", required: true },
    { key: "ageRange", labelEn: "Age range", labelKa: "ასაკობრივი დიაპაზონი", type: "text", required: true },
    { key: "coverageLevel", labelEn: "Coverage level", labelKa: "დაფარვის დონე", type: "select", required: true },
    { key: "preExisting", labelEn: "Pre-existing conditions", labelKa: "არსებული მდგომარეობა", type: "text", required: false },
  ],
  home: [
    { key: "propertyType", labelEn: "Property type", labelKa: "ქონების ტიპი", type: "select", required: true },
    { key: "address", labelEn: "Address", labelKa: "მისამართი", type: "text", required: true },
    { key: "rebuildValue", labelEn: "Rebuild value", labelKa: "აღდგენის ღირებულება", type: "number", required: true },
    { key: "contentsValue", labelEn: "Contents value", labelKa: "ნივთების ღირებულება", type: "number", required: false },
  ],
  travel: [
    { key: "destination", labelEn: "Destination", labelKa: "მიმართულება", type: "text", required: true },
    { key: "tripDays", labelEn: "Trip length (days)", labelKa: "მგზავრობის დღეები", type: "number", required: true },
    { key: "travellers", labelEn: "Travellers", labelKa: "მგზავრები", type: "number", required: true },
    { key: "coverageLevel", labelEn: "Coverage level", labelKa: "დაფარვის დონე", type: "select", required: true },
  ],
  pet: [
    { key: "species", labelEn: "Species", labelKa: "სახეობა", type: "select", required: true },
    { key: "breed", labelEn: "Breed", labelKa: "ჯიში", type: "text", required: false },
    { key: "petAge", labelEn: "Pet age", labelKa: "ცხოველის ასაკი", type: "number", required: true },
  ],
  commercial: [
    { key: "businessType", labelEn: "Business type", labelKa: "ბიზნესის ტიპი", type: "text", required: true },
    { key: "employees", labelEn: "Employees", labelKa: "თანამშრომლები", type: "number", required: true },
    { key: "coverageScope", labelEn: "Coverage scope", labelKa: "დაფარვის მოცულობა", type: "text", required: true },
    { key: "annualRevenue", labelEn: "Annual revenue", labelKa: "წლიური შემოსავალი", type: "number", required: false },
  ],
};

/** Build a fresh FieldValue[] for a line of business, seeded from `hints`. */
export function buildProfileFields(
  lob: string,
  hints: Record<string, unknown> = {},
): FieldValue[] {
  const template = LOB_TEMPLATES[lob] ?? LOB_TEMPLATES.auto;
  return template.map((t) => {
    const raw = hints[t.key];
    const value = raw === undefined || raw === null ? "" : String(raw);
    return {
      ...t,
      value,
      source: value ? "import" : "missing",
    };
  });
}

/** Count fields that are still empty. */
export function countMissing(fields: FieldValue[]): number {
  return fields.filter((f) => !f.value || !f.value.trim()).length;
}

/**
 * Required-field keys for a line of business — the default stage gate for
 * the "Offer prepared" stage.
 */
export function requiredKeysForLob(lob: string): string[] {
  return (LOB_TEMPLATES[lob] ?? LOB_TEMPLATES.auto)
    .filter((t) => t.required)
    .map((t) => t.key);
}

/**
 * Given the keys a stage requires and the deal's current fields, return the
 * keys still missing. An empty array means the stage gate is satisfied.
 */
export function missingForGate(
  requiredKeys: string[],
  fields: FieldValue[],
): string[] {
  const byKey = new Map(fields.map((f) => [f.key, f]));
  return requiredKeys.filter((key) => {
    const f = byKey.get(key);
    return !f || !f.value || !f.value.trim();
  });
}
