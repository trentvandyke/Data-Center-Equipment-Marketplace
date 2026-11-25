import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { BuyerListing } from "@/components/buyer-listing";
import { ListingCardFace } from "@/components/listing-card";
import { dealerDomains, dealerNames } from "@/lib/dealer-identities";

const poison = [
  ...dealerNames,
  ...dealerDomains,
  "https://arcbarn.com/listings/x",
  "sales@cigroup-us.com",
  "(214) 555-0194",
  "stock MEG1454",
  "via Arcbarn",
  "(seller)",
  "RESA Power",
].join(" ");

const listing = {
  publicCode: "RB-000123",
  title: `Eaton 2500 kVA transformer ${poison}`,
  description: `Pad-mount transformer in Dallas. ${poison}`,
  location: `Dallas, TX ${poison}`,
  manufacturer: "Eaton",
  model: "Magnum DS",
  sourceCategory: "Pad-mount transformer",
  serialNumber: "MEG1454",
  priceText: "Call Atlas Electric",
  ratingText: "2500 kVA",
  voltageText: "13.8 kV",
  externalSeller: "RESA Power (via Arcbarn)",
  notes: poison,
  slug: "eaton-transformer",
  category: "transformers",
  condition: "USED",
  voltageClass: "MV_15",
  ratingValue: 2500,
  ratingUnit: "kVA",
  phase: "3",
  frequencyHz: 60,
  year: 2018,
  quantity: 1,
  leadTime: "ON_REQUEST",
  priceCents: null,
  isSample: false,
  status: "ACTIVE",
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  photos: [{ id: "photo-1", url: "https://machineryhost.com/uploads/unit.jpg", alt: poison }],
  documents: [{ id: "doc-1", url: "https://dces.com/spec.pdf", filename: "Arcbarn spec.pdf", kind: "SPEC_SHEET" }],
};

test("rendered buyer surfaces omit every source name and domain", () => {
  const html = renderToStaticMarkup(
    createElement(
      "div",
      null,
      createElement(ListingCardFace, { listing }),
      createElement(BuyerListing, { listing }),
    ),
  );
  const folded = html.toLowerCase();
  for (const name of dealerNames) {
    assert.equal(folded.includes(name.toLowerCase()), false, name);
  }
  for (const domain of dealerDomains) {
    assert.equal(folded.includes(domain.toLowerCase()), false, domain);
  }
  assert.equal(folded.includes("meg1454"), false);
  assert.equal(folded.includes("555-0194"), false);
  assert.equal(folded.includes("sales@"), false);
  assert.equal(folded.includes("resa power"), false);
  assert.equal(folded.includes("view original"), false);
  assert.match(html, /\/api\/img\/photo-1/);
  assert.match(html, /RB-000123/);
  assert.match(html, /Eaton/);
  assert.match(html, /Request a quote/);
  assert.match(html, /Trent Van Dyke/);
});
