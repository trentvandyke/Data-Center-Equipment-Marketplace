import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RequestMatch } from "@/components/match/request-match";
import { categories, labelOf } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { formatOffer } from "@/lib/format";
import { rankMatches } from "@/lib/match/score";
import type { EquipmentNeed, MatchCandidate } from "@/lib/match/types";

export const instant = false;
export const metadata = { title: "Match results" };

export default function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted">Matching inventory…</p>}>
      <Results params={params} />
    </Suspense>
  );
}

async function Results({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await prisma.matchRun.findUnique({ where: { id } });
  if (!run) notFound();
  const needs = JSON.parse(run.itemsJson) as EquipmentNeed[];
  const rows = await prisma.listing.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      sourceCategory: true,
      manufacturer: true,
      voltageClass: true,
      voltageText: true,
      ratingText: true,
      kw: true,
      kva: true,
      amps: true,
      ratingValue: true,
      ratingUnit: true,
      quantity: true,
      condition: true,
      priceCents: true,
      priceText: true,
      location: true,
      externalSeller: true,
      phase: true,
      seller: { select: { company: true, name: true } },
    },
  });
  const candidates: MatchCandidate[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    sourceCategory: row.sourceCategory,
    manufacturer: row.manufacturer,
    voltageClass: row.voltageClass,
    voltageText: row.voltageText,
    ratingText: row.ratingText,
    kw: row.kw,
    kva: row.kva,
    amps: row.amps,
    ratingValue: row.ratingValue,
    ratingUnit: row.ratingUnit,
    quantity: row.quantity,
    condition: row.condition,
    priceCents: row.priceCents,
    priceText: row.priceText,
    location: row.location,
    seller: row.externalSeller || row.seller?.company || row.seller?.name || "Seller",
    phase: row.phase,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-copper">Bill of equipment</p>
      <h1 className="mt-2 font-serif text-4xl">Matches for {needs.length} line {needs.length === 1 ? "item" : "items"}</h1>
      <p className="mt-2 text-sm text-muted">
        Scores favor the same category, a compatible voltage, and a rating within about 15 percent.
      </p>
      <div className="mt-8 grid gap-8">
        {needs.map((need, index) => {
          const hits = rankMatches(need, candidates, 5);
          return (
            <section key={`${need.label}-${index}`} className="panel p-5">
              <h2 className="font-serif text-2xl">{need.label || `Line ${index + 1}`}</h2>
              <p className="mt-1 text-sm text-muted">
                {[labelOf(categories, need.category), need.voltage, need.kva ? `${need.kva} kVA` : "", need.kw ? `${need.kw} kW` : "", need.amps ? `${need.amps} A` : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <ul className="mt-4 grid gap-3">
                {hits.map((hit) => (
                  <li key={hit.candidate.id} className="rounded-lg border border-line p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-copper">Score {hit.score}</p>
                        <Link href={`/listings/${hit.candidate.slug}`} className="font-serif text-xl">
                          {hit.candidate.title}
                        </Link>
                        <p className="text-sm text-muted">
                          {hit.candidate.seller} · {hit.candidate.location} · {formatOffer(hit.candidate.priceCents, hit.candidate.priceText)}
                        </p>
                      </div>
                    </div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-muted">
                      {hit.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                    <RequestMatch
                      listingId={hit.candidate.id}
                      label={need.label}
                      score={hit.score}
                      reasons={hit.reasons}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
