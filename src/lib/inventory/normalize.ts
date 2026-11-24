import { createHash } from "node:crypto";
import { sourceCategoryToId } from "@/lib/catalog";
import { slugify } from "@/lib/format";
import type { InventoryRecord } from "@/lib/inventory/types";

export type StoredListingFields = {
  title: string;
  slug: string;
  description: string;
  category: string;
  sourceCategory: string | null;
  manufacturer: string;
  condition: string;
  conditionRaw: string | null;
  priceCents: number | null;
  priceText: string | null;
  quantity: number;
  location: string;
  voltageClass: string;
  voltageText: string | null;
  ratingValue: number | null;
  ratingUnit: string | null;
  ratingText: string | null;
  kw: number | null;
  kva: number | null;
  amps: number | null;
  phase: string | null;
  frequencyHz: number | null;
  year: number | null;
  hours: string | null;
  model: string | null;
  leadTime: string;
  externalSeller: string | null;
  sellerType: string | null;
  sourcePlatform: string | null;
  sourceUrl: string;
  notes: string | null;
  seenAt: Date;
};

const conditionMap: Record<string, string> = {
  "new/new-surplus": "NEW_SURPLUS",
  "new surplus": "NEW_SURPLUS",
  new: "NEW_SURPLUS",
  used: "USED",
  "refurbished/reman": "REFURBISHED",
  refurbished: "REFURBISHED",
  remanufactured: "REFURBISHED",
  "surplus (new/used not stated)": "SURPLUS",
  surplus: "SURPLUS",
  "not stated": "NOT_STATED",
};

export function mapCondition(value: string) {
  const key = value.trim().toLowerCase();
  return conditionMap[key] ?? "NOT_STATED";
}

export function mapSourceCategory(label: string) {
  const direct = sourceCategoryToId[label.trim()];
  if (direct) return direct;
  const text = label.toLowerCase();
  if (text.includes("paralleling")) return "paralleling";
  if (text.includes("switchboard") || text.includes("panelboard")) return "switchboards";
  if (text.includes("switchgear")) return "switchgear";
  if (text.includes("breaker")) return "breakers";
  if (text.includes("busway") || text.includes("bus duct")) return "busway";
  if (text.includes("battery")) return "batteries";
  if (text.includes("pdu") || text.includes("rpp")) return "pdus";
  if (/\bups\b/.test(text)) return "ups";
  if (text.includes("transfer") || text.includes("ats") || text.includes("sts")) return "transfer-switches";
  if (text.includes("generator") || text.includes("genset")) return "generators";
  if (text.includes("transformer")) return "transformers";
  return "related";
}

export function voltageNumbers(text: string): number[] {
  const found: number[] = [];
  const source = text.replace(/\u00a0/g, " ");
  for (const match of source.matchAll(/([\d]+(?:[.,]\d+)?)\s*kv\b/gi)) {
    const value = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(value)) found.push(Math.round(value * 1000));
  }
  for (const match of source.matchAll(/([\d]{1,3}(?:,\d{3})+|\d{2,6})(?:\s*v\b|(?=y\/)|(?=\s*delta)|(?=\s*wye)|(?=\s*→)|(?=\s*to\b))/gi)) {
    const value = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(value) && value >= 100 && value < 500000) found.push(value);
  }
  return [...new Set(found)];
}

export function voltageClassFromText(text: string) {
  const numbers = voltageNumbers(text);
  if (numbers.length === 0) {
    if (/\b208\b/.test(text)) return "LV_208";
    if (/\b480\b/.test(text)) return "LV_480";
    if (/\b600\b/.test(text)) return "LV_600";
    return "";
  }
  const high = Math.max(...numbers);
  if (high >= 69000) return "HV";
  if (high >= 30000) return "MV_35";
  if (high >= 18000) return "MV_25";
  if (high >= 8000) return "MV_15";
  if (high >= 2000) return "MV_5";
  if (high >= 520) return "LV_600";
  if (high >= 400) return "LV_480";
  if (high >= 100) return "LV_208";
  return "";
}

export function voltagesCompatible(left: string, right: string) {
  const a = voltageNumbers(left);
  const b = voltageNumbers(right);
  if (a.length === 0 || b.length === 0) {
    const classA = voltageClassFromText(left);
    const classB = voltageClassFromText(right);
    return Boolean(classA && classA === classB);
  }
  return a.some((value) => b.some((other) => Math.abs(value - other) / Math.max(value, other) <= 0.08));
}

function primaryRating(category: string, record: InventoryRecord) {
  if (category === "generators" || category === "ups") {
    if (record.kw) return { value: record.kw, unit: "kW" };
    if (record.kva) return { value: record.kva, unit: "kVA" };
  }
  if (category === "transformers") {
    if (record.kva) return { value: record.kva, unit: "kVA" };
    if (record.kw) return { value: record.kw, unit: "kW" };
  }
  if (record.amps) return { value: record.amps, unit: "A" };
  if (record.kva) return { value: record.kva, unit: "kVA" };
  if (record.kw) return { value: record.kw, unit: "kW" };
  return { value: null, unit: null };
}

function parseYear(value: string) {
  const match = value.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function parsePhase(text: string) {
  if (/single[-\s]?phase|\b1[-\s]?ph\b/i.test(text)) return "1";
  if (/3[-\s]?phase|three[-\s]?phase|\b3[-\s]?ph\b/i.test(text)) return "3";
  return null;
}

function parseFrequency(text: string) {
  if (/\b50\s*hz\b/i.test(text)) return 50;
  if (/\b60\s*hz\b/i.test(text)) return 60;
  return null;
}

export function listingSlug(title: string, url: string) {
  const base = slugify(title).slice(0, 64) || "listing";
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 6);
  return `${base}-${hash}`;
}

export function seenDate(value: string) {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function toStoredListing(record: InventoryRecord): StoredListingFields {
  const category = mapSourceCategory(record.category);
  const rating = primaryRating(category, record);
  const blob = [record.title, record.rating, record.voltage, record.notes, record.conditionRaw].join(" ");
  const description = [
    record.notes,
    record.conditionRaw ? `Condition as listed: ${record.conditionRaw}.` : "",
    record.hours ? `Hours: ${record.hours}.` : "",
    record.rating ? `Rating: ${record.rating}.` : "",
    "Availability and price were copied from a public dealer listing. Confirm both on the original page before you buy.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    title: record.title.slice(0, 240),
    slug: listingSlug(record.title, record.url),
    description: description.slice(0, 8000),
    category,
    sourceCategory: record.category || null,
    manufacturer: (record.manufacturer || "Unspecified").slice(0, 160),
    condition: mapCondition(record.condition),
    conditionRaw: record.conditionRaw || null,
    priceCents: record.priceUsd != null && record.priceUsd > 0 ? Math.round(record.priceUsd * 100) : null,
    priceText: record.priceText || null,
    quantity: record.qty && record.qty > 0 ? Math.min(9999, Math.round(record.qty)) : 1,
    location: (record.location || "Location not stated").slice(0, 160),
    voltageClass: voltageClassFromText(`${record.voltage} ${record.rating} ${record.title}`),
    voltageText: record.voltage || null,
    ratingValue: rating.value,
    ratingUnit: rating.unit,
    ratingText: record.rating || null,
    kw: record.kw,
    kva: record.kva,
    amps: record.amps,
    phase: parsePhase(blob),
    frequencyHz: parseFrequency(blob),
    year: parseYear(record.year),
    hours: record.hours || null,
    model: record.model || null,
    leadTime: "ON_REQUEST",
    externalSeller: record.seller || null,
    sellerType: record.sellerType || null,
    sourcePlatform: record.platform || null,
    sourceUrl: record.url,
    notes: record.notes || null,
    seenAt: seenDate(record.dateChecked),
  };
}

export function contentKey(fields: StoredListingFields) {
  return JSON.stringify({
    title: fields.title,
    category: fields.category,
    sourceCategory: fields.sourceCategory,
    manufacturer: fields.manufacturer,
    condition: fields.condition,
    priceCents: fields.priceCents,
    priceText: fields.priceText,
    quantity: fields.quantity,
    location: fields.location,
    voltageText: fields.voltageText,
    ratingText: fields.ratingText,
    kw: fields.kw,
    kva: fields.kva,
    amps: fields.amps,
    externalSeller: fields.externalSeller,
  });
}
