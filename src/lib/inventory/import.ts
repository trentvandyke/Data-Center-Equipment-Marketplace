import { prisma } from "@/lib/db";
import { contentKey, toStoredListing } from "@/lib/inventory/normalize";
import { dedupeRecords } from "@/lib/inventory/parse";
import type { ImportReport, InventoryRecord } from "@/lib/inventory/types";

function photoRows(record: InventoryRecord, title: string) {
  const urls = [...(record.imageUrls ?? [])];
  if (record.imageUrl && !urls.includes(record.imageUrl)) urls.unshift(record.imageUrl);
  return urls.slice(0, 6).map((url, index) => ({ url, alt: title, sortOrder: index }));
}

type ExistingRow = {
  id: string;
  sourceUrl: string | null;
  slug: string;
  status: string;
  title: string;
  category: string;
  sourceCategory: string | null;
  manufacturer: string;
  condition: string;
  priceCents: number | null;
  priceText: string | null;
  quantity: number;
  location: string;
  voltageText: string | null;
  ratingText: string | null;
  kw: number | null;
  kva: number | null;
  amps: number | null;
  externalSeller: string | null;
  photoCount: number;
};

function chunk<T>(items: T[], size: number) {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) batches.push(items.slice(index, index + size));
  return batches;
}

/**
 * Upsert sourced listings by source URL.
 * A snapshot (the daily file) retires listings from the same source sites that
 * are no longer in the file. A partial crawl should pass markAbsent: false,
 * or the pipeline will refuse to retire rows when the new set is much smaller
 * than what is already stored.
 */
export async function importInventory(
  incoming: InventoryRecord[],
  options: { markAbsent?: boolean; seenAt?: Date } = {},
): Promise<ImportReport> {
  const records = dedupeRecords(incoming.filter((record) => record.url && record.title));
  const report: ImportReport = {
    received: incoming.length,
    unique: records.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    reactivated: 0,
    markedStale: 0,
    skipped: incoming.length - records.length,
    platforms: [...new Set(records.map((record) => record.platform).filter(Boolean))],
  };
  if (records.length === 0) return report;

  const existing: ExistingRow[] = [];
  for (const urls of chunk(records.map((record) => record.url), 400)) {
    const rows = await prisma.listing.findMany({
      where: { sourceUrl: { in: urls } },
      select: {
        id: true,
        sourceUrl: true,
        slug: true,
        status: true,
        title: true,
        category: true,
        sourceCategory: true,
        manufacturer: true,
        condition: true,
        priceCents: true,
        priceText: true,
        quantity: true,
        location: true,
        voltageText: true,
        ratingText: true,
        kw: true,
        kva: true,
        amps: true,
        externalSeller: true,
        _count: { select: { photos: true } },
      },
    });
    existing.push(...rows.map((row) => ({ ...row, photoCount: row._count.photos })));
  }
  const byUrl = new Map(existing.map((row) => [row.sourceUrl, row]));

  for (const record of records) {
    const fields = toStoredListing(record);
    if (options.seenAt) fields.seenAt = options.seenAt;
    const current = byUrl.get(record.url);
    if (!current) {
      await prisma.listing.create({
        data: {
          origin: "SOURCED",
          title: fields.title,
          slug: fields.slug,
          description: fields.description,
          category: fields.category,
          sourceCategory: fields.sourceCategory,
          manufacturer: fields.manufacturer,
          condition: fields.condition,
          conditionRaw: fields.conditionRaw,
          priceCents: fields.priceCents,
          priceText: fields.priceText,
          quantity: fields.quantity,
          location: fields.location,
          voltageClass: fields.voltageClass,
          voltageText: fields.voltageText,
          ratingValue: fields.ratingValue,
          ratingUnit: fields.ratingUnit,
          ratingText: fields.ratingText,
          kw: fields.kw,
          kva: fields.kva,
          amps: fields.amps,
          phase: fields.phase,
          frequencyHz: fields.frequencyHz,
          year: fields.year,
          hours: fields.hours,
          model: fields.model,
          leadTime: fields.leadTime,
          status: "ACTIVE",
          externalSeller: fields.externalSeller,
          sellerType: fields.sellerType,
          sourcePlatform: fields.sourcePlatform,
          sourceUrl: fields.sourceUrl,
          notes: fields.notes,
          firstSeen: fields.seenAt,
          lastSeen: fields.seenAt,
          ...(photoRows(record, fields.title).length
            ? { photos: { create: photoRows(record, fields.title) } }
            : {}),
        },
      });
      report.created += 1;
      continue;
    }

    const previousKey = JSON.stringify({
      title: current.title,
      category: current.category,
      sourceCategory: current.sourceCategory,
      manufacturer: current.manufacturer,
      condition: current.condition,
      priceCents: current.priceCents,
      priceText: current.priceText,
      quantity: current.quantity,
      location: current.location,
      voltageText: current.voltageText,
      ratingText: current.ratingText,
      kw: current.kw,
      kva: current.kva,
      amps: current.amps,
      externalSeller: current.externalSeller,
    });
    const changed = previousKey !== contentKey(fields);
    if (current.status !== "ACTIVE") report.reactivated += 1;
    else if (!changed) report.unchanged += 1;
    else report.updated += 1;

    await prisma.listing.update({
      where: { id: current.id },
      data: {
        title: fields.title,
        description: fields.description,
        category: fields.category === "related" && current.category !== "related" ? current.category : fields.category,
        sourceCategory: fields.sourceCategory,
        manufacturer: prefer(fields.manufacturer, current.manufacturer),
        condition: fields.condition,
        conditionRaw: fields.conditionRaw,
        priceCents: fields.priceCents ?? current.priceCents,
        priceText: fields.priceText ?? current.priceText,
        quantity: fields.quantity,
        location: fields.location || current.location,
        voltageClass: fields.voltageClass || undefined,
        voltageText: fields.voltageText ?? current.voltageText,
        ratingValue: fields.ratingValue ?? undefined,
        ratingUnit: fields.ratingUnit ?? undefined,
        ratingText: fields.ratingText ?? current.ratingText,
        kw: fields.kw ?? current.kw,
        kva: fields.kva ?? current.kva,
        amps: fields.amps ?? current.amps,
        phase: fields.phase,
        frequencyHz: fields.frequencyHz,
        year: fields.year,
        hours: fields.hours,
        model: fields.model,
        externalSeller: fields.externalSeller || current.externalSeller,
        sellerType: fields.sellerType,
        sourcePlatform: fields.sourcePlatform,
        notes: fields.notes,
        status: "ACTIVE",
        lastSeen: fields.seenAt,
      },
    });
    const photos = photoRows(record, fields.title);
    if (current.photoCount === 0 && photos.length > 0) {
      await prisma.listingPhoto.createMany({
        data: photos.map((photo) => ({ ...photo, listingId: current.id })),
      });
    }
  }

  if (options.markAbsent) {
    report.markedStale = await markMissingStale(report.platforms, new Set(records.map((record) => record.url)));
  }
  return report;
}

function prefer(incoming: string, current: string) {
  if (!incoming || incoming === "Unspecified") return current || incoming;
  return incoming;
}

async function markMissingStale(platforms: string[], seen: Set<string>) {
  if (platforms.length === 0) return 0;
  const rows = await prisma.listing.findMany({
    where: { origin: "SOURCED", status: "ACTIVE", sourcePlatform: { in: platforms } },
    select: { id: true, sourceUrl: true },
  });
  const missing = rows.filter((row) => row.sourceUrl && !seen.has(row.sourceUrl)).map((row) => row.id);
  let marked = 0;
  for (const ids of chunk(missing, 400)) {
    const result = await prisma.listing.updateMany({
      where: { id: { in: ids } },
      data: { status: "STALE" },
    });
    marked += result.count;
  }
  return marked;
}
