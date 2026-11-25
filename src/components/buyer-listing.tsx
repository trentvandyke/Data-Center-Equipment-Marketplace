import Link from "next/link";
import type { ReactNode } from "react";
import { ConditionBadge, SampleBadge, StatusBadge } from "@/components/badges";
import { PhotoGallery } from "@/components/photo-gallery";
import {
  categories,
  conditions,
  documentKinds,
  labelOf,
  leadTimes,
  phases,
  voltageClasses,
} from "@/lib/catalog";
import { site } from "@/lib/config";
import { freight } from "@/lib/freight";
import { formatDate, formatOffer, formatRating } from "@/lib/format";
import { payments } from "@/lib/payments";
import { buyerPhotoSrc, isHostedFile, sanitizePublicText, toPublicListing, type PublicListingSource } from "@/lib/public-copy";
import { hidesPublicPhotos } from "@/lib/sources";

export type BuyerListingRecord = PublicListingSource & {
  category: string;
  condition: string;
  voltageClass: string;
  ratingValue: number | null;
  ratingUnit: string | null;
  phase: string | null;
  frequencyHz: number | null;
  year: number | null;
  quantity: number;
  leadTime: string;
  priceCents: number | null;
  isSample: boolean;
  status: string;
  updatedAt: Date;
  createdAt: Date;
  sourcePlatform?: string | null;
  sourceUrl?: string | null;
  photos: { id: string }[];
  documents: { id: string; url: string; filename: string; kind: string }[];
};

export function BuyerListing({
  listing,
  quote,
  editHref,
}: {
  listing: BuyerListingRecord;
  quote?: ReactNode;
  editHref?: string;
}) {
  const view = toPublicListing(listing);
  const rows: Array<[string, string]> = [
    ["Listing ID", view.code],
    ["Type", view.typeLabel],
    ["Manufacturer", view.manufacturer],
    ["Model", view.model],
    ["Category", labelOf(categories, listing.category)],
    ["Condition", labelOf(conditions, listing.condition)],
    ["Voltage class", view.voltageText || labelOf(voltageClasses, listing.voltageClass)],
    ["Rating", view.ratingText || formatRating(listing.ratingValue, listing.ratingUnit)],
    ["Phase", labelOf(phases, listing.phase)],
    ["Frequency", listing.frequencyHz ? `${listing.frequencyHz} Hz` : ""],
    ["Year", listing.year ? String(listing.year) : ""],
    ["Quantity available", String(listing.quantity)],
    ["Lead time", labelOf(leadTimes, listing.leadTime)],
    ["Location", view.location],
  ].filter((row): row is [string, string] => row[1].length > 0 && row[1] !== "—");
  const documents = listing.documents.filter((doc) => isHostedFile(doc.url));
  const photos = hidesPublicPhotos(listing) ? [] : listing.photos;

  return (
    <article className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm text-muted">
        <Link href="/listings" className="font-semibold text-pine">
          All equipment
        </Link>
        <span> / {labelOf(categories, listing.category)}</span>
      </p>
      {listing.isSample ? (
        <p className="mt-4 rounded-lg border border-copper/40 bg-copper/10 px-4 py-3 text-sm text-copper-dark">
          Sample data. This listing is fictional and is not an offer to sell.
        </p>
      ) : null}
      {listing.status === "SOLD" ? (
        <p className="mt-4 rounded-lg bg-ink px-4 py-3 text-sm text-paper">This listing is marked sold.</p>
      ) : null}
      {listing.status !== "ACTIVE" && listing.status !== "SOLD" ? (
        <p className="mt-4">
          <StatusBadge status={listing.status} />
        </p>
      ) : null}

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <div>
          <PhotoGallery
            title={view.title}
            category={listing.category}
            photos={photos.map((photo) => ({ src: buyerPhotoSrc(photo.id), alt: view.title }))}
          />
          <header className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              <ConditionBadge condition={listing.condition} />
              {listing.isSample ? <SampleBadge /> : null}
            </div>
            <h1 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">{view.title}</h1>
            {view.code ? <p className="mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-muted">{view.code}</p> : null}
            <p className="mt-2 text-sm text-muted">
              Updated {formatDate(listing.updatedAt)} · Listed {formatDate(listing.createdAt)}
            </p>
          </header>
          <h2 className="mt-8 font-serif text-2xl">Specifications</h2>
          <dl className="mt-3 divide-y divide-line border-y border-line">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[minmax(8rem,12rem)_1fr] gap-3 py-2.5 text-sm">
                <dt className="text-muted">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <h2 className="mt-8 font-serif text-2xl">Description</h2>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-ink-soft">
            {view.description || "Ask us for the latest availability and price."}
          </p>
          {documents.length > 0 ? (
            <>
              <h2 className="mt-8 font-serif text-2xl">Documents</h2>
              <ul className="mt-3 space-y-2">
                {documents.map((doc) => (
                  <li key={doc.id} className="panel flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <a href={doc.url} className="font-semibold text-pine" target="_blank" rel="noreferrer">
                      {sanitizePublicText(doc.filename) || "Document"}
                    </a>
                    <span className="text-muted">{labelOf(documentKinds, doc.kind)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-4">
          <section className="panel p-5">
            <p className="font-serif text-3xl">{formatOffer(listing.priceCents, view.priceText)}</p>
            <p className="mt-1 text-sm text-muted">Quantity {listing.quantity}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Location</dt>
                <dd>{view.location}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Lead time</dt>
                <dd>{labelOf(leadTimes, listing.leadTime)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs leading-5 text-muted">
              {payments.buyerMessage} {freight.buyerMessage}
            </p>
            {editHref ? (
              <Link href={editHref} className="btn btn-ghost mt-4 w-full">
                Edit listing
              </Link>
            ) : null}
          </section>
          <section className="panel p-5">
            <h2 className="font-serif text-xl">Request a quote</h2>
            <p className="mt-2 text-sm text-muted">
              Quotes go to {site.ownerName} at {site.legalName}. We reply from the desk. Sending a request does not purchase the equipment.
            </p>
            {listing.status === "ACTIVE" ? quote : <p className="mt-3 text-sm text-muted">This listing is not accepting quotes.</p>}
          </section>
        </aside>
      </div>
    </article>
  );
}
