import type { Prisma } from "@prisma/client";
import {
  categories,
  conditions,
  hasId,
  leadTimes,
  manufacturers,
  ratingUnits,
  voltageClasses,
} from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { daysAgo } from "@/lib/format";

export const PAGE_SIZE = 12;

export type SearchFilters = {
  q?: string;
  category?: string;
  manufacturer?: string;
  condition?: string;
  voltageClass?: string;
  leadTime?: string;
  location?: string;
  priceMin?: number;
  priceMax?: number;
  ratingMin?: number;
  ratingMax?: number;
  ratingUnit?: string;
  sort: "newest" | "price_asc" | "price_desc";
  fresh?: "week";
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function one(raw: RawParams, key: string) {
  const value = raw[key];
  const picked = Array.isArray(value) ? value[0] : value;
  const trimmed = picked?.trim();
  return trimmed ? trimmed : undefined;
}

function num(raw: RawParams, key: string) {
  const value = one(raw, key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseSearchParams(raw: RawParams): SearchFilters {
  const sortRaw = one(raw, "sort");
  const category = one(raw, "category");
  const condition = one(raw, "condition");
  const voltage = one(raw, "voltage");
  const lead = one(raw, "lead");
  const ratingUnit = one(raw, "ratingUnit");
  const manufacturer = one(raw, "manufacturer");
  return {
    q: one(raw, "q")?.slice(0, 120),
    category: category && hasId(categories, category) ? category : undefined,
    manufacturer: manufacturer && manufacturer.length <= 160 ? manufacturer : undefined,
    fresh: one(raw, "fresh") === "week" ? "week" : undefined,
    condition: condition && hasId(conditions, condition) ? condition : undefined,
    voltageClass: voltage && hasId(voltageClasses, voltage) ? voltage : undefined,
    leadTime: lead && hasId(leadTimes, lead) ? lead : undefined,
    location: one(raw, "location")?.slice(0, 80),
    priceMin: num(raw, "priceMin"),
    priceMax: num(raw, "priceMax"),
    ratingMin: num(raw, "ratingMin"),
    ratingMax: num(raw, "ratingMax"),
    ratingUnit: ratingUnit && hasId(ratingUnits, ratingUnit) ? ratingUnit : undefined,
    sort: sortRaw === "price_asc" || sortRaw === "price_desc" ? sortRaw : "newest",
    page: Math.min(100, Math.max(1, Math.floor(num(raw, "page") ?? 1))),
  };
}

export function listingWhere(filters: SearchFilters): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = { status: "ACTIVE" };
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q } },
      { description: { contains: filters.q } },
      { manufacturer: { contains: filters.q } },
      { model: { contains: filters.q } },
      { serialNumber: { contains: filters.q } },
      { location: { contains: filters.q } },
      { externalSeller: { contains: filters.q } },
      { sourceCategory: { contains: filters.q } },
      { voltageText: { contains: filters.q } },
      { ratingText: { contains: filters.q } },
      { notes: { contains: filters.q } },
    ];
  }
  if (filters.fresh === "week") {
    where.firstSeen = { gte: daysAgo(7) };
  }
  if (filters.category) where.category = filters.category;
  if (filters.manufacturer) where.manufacturer = filters.manufacturer;
  if (filters.condition) where.condition = filters.condition;
  if (filters.voltageClass) where.voltageClass = filters.voltageClass;
  if (filters.leadTime) where.leadTime = filters.leadTime;
  if (filters.location) where.location = { contains: filters.location };
  if (filters.ratingUnit) where.ratingUnit = filters.ratingUnit;
  if (filters.ratingMin != null || filters.ratingMax != null) {
    where.ratingValue = {
      ...(filters.ratingMin != null ? { gte: filters.ratingMin } : {}),
      ...(filters.ratingMax != null ? { lte: filters.ratingMax } : {}),
    };
  }
  if (filters.priceMin != null || filters.priceMax != null) {
    where.priceCents = {
      ...(filters.priceMin != null ? { gte: Math.round(filters.priceMin * 100) } : {}),
      ...(filters.priceMax != null ? { lte: Math.round(filters.priceMax * 100) } : {}),
    };
  }
  return where;
}

function orderBy(sort: SearchFilters["sort"]): Prisma.ListingOrderByWithRelationInput[] {
  if (sort === "price_asc") return [{ priceCents: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }];
  if (sort === "price_desc") return [{ priceCents: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
  return [{ firstSeen: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
}

export const cardInclude = {
  photos: { orderBy: { sortOrder: "asc" as const }, take: 1 },
} satisfies Prisma.ListingInclude;

export type ListingCard = Prisma.ListingGetPayload<{ include: typeof cardInclude }>;

export const detailInclude = {
  photos: { orderBy: { sortOrder: "asc" as const } },
  documents: { orderBy: { filename: "asc" as const } },
  seller: {
    select: { id: true, name: true, company: true, location: true, createdAt: true, phone: true },
  },
} satisfies Prisma.ListingInclude;

export type ListingDetail = Prisma.ListingGetPayload<{ include: typeof detailInclude }>;

export async function searchListings(filters: SearchFilters) {
  const where = listingWhere(filters);
  const [total, listings] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      include: cardInclude,
      orderBy: orderBy(filters.sort),
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return { total, listings, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export function searchHref(filters: SearchFilters, overrides: Partial<SearchFilters> = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  const entries: Array<[string, string | number | undefined]> = [
    ["q", next.q],
    ["category", next.category],
    ["manufacturer", next.manufacturer],
    ["condition", next.condition],
    ["voltage", next.voltageClass],
    ["lead", next.leadTime],
    ["location", next.location],
    ["priceMin", next.priceMin],
    ["priceMax", next.priceMax],
    ["ratingMin", next.ratingMin],
    ["ratingMax", next.ratingMax],
    ["ratingUnit", next.ratingUnit],
    ["fresh", next.fresh],
    ["sort", next.sort === "newest" ? undefined : next.sort],
    ["page", next.page > 1 ? next.page : undefined],
  ];
  for (const [key, value] of entries) {
    if (value != null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `/listings?${qs}` : "/listings";
}

export function filtersAreActive(filters: SearchFilters) {
  return Boolean(
    filters.q ||
      filters.category ||
      filters.manufacturer ||
      filters.condition ||
      filters.voltageClass ||
      filters.leadTime ||
      filters.location ||
      filters.priceMin != null ||
      filters.priceMax != null ||
      filters.ratingMin != null ||
      filters.ratingMax != null ||
      filters.ratingUnit ||
      filters.fresh === "week" ||
      filters.sort !== "newest",
  );
}

export async function manufacturerChoices() {
  const rows = await prisma.listing.findMany({
    where: { status: "ACTIVE" },
    distinct: ["manufacturer"],
    select: { manufacturer: true },
  });
  const known = new Set<string>(manufacturers);
  const extras = rows
    .map((row) => row.manufacturer)
    .filter((name) => !known.has(name))
    .sort((a, b) => a.localeCompare(b));
  return [...manufacturers, ...extras];
}
