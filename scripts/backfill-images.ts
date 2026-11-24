import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { allowed, politeFetch } from "../src/lib/crawl/http";
import { extractImageUrls } from "../src/lib/images/extract";

type Target = { platform: string; url: string; listingId?: string };

const cacheDir = path.join(process.cwd(), ".cache", "image-backfill");

function argValue(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function cacheKey(url: string) {
  return createHash("sha1").update(url).digest("hex");
}

async function readCache(url: string): Promise<string[] | null> {
  try {
    const raw = await readFile(path.join(cacheDir, `${cacheKey(url)}.json`), "utf8");
    const parsed = JSON.parse(raw) as { images?: string[] };
    return parsed.images ?? [];
  } catch {
    return null;
  }
}

async function writeCache(url: string, images: string[]) {
  await mkdir(cacheDir, { recursive: true });
  await writeFile(path.join(cacheDir, `${cacheKey(url)}.json`), JSON.stringify({ url, images, fetchedAt: new Date().toISOString() }));
}

async function targetsFromSnapshot(perSource: number): Promise<Target[]> {
  const rows = JSON.parse(await readFile("data/inventory/recs_2026-11-24.json", "utf8")) as Array<{ platform?: string; url?: string }>;
  const seen = new Set<string>();
  const grouped = new Map<string, Target[]>();
  for (const row of rows) {
    if (!row.url || !row.platform || seen.has(row.url)) continue;
    seen.add(row.url);
    const list = grouped.get(row.platform) ?? [];
    if (perSource > 0 && list.length >= perSource) continue;
    list.push({ platform: row.platform, url: row.url });
    grouped.set(row.platform, list);
  }
  return [...grouped.values()].flat();
}

async function targetsFromDatabase(perSource: number): Promise<Target[]> {
  const prisma = new PrismaClient();
  const rows = await prisma.listing.findMany({
    where: { origin: "SOURCED", status: "ACTIVE", photos: { none: {} }, sourceUrl: { not: null } },
    select: { id: true, sourceUrl: true, sourcePlatform: true },
  });
  await prisma.$disconnect();
  const grouped = new Map<string, Target[]>();
  for (const row of rows) {
    if (!row.sourceUrl) continue;
    const platform = row.sourcePlatform || "unknown";
    const list = grouped.get(platform) ?? [];
    if (perSource > 0 && list.length >= perSource) continue;
    list.push({ platform, url: row.sourceUrl, listingId: row.id });
    grouped.set(platform, list);
  }
  return [...grouped.values()].flat();
}

const robotsOk = new Map<string, boolean>();

async function fetchImages(url: string) {
  const cached = await readCache(url);
  if (cached) return { images: cached, cached: true, status: "cache" };
  const origin = new URL(url).origin;
  let allowedOrigin = robotsOk.get(origin);
  if (allowedOrigin == null) {
    allowedOrigin = await allowed(`${origin}/`);
    robotsOk.set(origin, allowedOrigin);
  }
  if (!allowedOrigin) return { images: [] as string[], cached: false, status: "robots" };
  const response = await politeFetch(url);
  if (!response.ok) return { images: [] as string[], cached: false, status: String(response.status) };
  const html = await response.text();
  const images = extractImageUrls(html, response.url || url);
  await writeCache(url, images);
  return { images, cached: false, status: "fetched" };
}

async function main() {
  const perSource = Number(argValue("--per-source") ?? "0");
  const write = process.argv.includes("--write");
  const fromSnapshot = process.argv.includes("--from-snapshot") || !process.env.DATABASE_URL?.startsWith("postgres");
  const items = fromSnapshot ? await targetsFromSnapshot(perSource) : await targetsFromDatabase(perSource);
  const summary = new Map<string, { tried: number; withImages: number }>();
  const found = new Map<string, string[]>();

  for (const item of items) {
    const bucket = summary.get(item.platform) ?? { tried: 0, withImages: 0 };
    bucket.tried += 1;
    let images: string[] = [];
    try {
      const result = await fetchImages(item.url);
      images = result.images;
      if (images.length > 0) bucket.withImages += 1;
      console.log(`${item.platform}\t${result.status}\t${images.length}\t${item.url}`);
    } catch (error) {
      console.log(`${item.platform}\terror\t0\t${item.url}\t${error instanceof Error ? error.message : "failed"}`);
    }
    summary.set(item.platform, bucket);
    if (images.length > 0) found.set(item.url, images);
  }

  if (write && !fromSnapshot) {
    const prisma = new PrismaClient();
    for (const item of items) {
      const images = found.get(item.url);
      if (!item.listingId || !images?.length) continue;
      await prisma.listingPhoto.createMany({
        data: images.map((url, index) => ({ listingId: item.listingId!, url, alt: "", sortOrder: index })),
      });
    }
    await prisma.$disconnect();
  }

  console.log("\nCoverage (sample)");
  for (const [platform, stats] of [...summary.entries()].sort((a, b) => b[1].tried - a[1].tried)) {
    const pct = stats.tried ? Math.round((stats.withImages / stats.tried) * 100) : 0;
    console.log(`${platform}\t${stats.withImages}/${stats.tried}\t${pct}%`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
