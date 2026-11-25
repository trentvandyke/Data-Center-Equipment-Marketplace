import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BuyerListing } from "@/components/buyer-listing";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { canManageListing, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toPublicListing } from "@/lib/public-copy";
import { detailInclude } from "@/lib/queries";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const listing = await prisma.listing.findUnique({
    where: { slug },
    select: {
      status: true,
      title: true,
      publicTitle: true,
      description: true,
      publicDescription: true,
      location: true,
      publicLocation: true,
      manufacturer: true,
      externalSeller: true,
    },
  });
  if (!listing || (listing.status !== "ACTIVE" && listing.status !== "SOLD")) {
    return { title: "Equipment" };
  }
  const view = toPublicListing(listing);
  const description = (view.description || "Request a quote for this equipment.").slice(0, 180);
  return {
    title: view.title || "Equipment",
    description,
    openGraph: { title: view.title || "Equipment", description },
  };
}

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

  return (
    <BuyerListing
      listing={listing}
      editHref={manager ? `/dashboard/listings/${listing.id}/edit` : undefined}
      quote={
        <div className="mt-3">
          <InquiryForm
            listingId={listing.id}
            defaults={{
              name: user?.name ?? "",
              email: user?.email ?? "",
              company: user?.company ?? "",
              phone: user?.phone ?? "",
            }}
          />
        </div>
      }
    />
  );
}
