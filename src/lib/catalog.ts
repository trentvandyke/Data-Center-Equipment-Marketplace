export const categories = [
  { id: "switchgear", label: "Switchgear", blurb: "Medium- and low-voltage lineups" },
  { id: "transformers", label: "Transformers", blurb: "MV and LV dry-type and cast resin" },
  { id: "ups", label: "UPS systems", blurb: "Static and rotary critical power" },
  { id: "batteries", label: "UPS batteries", blurb: "VRLA strings, jars, and cabinets" },
  { id: "pdus", label: "PDUs & RPPs", blurb: "Rack PDUs and remote power panels" },
  { id: "generators", label: "Generators", blurb: "Diesel and gas generator sets" },
  { id: "paralleling", label: "Paralleling gear", blurb: "Generator paralleling switchgear" },
  { id: "transfer-switches", label: "ATS / STS", blurb: "Automatic and static transfer" },
  { id: "busway", label: "Busway", blurb: "Feeder and plug-in bus duct" },
  { id: "switchboards", label: "Switchboards & panelboards", blurb: "Distribution boards" },
  { id: "breakers", label: "Breakers", blurb: "Air, vacuum, and insulated-case" },
  { id: "related", label: "Related gear", blurb: "Sections, parts, and companions" },
] as const;

export const conditions = [
  { id: "NEW_SURPLUS", label: "New surplus" },
  { id: "USED_TESTED", label: "Used — tested" },
  { id: "USED", label: "Used" },
  { id: "USED_AS_IS", label: "Used — as-is" },
  { id: "REFURBISHED", label: "Refurbished" },
  { id: "SURPLUS", label: "Surplus" },
  { id: "FOR_PARTS", label: "For parts" },
  { id: "NOT_STATED", label: "Condition not stated" },
] as const;

export const voltageClasses = [
  { id: "LV_208", label: "120/208V" },
  { id: "LV_480", label: "277/480V" },
  { id: "LV_600", label: "600V" },
  { id: "MV_5", label: "5 kV class" },
  { id: "MV_15", label: "15 kV class" },
  { id: "MV_25", label: "25 kV class" },
  { id: "MV_35", label: "35 kV class" },
  { id: "HV", label: "69 kV and above" },
] as const;

/** Labels used by the dealer snapshot, mapped onto marketplace categories. */
export const sourceCategoryToId: Record<string, string> = {
  "Switchgear (MV/LV)": "switchgear",
  Switchboard: "switchboards",
  "Paralleling switchgear": "paralleling",
  "Pad-mount transformer": "transformers",
  "Substation transformer": "transformers",
  "Dry-type transformer": "transformers",
  "Transformer (other/unspecified)": "transformers",
  "UPS system": "ups",
  "UPS battery cabinet": "batteries",
  "PDU/RPP/RDC": "pdus",
  Generator: "generators",
  "ATS/STS": "transfer-switches",
  Busway: "busway",
  "Large breaker": "breakers",
};

export const leadTimes = [
  { id: "IN_STOCK", label: "In stock" },
  { id: "WEEKS_1_2", label: "1–2 weeks" },
  { id: "WEEKS_3_6", label: "3–6 weeks" },
  { id: "ON_REQUEST", label: "Lead time on request" },
] as const;

export const ratingUnits = [
  { id: "kVA", label: "kVA" },
  { id: "kW", label: "kW" },
  { id: "A", label: "A" },
] as const;

export const phases = [
  { id: "3", label: "3-phase" },
  { id: "1", label: "Single-phase" },
] as const;

export const frequencies = [
  { id: "60", label: "60 Hz" },
  { id: "50", label: "50 Hz" },
] as const;

export const documentKinds = [
  { id: "TEST_REPORT", label: "Test report" },
  { id: "SPEC_SHEET", label: "Spec sheet" },
  { id: "DRAWING", label: "Drawing" },
  { id: "OTHER", label: "Other document" },
] as const;

export const listingStatuses = [
  { id: "ACTIVE", label: "Active" },
  { id: "SOLD", label: "Sold" },
  { id: "HIDDEN", label: "Hidden" },
  { id: "REMOVED", label: "Removed" },
] as const;

/** Manufacturers buyers can filter on. Sellers may also enter another name. */
export const manufacturers = [
  "Eaton",
  "Schneider Electric",
  "ABB",
  "Siemens",
  "Vertiv",
  "Caterpillar",
  "Cummins",
  "ASCO",
  "C&D Technologies",
  "EnerSys",
  "GE",
  "Hammond",
  "Kohler",
  "Mitsubishi Electric",
  "Piller",
  "Russelectric",
  "Socomec",
  "Starline",
] as const;

export type CategoryId = (typeof categories)[number]["id"];

export function labelOf(items: readonly { id: string; label: string }[], id: string | null | undefined) {
  if (!id) return "—";
  return items.find((item) => item.id === id)?.label ?? id;
}

export function hasId(items: readonly { id: string }[], id: string) {
  return items.some((item) => item.id === id);
}
