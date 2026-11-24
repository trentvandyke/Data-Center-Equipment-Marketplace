import type { InventoryRecord } from "@/lib/inventory/types";

const rules: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /pad[-\s]?mount/i, category: "Pad-mount transformer" },
  { pattern: /substation/i, category: "Substation transformer" },
  { pattern: /dry[-\s]?type|cast resin/i, category: "Dry-type transformer" },
  { pattern: /transformer/i, category: "Transformer (other/unspecified)" },
  { pattern: /paralleling/i, category: "Paralleling switchgear" },
  { pattern: /switchboard|panelboard/i, category: "Switchboard" },
  { pattern: /switchgear/i, category: "Switchgear (MV/LV)" },
  { pattern: /breaker/i, category: "Large breaker" },
  { pattern: /busway|bus duct/i, category: "Busway" },
  { pattern: /battery/i, category: "UPS battery cabinet" },
  { pattern: /\bpdu\b|\brpp\b/i, category: "PDU/RPP/RDC" },
  { pattern: /\bups\b/i, category: "UPS system" },
  { pattern: /transfer switch|\bats\b|\bsts\b/i, category: "ATS/STS" },
  { pattern: /generator|genset/i, category: "Generator" },
];

export function classifyTitle(title: string, extra = "") {
  const text = `${title} ${extra}`;
  return rules.find((rule) => rule.pattern.test(text))?.category ?? "";
}

export function recordFromProduct(input: {
  title: string;
  url: string;
  platform: string;
  seller: string;
  sellerType: string;
  description?: string;
  priceUsd?: number | null;
  priceText?: string;
  imageUrl?: string;
  categoryHint?: string;
}): InventoryRecord | null {
  const title = input.title.trim();
  if (!title || !input.url) return null;
  const blob = `${title} ${input.description ?? ""}`;
  const category = input.categoryHint || classifyTitle(title, input.description);
  if (!category) return null;
  const kva = numberOf(blob, /([\d,.]+)\s*kva\b/i);
  const kw = numberOf(blob, /([\d,.]+)\s*kw\b/i);
  const amps = numberOf(blob, /([\d,.]+)\s*a\b/i);
  const voltage = blob.match(/(\d[\d,.]*)\s*kv\b[^.]{0,40}|\b277\/480v?\b|\b480v?\b|\b208v?\b|\b600v?\b/i)?.[0] ?? "";
  return {
    category,
    manufacturer: "",
    model: "",
    title,
    rating: [kva ? `${kva} kVA` : "", kw ? `${kw} kW` : "", amps ? `${amps} A` : ""].filter(Boolean).join(" / "),
    kw,
    kva,
    amps,
    voltage,
    condition: /new surplus|unused|factory new/i.test(blob) ? "New/New-surplus" : /refurb|reman/i.test(blob) ? "Refurbished/Reman" : /used/i.test(blob) ? "Used" : "Not stated",
    conditionRaw: "",
    year: blob.match(/\b(19|20)\d{2}\b/)?.[0] ?? "",
    hours: "",
    quantity: "",
    qty: null,
    priceUsd: input.priceUsd ?? null,
    priceText: input.priceText || (input.priceUsd ? `$${input.priceUsd}` : "Call/Quote"),
    location: "",
    seller: input.seller,
    sellerType: input.sellerType,
    platform: input.platform,
    url: input.url,
    dateChecked: new Date().toISOString().slice(0, 10),
    notes: (input.description ?? "").slice(0, 2000),
    imageUrl: input.imageUrl,
  };
}

function numberOf(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  if (!match?.[1]) return null;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}
