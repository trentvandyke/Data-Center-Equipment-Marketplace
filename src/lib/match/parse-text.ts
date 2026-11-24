import { manufacturers } from "@/lib/catalog";
import type { EquipmentNeed } from "@/lib/match/types";

const categoryRules: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /pad[-\s]?mount/i, category: "transformers" },
  { pattern: /substation/i, category: "transformers" },
  { pattern: /dry[-\s]?type|cast[-\s]?resin/i, category: "transformers" },
  { pattern: /transformer/i, category: "transformers" },
  { pattern: /paralleling/i, category: "paralleling" },
  { pattern: /switchboard|panelboard/i, category: "switchboards" },
  { pattern: /switchgear/i, category: "switchgear" },
  { pattern: /breaker/i, category: "breakers" },
  { pattern: /busway|bus duct/i, category: "busway" },
  { pattern: /battery/i, category: "batteries" },
  { pattern: /\bpdu\b|\brpp\b|\brdc\b/i, category: "pdus" },
  { pattern: /\bups\b|uninterruptible/i, category: "ups" },
  { pattern: /\bats\b|\bsts\b|transfer switch/i, category: "transfer-switches" },
  { pattern: /generator|genset|\bgenset\b/i, category: "generators" },
];

function numberBefore(text: string, unit: RegExp) {
  const match = text.match(unit);
  if (!match?.[1]) return null;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

function detectManufacturer(text: string) {
  const ordered = [...manufacturers].sort((a, b) => b.length - a.length);
  for (const name of ordered) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(?:^|[^A-Za-z0-9])${escaped}(?:[^A-Za-z0-9]|$)`, "i").test(text)) return name;
  }
  return null;
}

function configurationOf(text: string) {
  const bits = [];
  if (/pad[-\s]?mount/i.test(text)) bits.push("pad-mount");
  if (/substation/i.test(text)) bits.push("substation");
  if (/dry[-\s]?type|cast[-\s]?resin/i.test(text)) bits.push("dry-type");
  if (/outdoor|nema\s*3r/i.test(text)) bits.push("outdoor");
  if (/indoor/i.test(text)) bits.push("indoor");
  if (/\biec\b/i.test(text)) bits.push("IEC");
  if (/\bnema\b/i.test(text)) bits.push("NEMA");
  return bits.join(", ");
}

export function needFromText(text: string): EquipmentNeed | null {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length < 3) return null;
  const category = categoryRules.find((rule) => rule.pattern.test(cleaned))?.category ?? "";
  const kva = numberBefore(cleaned, /([\d,.]+)\s*kva\b/i);
  const kw = numberBefore(cleaned, /([\d,.]+)\s*kw\b/i);
  const amps = numberBefore(cleaned, /([\d,.]+)\s*(?:amps?|ampere)\b/i) ?? numberBefore(cleaned, /([\d,.]+)\s*a\b(?!\w)/i);
  const voltageMatch = cleaned.match(
    /([\d,.]+\s*kv(?![a-z])(?:\s*(?:to|\/|→)\s*[\d,.]+(?:\s*kv(?![a-z])|\s*v\b|\s*y\/\d+)?)?|\b\d{2,3}\s*y\/\d{2,3}\s*v?\b|\b277\s*\/\s*480\s*v?\b|\b(?:208|240|480|600)\s*v\b)/i,
  );
  const quantity =
    numberBefore(cleaned, /^(\d{1,4})\s*x\b/i) ??
    numberBefore(cleaned, /(?:qty|quantity)\s*(\d{1,4})\b/i) ??
    numberBefore(cleaned, /(?<!\d)x\s+(\d{1,4})\b/i) ??
    numberBefore(cleaned, /^(\d{1,3})\s+units?\b/i);
  const phase = /single[-\s]?phase/i.test(cleaned) ? "1" : /3[-\s]?phase|three[-\s]?phase/i.test(cleaned) ? "3" : null;
  if (!category && !kva && !kw && !amps) return null;
  return {
    label: cleaned.slice(0, 180),
    category,
    voltage: voltageMatch?.[0] ?? "",
    kw,
    kva,
    amps: kva || kw ? amps : amps,
    phase,
    quantity,
    manufacturer: detectManufacturer(cleaned),
    configuration: configurationOf(cleaned),
    notes: "",
  };
}

/** Split a pasted description into line items without calling a model. */
export function parseRequirementText(text: string): EquipmentNeed[] {
  const chunks = text
    .split(/\n+|;\s+|,\s+plus\s+|\s+plus\s+|\s+and\s+(?=\d+\s*x\b)/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const pieces = chunks.flatMap((chunk) => {
    const sentences = chunk.split(/(?<=\.)\s+(?=[A-Z0-9])/);
    return sentences.length > 1 ? sentences : [chunk];
  });
  const needs = pieces.map(needFromText).filter((item): item is EquipmentNeed => item != null);
  if (needs.length > 0) return needs;
  const whole = needFromText(text);
  return whole ? [whole] : [];
}
