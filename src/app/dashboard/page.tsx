import Link from "next/link";
import { Suspense } from "react";
import { becomeSeller } from "@/actions/auth";
import { deleteListing, setListingStatus } from "@/actions/listings";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { InquiryList } from "@/components/inquiry-list";
import { StatusBadge } from "@/components/badges";
import { ListingImage } from "@/components/listing-image";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/db";

export const instant = false;
export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading your dashboard…</p>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const user = await requireUser();
  const seller = user.role === "SELLER" || user.role === "ADMIN";
  const [listings, incoming, sent, unread] = await Promise.all([
    seller
      ? prisma.listing.findMany({
          where: { sellerId: user.id },
          orderBy: { updatedAt: "desc" },
          include: {
            photos: { orderBy: { sortOrder: "asc" }, take: 1 },
            _count: { select: { inquiries: true } },
          },
        })
      : Promise.resolve([]),
    seller
      ? prisma.inquiry.findMany({
          where: { listing: { sellerId: user.id } },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { listing: { select: { title: true, slug: true } } },
        })
      : Promise.resolve([]),
    prisma.inquiry.findMany({
      where: { buyerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { listing: { select: { title: true, slug: true } } },
    }),
    seller
      ? prisma.inquiry.count({ where: { listing: { sellerId: user.id }, readAt: null } })
      : Promise.resolve(0),
  ]);

  return (
    <div className="grid gap-10">
      {!seller ? (
        <section className="panel p-5">
          <h1 className="font-serif text-3xl">Buyer desk</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Inquiries you send while logged in are kept here. To post equipment, turn this account into a seller.
          </p>
          <form action={becomeSeller} className="mt-4">
            <button className="btn btn-primary" type="submit">
              Start selling
            </button>
          </form>
        </section>
      ) : (
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl">Your listings</h1>
              <p className="mt-1 text-sm text-muted">{unread} unread {unread === 1 ? "inquiry" : "inquiries"}</p>
            </div>
            <Link href="/dashboard/listings/new" className="btn btn-primary">
              New listing
            </Link>
          </div>
          {listings.length === 0 ? (
            <p className="panel mt-4 px-4 py-6 text-sm text-muted">No listings yet. Publish the first one.</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {listings.map((listing) => (
                <li key={listing.id} className="panel flex flex-col gap-4 p-3 sm:flex-row sm:items-center">
                  <div className="h-20 w-full overflow-hidden rounded-lg bg-ink sm:w-28">
                    <ListingImage
                      src={listing.photos[0]?.url}
                      alt=""
                      category={listing.category}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={listing.status} />
                      {listing.isSample ? <span className="text-xs uppercase tracking-wide text-copper">Sample</span> : null}
                    </div>
                    <Link href={`/listings/${listing.slug}`} className="mt-1 block font-serif text-lg leading-snug">
                      {listing.title}
                    </Link>
                    <p className="text-sm text-muted">
                      {formatMoney(listing.priceCents)} · {listing._count.inquiries} inquiries · {listing.location}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/listings/${listing.id}/edit`} className="btn btn-ghost">
                      Edit
                    </Link>
                    {listing.status === "ACTIVE" || listing.status === "SOLD" ? (
                      <form action={setListingStatus}>
                        <input type="hidden" name="id" value={listing.id} />
                        <input type="hidden" name="status" value={listing.status === "SOLD" ? "ACTIVE" : "SOLD"} />
                        <button className="btn btn-ghost" type="submit">
                          {listing.status === "SOLD" ? "Mark available" : "Mark sold"}
                        </button>
                      </form>
                    ) : null}
                    <ConfirmSubmit action={deleteListing} message="Delete this listing permanently?">
                      <input type="hidden" name="id" value={listing.id} />
                      <button className="btn btn-danger" type="submit">
                        Delete
                      </button>
                    </ConfirmSubmit>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {seller ? (
        <section>
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-serif text-2xl">Recent inquiries</h2>
            <Link href="/dashboard/inquiries" className="text-sm font-semibold text-pine">
              All inquiries
            </Link>
          </div>
          <div className="mt-4">
            <InquiryList inquiries={incoming} mode="incoming" />
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="font-serif text-2xl">Inquiries you sent</h2>
        <div className="mt-4">
          <InquiryList inquiries={sent} mode="sent" />
        </div>
      </section>
    </div>
  );
}
