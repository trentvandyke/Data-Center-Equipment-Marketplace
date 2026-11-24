import Link from "next/link";
import { Suspense } from "react";
import { FilterForm, type FilterValues } from "@/components/forms/filter-form";
import { ListingCard } from "@/components/listing-card";
import {
  filtersAreActive,
  manufacturerChoices,
  PAGE_SIZE,
  parseSearchParams,
  searchHref,
  searchListings,
  type SearchFilters,
} from "@/lib/queries";

export const instant = false;
export const metadata = { title: "Search equipment" };

export default function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted">Searching equipment…</p>}>
      <Results searchParams={searchParams} />
    </Suspense>
  );
}

async function Results({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseSearchParams(await searchParams);
  const [{ listings, total, pageCount }, manufacturers] = await Promise.all([
    searchListings(filters),
    manufacturerChoices(),
  ]);
  const values = toValues(filters);
  const start = total === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1;
  const end = Math.min(total, filters.page * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-copper">Marketplace</p>
        <h1 className="mt-2 font-serif text-4xl">Equipment for sale</h1>
        <p className="mt-3 text-muted">
          Filter by category, manufacturer, condition, voltage, rating, price, lead time, and location.
        </p>
      </header>
      <div className="mt-6">
        <FilterForm values={values} manufacturers={manufacturers} />
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {total === 0 ? "No listings match." : `Showing ${start}–${end} of ${total}`}
        </p>
        {filters.priceMin != null || filters.priceMax != null ? (
          <p className="text-sm text-muted">Request-quote listings are hidden while a price range is set.</p>
        ) : null}
      </div>
      {listings.length === 0 ? (
        <div className="panel mt-6 p-8">
          <p className="font-serif text-2xl">Nothing in this cut of the board.</p>
          <p className="mt-2 text-sm text-muted">Widen a filter, or clear them and start from the full catalog.</p>
          {filtersAreActive(filters) ? (
            <Link href="/listings" className="btn btn-ghost mt-4">
              Clear filters
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
      {pageCount > 1 ? (
        <nav className="mt-8 flex items-center justify-between text-sm" aria-label="Pagination">
          {filters.page > 1 ? (
            <Link href={searchHref(filters, { page: filters.page - 1 })} className="btn btn-ghost">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <p className="text-muted">
            Page {filters.page} of {pageCount}
          </p>
          {filters.page < pageCount ? (
            <Link href={searchHref(filters, { page: filters.page + 1 })} className="btn btn-ghost">
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}

function toValues(filters: SearchFilters): FilterValues {
  return {
    q: filters.q ?? "",
    category: filters.category ?? "",
    manufacturer: filters.manufacturer ?? "",
    condition: filters.condition ?? "",
    voltage: filters.voltageClass ?? "",
    lead: filters.leadTime ?? "",
    location: filters.location ?? "",
    priceMin: filters.priceMin?.toString() ?? "",
    priceMax: filters.priceMax?.toString() ?? "",
    ratingMin: filters.ratingMin?.toString() ?? "",
    ratingMax: filters.ratingMax?.toString() ?? "",
    ratingUnit: filters.ratingUnit ?? "",
    sort: filters.sort,
    fresh: filters.fresh ?? "",
  };
}
