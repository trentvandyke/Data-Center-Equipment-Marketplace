import { Suspense } from "react";
import { moderateListing, setUserSuspended } from "@/actions/admin";
import { AdminImport } from "@/components/admin-import";
import { StatusBadge } from "@/components/badges";
import { listingStatuses } from "@/lib/catalog";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { prisma } from "@/lib/db";

export const instant = false;
export const metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted">Loading admin…</p>}>
      <Admin />
    </Suspense>
  );
}

async function Admin() {
  const admin = await requireAdmin();
  const [listings, listingCount, users, leads, quoteInquiries] = await Promise.all([
    prisma.listing.findMany({
      orderBy: { updatedAt: "desc" },
      take: 80,
      include: { seller: { select: { name: true, company: true, email: true } } },
    }),
    prisma.listing.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { listings: true, inquiries: true } } },
    }),
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { lines: { include: { listing: { select: { title: true, slug: true } } } } },
    }),
    prisma.inquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { listing: { select: { title: true, publicCode: true, sourceUrl: true, sourcePlatform: true, externalSeller: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-copper">Moderation</p>
      <h1 className="mt-2 font-serif text-4xl">Admin</h1>
      <p className="mt-2 text-sm text-muted">Signed in as {admin.email}. Import a snapshot, review quote requests, or hide a listing. Source names stay on this page.</p>
      <div className="mt-6">
        <AdminImport />
      </div>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Quote requests</h2>
        {leads.length === 0 && quoteInquiries.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No quote requests yet.</p>
        ) : null}
        <ul className="mt-3 grid gap-3">
          {leads.map((lead) => (
            <li key={lead.id} className="panel p-4 text-sm">
              <p className="font-medium">
                {lead.name} · {lead.email}
                {lead.company ? ` · ${lead.company}` : ""}
              </p>
              <p className="text-muted">{formatDate(lead.createdAt)}</p>
              <ul className="mt-2 list-disc pl-5">
                {lead.lines.map((line) => (
                  <li key={line.id}>
                    {line.label}
                    {line.score != null ? ` · score ${line.score}` : ""}
                    {line.listing ? ` · ${line.listing.title}` : ""}
                  </li>
                ))}
              </ul>
            </li>
          ))}
          {quoteInquiries.map((inquiry) => (
            <li key={inquiry.id} className="panel p-4 text-sm">
              <p className="font-medium">
                Quote · {inquiry.name} · {inquiry.email}
              </p>
              <p>
                {inquiry.listing.publicCode ? `${inquiry.listing.publicCode} · ` : ""}
                {inquiry.listing.title}
              </p>
              {inquiry.listing.externalSeller ? (
                <p className="text-xs text-muted">
                  Internal source: {inquiry.listing.externalSeller}
                  {inquiry.listing.sourcePlatform ? ` · ${inquiry.listing.sourcePlatform}` : ""}
                </p>
              ) : null}
              <p className="text-muted">{inquiry.message}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Listings</h2>
        <p className="mt-1 text-sm text-muted">Showing the 80 most recently updated of {listingCount.toLocaleString("en-US")}.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[46rem] border-separate border-spacing-y-2 text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-2 font-semibold">Listing</th>
                <th className="px-2 font-semibold">Seller</th>
                <th className="px-2 font-semibold">Price</th>
                <th className="px-2 font-semibold">Moderate</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr key={listing.id} className="bg-card">
                  <td className="rounded-l-lg px-3 py-3 align-top">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={listing.status} />
                      {listing.isSample ? <span className="text-xs text-copper">Sample</span> : null}
                    </div>
                    <p className="mt-1 font-medium">
                      {listing.publicCode ? `${listing.publicCode} · ` : ""}
                      {listing.title}
                    </p>
                    {listing.sourceUrl ? (
                      <p className="text-xs text-muted">
                        <a href={listing.sourceUrl} className="text-pine">
                          {listing.sourcePlatform || "Source page"}
                        </a>
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p>{listing.seller?.company || listing.seller?.name || listing.externalSeller || "Posted listing"}</p>
                    <p className="text-xs text-muted">{listing.seller?.email || listing.sourcePlatform}</p>
                  </td>
                  <td className="px-3 py-3 align-top">{formatMoney(listing.priceCents)}</td>
                  <td className="rounded-r-lg px-3 py-3 align-top">
                    <form action={moderateListing} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={listing.id} />
                      <select name="status" defaultValue={listing.status} className="field w-auto">
                        {listingStatuses.map((status) => (
                          <option key={status.id} value={status.id}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" name="featured" defaultChecked={listing.featured} />
                        Featured
                      </label>
                      <button className="btn btn-ghost" type="submit">
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Users</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-separate border-spacing-y-2 text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-2 font-semibold">Account</th>
                <th className="px-2 font-semibold">Role</th>
                <th className="px-2 font-semibold">Activity</th>
                <th className="px-2 font-semibold">Access</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="bg-card">
                  <td className="rounded-l-lg px-3 py-3 align-top">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted">{user.email}</p>
                    <p className="text-xs text-muted">{user.company}</p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    {user.role}
                    {user.suspended ? <p className="text-xs text-danger">Suspended</p> : null}
                  </td>
                  <td className="px-3 py-3 align-top text-muted">
                    {user._count.listings} listings · {user._count.inquiries} inquiries
                    <br />
                    Joined {formatDate(user.createdAt)}
                  </td>
                  <td className="rounded-r-lg px-3 py-3 align-top">
                    {user.id === admin.id ? (
                      <span className="text-xs text-muted">This is you</span>
                    ) : (
                      <form action={setUserSuspended}>
                        <input type="hidden" name="id" value={user.id} />
                        <input type="hidden" name="suspended" value={user.suspended ? "0" : "1"} />
                        <button className="btn btn-ghost" type="submit">
                          {user.suspended ? "Reinstate" : "Suspend"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
