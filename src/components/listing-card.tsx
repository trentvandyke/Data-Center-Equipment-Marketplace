import Link from "next/link";
import { ConditionBadge, SampleBadge } from "@/components/badges";
import { ListingImage } from "@/components/listing-image";
import { labelOf, voltageClasses } from "@/lib/catalog";
import { formatOffer, formatRating } from "@/lib/format";
import { buyerPhotoSrc, toPublicListing, type PublicListingSource } from "@/lib/public-copy";
import { hidesPublicPhotos } from "@/lib/sources";

export type PublicCardListing = PublicListingSource & {
  slug: string;
  category: string;
  condition: string;
  voltageClass: string;
  ratingValue: number | null;
  ratingUnit: string | null;
  priceCents: number | null;
  isSample: boolean;
  sourcePlatform?: string | null;
  sourceUrl?: string | null;
  photos: { id: string }[];
};

export function ListingCardFace({ listing }: { listing: PublicCardListing }) {
  const view = toPublicListing(listing);
  const photo = hidesPublicPhotos(listing) ? undefined : listing.photos[0];
  const voltage = view.voltageText || labelOf(voltageClasses, listing.voltageClass);
  const rating = view.ratingText || formatRating(listing.ratingValue, listing.ratingUnit);
  return (
    <>
      <div className="relative aspect-[4/3] bg-paper">
        <ListingImage
          src={photo ? buyerPhotoSrc(photo.id) : null}
          alt={view.title}
          category={listing.category}
          rating={rating}
          voltage={voltage}
        />
        {listing.isSample ? (
          <div className="absolute left-3 top-3">
            <SampleBadge />
          </div>
        ) : null}
        <div className="absolute right-3 top-3">
          <ConditionBadge condition={listing.condition} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {view.typeLabel || view.manufacturer || "Equipment"}
        </p>
        <h2 className="line-clamp-2 font-serif text-lg leading-snug text-ink group-hover:text-pine">{view.title}</h2>
        {view.code ? <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{view.code}</p> : null}
        <p className="text-sm text-muted">
          {voltage} · {rating}
          {view.location ? ` · ${view.location}` : ""}
        </p>
        <p className="mt-auto pt-3 font-serif text-xl text-ink">{formatOffer(listing.priceCents, view.priceText)}</p>
      </div>
    </>
  );
}

export function ListingCard({ listing }: { listing: PublicCardListing }) {
  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="panel group flex h-full flex-col overflow-hidden transition hover:border-pine/40"
    >
      <ListingCardFace listing={listing} />
    </Link>
  );
}
