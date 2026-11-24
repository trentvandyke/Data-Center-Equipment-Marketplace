import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { toStoredListing } from "../inventory/normalize";
import { fromSnapshotJson } from "../inventory/parse";
import { parseRequirementText } from "./parse-text";
import { rankMatches, scoreCandidate } from "./score";
import type { MatchCandidate } from "./types";

type Row = Record<string, unknown>;

const rows = JSON.parse(readFileSync("data/inventory/recs_2026-11-24.json", "utf8")) as Row[];

function candidate(row: Row, index: number): MatchCandidate | null {
  const record = fromSnapshotJson(row);
  if (!record) return null;
  const stored = toStoredListing(record);
  return {
    id: String(index),
    slug: stored.slug,
    title: stored.title,
    category: stored.category,
    sourceCategory: stored.sourceCategory,
    manufacturer: stored.manufacturer,
    voltageClass: stored.voltageClass,
    voltageText: stored.voltageText,
    ratingText: stored.ratingText,
    kw: stored.kw,
    kva: stored.kva,
    amps: stored.amps,
    ratingValue: stored.ratingValue,
    ratingUnit: stored.ratingUnit,
    quantity: stored.quantity,
    condition: stored.condition,
    priceCents: stored.priceCents,
    priceText: stored.priceText,
    location: stored.location,
    seller: stored.externalSeller ?? "",
    phase: stored.phase,
  };
}

const catalog = rows.map(candidate).filter((item): item is MatchCandidate => item != null);

test("a 1000 kVA pad-mount request ranks a real pad-mount ahead of a generator", () => {
  const [need] = parseRequirementText(
    "1000 kVA pad-mount transformer, 12.47 kV to 480Y/277 V, qty 1",
  );
  assert.ok(need);
  assert.equal(need.category, "transformers");
  assert.equal(need.kva, 1000);
  assert.match(need.voltage, /12\.47\s*kv/i);
  assert.doesNotMatch(need.voltage, /1000\s*kv/i);
  const top = rankMatches(need, catalog, 5);
  assert.ok(top[0].score >= 70);
  assert.equal(top[0].candidate.category, "transformers");
  assert.match(top[0].candidate.sourceCategory ?? "", /Pad-mount/i);
  assert.ok((top[0].candidate.kva ?? 0) >= 750 && (top[0].candidate.kva ?? 0) <= 1250);
  const generator = catalog.find((item) => item.category === "generators" && item.kw && item.kw > 800);
  assert.ok(generator);
  const generatorScore = scoreCandidate(need, generator).score;
  assert.ok(generatorScore <= 24);
  assert.ok(top[0].score > generatorScore);
});

test("a 1500 kW generator request prefers a real generator near that rating", () => {
  const need = {
    label: "1500 kW diesel generator, 480 V",
    category: "generators",
    voltage: "480 V",
    kw: 1500,
    kva: null,
    amps: null,
    phase: "3" as const,
    quantity: 1,
    manufacturer: "Caterpillar",
    configuration: "",
    notes: "",
  };
  const top = rankMatches(need, catalog, 8);
  assert.equal(top[0].candidate.category, "generators");
  assert.ok((top[0].candidate.kw ?? 0) >= 1000 && (top[0].candidate.kw ?? 0) <= 2000);
  const transformer = catalog.find((item) => item.category === "transformers" && item.kva === 1500);
  if (transformer) {
    assert.ok(scoreCandidate(need, transformer).score < top[0].score);
  }
});

test("a combined transformer and generator sentence stays two lines", () => {
  const needs = parseRequirementText(
    "2x 2500 kVA pad-mount transformers 13.8kV to 480V, plus 1x 2000 kW diesel generator 480V",
  );
  assert.equal(needs.length, 2);
  assert.equal(needs[0].category, "transformers");
  assert.equal(needs[0].kva, 2500);
  assert.equal(needs[0].quantity, 2);
  assert.equal(needs[0].kw, null);
  assert.equal(needs[0].manufacturer, null);
  assert.match(needs[0].voltage, /13\.8\s*kv/i);
  assert.equal(needs[1].category, "generators");
  assert.equal(needs[1].kw, 2000);
  assert.equal(needs[1].quantity, 1);
  assert.equal(needs[1].manufacturer, null);
  assert.match(needs[1].voltage, /480\s*v/i);
});

test("480 V switchgear lines up with a real 480 V breaker or switchgear listing", () => {
  const need = {
    label: "2000 A switchgear, 480Y/277 V",
    category: "switchgear",
    voltage: "480Y/277 V",
    kw: null,
    kva: null,
    amps: 2000,
    phase: "3" as const,
    quantity: 1,
    manufacturer: null,
    configuration: "",
    notes: "",
  };
  const top = rankMatches(need, catalog, 5);
  assert.equal(top[0].candidate.category, "switchgear");
  assert.ok(top[0].reasons.some((reason) => reason.includes("Voltage is compatible")));
  assert.ok(top[0].score >= 60);
});
