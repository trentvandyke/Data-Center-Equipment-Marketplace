import { recordFromProduct } from "@/lib/crawl/classify";
import { collectImageUrls } from "@/lib/images/extract";
import { allowed, crawlPageLimit, fetchText } from "@/lib/crawl/http";
import type { InventoryRecord } from "@/lib/inventory/types";
import { sourceById } from "@/lib/sources";

export type AdapterResult = {
  id: string;
  label: string;
  records: InventoryRecord[];
  exhaustive: boolean;
  note: string;
};

export type SourceAdapter = {
  id: string;
  label: string;
  /** When set, buyer pages show the category drawing instead of this source's photos. */
  hidePhotosPublic?: boolean;
  run: () => Promise<AdapterResult>;
};

type JsonLd = Record<string, unknown>;

function asRecord(value: unknown): JsonLd | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonLd) : null;
}

function productsFromHtml(html: string, platform: string, seller: string, sellerType: string) {
  const records: InventoryRecord[] = [];
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1]) as unknown;
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        const product = asRecord(node);
        if (!product || product["@type"] !== "Product") continue;
        const offers = asRecord(product.offers);
        const brand = asRecord(product.brand);
        const price = typeof offers?.price === "number" ? offers.price : Number(offers?.price);
        const record = recordFromProduct({
          title: String(product.name ?? ""),
          url: String(product.url ?? ""),
          platform,
          seller: String(brand?.name ?? seller),
          sellerType,
          description: String(product.description ?? ""),
          priceUsd: Number.isFinite(price) && price > 0 ? price : null,
          categoryHint: typeof product.category === "string" ? product.category : "",
          imageUrls: collectImageUrls([product.image], String(product.url ?? "")),
        });
        if (record) records.push(record);
      }
    } catch {
      // Ignore broken JSON-LD blocks.
    }
  }
  return records;
}

async function crawlWoo(input: {
  id: string;
  label: string;
  origin: string;
  seller: string;
  sellerType: string;
  platform: string;
}): Promise<AdapterResult> {
  const limit = crawlPageLimit();
  const records: InventoryRecord[] = [];
  let page = 1;
  let totalPages = 1;
  let exhaustive = false;
  try {
    if (!(await allowed(`${input.origin}/wp-json/wc/store/v1/products`))) {
      return { ...input, records: [], exhaustive: false, note: "robots.txt disallows the store API path." };
    }
    while (records.length < limit && page <= totalPages && page <= 30) {
      const { text, headers } = await fetchText(`${input.origin}/wp-json/wc/store/v1/products?per_page=100&page=${page}`);
      totalPages = Number(headers.get("x-wp-totalpages") ?? 1);
      const products = JSON.parse(text) as Array<Record<string, unknown>>;
      if (!Array.isArray(products) || products.length === 0) break;
      for (const product of products) {
        const prices = asRecord(product.prices);
        const minor = Number(prices?.currency_minor_unit ?? 2);
        const raw = Number(prices?.price ?? 0);
        const priceUsd = raw > 0 ? raw / 10 ** minor : null;
        const categories = Array.isArray(product.categories)
          ? product.categories.map((item) => String(asRecord(item)?.name ?? "")).join(" ")
          : "";
        const imageUrls = Array.isArray(product.images)
          ? product.images
              .map((item) => (typeof asRecord(item)?.src === "string" ? String(asRecord(item)?.src) : ""))
              .filter(Boolean)
          : [];
        const record = recordFromProduct({
          title: String(product.name ?? ""),
          url: String(product.permalink ?? ""),
          platform: input.platform,
          seller: input.seller,
          sellerType: input.sellerType,
          description: `${categories} ${String(product.short_description ?? "")}`,
          priceUsd,
          imageUrls,
        });
        if (record) records.push(record);
      }
      page += 1;
    }
    exhaustive = page > totalPages || totalPages === 0;
  } catch (error) {
    return { ...input, records, exhaustive: false, note: error instanceof Error ? error.message : "WooCommerce fetch failed." };
  }
  return {
    ...input,
    records,
    exhaustive: exhaustive && records.length < limit,
    note: exhaustive ? `Store API, ${records.length} relevant products.` : `Store API stopped at the page limit (${records.length} kept).`,
  };
}

async function crawlArcbarn(): Promise<AdapterResult> {
  const id = "arcbarn";
  const limit = crawlPageLimit();
  try {
    if (!(await allowed("https://arcbarn.com/listings/"))) {
      return { id, label: "Arcbarn", records: [], exhaustive: false, note: "robots.txt disallows listings." };
    }
    const sitemap = await fetchText("https://arcbarn.com/sitemap.xml", 0);
    const urls = [...sitemap.text.matchAll(/<loc>(https:\/\/arcbarn\.com\/listings\/[^<]+)<\/loc>/g)].map((match) => match[1]);
    const slice = urls.slice(0, limit);
    const records: InventoryRecord[] = [];
    for (const url of slice) {
      const page = await fetchText(url);
      records.push(...productsFromHtml(page.text, "arcbarn.com", "Arcbarn", "Broker re-publishing dealer listings"));
    }
    return {
      id,
      label: "Arcbarn",
      records,
      exhaustive: slice.length === urls.length,
      note: `Sitemap has ${urls.length} listing URLs. Fetched ${slice.length}. JSON-LD products kept: ${records.length}.`,
    };
  } catch (error) {
    return { id, label: "Arcbarn", records: [], exhaustive: false, note: error instanceof Error ? error.message : "Arcbarn fetch failed." };
  }
}

async function crawlStatic(input: {
  id: string;
  label: string;
  pages: string[];
  platform: string;
  seller: string;
  sellerType: string;
}): Promise<AdapterResult> {
  const records: InventoryRecord[] = [];
  try {
    for (const url of input.pages) {
      if (!(await allowed(url))) continue;
      const page = await fetchText(url);
      records.push(...productsFromHtml(page.text, input.platform, input.seller, input.sellerType));
    }
  } catch (error) {
    return { ...input, records, exhaustive: false, note: error instanceof Error ? error.message : "Page fetch failed." };
  }
  return {
    ...input,
    records,
    exhaustive: records.length > 0,
    note: records.length ? `Parsed ${records.length} JSON-LD products.` : "No JSON-LD products on the public page. Use the daily file for this site.",
  };
}

export const adapters: SourceAdapter[] = [
  { id: "arcbarn", label: "Arcbarn", run: crawlArcbarn },
  {
    id: "cigroup",
    label: "CI Group",
    hidePhotosPublic: sourceById("cigroup").hidePhotosPublic,
    run: () =>
      crawlWoo({
        id: "cigroup",
        label: "CI Group",
        origin: "https://cigroup-us.com",
        seller: "Critical Infrastructure Group (CI Group)",
        sellerType: "Dealer (critical power)",
        platform: "cigroup-us.com",
      }),
  },
  {
    id: "midwest",
    label: "Midwest Engines & Generators",
    run: () =>
      crawlWoo({
        id: "midwest",
        label: "Midwest Engines & Generators",
        origin: "https://midwest-generators.com",
        seller: "Midwest Engines & Generators (MEG)",
        sellerType: "Dealer",
        platform: "midwest-generators.com",
      }),
  },
  {
    id: "gruber",
    label: "Gruber Power Services",
    run: () =>
      crawlWoo({
        id: "gruber",
        label: "Gruber Power Services",
        origin: "https://gruberpower.com",
        seller: "Gruber Power Services",
        sellerType: "Dealer (UPS service/reman)",
        platform: "gruberpower.com",
      }),
  },
  {
    id: "apasof",
    label: "APASOF",
    run: () =>
      crawlWoo({
        id: "apasof",
        label: "APASOF",
        origin: "https://apasof.com",
        seller: "APASOF",
        sellerType: "Dealer",
        platform: "apasof.com",
      }),
  },
  {
    id: "usadecom",
    label: "USA Decom",
    run: () =>
      crawlWoo({
        id: "usadecom",
        label: "USA Decom",
        origin: "https://usadecommissioning.com",
        seller: "USA Decom (USA Decommissioning)",
        sellerType: "Decommissioning dealer",
        platform: "usadecommissioning.com",
      }),
  },
  {
    id: "atlas",
    label: "Atlas Electric",
    run: () =>
      crawlWoo({
        id: "atlas",
        label: "Atlas Electric",
        origin: "https://atlaselectricinc.com",
        seller: "Atlas Electric",
        sellerType: "Dealer / reconditioner",
        platform: "atlaselectricinc.com",
      }),
  },
  {
    id: "pnw",
    label: "Pacific Northwest Power",
    run: () =>
      crawlWoo({
        id: "pnw",
        label: "Pacific Northwest Power",
        origin: "https://pnwpower.com",
        seller: "Pacific Northwest Power",
        sellerType: "Dealer",
        platform: "pnwpower.com",
      }),
  },
  {
    id: "farbazaar",
    label: "The FAR Bazaar",
    run: () =>
      crawlStatic({
        id: "farbazaar",
        label: "The FAR Bazaar",
        pages: ["https://www.thefarbazaar.com/inventory"],
        platform: "thefarbazaar.com",
        seller: "The FAR Bazaar",
        sellerType: "Broker / dealer",
      }),
  },
  {
    id: "proven",
    label: "Proven Performer",
    run: () =>
      crawlStatic({
        id: "proven",
        label: "Proven Performer",
        pages: ["https://provenperformer.com/current-opportunities"],
        platform: "provenperformer.com",
        seller: "Proven Performer",
        sellerType: "Surplus reseller (canceled-project / liquidation lots)",
      }),
  },
  {
    id: "dces",
    label: "DCES",
    run: () =>
      crawlStatic({
        id: "dces",
        label: "DCES",
        pages: ["https://www.dces.com/listings"],
        platform: "www.dces.com",
        seller: "DCES (Data Center Equipment Sales)",
        sellerType: "Dealer (data center surplus)",
      }),
  },
  {
    id: "gentel",
    label: "Gentel Power",
    run: () =>
      crawlStatic({
        id: "gentel",
        label: "Gentel Power",
        pages: ["https://gentelpower.com/services/"],
        platform: "gentelpower.com",
        seller: "Gentel Power",
        sellerType: "Dealer",
      }),
  },
  {
    id: "turnkey",
    label: "Turnkey Industries",
    run: () =>
      crawlStatic({
        id: "turnkey",
        label: "Turnkey Industries",
        pages: ["https://turnkey-industries.com/inventory/"],
        platform: "turnkey-industries.com",
        seller: "Turnkey Industries",
        sellerType: "Dealer",
      }),
  },
  {
    id: "wpp",
    label: "Worldwide Power Products",
    run: () =>
      crawlStatic({
        id: "wpp",
        label: "Worldwide Power Products",
        pages: ["https://www.wpowerproducts.com/sales/used-generators/"],
        platform: "wpowerproducts.com",
        seller: "Worldwide Power Products",
        sellerType: "Dealer",
      }),
  },
];

export const documentedGaps = [
  { site: "Machinio", reason: "Index pages return 403 to a plain fetch and do not expose per-listing URLs." },
  { site: "Surplus Record", reason: "HTTP 403. Some of its listings already appear via Arcbarn." },
  { site: "eBay industrial", reason: "Blocked for anonymous crawl. A Browse API key would be the supported route." },
  { site: "MachineryTrader", reason: "Bot protection returns 403." },
  { site: "Ritchie Bros / IronPlanet", reason: "Auction pages are blocked or empty without a browser session." },
  { site: "GovDeals / AllSurplus", reason: "Listings render in a JavaScript app, not in the HTML." },
  { site: "Bid on Equipment", reason: "Inventory loads in the browser and offers require login." },
  { site: "Power Generation Enterprises", reason: "WAF returns 403." },
  { site: "T&R Electric and other OEM reman sites", reason: "No public inventory HTML. Their units are covered when Arcbarn republishes them." },
];
