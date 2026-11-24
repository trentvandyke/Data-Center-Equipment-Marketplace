import type { InventoryRecord } from "@/lib/inventory/types";

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function str(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** JSON snapshot rows, as exported in recs_final.json. */
export function fromSnapshotJson(row: Record<string, unknown>): InventoryRecord | null {
  const url = str(row.url);
  const title = str(row.title);
  if (!url || !title) return null;
  return {
    category: str(row.category),
    manufacturer: str(row.manufacturer),
    model: str(row.model),
    title,
    rating: str(row.rating),
    kw: num(row.kw),
    kva: num(row.kva),
    amps: num(row.amps),
    voltage: str(row.voltage),
    condition: str(row.condition) || "Not stated",
    conditionRaw: str(row.condition_raw),
    year: str(row.year),
    hours: str(row.hours),
    quantity: str(row.quantity),
    qty: num(row.qty_n),
    priceUsd: num(row.price_usd),
    priceText: str(row.price_text),
    location: str(row.location),
    seller: str(row.seller),
    sellerType: str(row.seller_type),
    platform: str(row.platform) || hostOf(url),
    url,
    dateChecked: str(row.date_checked) || new Date().toISOString().slice(0, 10),
    notes: str(row.notes),
  };
}

const headerMap: Record<string, keyof InventoryRecord | "skip"> = {
  category: "category",
  manufacturer: "manufacturer",
  model: "model",
  "listing title / description": "title",
  title: "title",
  "key rating": "rating",
  rating: "rating",
  kw: "kw",
  kva: "kva",
  amps: "amps",
  voltage: "voltage",
  "condition (normalized)": "condition",
  condition: "condition",
  "condition (as listed / basis)": "conditionRaw",
  year: "year",
  hours: "hours",
  quantity: "quantity",
  "price (usd)": "priceUsd",
  "price as listed": "priceText",
  location: "location",
  seller: "seller",
  "seller type": "sellerType",
  "source site": "platform",
  "listing url": "url",
  url: "url",
  "date checked": "dateChecked",
  notes: "notes",
};

export function fromTabularRow(row: Record<string, unknown>): InventoryRecord | null {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const mapped = headerMap[key.trim().toLowerCase()];
    if (!mapped || mapped === "skip") continue;
    normalized[mapped] = value;
  }
  if (normalized.url || normalized.title) {
    const qty = num(normalized.quantity);
    return fromSnapshotJson({
      ...normalized,
      qty_n: qty,
      price_usd: normalized.priceUsd,
      price_text: normalized.priceText,
      condition_raw: normalized.conditionRaw,
      date_checked: normalized.dateChecked,
      seller_type: normalized.sellerType,
      platform: normalized.platform,
    });
  }
  return null;
}

export function dedupeRecords(records: InventoryRecord[]) {
  const byUrl = new Map<string, InventoryRecord>();
  for (const record of records) {
    const current = byUrl.get(record.url);
    if (!current || completeness(record) > completeness(current)) byUrl.set(record.url, record);
  }
  return [...byUrl.values()];
}

function completeness(record: InventoryRecord) {
  return [
    record.manufacturer,
    record.model,
    record.voltage,
    record.rating,
    record.location,
    record.priceUsd,
    record.kw,
    record.kva,
    record.amps,
    record.notes,
  ].filter((value) => value != null && value !== "").length;
}
