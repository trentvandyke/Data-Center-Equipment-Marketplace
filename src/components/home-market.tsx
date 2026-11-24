import { connection } from "next/server";
import Link from "next/link";
import { CategoryIcon } from "@/components/category-icon";
import { ListingCard } from "@/components/listing-card";
import { categories } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { daysAgo } from "@/lib/format";
import { cardInclude } from "@/lib/queries";

export async function HeroBoard() {
  await connection();
  const listings = await prisma.listing.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ firstSeen: "desc" }, { createdAt: "desc" }],
    take: 4,
    select: { slug: true, title: true, manufacturer: true, location: true, priceCents: true, externalSeller: true },
  });
  return (
    <aside className="panel p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-copper">On the board</p>
      <ul className="mt-4 divide-y divide-line">
        {listings.map((listing) => (
          <li key={listing.slug} className="py-3">
            <Link href={`/listings/${listing.slug}`} className="block">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                {listing.externalSeller || listing.manufacturer}
              </p>
              <p className="font-serif text-lg leading-snug">{listing.title}</p>
              <p className="text-sm text-muted">{listing.location}</p>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export async function HomeMarket() {
  await connection();
  const weekAgo = daysAgo(7);
  const [fresh, freshCount, recent, grouped, listingCount, sellerCount] = await Promise.all([
    prisma.listing.findMany({
      where: { status: "ACTIVE", firstSeen: { gte: weekAgo } },
      include: cardInclude,
      orderBy: { firstSeen: "desc" },
      take: 6,
    }),
    prisma.listing.count({ where: { status: "ACTIVE", firstSeen: { gte: weekAgo } } }),
    prisma.listing.findMany({
      where: { status: "ACTIVE" },
      include: cardInclude,
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.listing.groupBy({
      by: ["category"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    }),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.listing.findMany({
      where: { status: "ACTIVE", origin: "SOURCED" },
      distinct: ["externalSeller"],
      select: { externalSeller: true },
    }),
  ]);
  const counts = new Map(grouped.map((row) => [row.category, row._count._all]));

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-10">
        <dl className="grid grid-cols-3 gap-3">
          <Stat label="Active listings" value={String(listingCount)} />
          <Stat label="Categories" value={String(counts.size)} />
          <Stat label="Dealers" value={String(sellerCount.filter((row) => row.externalSeller).length)} />
        </dl>
        <div className="mt-10 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-3xl">New this week</h2>
            <p className="mt-1 text-sm text-muted">{freshCount.toLocaleString("en-US")} listings first seen in the last 7 days.</p>
          </div>
          <Link href="/listings?fresh=week" className="text-sm font-semibold text-pine">
            See all
          </Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fresh.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
        <div className="mt-12 flex items-end justify-between gap-4">
          <h2 className="font-serif text-3xl">Browse by category</h2>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Sourced listings are copied from public dealer sites and labeled with the dealer. Confirm price and availability on the original page.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/listings?category=${category.id}`}
              className="panel flex h-full flex-col gap-3 p-4 hover:border-pine/40"
            >
              <span className="text-pine">
                <CategoryIcon id={category.id} />
              </span>
              <span className="font-serif text-lg leading-tight">{category.label}</span>
              <span className="mt-auto text-xs uppercase tracking-[0.12em] text-muted">
                {counts.get(category.id) ?? 0} listed
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="font-serif text-3xl">Recently listed</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel px-4 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className="font-serif text-3xl">{value}</dd>
    </div>
  );
}
