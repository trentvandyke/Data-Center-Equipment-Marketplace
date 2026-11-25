import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dealerDomains, dealerNames } from "@/lib/dealer-identities";
import { fromSnapshotJson } from "@/lib/inventory/parse";
import { toStoredListing } from "@/lib/inventory/normalize";
import { publicCopy, publicManufacturerName } from "@/lib/public-copy";

const extraNames = [
  "eBay",
  "Veracity Asset Services",
  "LTL",
  "ERC",
  "DMK Net Enterprises",
  "EnergyEquipment.com",
  "Electrical Trader",
  "Live Auction World",
  "Maddox Industrial Transformer",
  "Sunbelt Solomon Services",
  "Surplec HV",
  "High to Low Voltage",
  "T&R",
  "American Electric Components",
  "Original listing on",
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function leaks(text: string) {
  const found: string[] = [];
  for (const name of [...dealerNames, ...extraNames]) {
    if (new RegExp(`\\b${escapeRegExp(name)}\\b`, "i").test(text)) found.push(name);
  }
  const folded = text.toLowerCase();
  for (const domain of dealerDomains) {
    if (domain && folded.includes(domain.toLowerCase())) found.push(domain);
  }
  return found;
}

test("public copy drops provenance and dealer manufacturers across the snapshot", () => {
  const rows = JSON.parse(readFileSync("data/inventory/recs_2026-11-24.json", "utf8")) as Record<string, unknown>[];
  const facets = new Set<string>();
  const problems: string[] = [];
  for (const row of rows) {
    const record = fromSnapshotJson(row);
    if (!record) continue;
    const stored = toStoredListing(record);
    const copy = publicCopy(stored);
    facets.add(copy.publicManufacturer);
    const descriptionLeaks = leaks(copy.publicDescription);
    if (descriptionLeaks.length) {
      problems.push(`${record.url} description: ${descriptionLeaks.join(", ")}`);
    }
  }
  for (const facet of facets) {
    const facetLeaks = leaks(facet);
    if (facetLeaks.length) problems.push(`facet ${facet}: ${facetLeaks.join(", ")}`);
  }
  assert.deepEqual(problems, []);
  assert.equal(
    publicManufacturerName("GE (rebuilt by American Electric Components), 1000TPO2HFD"),
    "GE (remanufactured)",
  );
  assert.equal(publicManufacturerName("Maddox Industrial Transformer"), "Unbranded/Other");
  assert.equal(publicManufacturerName("Sunbelt Solomon Services, LLC"), "Unbranded/Other");
  assert.equal(publicManufacturerName("Surplec HV"), "Unbranded/Other");
  assert.equal(publicManufacturerName("High to Low Voltage"), "Unbranded/Other");
  assert.equal(publicManufacturerName("T&R"), "Unbranded/Other");
  assert.equal(publicManufacturerName("Eaton"), "Eaton");
  assert.equal(facets.has("Maddox Industrial Transformer"), false);
  assert.equal(facets.has("GE (remanufactured)"), true);
});
