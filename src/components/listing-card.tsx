import Link from "next/link";
import { ConditionBadge, SampleBadge, SourcedBadge } from "@/components/badges";
import { ListingImage } from "@/components/listing-image";
import { labelOf, voltageClasses } from "@/lib/catalog";
import { formatOffer, formatRating } from "@/lib/format";
import type { ListingCard } from "@/lib/queries";

export function ListingCard({ listing }: { listing: ListingCard }) {
  const photo = listing.photos[0];
  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="panel group flex h-full flex-col overflow-hidden transition hover:border-pine/40"
    >
      <div className="relative aspect-[4/3] bg-paper">
        <ListingImage
          src={photo?.url}
          alt={photo?.alt || listing.title}
          category={listing.category}
          rating={listing.ratingText || formatRating(listing.ratingValue, listing.ratingUnit)}
          voltage={listing.voltageText || labelOf(voltageClasses, listing.voltageClass)}
        />
        <div className="absolute left-3 top-3 flex max-w-[70%] flex-wrap gap-2">
          {listing.origin === "SOURCED" ? <SourcedBadge seller={listing.externalSeller || "a dealer"} /> : null}
          {listing.isSample ? <SampleBadge /> : null}
        </div>
        <div className="absolute right-3 top-3">
          <ConditionBadge condition={listing.condition} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {listing.sourceCategory || listing.manufacturer}
        </p>
        <h2 className="line-clamp-2 font-serif text-lg leading-snug text-ink group-hover:text-pine">{listing.title}</h2>
        <p className="text-sm text-muted">
          {listing.voltageText || labelOf(voltageClasses, listing.voltageClass)} ·{" "}
          {listing.ratingText || formatRating(listing.ratingValue, listing.ratingUnit)} · {listing.location}
        </p>
        <p className="mt-auto pt-3 font-serif text-xl text-ink">{formatOffer(listing.priceCents, listing.priceText)}</p>
      </div>
    </Link>
  );
}
