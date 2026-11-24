import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConditionBadge, SampleBadge, SourcedBadge, StatusBadge } from "@/components/badges";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { PhotoGallery } from "@/components/photo-gallery";
import { canManageListing, getCurrentUser } from "@/lib/auth";
import {
  categories,
  conditions,
  documentKinds,
  labelOf,
  leadTimes,
  phases,
  voltageClasses,
} from "@/lib/catalog";
import { freight } from "@/lib/freight";
import { formatDate, formatOffer, formatRating } from "@/lib/format";
import { payments } from "@/lib/payments";
import { prisma } from "@/lib/db";
import { detailInclude } from "@/lib/queries";

export const instant = false;
export const metadata = { title: "Equipment listing" };

export default function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted">Loading listing…</p>}>
      <ListingScreen params={params} />
    </Suspense>
  );
}

async function ListingScreen({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [listing, user] = await Promise.all([
    prisma.listing.findUnique({ where: { slug }, include: detailInclude }),
    getCurrentUser(),
  ]);
  if (!listing) notFound();
  const manager = user ? canManageListing(user, listing) : false;
  const publicStatus = listing.status === "ACTIVE" || listing.status === "SOLD";
  if (!publicStatus && !manager) notFound();

  const rows: Array<[string, string]> = [
    ["Dealer category", listing.sourceCategory ?? ""],
    ["Manufacturer", listing.manufacturer],
    ["Model", listing.model ?? ""],
    ["Category", labelOf(categories, listing.category)],
    ["Condition", labelOf(conditions, listing.condition)],
    ["Voltage class", labelOf(voltageClasses, listing.voltageClass)],
    ["Rating", formatRating(listing.ratingValue, listing.ratingUnit)],
    ["Phase", labelOf(phases, listing.phase)],
    ["Frequency", listing.frequencyHz ? `${listing.frequencyHz} Hz` : ""],
    ["Year", listing.year ? String(listing.year) : ""],
    ["Serial / nameplate", listing.serialNumber ?? ""],
    ["Quantity available", String(listing.quantity)],
    ["Lead time", labelOf(leadTimes, listing.leadTime)],
    ["Location", listing.location],
  ].filter((row): row is [string, string] => row[1].length > 0 && row[1] !== "—");

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
            title={listing.title}
            category={listing.category}
            photos={listing.photos.map((photo) => ({ src: photo.url, alt: photo.alt || listing.title }))}
          />
          <header className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              <ConditionBadge condition={listing.condition} />
              {listing.origin === "SOURCED" ? (
                <SourcedBadge seller={listing.externalSeller || "a public dealer"} />
              ) : null}
              {listing.isSample ? <SampleBadge /> : null}
            </div>
            <h1 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">{listing.title}</h1>
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
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-ink-soft">{listing.description}</p>
          {listing.documents.length > 0 ? (
            <>
              <h2 className="mt-8 font-serif text-2xl">Documents</h2>
              <ul className="mt-3 space-y-2">
                {listing.documents.map((doc) => (
                  <li key={doc.id} className="panel flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <a href={doc.url} className="font-semibold text-pine" target="_blank" rel="noreferrer">
                      {doc.filename}
                    </a>
                    <span className="text-muted">{labelOf(documentKinds, doc.kind)}</span>
                  </li>
                ))}
              </ul>
              {listing.isSample ? (
                <p className="mt-2 text-xs text-muted">Attached reports on sample listings are placeholders.</p>
              ) : null}
            </>
          ) : null}
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-4">
          <section className="panel p-5">
            <p className="font-serif text-3xl">{formatOffer(listing.priceCents, listing.priceText)}</p>
            {listing.sourceUrl ? (
              <a href={listing.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-ghost mt-4 w-full">
                View original listing
              </a>
            ) : null}
            <p className="mt-1 text-sm text-muted">Quantity {listing.quantity}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Location</dt>
                <dd>{listing.location}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Lead time</dt>
                <dd>{labelOf(leadTimes, listing.leadTime)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs leading-5 text-muted">
              {payments.buyerMessage} {freight.buyerMessage}
            </p>
            {manager ? (
              <Link href={`/dashboard/listings/${listing.id}/edit`} className="btn btn-ghost mt-4 w-full">
                Edit listing
              </Link>
            ) : null}
          </section>
          <section className="panel p-5">
            <h2 className="font-serif text-xl">{listing.origin === "SOURCED" ? "Listed by" : "Seller"}</h2>
            {listing.origin === "SOURCED" ? (
              <>
                <p className="mt-2 font-medium">{listing.externalSeller || "Public dealer"}</p>
                {listing.sellerType ? <p className="text-sm text-muted">{listing.sellerType}</p> : null}
                {listing.sourcePlatform ? <p className="text-sm text-muted">{listing.sourcePlatform}</p> : null}
                {listing.lastSeen ? (
                  <p className="mt-2 text-xs text-muted">Last checked {formatDate(listing.lastSeen)}</p>
                ) : null}
              </>
            ) : listing.seller ? (
              <>
                <p className="mt-2 font-medium">{listing.seller.company || listing.seller.name}</p>
                <p className="text-sm text-muted">{listing.seller.name}</p>
                {listing.seller.location ? <p className="text-sm text-muted">{listing.seller.location}</p> : null}
                <p className="mt-2 text-xs text-muted">Member since {formatDate(listing.seller.createdAt)}</p>
              </>
            ) : null}
          </section>
          <section className="panel p-5">
            <h2 className="font-serif text-xl">
              {listing.origin === "SOURCED" ? "Ask us to source this" : "Inquiry"}
            </h2>
            {listing.origin === "SOURCED" ? (
              <p className="mt-2 text-sm text-muted">
                Relayboard will follow up with the dealer. This does not purchase the equipment.
              </p>
            ) : null}
            {listing.status === "ACTIVE" ? (
              <div className="mt-3">
                <InquiryForm
                  listingId={listing.id}
                  intent={listing.origin === "SOURCED" ? "source" : "seller"}
                  defaults={{
                    name: user?.name ?? "",
                    email: user?.email ?? "",
                    company: user?.company ?? "",
                    phone: user?.phone ?? "",
                  }}
                />
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">This listing is not accepting inquiries.</p>
            )}
          </section>
        </aside>
      </div>
    </article>
  );
}
