const IMAGE_EXT = /\.(?:jpe?g|png|webp|avif)(?:$|[?#])/i;
const JUNK = /favicon|logo|sprite|icon|social\.jpg|placeholder|gravatar|emoji|badge|pixel|spinner|siteicon|header-media/i;
const BRAND_FILE = /\/(?:abb|siemens|ge|eaton|schneider|square-d|westinghouse|allen-bradley|cutler-hammer)\.(?:jpe?g|png|webp)$/i;

export function canonicalImageUrl(url: string) {
  const path = url.split("?")[0].replace(/^http:\/\//i, "https://");
  return path.replace(/[-_]\d+x\d+(?:_crop_[a-z]+)?(?=\.(?:jpe?g|png|webp|avif)$)/i, "");
}

export function isUsableImageUrl(url: string) {
  if (!IMAGE_EXT.test(url)) return false;
  if (JUNK.test(url) || BRAND_FILE.test(url)) return false;
  const thumb = url.match(/-(\d+)x(\d+)\.(?:jpe?g|png|webp|avif)/i);
  if (thumb && Number(thumb[1]) <= 160 && Number(thumb[2]) <= 160) return false;
  return true;
}

function absoluteUrl(value: string, base: string) {
  try {
    return new URL(value.trim(), base).href;
  } catch {
    return "";
  }
}

function pushUrl(found: string[], value: string, base: string) {
  const url = absoluteUrl(value.replace(/&amp;/g, "&"), base);
  if (url && isUsableImageUrl(url)) found.push(url);
}

function urlsFromImageNode(node: unknown, base: string, found: string[]) {
  if (!node) return;
  if (typeof node === "string") {
    pushUrl(found, node, base);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) urlsFromImageNode(item, base, found);
    return;
  }
  if (typeof node === "object") {
    const record = node as { url?: unknown; contentUrl?: unknown; ["@type"]?: unknown };
    if (typeof record.url === "string") pushUrl(found, record.url, base);
    if (typeof record.contentUrl === "string") pushUrl(found, record.contentUrl, base);
  }
}

function walkJsonLd(node: unknown, base: string, found: string[]) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) walkJsonLd(item, base, found);
    return;
  }
  if (typeof node !== "object") return;
  const record = node as Record<string, unknown>;
  const type = record["@type"];
  const types = Array.isArray(type) ? type.map(String) : [String(type ?? "")];
  if (types.some((name) => /Product|ImageObject/i.test(name))) urlsFromImageNode(record.image, base, found);
  if (record["@graph"]) walkJsonLd(record["@graph"], base, found);
}

function uniqueUrls(urls: string[], limit: number) {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const url of urls) {
    const key = canonicalImageUrl(url);
    if (seen.has(key) || !isUsableImageUrl(key)) continue;
    seen.add(key);
    unique.push(key);
    if (unique.length >= limit) break;
  }
  return unique;
}

function seriesKey(url: string) {
  const file = canonicalImageUrl(url).split("/").pop()?.toLowerCase() ?? "";
  const base = file.replace(/\.(?:jpe?g|png|webp|avif)$/i, "");
  const match = base.match(/^([a-z]+[_-]?\d+)/i);
  return match ? match[1] : base.slice(0, 18);
}

/** Pull product photos out of a listing page. Logos, theme art, and related-product photos are dropped. */
export function extractImageUrls(html: string, pageUrl: string, limit = 4) {
  const preferred: string[] = [];
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try {
      walkJsonLd(JSON.parse(match[1]) as unknown, pageUrl, preferred);
    } catch {
      // Ignore broken JSON-LD.
    }
  }
  for (const match of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*>/gi)) {
    const content = match[0].match(/content=["']([^"']+)["']/i)?.[1];
    if (content) pushUrl(preferred, content, pageUrl);
  }
  const primary = uniqueUrls(preferred, limit);
  if (primary.length > 0) return primary;

  const extras: string[] = [];
  for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
    const width = Number(tag[0].match(/\bwidth=["']?(\d+)/i)?.[1] ?? 0);
    const height = Number(tag[0].match(/\bheight=["']?(\d+)/i)?.[1] ?? 0);
    if ((width && width < 180) || (height && height < 180)) continue;
    const raw = tag[0].match(/\b(?:data-large_image|data-src|src)=["']([^"']+)["']/i)?.[1];
    if (!raw || /\/themes\/|\/plugins\/|sidebar|banner|warranty|assurance|calculator|gradident|inbug/i.test(raw)) continue;
    pushUrl(extras, raw, pageUrl);
  }
  const cleaned = uniqueUrls(extras, 24);
  if (cleaned.length === 0) return [];
  const key = seriesKey(cleaned[0]);
  return cleaned.filter((url) => seriesKey(url) === key).slice(0, limit);
}

export function collectImageUrls(values: unknown[], base: string, limit = 6) {
  const found: string[] = [];
  for (const value of values) urlsFromImageNode(value, base, found);
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const url of found) {
    const key = canonicalImageUrl(url);
    if (seen.has(key) || !isUsableImageUrl(key)) continue;
    seen.add(key);
    unique.push(key);
    if (unique.length >= limit) break;
  }
  return unique;
}
